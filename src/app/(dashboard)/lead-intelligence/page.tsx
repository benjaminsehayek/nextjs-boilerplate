/**
 * Lead Intelligence — B5-01 + B5-13
 *
 * Attribution model: Last-touch by source field
 * Source → channel name mapping:
 *   ppc      → Google Ads
 *   lsa      → Google LSA
 *   meta     → Meta Ads
 *   website  → Organic/SEO
 *   referral → Referral
 *   crm      → CRM Import
 *   manual   → Manual Entry
 *
 * Data sources: contacts table (id, source, elv_score, created_at, market_id)
 *               markets table  (id, name)
 */

'use client';

import { useState, useEffect } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/context/AuthContext';
import { useLocations } from '@/lib/hooks/useLocations';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactSource = 'ppc' | 'lsa' | 'meta' | 'website' | 'referral' | 'crm' | 'manual';
type TimeRange = '30' | '60' | '90';

interface RawContact {
  id: string;
  source: string;
  elv_score: number | null;
  created_at: string;
  market_id: string | null;
  opted_email: boolean | null;
  opted_sms: boolean | null;
}

interface RawMarket {
  id: string;
  name: string;
}

interface ChannelStats {
  source: ContactSource;
  label: string;
  icon: string;
  totalLeads: number;
  totalElv: number;
  avgElv: number;
  avgScore: number;
  leadsLast30: number;
  leadsPrior30: number;
  trend: number; // percentage change — positive = up, negative = down
}

interface MarketBreakdown {
  marketId: string;
  marketName: string;
  leadCount: number;
  avgScore: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_META: Record<ContactSource, { label: string; icon: string }> = {
  ppc:      { label: 'Google Ads',    icon: '🔍' },
  lsa:      { label: 'Google LSA',    icon: '📍' },
  meta:     { label: 'Meta Ads',      icon: '📱' },
  website:  { label: 'Organic/SEO',   icon: '🌐' },
  referral: { label: 'Referral',      icon: '🤝' },
  crm:      { label: 'CRM Import',    icon: '📋' },
  manual:   { label: 'Manual Entry',  icon: '✏️'  },
};

const KNOWN_SOURCES = Object.keys(SOURCE_META) as ContactSource[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function computeTrend(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 100);
}

// ─── Lead Scoring Model (B8-10) ───────────────────────────────────────────────

function computeLeadScore(contact: {
  estimated_value: number;
  created_at: string;
  source: string;
  opted_email: boolean;
  opted_sms: boolean;
}): number {
  // ELV component: 0-40 pts
  const elvPts = Math.min(40, (contact.estimated_value / 5000) * 40);

  // Recency component: 0-30 pts (30pts if <30 days, scales down linearly to 0 at 365 days)
  const daysSince = (Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const recencyPts = Math.max(0, 30 - (daysSince / 365) * 30);

  // Source quality: 0-20 pts
  const sourcePts = ({ lsa: 20, ppc: 18, meta: 15, website: 12, referral: 10, crm: 8, manual: 5 } as Record<string, number>)[contact.source] ?? 5;

  // Opt-in completeness: 0-10 pts
  const optPts = (contact.opted_email ? 5 : 0) + (contact.opted_sms ? 5 : 0);

  return Math.round(elvPts + recencyPts + sourcePts + optPts);
}

function scoreContacts(contacts: RawContact[]): number[] {
  return contacts.map((c) =>
    computeLeadScore({
      estimated_value: c.elv_score ?? 0,
      created_at: c.created_at,
      source: c.source,
      opted_email: c.opted_email ?? false,
      opted_sms: c.opted_sms ?? false,
    }),
  );
}

function avgScoreOf(contacts: RawContact[]): number {
  if (contacts.length === 0) return 0;
  const scores = scoreContacts(contacts);
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

function buildChannelStats(
  contacts: RawContact[],
  now: Date,
): ChannelStats[] {
  const cutoff30 = new Date(now.getTime() - 30 * 86_400_000);
  const cutoff60 = new Date(now.getTime() - 60 * 86_400_000);

  // Group by normalized source
  const bySource = new Map<ContactSource, RawContact[]>();

  for (const c of contacts) {
    const src = KNOWN_SOURCES.includes(c.source as ContactSource)
      ? (c.source as ContactSource)
      : 'manual';
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(c);
  }

  const stats: ChannelStats[] = [];

  for (const [source, rows] of bySource) {
    const meta = SOURCE_META[source];
    const totalLeads = rows.length;
    const totalElv = rows.reduce((sum, r) => sum + (r.elv_score ?? 0), 0);
    const avgElv = totalLeads > 0 ? totalElv / totalLeads : 0;

    const leadsLast30 = rows.filter(
      (r) => new Date(r.created_at) >= cutoff30,
    ).length;
    const leadsPrior30 = rows.filter((r) => {
      const d = new Date(r.created_at);
      return d >= cutoff60 && d < cutoff30;
    }).length;
    const trend = computeTrend(leadsLast30, leadsPrior30);

    stats.push({
      source,
      label: meta.label,
      icon: meta.icon,
      totalLeads,
      totalElv,
      avgElv,
      avgScore: avgScoreOf(rows),
      leadsLast30,
      leadsPrior30,
      trend,
    });
  }

  // Sort by total leads descending
  return stats.sort((a, b) => b.totalLeads - a.totalLeads);
}

function filterByTimeRange(contacts: RawContact[], days: number, now: Date): RawContact[] {
  const cutoff = new Date(now.getTime() - days * 86_400_000);
  return contacts.filter((c) => new Date(c.created_at) >= cutoff);
}

// ─── Lead Trend Chart (B9-13) ─────────────────────────────────────────────────

const TREND_SOURCE_COLORS: Record<string, string> = {
  ppc:      '#4ade80',
  lsa:      '#60a5fa',
  meta:     '#f472b6',
  website:  '#fb923c',
  referral: '#a78bfa',
  crm:      '#fbbf24',
  manual:   '#94a3b8',
};

function buildTrendData(contacts: RawContact[], now: Date) {
  // Build last 6 months array
  const months: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      start: d,
      end,
    });
  }

  // Count per source per month
  const sourcesSet = new Set<string>();
  for (const c of contacts) {
    sourcesSet.add(KNOWN_SOURCES.includes(c.source as ContactSource) ? c.source : 'manual');
  }
  const sources = Array.from(sourcesSet).slice(0, 6);

  const data = months.map((m) => {
    const monthContacts = contacts.filter((c) => {
      const d = new Date(c.created_at);
      return d >= m.start && d <= m.end;
    });
    const counts: Record<string, number> = {};
    for (const src of sources) {
      counts[src] = monthContacts.filter((c) => {
        const normalized = KNOWN_SOURCES.includes(c.source as ContactSource) ? c.source : 'manual';
        return normalized === src;
      }).length;
    }
    return { label: m.label, counts };
  });

  const maxCount = Math.max(1, ...data.flatMap((d) => Object.values(d.counts)));
  return { data, sources, maxCount };
}

function LeadTrendChart({ contacts }: { contacts: RawContact[] }) {
  const now = new Date();
  const { data, sources, maxCount } = buildTrendData(contacts, now);

  if (contacts.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-ash-100 mb-5 flex items-center gap-2">
        <span>📈</span> Lead Trend (Last 6 Months)
      </h3>

      {/* Chart */}
      <div className="overflow-x-auto">
        <div className="flex items-end gap-3 min-w-[400px]" style={{ minHeight: '120px' }}>
          {data.map((month) => (
            <div key={month.label} className="flex-1 flex flex-col items-center gap-1">
              {/* Bars group */}
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: '80px' }}>
                {sources.map((src) => {
                  const count = month.counts[src] || 0;
                  const height = count > 0 ? Math.max(4, Math.round((count / maxCount) * 80)) : 0;
                  const color = TREND_SOURCE_COLORS[src] || '#6b7280';
                  return (
                    <div
                      key={src}
                      title={`${SOURCE_META[src as ContactSource]?.label ?? src}: ${count}`}
                      className="rounded-t w-4 transition-all"
                      style={{
                        height: `${height}px`,
                        backgroundColor: color,
                        opacity: count === 0 ? 0.15 : 0.9,
                        alignSelf: 'flex-end',
                      }}
                    />
                  );
                })}
              </div>
              {/* Month label */}
              <span className="text-xs text-ash-500">{month.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {sources.map((src) => (
          <div key={src} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: TREND_SOURCE_COLORS[src] || '#6b7280' }}
            />
            <span className="text-xs text-ash-400">
              {SOURCE_META[src as ContactSource]?.label ?? src}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeadScoreBadge({ score }: { score: number }) {
  const colorClass =
    score >= 70
      ? 'bg-emerald-900/30 text-emerald-400'
      : score >= 40
      ? 'bg-amber-900/30 text-amber-400'
      : 'bg-danger/20 text-danger';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {score}/100
    </span>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) {
    return (
      <span className="text-xs text-ash-400 font-medium">—</span>
    );
  }
  const up = trend > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        up
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-danger/15 text-danger'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(trend)}%
    </span>
  );
}

function ChannelCard({ stats }: { stats: ChannelStats }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{stats.icon}</span>
          <span className="font-display font-semibold text-ash-100">
            {stats.label}
          </span>
        </div>
        <TrendBadge trend={stats.trend} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-ash-500 mb-0.5">Leads</p>
          <p className="text-xl font-bold text-ash-100">{stats.totalLeads}</p>
        </div>
        <div>
          <p className="text-xs text-ash-500 mb-0.5">Total ELV</p>
          <p className="text-xl font-bold text-ash-100">
            {formatCurrency(stats.totalElv)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ash-500 mb-0.5">Avg ELV</p>
          <p className="text-xl font-bold text-flame-400">
            {formatCurrency(stats.avgElv)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-ash-500">
          {stats.leadsLast30} leads last 30 days
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ash-500">Avg Score</span>
          <LeadScoreBadge score={stats.avgScore} />
        </div>
      </div>
    </div>
  );
}

function BudgetRecommendations({ channels }: { channels: ChannelStats[] }) {
  // Need at least 1 channel with data
  if (channels.length === 0) return null;

  const topChannel = channels.reduce((best, c) =>
    c.avgElv > best.avgElv ? c : best,
  );

  // Lowest ROI channel: lowest avg ELV among channels with >= 3 leads
  const significantChannels = channels.filter((c) => c.totalLeads >= 3);
  const lowestChannel =
    significantChannels.length > 0
      ? significantChannels.reduce((worst, c) =>
          c.avgElv < worst.avgElv ? c : worst,
        )
      : null;

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-ash-100 mb-4 flex items-center gap-2">
        <span>💡</span> Budget Reallocation Recommendations
      </h3>

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-btn bg-emerald-500/8 border border-emerald-500/20">
          <span className="text-lg mt-0.5">🎯</span>
          <p className="text-sm text-ash-200">
            <span className="font-semibold text-emerald-400">Top Channel: {topChannel.label}</span>
            {' '}— {formatCurrency(topChannel.avgElv)} avg lead value. Consider increasing budget here.
          </p>
        </div>

        {lowestChannel && lowestChannel.source !== topChannel.source && (
          <div className="flex items-start gap-3 p-3 rounded-btn bg-warning/8 border border-warning/20">
            <span className="text-lg mt-0.5">⚠️</span>
            <p className="text-sm text-ash-200">
              <span className="font-semibold text-warning">Lowest ROI: {lowestChannel.label}</span>
              {' '}— {formatCurrency(lowestChannel.avgElv)} avg lead value. Review or reduce spend.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadIntelligencePage() {
  const { business, loading: authLoading } = useAuth();
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);
  const supabase = createClient();

  const [timeRange, setTimeRange] = useState<TimeRange>('30');
  const [allContacts, setAllContacts] = useState<RawContact[]>([]);
  const [markets, setMarkets] = useState<RawMarket[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contacts + markets once business is ready
  useEffect(() => {
    if (authLoading || !business?.id) return;

    let cancelled = false;
    setDataLoading(true);
    setError(null);

    async function load() {
      try {
        const [contactsRes, marketsRes] = await Promise.all([
          supabase
            .from('contacts')
            .select('id, source, elv_score, created_at, market_id, opted_email, opted_sms')
            .eq('business_id', business!.id)
            .is('deleted_at', null),
          supabase
            .from('markets')
            .select('id, name')
            .eq('business_id', business!.id),
        ]);

        if (cancelled) return;

        if (contactsRes.error) throw contactsRes.error;
        if (marketsRes.error) throw marketsRes.error;

        setAllContacts((contactsRes.data as RawContact[]) ?? []);
        setMarkets((marketsRes.data as RawMarket[]) ?? []);
      } catch (err) {
        if (!cancelled) {
          console.error('[LeadIntelligence] load error:', err);
          setError('Failed to load lead data.');
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [business?.id, authLoading]);

  const now = new Date();
  const days = parseInt(timeRange, 10);

  // Apply time-range filter
  const filteredContacts = filterByTimeRange(allContacts, days, now);

  // If a location is selected, show all contacts in the time range
  // (contacts link to markets not locations; all = no extra filter)
  const displayContacts = filteredContacts;

  const channelStats = buildChannelStats(displayContacts, now);

  // Market breakdown
  const marketMap = new Map(markets.map((m) => [m.id, m.name]));
  const marketContactsMap = new Map<string, RawContact[]>();
  for (const c of displayContacts) {
    if (c.market_id) {
      if (!marketContactsMap.has(c.market_id)) marketContactsMap.set(c.market_id, []);
      marketContactsMap.get(c.market_id)!.push(c);
    }
  }
  const marketBreakdown: MarketBreakdown[] = Array.from(marketContactsMap.entries())
    .map(([marketId, contacts]) => ({
      marketId,
      marketName: marketMap.get(marketId) ?? 'Unknown Market',
      leadCount: contacts.length,
      avgScore: avgScoreOf(contacts),
    }))
    .sort((a, b) => b.leadCount - a.leadCount);

  const totalLeads = displayContacts.length;
  const totalElv = displayContacts.reduce((sum, c) => sum + (c.elv_score ?? 0), 0);
  const overallAvgScore = avgScoreOf(displayContacts);

  const loading = authLoading || dataLoading;

  return (
    <ToolGate tool="lead-intelligence">
      <ToolPageShell
        icon="📡"
        name="Lead Intelligence"
        description="Multi-channel lead attribution with budget recommendations"
      >
        {loading ? (
          <div className="space-y-6">
            {/* 5 stat card skeletons */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
            {/* 3 channel card skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
            {/* 1 table skeleton */}
            <div className="card p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="table-row" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header row: location selector + time range */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <LocationSelector
                locations={locations}
                selectedLocation={selectedLocation}
                onSelectLocation={selectLocation}
                showAllOption={true}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-ash-500">Range:</span>
                {(['30', '60', '90'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 text-xs rounded-btn font-medium transition-colors ${
                      timeRange === r
                        ? 'bg-flame-500 text-white'
                        : 'bg-char-700 text-ash-300 hover:bg-char-600'
                    }`}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="card p-4 border-danger/30 bg-danger/8 text-danger text-sm">
                {error}
              </div>
            )}

            {/* Summary strip */}
            {!error && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-ash-500 mb-1">Total Leads</p>
                  <p className="text-2xl font-bold text-ash-100">{totalLeads}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-ash-500 mb-1">Total ELV</p>
                  <p className="text-2xl font-bold text-ash-100">{formatCurrency(totalElv)}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-ash-500 mb-1">Avg ELV / Lead</p>
                  <p className="text-2xl font-bold text-flame-400">
                    {totalLeads > 0 ? formatCurrency(totalElv / totalLeads) : '—'}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-ash-500 mb-1">Avg Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    {totalLeads > 0 ? (
                      <LeadScoreBadge score={overallAvgScore} />
                    ) : (
                      <span className="text-2xl font-bold text-ash-100">—</span>
                    )}
                  </div>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-ash-500 mb-1">Channels Active</p>
                  <p className="text-2xl font-bold text-ash-100">{channelStats.length}</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!error && channelStats.length === 0 && (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">📡</div>
                <h3 className="text-lg font-display text-ash-300 mb-2">No leads found</h3>
                <p className="text-ash-500 text-sm">
                  Contacts with a source field will appear here once added to the lead database.
                </p>
              </div>
            )}

            {/* Channel cards grid */}
            {channelStats.length > 0 && (
              <div>
                <h2 className="text-base font-display font-semibold text-ash-200 mb-3">
                  Channel Performance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channelStats.map((ch) => (
                    <ChannelCard key={ch.source} stats={ch} />
                  ))}
                </div>
              </div>
            )}

            {/* Lead trend chart */}
            {allContacts.length > 0 && (
              <LeadTrendChart contacts={allContacts} />
            )}

            {/* Budget recommendations */}
            {channelStats.length > 0 && (
              <BudgetRecommendations channels={channelStats} />
            )}

            {/* Market breakdown */}
            {marketBreakdown.length > 0 && (
              <div className="card p-6">
                <h3 className="font-display font-semibold text-ash-100 mb-4">
                  Leads by Market
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-char-700">
                        <th className="text-left text-ash-500 font-medium py-2 pr-4">Market</th>
                        <th className="text-right text-ash-500 font-medium py-2">Leads</th>
                        <th className="text-right text-ash-500 font-medium py-2 pl-4">Share</th>
                        <th className="text-right text-ash-500 font-medium py-2 pl-4">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketBreakdown.map((row) => (
                        <tr
                          key={row.marketId}
                          className="border-b border-char-800 hover:bg-char-800/50 transition-colors"
                        >
                          <td className="py-2 pr-4 text-ash-200">{row.marketName}</td>
                          <td className="py-2 text-right font-medium text-ash-100">
                            {row.leadCount}
                          </td>
                          <td className="py-2 pl-4 text-right text-ash-400">
                            {totalLeads > 0
                              ? `${Math.round((row.leadCount / totalLeads) * 100)}%`
                              : '—'}
                          </td>
                          <td className="py-2 pl-4 text-right">
                            <LeadScoreBadge score={row.avgScore} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </ToolPageShell>
    </ToolGate>
  );
}
