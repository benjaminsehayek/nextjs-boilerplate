'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Monitor } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { CalendarItemV2, SimpleStrategyConfig, SiteAudit } from '@/types';
import type { EnrichedKeyword, SiteAuditKeyword } from '@/lib/contentStrategy/keywordResearch';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const SimpleConfigForm = dynamic(() => import('@/components/tools/ContentStrategy/SimpleConfigForm'), { ssr: false });
const UnifiedCalendar = dynamic(() => import('@/components/tools/ContentStrategy/UnifiedCalendar'), { ssr: false });

type Phase = 'checking' | 'prereq_missing' | 'config' | 'generating' | 'complete';

interface PrereqStatus {
  hasSiteAudit: boolean;
  hasIndustry: boolean;
  hasCity: boolean;
  hasState: boolean;
  hasOffPage: boolean;
  siteAuditDate?: string;
}

// Days before auto-refresh triggers per tier (undefined = no auto-refresh)
const AUTO_REFRESH_DAYS: Partial<Record<string, number>> = {
  growth: 7,
  marketing: 30,
};

// B6-10: Time-ago helper
function timeAgo(date: Date | null): string {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

function autoRefreshDue(lastGeneratedAt: string | null, tier: string): boolean {
  const days = AUTO_REFRESH_DAYS[tier];
  if (!days || !lastGeneratedAt) return false;
  return Date.now() - new Date(lastGeneratedAt).getTime() > days * 24 * 60 * 60 * 1000;
}

// ── GSC types ─────────────────────────────────────────────────────────────────

interface GSCRow {
  keys: string[]; // [query, page] from analytics API
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCQuerySummary {
  query: string;
  clicks: number;
  impressions: number;
  position: number; // average position
}

interface ContentGap {
  query: string;
  impressions: number;
  position: number;
}

interface LocalOpportunity {
  query: string;
  impressions: number;
  position: number;
  city: string;
}

// Aggregate multi-page rows for the same query into a single summary
function aggregateGSCRows(rows: GSCRow[]): GSCQuerySummary[] {
  const map = new Map<string, { clicks: number; impressions: number; posSum: number; posCount: number }>();
  for (const row of rows) {
    const query = row.keys[0] ?? '';
    if (!query) continue;
    const existing = map.get(query);
    if (existing) {
      existing.clicks += row.clicks;
      existing.impressions += row.impressions;
      existing.posSum += row.position;
      existing.posCount += 1;
    } else {
      map.set(query, { clicks: row.clicks, impressions: row.impressions, posSum: row.position, posCount: 1 });
    }
  }
  return Array.from(map.entries()).map(([query, v]) => ({
    query,
    clicks: v.clicks,
    impressions: v.impressions,
    position: v.posCount > 0 ? v.posSum / v.posCount : 0,
  }));
}

// ── GSC Insights Panel ────────────────────────────────────────────────────────

interface GSCInsightsPanelProps {
  businessId: string;
  industry: string;
  city: string;
  // Called when "Import from GSC" is clicked — provides top queries
  onImportKeywords: (queries: string[]) => void;
  // Called with the GSC map so keyword results can show actual traffic
  onGscMapReady: (map: Map<string, { clicks: number; impressions: number; position: number }>) => void;
}

function GSCInsightsPanel({ businessId, industry, city, onImportKeywords, onGscMapReady }: GSCInsightsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gscConnected, setGscConnected] = useState<boolean | null>(null); // null = unknown
  const [querySummaries, setQuerySummaries] = useState<GSCQuerySummary[]>([]);
  const [importDone, setImportDone] = useState(false);

  // Check GSC connection and fetch data
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/gsc/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          // GSC not connected
          setGscConnected(false);
          return;
        }
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
        setGscConnected(true);
        const rows: GSCRow[] = json.rows || [];
        const summaries = aggregateGSCRows(rows);
        setQuerySummaries(summaries);

        // Build query → { clicks, impressions, position } map for GSC-25
        const gscMap = new Map<string, { clicks: number; impressions: number; position: number }>();
        for (const s of summaries) {
          gscMap.set(s.query.toLowerCase(), { clicks: s.clicks, impressions: s.impressions, position: s.position });
        }
        onGscMapReady(gscMap);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message || 'Failed to load GSC data');
          setGscConnected(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  // GSC-10: Top import keywords — position > 5 OR impressions >= 100, top 20 by impressions
  const importKeywords = useMemo(() => {
    return querySummaries
      .filter(q => q.position > 5 || q.impressions >= 100)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20)
      .map(q => q.query);
  }, [querySummaries]);

  // GSC-11: Content gaps — impressions >= 100 AND position > 10, top 10 by impressions
  const contentGaps = useMemo((): ContentGap[] => {
    return querySummaries
      .filter(q => q.impressions >= 100 && q.position > 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(q => ({ query: q.query, impressions: q.impressions, position: Math.round(q.position) }));
  }, [querySummaries]);

  // GSC-13: Local landing page opportunities — queries containing city names, position > 5
  const localOpportunities = useMemo((): LocalOpportunity[] => {
    if (!city) return [];
    // We only have the primary city here; parent can pass more via markets
    const cityLower = city.toLowerCase();
    return querySummaries
      .filter(q => {
        const ql = q.query.toLowerCase();
        return q.position > 5 && ql.includes(cityLower);
      })
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(q => ({
        query: q.query,
        impressions: q.impressions,
        position: Math.round(q.position),
        city,
      }));
  }, [querySummaries, city]);

  if (loading) {
    return (
      <div className="card p-4 flex items-center gap-3 text-sm text-ash-400">
        <div className="w-4 h-4 border-2 border-ash-600 border-t-flame-500 rounded-full animate-spin shrink-0" />
        Loading GSC data…
      </div>
    );
  }

  if (gscConnected === false || error) {
    return (
      <div className="card p-4 border-char-600 bg-char-800/50">
        <p className="text-xs text-ash-500">
          <span className="text-ash-300 font-medium">Connect GSC in Settings</span> to unlock keyword import, content gap detection, and local page opportunities.
        </p>
      </div>
    );
  }

  if (gscConnected === null || querySummaries.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* GSC-10: Import from GSC */}
      {importKeywords.length > 0 && (
        <div className="card p-4 border-brand-500/20 bg-brand-500/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-display text-ash-200 mb-1">Import from GSC</h3>
              <p className="text-xs text-ash-500">
                {importKeywords.length} opportunity keywords found — queries with high impressions or ranking below position 5.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {importKeywords.slice(0, 5).map(kw => (
                  <span key={kw} className="text-[10px] bg-char-700 text-ash-400 px-2 py-0.5 rounded-full">{kw}</span>
                ))}
                {importKeywords.length > 5 && (
                  <span className="text-[10px] text-ash-600">+{importKeywords.length - 5} more</span>
                )}
              </div>
            </div>
            <button
              onClick={() => { onImportKeywords(importKeywords); setImportDone(true); }}
              disabled={importDone}
              className="btn-primary text-xs py-1.5 px-3 shrink-0 disabled:opacity-50"
            >
              {importDone ? 'Imported' : 'Import top keywords from GSC'}
            </button>
          </div>
        </div>
      )}

      {/* GSC-11: Content Gaps */}
      {contentGaps.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-char-700">
            <h3 className="text-sm font-display text-ash-200 flex items-center gap-2">
              <span className="text-amber-400">◆</span>
              Content Gaps
              <span className="text-xs text-ash-500 font-normal">({contentGaps.length})</span>
            </h3>
            <p className="text-xs text-ash-500 mt-0.5">
              Queries with confirmed demand (100+ impressions) but no strong ranking page (position &gt; 10). Each is a new-page opportunity.
            </p>
          </div>
          <div className="divide-y divide-char-700">
            {contentGaps.map((gap, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ash-200 truncate">"{gap.query}"</p>
                  <p className="text-[10px] text-amber-400 mt-0.5">
                    Create a <span className="font-medium">{gap.query}</span> page
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-xs font-display text-ash-100">{gap.impressions.toLocaleString()}</p>
                    <p className="text-[10px] text-ash-500">impr.</p>
                  </div>
                  <div>
                    <p className="text-xs font-display text-ash-400">#{gap.position}</p>
                    <p className="text-[10px] text-ash-500">position</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GSC-13: Local Page Opportunities */}
      {localOpportunities.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-char-700">
            <h3 className="text-sm font-display text-ash-200 flex items-center gap-2">
              <span className="text-sky-400">📍</span>
              Local Page Opportunities
              <span className="text-xs text-ash-500 font-normal">({localOpportunities.length})</span>
            </h3>
            <p className="text-xs text-ash-500 mt-0.5">
              Queries containing your city name where you're not ranking well (position &gt; 5). Create dedicated local pages to capture this traffic.
            </p>
          </div>
          <div className="divide-y divide-char-700">
            {localOpportunities.map((opp, i) => {
              // Extract the service portion of the query (remove city name)
              const servicePart = opp.query.replace(new RegExp(opp.city, 'gi'), '').trim().replace(/\s+/g, ' ');
              const cityFormatted = opp.city.charAt(0).toUpperCase() + opp.city.slice(1);
              const suggestion = servicePart
                ? `Create ${cityFormatted} ${servicePart} page`
                : `Create dedicated ${cityFormatted} page`;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ash-200 truncate">"{opp.query}"</p>
                    <p className="text-[10px] text-sky-400 mt-0.5">{suggestion}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-xs font-display text-ash-100">{opp.impressions.toLocaleString()}</p>
                      <p className="text-[10px] text-ash-500">impr.</p>
                    </div>
                    <div>
                      <p className="text-xs font-display text-ash-400">#{opp.position}</p>
                      <p className="text-[10px] text-ash-500">position</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── GSCInsightsPanel with markets cities (GSC-13 extended) ────────────────────

interface GSCInsightsPanelWithMarketsProps extends GSCInsightsPanelProps {
  marketCities: string[];
  calendarItems?: CalendarItemV2[];
  querySummariesForMarkets?: GSCQuerySummary[];
}

function GSCInsightsPanelWithMarkets({
  businessId, industry, city, onImportKeywords, onGscMapReady, marketCities, calendarItems = [],
}: GSCInsightsPanelWithMarketsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gscConnected, setGscConnected] = useState<boolean | null>(null);
  const [querySummaries, setQuerySummaries] = useState<GSCQuerySummary[]>([]);
  const [gscRows, setGscRows] = useState<GSCRow[]>([]);
  const [importDone, setImportDone] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/gsc/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) { setGscConnected(false); return; }
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
        setGscConnected(true);
        const rows: GSCRow[] = json.rows || [];
        const summaries = aggregateGSCRows(rows);
        setQuerySummaries(summaries);
        setGscRows(rows);

        // Build GSC map for GSC-25
        const gscMap = new Map<string, { clicks: number; impressions: number; position: number }>();
        for (const s of summaries) {
          gscMap.set(s.query.toLowerCase(), { clicks: s.clicks, impressions: s.impressions, position: s.position });
        }
        onGscMapReady(gscMap);
      })
      .catch((e: Error) => {
        if (!cancelled) { setError(e.message || 'Failed to load GSC data'); setGscConnected(false); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  // GSC-12: Underperforming content — calendar items whose targetUrl ranks position > 15
  const underperformingItems = useMemo((): UnderperformingItem[] => {
    if (gscRows.length === 0 || calendarItems.length === 0) return [];
    const pagePositions = buildPagePositionMap(gscRows);
    return calendarItems
      .filter((item) => {
        if (!item.targetUrl) return false;
        const path = item.targetUrl.startsWith('/') ? item.targetUrl : `/${item.targetUrl}`;
        const pos = pagePositions.get(path);
        return pos !== undefined && pos > 15;
      })
      .map((item) => {
        const path = item.targetUrl!.startsWith('/') ? item.targetUrl! : `/${item.targetUrl!}`;
        return {
          id: item.id,
          title: item.title,
          targetUrl: item.targetUrl!,
          position: Math.round(pagePositions.get(path)!),
        };
      })
      .sort((a, b) => b.position - a.position)
      .slice(0, 10);
  }, [gscRows, calendarItems]);

  // All cities to match against: primary city + market cities, deduped, lowercase
  const allCities = useMemo(() => {
    const set = new Set<string>();
    if (city) set.add(city.toLowerCase());
    for (const c of marketCities) {
      if (c) set.add(c.toLowerCase());
    }
    return Array.from(set);
  }, [city, marketCities]);

  // GSC-10
  const importKeywords = useMemo(() => {
    return querySummaries
      .filter(q => q.position > 5 || q.impressions >= 100)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20)
      .map(q => q.query);
  }, [querySummaries]);

  // GSC-11
  const contentGaps = useMemo((): ContentGap[] => {
    return querySummaries
      .filter(q => q.impressions >= 100 && q.position > 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(q => ({ query: q.query, impressions: q.impressions, position: Math.round(q.position) }));
  }, [querySummaries]);

  // GSC-13: extended with all market cities
  const localOpportunities = useMemo((): LocalOpportunity[] => {
    if (allCities.length === 0) return [];
    const results: LocalOpportunity[] = [];
    const seen = new Set<string>();

    for (const q of querySummaries) {
      if (q.position <= 5) continue;
      const ql = q.query.toLowerCase();
      for (const c of allCities) {
        if (ql.includes(c) && !seen.has(q.query)) {
          seen.add(q.query);
          results.push({
            query: q.query,
            impressions: q.impressions,
            position: Math.round(q.position),
            city: c,
          });
          break;
        }
      }
    }

    return results
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10);
  }, [querySummaries, allCities]);

  if (loading) {
    return (
      <div className="card p-4 flex items-center gap-3 text-sm text-ash-400">
        <div className="w-4 h-4 border-2 border-ash-600 border-t-flame-500 rounded-full animate-spin shrink-0" />
        Loading GSC data…
      </div>
    );
  }

  if (gscConnected === false || error) {
    return (
      <div className="card p-4 border-char-600 bg-char-800/50">
        <p className="text-xs text-ash-500">
          <span className="text-ash-300 font-medium">Connect GSC in Settings</span> to unlock keyword import, content gap detection, and local page opportunities.
        </p>
      </div>
    );
  }

  if (gscConnected === null || querySummaries.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* GSC-10: Import from GSC */}
      {importKeywords.length > 0 && (
        <div className="card p-4 border-brand-500/20 bg-brand-500/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-display text-ash-200 mb-1">Import from GSC</h3>
              <p className="text-xs text-ash-500">
                {importKeywords.length} opportunity keywords found — queries with high impressions or ranking below position 5.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {importKeywords.slice(0, 5).map(kw => (
                  <span key={kw} className="text-[10px] bg-char-700 text-ash-400 px-2 py-0.5 rounded-full">{kw}</span>
                ))}
                {importKeywords.length > 5 && (
                  <span className="text-[10px] text-ash-600">+{importKeywords.length - 5} more</span>
                )}
              </div>
            </div>
            <button
              onClick={() => { onImportKeywords(importKeywords); setImportDone(true); }}
              disabled={importDone}
              className="btn-primary text-xs py-1.5 px-3 shrink-0 disabled:opacity-50"
            >
              {importDone ? 'Imported' : 'Import top keywords from GSC'}
            </button>
          </div>
        </div>
      )}

      {/* GSC-11: Content Gaps */}
      {contentGaps.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-char-700">
            <h3 className="text-sm font-display text-ash-200 flex items-center gap-2">
              <span className="text-amber-400">◆</span>
              Content Gaps
              <span className="text-xs text-ash-500 font-normal">({contentGaps.length})</span>
            </h3>
            <p className="text-xs text-ash-500 mt-0.5">
              Queries with confirmed demand (100+ impressions) but no strong ranking page (position &gt; 10). Each is a new-page opportunity.
            </p>
          </div>
          <div className="divide-y divide-char-700">
            {contentGaps.map((gap, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ash-200 truncate">"{gap.query}"</p>
                  <p className="text-[10px] text-amber-400 mt-0.5">
                    Create a <span className="font-medium">{gap.query}</span> page
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-xs font-display text-ash-100">{gap.impressions.toLocaleString()}</p>
                    <p className="text-[10px] text-ash-500">impr.</p>
                  </div>
                  <div>
                    <p className="text-xs font-display text-ash-400">#{gap.position}</p>
                    <p className="text-[10px] text-ash-500">position</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GSC-12: Underperforming Content */}
      {underperformingItems.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-char-700">
            <h3 className="text-sm font-display text-ash-200 flex items-center gap-2">
              <span className="text-danger">⚠</span>
              Underperforming Content
              <span className="text-xs text-ash-500 font-normal">({underperformingItems.length})</span>
            </h3>
            <p className="text-xs text-ash-500 mt-0.5">
              Calendar items whose target page ranks beyond position 15 — content isn't gaining traction. Refresh, consolidate, or promote these pages.
            </p>
          </div>
          <div className="divide-y divide-char-700">
            {underperformingItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ash-200 truncate">{item.title}</p>
                  <p className="text-[10px] font-mono text-ash-500 mt-0.5 truncate">{item.targetUrl}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] bg-danger/10 text-danger border border-danger/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Refresh or consolidate
                  </span>
                  <div className="text-right">
                    <p className="text-xs font-display text-danger">#{item.position}</p>
                    <p className="text-[10px] text-ash-500">position</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GSC-13: Local Page Opportunities */}
      {localOpportunities.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-char-700">
            <h3 className="text-sm font-display text-ash-200 flex items-center gap-2">
              <span className="text-sky-400">📍</span>
              Local Page Opportunities
              <span className="text-xs text-ash-500 font-normal">({localOpportunities.length})</span>
            </h3>
            <p className="text-xs text-ash-500 mt-0.5">
              Queries containing your market cities where you're not ranking well (position &gt; 5). Create dedicated local pages to capture this traffic.
            </p>
          </div>
          <div className="divide-y divide-char-700">
            {localOpportunities.map((opp, i) => {
              const servicePart = opp.query.replace(new RegExp(opp.city, 'gi'), '').trim().replace(/\s+/g, ' ');
              const cityFormatted = opp.city.charAt(0).toUpperCase() + opp.city.slice(1);
              const suggestion = servicePart
                ? `Create ${cityFormatted} ${servicePart} page`
                : `Create dedicated ${cityFormatted} page`;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ash-200 truncate">"{opp.query}"</p>
                    <p className="text-[10px] text-sky-400 mt-0.5">{suggestion}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-xs font-display text-ash-100">{opp.impressions.toLocaleString()}</p>
                      <p className="text-[10px] text-ash-500">impr.</p>
                    </div>
                    <div>
                      <p className="text-xs font-display text-ash-400">#{opp.position}</p>
                      <p className="text-[10px] text-ash-500">position</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── GSC-12: Underperforming content detection ─────────────────────────────────

interface UnderperformingItem {
  id: string;
  title: string;
  targetUrl: string;
  position: number;
}

function buildPagePositionMap(rows: GSCRow[]): Map<string, number> {
  const pageMap = new Map<string, { posSum: number; count: number }>();
  for (const row of rows) {
    const rawPage = row.keys[1] ?? '';
    if (!rawPage) continue;
    let pathname: string;
    try {
      pathname = new URL(rawPage).pathname;
    } catch {
      pathname = rawPage.startsWith('/') ? rawPage : `/${rawPage}`;
    }
    const prev = pageMap.get(pathname) ?? { posSum: 0, count: 0 };
    pageMap.set(pathname, { posSum: prev.posSum + row.position, count: prev.count + 1 });
  }
  const result = new Map<string, number>();
  for (const [path, d] of pageMap) {
    result.set(path, d.posSum / d.count);
  }
  return result;
}

// ── GSC-25: Keyword Research Results with actual GSC traffic ─────────────────

interface GSCKeywordTableProps {
  keywords: EnrichedKeyword[];
  gscMap: Map<string, { clicks: number; impressions: number; position: number }>;
}

function GSCKeywordTable({ keywords, gscMap }: GSCKeywordTableProps) {
  if (keywords.length === 0) return null;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-char-700">
        <h3 className="text-sm font-display text-ash-200">Keyword Research Results</h3>
        <p className="text-xs text-ash-500 mt-0.5">
          Keywords imported from GSC. Where your business already ranks, actual 90-day traffic is shown.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-char-700">
              <th className="text-left text-ash-500 font-medium py-2 px-4">Keyword</th>
              <th className="text-right text-ash-500 font-medium py-2 px-3">Est. Volume</th>
              <th className="text-right text-ash-500 font-medium py-2 px-3">Actual traffic (90d)</th>
              <th className="text-right text-ash-500 font-medium py-2 px-3">Position</th>
              <th className="text-right text-ash-500 font-medium py-2 px-3">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw, i) => {
              const gsc = gscMap.get(kw.keyword.toLowerCase());
              const hasGsc = gsc && gsc.position <= 20;
              return (
                <tr key={i} className="border-b border-char-800 hover:bg-char-800/50 transition-colors">
                  <td className="py-2 px-4 text-ash-200">{kw.keyword}</td>
                  <td className="py-2 px-3 text-right text-ash-400">
                    {kw.avgVolume > 0 ? kw.avgVolume.toLocaleString() : '—'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {hasGsc ? (
                      <span className="text-flame-400 font-medium">{gsc.clicks.toLocaleString()}</span>
                    ) : (
                      <span className="text-ash-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {hasGsc ? (
                      <span className={`font-display ${gsc.position <= 3 ? 'text-success' : gsc.position <= 10 ? 'text-ash-200' : 'text-ash-400'}`}>
                        #{Math.round(gsc.position)}
                      </span>
                    ) : kw.currentRank ? (
                      <span className="text-ash-400">#{kw.currentRank}</span>
                    ) : (
                      <span className="text-ash-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {kw.difficulty != null ? (
                      <span className={`${kw.difficulty >= 70 ? 'text-danger' : kw.difficulty >= 40 ? 'text-warning' : 'text-success'}`}>
                        {kw.difficulty}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentStrategyPage() {
  const { user, business, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>('checking');
  const [prereqStatus, setPrereqStatus] = useState<PrereqStatus | null>(null);
  const [siteAudit, setSiteAudit] = useState<SiteAudit | null>(null);
  const [offPageAudit, setOffPageAudit] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItemV2[]>([]);
  const [itemStatuses, setItemStatuses] = useState<Record<string, 'done' | 'skipped'>>({});
  const [storedEconomics, setStoredEconomics] = useState<SimpleStrategyConfig | null>(null);
  const [hasNewerAudit, setHasNewerAudit] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // B6-10: Refresh indicator state
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [refreshToastError, setRefreshToastError] = useState(false);

  // B13-09: Lock to prevent concurrent generate() calls (manual + auto-refresh race)
  const generatingRef = useRef(false);

  // Debounce status saves
  const statusDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GSC state
  const [gscMap, setGscMap] = useState<Map<string, { clicks: number; impressions: number; position: number }>>(new Map());
  const [importedGscKeywords, setImportedGscKeywords] = useState<string[]>([]);
  const [importedEnrichedKeywords, setImportedEnrichedKeywords] = useState<EnrichedKeyword[]>([]);
  const [gscKeywordsLoading, setGscKeywordsLoading] = useState(false);

  // Markets cities for GSC-13 extended
  const [marketCities, setMarketCities] = useState<string[]>([]);

  // ── Load markets cities ────────────────────────────────────────────
  useEffect(() => {
    if (!business?.id) return;
    (supabase as any)
      .from('markets')
      .select('cities, name')
      .eq('business_id', business.id)
      .then(({ data }: { data: Array<{ cities: string[] | null; name: string }> | null }) => {
        if (!data) return;
        // Flatten cities arrays + extract city portion from market names like "Dallas County, TX"
        const cities: string[] = [];
        for (const m of data) {
          if (m.cities) {
            for (const c of m.cities) { if (c) cities.push(c.toLowerCase()); }
          }
          // Also extract first part of market name (e.g. "Dallas" from "Dallas County, TX")
          const namePart = m.name.split(',')[0].trim().toLowerCase();
          if (namePart && !namePart.includes('county')) cities.push(namePart);
        }
        setMarketCities([...new Set(cities)]);
      });
  }, [business?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle GSC keyword import → enrich via keyword-research API ───
  const handleImportKeywords = useCallback(async (queries: string[]) => {
    if (!business?.id || queries.length === 0) return;
    setImportedGscKeywords(queries);
    setGscKeywordsLoading(true);

    const auditCity = (siteAudit as any)?.crawl_data?.business?.city ?? (business as any)?.city ?? '';

    try {
      const kwRes = await fetch('/api/content-strategy/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: (business as any)?.industry ?? '',
          city: auditCity,
          state: (business as any)?.state ?? '',
          locations: auditCity ? [auditCity] : [],
          siteAuditKeywords: queries.map(q => ({ keyword: q, volume: 0, currentRank: null, cpc: null })),
          businessName: business?.name ?? '',
        }),
      });
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        if (kwData.keywords?.length) setImportedEnrichedKeywords(kwData.keywords);
      }
    } catch {
      // Non-fatal
    } finally {
      setGscKeywordsLoading(false);
    }
  }, [business?.id, siteAudit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load existing data on mount ────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!business?.id) return;

    setPhase('checking');

    const [auditRes, offPageRes, strategyRes] = await Promise.all([
      (supabase as any)
        .from('site_audits')
        .select('id, domain, status, crawl_data, issues_data, pages_data, created_at')
        .eq('business_id', business.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      (supabase as any)
        .from('off_page_audits')
        .select('id, citations, link_gaps, location_data, created_at')
        .eq('business_id', business.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r: any) => r.error ? { data: null, error: r.error } : r),
      (supabase as any)
        .from('content_strategies')
        .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at, status, domain, economics')
        .eq('business_id', business.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const audit: SiteAudit | null = auditRes.data ?? null;
    const offPage = offPageRes.data ?? null;
    const existing = strategyRes.data ?? null;

    setSiteAudit(audit);
    setOffPageAudit(offPage);

    const auditCity = (audit as any)?.crawl_data?.business?.city ?? (business as any)?.city ?? '';
    const status: PrereqStatus = {
      hasSiteAudit: !!audit,
      hasIndustry: !!((business as any)?.industry),
      hasCity: !!auditCity,
      hasState: !!((business as any)?.state),
      hasOffPage: !!offPage,
      siteAuditDate: (audit as any)?.created_at,
    };
    setPrereqStatus(status);

    // Existing strategy → go straight to calendar, no re-gating
    if (existing?.calendar_v2?.length) {
      setStrategy(existing);
      setCalendarItems(existing.calendar_v2);
      setItemStatuses(existing.item_statuses ?? {});
      setStoredEconomics((existing.economics as SimpleStrategyConfig) ?? null);

      const newerAudit = !!(existing.source_audit_id && audit?.id !== existing.source_audit_id);
      setHasNewerAudit(newerAudit);

      setPhase('complete');

      // Auto-refresh for qualifying tiers — run silently in background
      const tier = profile?.subscription_tier ?? 'free';
      if (autoRefreshDue(existing.last_generated_at, tier) && existing.economics) {
        generate(
          existing.economics as SimpleStrategyConfig,
          { silent: true, auditData: audit, offPageData: offPage, prevStatuses: existing.item_statuses ?? {} }
        );
      }
    } else {
      // First-time generation: all hard prerequisites must be met
      const allHardReqsMet = status.hasSiteAudit && status.hasIndustry && status.hasCity && status.hasState;
      setPhase(allHardReqsMet ? 'config' : 'prereq_missing');
    }
  }, [business?.id, profile?.subscription_tier]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading && business?.id) loadData();
  }, [authLoading, business?.id, loadData]);

  // ── Generate strategy ──────────────────────────────────────────────
  async function generate(
    cfg: SimpleStrategyConfig,
    opts?: {
      silent?: boolean;
      auditData?: SiteAudit | null;
      offPageData?: any;
      prevStatuses?: Record<string, 'done' | 'skipped'>;
    }
  ) {
    const auditToUse = opts?.auditData ?? siteAudit;
    const offPageToUse = opts?.offPageData ?? offPageAudit;
    if (!auditToUse || !business?.id) return;
    if (generatingRef.current) return;
    generatingRef.current = true;

    setError('');
    if (!opts?.silent) setPhase('generating');
    setRefreshing(true);

    try {
      // ── Step 1: External keyword research ─────────────────────────
      if (!opts?.silent) setGenerationStep('Discovering keywords…');

      // Extract site audit keywords to pass as internal context
      const marketKws: SiteAuditKeyword[] = [];
      const markets = (auditToUse as any)?.crawl_data?.keywords?.markets ?? {};
      for (const market of Object.values(markets)) {
        for (const item of (market as any)?.items ?? []) {
          const kw: string = item.keyword_data?.keyword;
          const vol: number = item.keyword_data?.keyword_info?.search_volume ?? 0;
          const rank: number | null = item.ranked_serp_element?.serp_item?.rank_group ?? null;
          const cpc: number | null = item.keyword_data?.keyword_info?.cpc ?? null;
          if (kw && vol > 0) marketKws.push({ keyword: kw, volume: vol, currentRank: rank, cpc });
        }
      }

      const auditCity = (auditToUse as any)?.crawl_data?.business?.city ?? (business as any)?.city ?? '';
      let enrichedKeywords: EnrichedKeyword[] | undefined;

      try {
        const kwRes = await fetch('/api/content-strategy/keyword-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry: (business as any)?.industry ?? '',
            city: auditCity,
            state: (business as any)?.state ?? '',
            locations: auditCity ? [auditCity] : [],
            siteAuditKeywords: marketKws,
            businessName: business?.name ?? '',
          }),
        });
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          if (kwData.keywords?.length) enrichedKeywords = kwData.keywords;
        }
      } catch {
        // Keyword research failure is non-fatal — fall back to audit-only keywords
      }

      // ── Step 2: Build calendar ─────────────────────────────────────
      if (!opts?.silent) setGenerationStep('Building your calendar…');

      const { buildUnifiedCalendar } = await import('@/lib/contentStrategy/unifiedCalendar');
      const items = buildUnifiedCalendar(auditToUse as any, offPageToUse, cfg, enrichedKeywords, (business as any)?.industry ?? '');

      // Carry over statuses for items that still exist — orphaned statuses are cleaned up
      const prevStatuses = opts?.prevStatuses ?? itemStatuses;
      const newIds = new Set(items.map(i => i.id));
      const carryOver: Record<string, 'done' | 'skipped'> = {};
      for (const [id, status] of Object.entries(prevStatuses)) {
        if (newIds.has(id)) carryOver[id] = status;
      }

      const now = new Date().toISOString();
      const upsertData = {
        business_id: business.id,
        domain: auditToUse.domain ?? (business as any).domain ?? '',
        status: 'complete',
        calendar_v2: items,
        source_audit_id: auditToUse.id,
        source_offpage_id: offPageToUse?.id ?? null,
        last_generated_at: now,
        item_statuses: carryOver,
        economics: cfg,
        completed_tasks: [],
      };

      let result;
      const strategyId = strategy?.id;
      if (strategyId) {
        result = await (supabase as any)
          .from('content_strategies')
          .update(upsertData)
          .eq('id', strategyId)
          .eq('business_id', business!.id)
          .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at, economics')
          .single();
      } else {
        result = await (supabase as any)
          .from('content_strategies')
          .insert(upsertData)
          .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at, economics')
          .single();
      }

      if (result.error) throw new Error(result.error.message);

      setStrategy(result.data);
      setCalendarItems(items);
      setItemStatuses(carryOver);
      setStoredEconomics(cfg);
      setHasNewerAudit(false);
      if (!opts?.silent) setPhase('complete');

      // B6-10: Track refresh time and show toast (both silent and manual refreshes)
      setLastRefreshedAt(new Date());
      setRefreshToastError(false);
      setShowRefreshToast(true);
      setTimeout(() => setShowRefreshToast(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate strategy');
      if (!opts?.silent) setPhase(strategy ? 'complete' : 'config');
      // Show error toast on silent background refresh failure so user knows data may be stale
      if (opts?.silent) {
        setRefreshToastError(true);
        setShowRefreshToast(true);
        setTimeout(() => setShowRefreshToast(false), 5000);
      }
    } finally {
      generatingRef.current = false;
      setRefreshing(false);
    }
  }

  // Save AI-generated content back to DB so it persists across sessions
  const handleContentGenerated = useCallback(async (id: string, content: string) => {
    const updated = calendarItems.map(item =>
      item.id === id ? { ...item, generatedContent: content } : item
    );
    setCalendarItems(updated);
    if (strategy?.id && business?.id) {
      await (supabase as any)
        .from('content_strategies')
        .update({ calendar_v2: updated })
        .eq('id', strategy.id)
        .eq('business_id', business.id);
    }
  }, [calendarItems, strategy?.id, business?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist week change after drag-and-drop
  const weekChangeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timers on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      if (weekChangeDebounce.current) clearTimeout(weekChangeDebounce.current);
      if (statusDebounce.current) clearTimeout(statusDebounce.current);
    };
  }, []);

  const handleWeekChange = useCallback((id: string, newWeek: number) => {
    const updated = calendarItems.map(item =>
      item.id === id ? { ...item, week: newWeek } : item
    );
    setCalendarItems(updated);

    if (weekChangeDebounce.current) clearTimeout(weekChangeDebounce.current);
    weekChangeDebounce.current = setTimeout(async () => {
      if (strategy?.id && business?.id) {
        await (supabase as any)
          .from('content_strategies')
          .update({ calendar_v2: updated })
          .eq('id', strategy.id)
          .eq('business_id', business.id);
      }
    }, 800);
  }, [calendarItems, strategy?.id, business?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // If economics are already stored, refresh inline — no config form needed
  const handleRefresh = useCallback(() => {
    if (storedEconomics) {
      generate(storedEconomics, { silent: true });
    } else {
      setPhase('config');
    }
  }, [storedEconomics]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Item status toggle ─────────────────────────────────────────────
  const handleStatusChange = useCallback((id: string, status: 'scheduled' | 'done' | 'skipped') => {
    const next: Record<string, 'done' | 'skipped'> = { ...itemStatuses };
    if (status === 'scheduled') {
      delete next[id];
    } else {
      next[id] = status;
    }
    setItemStatuses(next);
    setCalendarItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));

    if (statusDebounce.current) clearTimeout(statusDebounce.current);
    statusDebounce.current = setTimeout(async () => {
      if (strategy?.id && business?.id) {
        await (supabase as any)
          .from('content_strategies')
          .update({ item_statuses: next })
          .eq('id', strategy.id)
          .eq('business_id', business.id);
      }
    }, 800);
  }, [itemStatuses, strategy?.id, business?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized — recomputes only when [calendarItems, itemStatuses] change
  const itemsWithStatus = useMemo(() => calendarItems.map(item => ({
    ...item,
    status: (itemStatuses[item.id] as any) ?? item.status,
  })), [calendarItems, itemStatuses]);

  // ── Loading ────────────────────────────────────────────────────────
  if (authLoading || phase === 'checking') {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 bg-char-700 rounded-btn animate-pulse w-48" />
        <div className="h-40 bg-char-700 rounded-card animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const city = (siteAudit as any)?.crawl_data?.business?.city ?? (business as any)?.city ?? '';
  const businessName = business?.name ?? '';
  const domain = siteAudit?.domain ?? (business as any)?.domain ?? '';
  const industry = (business as any)?.industry ?? '';

  return (
    <>
      <div className="md:hidden flex flex-col items-center justify-center py-32 gap-6 px-8 text-center">
        <Monitor className="w-12 h-12 text-ash-400" />
        <h2 className="text-xl font-display text-ash-100">Best on desktop</h2>
        <p className="text-sm text-ash-400 max-w-xs">This tool is designed for larger screens. Visit on a desktop for the full experience.</p>
      </div>
      <div className="hidden md:block">
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/*
        INTENTIONALLY domain-level — no location selector.
        Content strategy analyzes the full domain (keywords, pages, authority)
        and produces one unified plan. Location-specific grids belong in Local Grid.
        Do NOT add a LocationSelector to this page.
      */}

      {/* B6-10: Refresh toast — fixed overlay, auto-hides after 3s (5s on error) */}
      {showRefreshToast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-btn text-sm animate-fade-in z-50 shadow-card ${refreshToastError ? 'bg-danger/20 border border-danger text-danger' : 'bg-char-700 text-ash-100'}`}>
          {refreshToastError ? 'Auto-refresh failed — data may be stale' : 'Strategy refreshed'}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ash-100">Content Strategy</h1>
          <p className="text-ash-500 mt-1 text-sm">
            Keyword research + 12-week content plan — finds what to target, generates what to publish.
          </p>
          {/* B6-10: Last refreshed indicator */}
          {lastRefreshedAt && (
            <p className="text-ash-500 text-sm mt-1">
              Strategy refreshed {timeAgo(lastRefreshedAt)}
            </p>
          )}
        </div>
        {domain && (
          <div className="flex items-center gap-1.5 text-xs text-ash-500 bg-char-700 border border-char-600 px-3 py-1.5 rounded-btn shrink-0 mt-1">
            <span>🌐</span>
            <span>{domain}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="card p-4 border-danger bg-danger/5 text-danger text-sm">{error}</div>
      )}

      {/* ── Prerequisite checklist ── */}
      {phase === 'prereq_missing' && prereqStatus && (() => {
        const allHardReqsMet = prereqStatus.hasSiteAudit && prereqStatus.hasIndustry && prereqStatus.hasCity && prereqStatus.hasState;
        const items: Array<{
          done: boolean; required: boolean; label: string; detail: string; href: string; cta: string;
        }> = [
          {
            done: prereqStatus.hasSiteAudit,
            required: true,
            label: 'Site Audit',
            detail: prereqStatus.hasSiteAudit
              ? `Completed ${new Date(prereqStatus.siteAuditDate!).toLocaleDateString()}`
              : 'Scans your site for existing keywords, pages, and technical issues',
            href: '/site-audit',
            cta: 'Run Site Audit',
          },
          {
            done: prereqStatus.hasIndustry,
            required: true,
            label: 'Business Industry',
            detail: prereqStatus.hasIndustry
              ? `Set to ${(business as any)?.industry}`
              : 'Used to match keywords to your services and set ROI defaults',
            href: '/settings',
            cta: 'Set in Settings',
          },
          {
            done: prereqStatus.hasCity,
            required: true,
            label: 'Business City',
            detail: prereqStatus.hasCity
              ? `Set to ${(business as any)?.city}`
              : 'Required for local keyword volume data — without it you get national averages',
            href: '/settings',
            cta: 'Set in Settings',
          },
          {
            done: prereqStatus.hasState,
            required: true,
            label: 'Business State',
            detail: prereqStatus.hasState
              ? `Set to ${(business as any)?.state}`
              : 'Narrows keyword research to your geographic market',
            href: '/settings',
            cta: 'Set in Settings',
          },
          {
            done: prereqStatus.hasOffPage,
            required: false,
            label: 'Off-Page Audit',
            detail: prereqStatus.hasOffPage
              ? 'Completed — citation gaps and link opportunities included'
              : 'Recommended — adds citation gaps and backlink opportunities to your calendar',
            href: '/off-page-audit',
            cta: 'Run Off-Page Audit',
          },
        ];

        return (
          <div className="card p-8 space-y-6 max-w-lg">
            <div>
              <h2 className="font-display text-lg text-ash-200">Complete These Steps First</h2>
              <p className="text-ash-500 text-sm mt-1">
                Keyword research needs accurate business data to find opportunities in your market.
              </p>
            </div>

            <div className="space-y-3">
              {items.map(item => (
                <div key={item.label} className={`flex items-start gap-3 p-3 rounded-btn border ${
                  item.done ? 'border-success/20 bg-success/5' : item.required ? 'border-danger/20 bg-danger/5' : 'border-warning/20 bg-warning/5'
                }`}>
                  <span className={`mt-0.5 text-base ${item.done ? 'text-success' : item.required ? 'text-danger' : 'text-warning'}`}>
                    {item.done ? '✓' : item.required ? '✗' : '⚠'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ash-200">{item.label}</span>
                      {!item.required && <span className="text-xs text-ash-500 bg-char-700 px-1.5 py-0.5 rounded">recommended</span>}
                    </div>
                    <p className="text-xs text-ash-500 mt-0.5">{item.detail}</p>
                  </div>
                  {!item.done && (
                    <a href={item.href} className="text-xs text-brand-400 hover:text-brand-300 whitespace-nowrap shrink-0 mt-0.5">
                      {item.cta} →
                    </a>
                  )}
                </div>
              ))}
            </div>

            <button
              disabled={!allHardReqsMet}
              onClick={() => setPhase('config')}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allHardReqsMet ? 'Continue to Strategy Setup' : 'Complete Required Steps Above'}
            </button>
          </div>
        );
      })()}

      {/* ── Config ── */}
      {(phase === 'config' || phase === 'generating') && (
        <div className="space-y-6">
          {siteAudit && (
            <div className="flex items-center gap-3 text-xs text-ash-400 card px-4 py-2 w-fit">
              <span className="w-2 h-2 rounded-full bg-success shrink-0" />
              <span>Domain-wide strategy for <span className="text-ash-300">{domain}</span></span>
              <span className="text-char-600">·</span>
              <span>Site audit {new Date((siteAudit as any).created_at).toLocaleDateString()}</span>
              {offPageAudit && <><span className="text-char-600">·</span><span>+ off-page audit</span></>}
            </div>
          )}
          <SimpleConfigForm
            domain={domain}
            industry={industry}
            onSubmit={generate}
            loading={phase === 'generating'}
          />
          {phase === 'generating' && (
            <p className="text-sm text-ash-400 animate-pulse">
              {generationStep || 'Building your 12-week calendar…'}
            </p>
          )}
        </div>
      )}

      {/* ── GSC Insights (shown on config, generating, and complete phases) ── */}
      {(phase === 'config' || phase === 'generating' || phase === 'complete') && business?.id && (
        <div className="space-y-2">
          <h2 className="text-base font-display font-semibold text-ash-200">GSC Insights</h2>
          <GSCInsightsPanelWithMarkets
            businessId={business.id}
            industry={industry}
            city={city}
            marketCities={marketCities}
            onImportKeywords={handleImportKeywords}
            onGscMapReady={setGscMap}
            calendarItems={itemsWithStatus}
          />
        </div>
      )}

      {/* GSC-25: Keyword Research Results (shown after import) */}
      {importedGscKeywords.length > 0 && (
        <div className="space-y-2">
          {gscKeywordsLoading ? (
            <div className="card p-4 flex items-center gap-3 text-sm text-ash-400">
              <div className="w-4 h-4 border-2 border-ash-600 border-t-flame-500 rounded-full animate-spin shrink-0" />
              Enriching keywords with volume data…
            </div>
          ) : importedEnrichedKeywords.length > 0 ? (
            <GSCKeywordTable keywords={importedEnrichedKeywords} gscMap={gscMap} />
          ) : (
            <div className="card p-4">
              <p className="text-xs text-ash-400">
                {importedGscKeywords.length} keywords queued for next strategy generation.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {importedGscKeywords.slice(0, 8).map(kw => (
                  <span key={kw} className="text-[10px] bg-char-700 text-ash-400 px-2 py-0.5 rounded-full">{kw}</span>
                ))}
                {importedGscKeywords.length > 8 && (
                  <span className="text-[10px] text-ash-600">+{importedGscKeywords.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Calendar ── */}
      {phase === 'complete' && (
        <ErrorBoundary fallbackLabel="Calendar failed to render">
          <UnifiedCalendar
            items={itemsWithStatus}
            businessName={businessName}
            domain={domain}
            industry={industry}
            city={city}
            lastGeneratedAt={strategy?.last_generated_at ?? null}
            hasNewerAudit={hasNewerAudit}
            onRefresh={handleRefresh}
            onStatusChange={handleStatusChange}
            onContentGenerated={handleContentGenerated}
            onWeekChange={handleWeekChange}
            refreshing={refreshing}
          />
        </ErrorBoundary>
      )}
    </div>
      </div>
    </>
  );
}
