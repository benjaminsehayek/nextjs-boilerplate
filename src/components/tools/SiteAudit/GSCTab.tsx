'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { useGSCConnection } from '@/lib/hooks/useGSCConnection';
import type { GSCRow } from '@/lib/siteAudit/cannibalizationDetection';
import type { TabProps } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function fmtPos(n: number): string {
  return n.toFixed(1);
}

/** Truncate a URL path to something readable */
function shortPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    if (path.length <= 50) return path || '/';
    return path.slice(0, 47) + '...';
  } catch {
    return url.length <= 50 ? url : url.slice(0, 47) + '...';
  }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-6 space-y-3">
          <div className="h-5 bg-char-700 rounded w-1/3 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-20 bg-char-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── GSC-06: Organic Summary Card ────────────────────────────────────────────

interface OrganicSummaryProps {
  rows: GSCRow[];
}

function OrganicSummaryCard({ rows }: OrganicSummaryProps) {
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);

  // Weighted-average position (weight by clicks; fall back to impressions if clicks=0)
  const weightedPos = useMemo(() => {
    const weightedSum = rows.reduce((s, r) => s + r.position * (r.clicks || r.impressions), 0);
    const totalWeight = rows.reduce((s, r) => s + (r.clicks || r.impressions), 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }, [rows]);

  // Top 5 pages by clicks
  const topPages = useMemo(() => {
    const pageMap = new Map<string, { clicks: number; impressions: number }>();
    for (const row of rows) {
      const page = row.keys[1] ?? '';
      const prev = pageMap.get(page) ?? { clicks: 0, impressions: 0 };
      pageMap.set(page, {
        clicks: prev.clicks + row.clicks,
        impressions: prev.impressions + row.impressions,
      });
    }
    return [...pageMap.entries()]
      .sort((a, b) => b[1].clicks - a[1].clicks)
      .slice(0, 5);
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg mb-1">Organic Search Performance</h3>
        <p className="text-xs text-ash-500 mb-4">
          Google Search Console · Last 90 days · {fmtN(rows.length)} query/page combinations
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-ash-100">{fmtN(totalClicks)}</div>
          <div className="text-xs text-ash-400 mt-1">Total Clicks (90d)</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-blue-400">{fmtN(totalImpressions)}</div>
          <div className="text-xs text-ash-400 mt-1">Total Impressions (90d)</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-yellow-400">{fmtPos(weightedPos)}</div>
          <div className="text-xs text-ash-400 mt-1">Avg Position (weighted)</div>
        </div>
      </div>

      {/* Top 5 pages by clicks */}
      {topPages.length > 0 && (
        <div className="card p-4">
          <div className="text-xs text-ash-500 uppercase font-display mb-3">Top Pages by Clicks</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-char-700">
                  <th className="text-left text-xs text-ash-500 font-display pb-2">Page</th>
                  <th className="text-right text-xs text-ash-500 font-display pb-2 pl-4">Clicks</th>
                  <th className="text-right text-xs text-ash-500 font-display pb-2 pl-4">Impressions</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map(([page, stats]) => (
                  <tr key={page} className="border-b border-char-800 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="font-mono text-xs text-ash-300 truncate block max-w-xs">
                        {shortPath(page)}
                      </span>
                    </td>
                    <td className="text-right py-2 pl-4 text-ash-200 font-display tabular-nums">
                      {fmtN(stats.clicks)}
                    </td>
                    <td className="text-right py-2 pl-4 text-ash-400 tabular-nums">
                      {fmtN(stats.impressions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GSC-07: Quick Wins — Rankings to Improve ────────────────────────────────

interface QuickWinsGSCProps {
  rows: GSCRow[];
}

function QuickWinsGSC({ rows }: QuickWinsGSCProps) {
  // Rows where position 4–10 AND impressions >= 50
  const quickWinRows = useMemo(
    () =>
      rows
        .filter((r) => r.position >= 4 && r.position <= 10 && r.impressions >= 50)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10),
    [rows]
  );

  if (quickWinRows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg mb-1">Quick Wins — Rankings to Improve</h3>
        <p className="text-xs text-ash-500 mb-1">
          These pages rank on page 1 but not top 3 — a small improvement = big traffic gain
        </p>
        <p className="text-xs text-ash-600">
          Showing top {quickWinRows.length} queries · position 4–10 · 50+ impressions
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-char-700 bg-char-900">
                <th className="text-left text-xs text-ash-500 font-display px-4 py-2.5">Query</th>
                <th className="text-left text-xs text-ash-500 font-display px-4 py-2.5">Page</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">Position</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">Impressions</th>
              </tr>
            </thead>
            <tbody>
              {quickWinRows.map((row, i) => {
                const query = row.keys[0] ?? '';
                const page = row.keys[1] ?? '';
                return (
                  <tr key={i} className="border-b border-char-800 last:border-0 hover:bg-char-800/50 transition-colors">
                    <td className="px-4 py-2.5 max-w-xs">
                      <span className="text-ash-200 text-xs">{query}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <span className="font-mono text-xs text-ash-400 truncate block">
                        {shortPath(page)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-yellow-400 font-display tabular-nums">
                        {fmtPos(row.position)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-ash-300 tabular-nums">
                        {fmtN(row.impressions)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── GSC-08: Low CTR Page Report ─────────────────────────────────────────────

interface LowCTRProps {
  rows: GSCRow[];
}

interface PageCTRAggregate {
  page: string;
  clicks: number;
  impressions: number;
  avgPosition: number;
  avgCTR: number;
}

function LowCTRReport({ rows }: LowCTRProps) {
  // Filter: position <= 10 AND ctr <= 0.01 (1%)
  const lowCTRRows = useMemo(
    () => rows.filter((r) => r.position <= 10 && r.ctr <= 0.01),
    [rows]
  );

  // Group by page — aggregate clicks, impressions, avg position, avg ctr
  const pageAggregates = useMemo((): PageCTRAggregate[] => {
    const pageMap = new Map<
      string,
      { clicks: number; impressions: number; positionSum: number; ctrSum: number; count: number }
    >();

    for (const row of lowCTRRows) {
      const page = row.keys[1] ?? '';
      const prev = pageMap.get(page) ?? {
        clicks: 0,
        impressions: 0,
        positionSum: 0,
        ctrSum: 0,
        count: 0,
      };
      pageMap.set(page, {
        clicks: prev.clicks + row.clicks,
        impressions: prev.impressions + row.impressions,
        positionSum: prev.positionSum + row.position,
        ctrSum: prev.ctrSum + row.ctr,
        count: prev.count + 1,
      });
    }

    return [...pageMap.entries()]
      .map(([page, d]) => ({
        page,
        clicks: d.clicks,
        impressions: d.impressions,
        avgPosition: d.positionSum / d.count,
        avgCTR: d.ctrSum / d.count,
      }))
      .filter((p) => p.impressions >= 20)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15);
  }, [lowCTRRows]);

  if (pageAggregates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg mb-1">Low Click-Through Rate Pages</h3>
        <p className="text-xs text-ash-500 mb-1">
          Pages in top 10 with CTR &le; 1% — update title &amp; meta description to improve clicks
        </p>
        <p className="text-xs text-ash-600">
          Showing top {pageAggregates.length} pages sorted by impressions
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-char-700 bg-char-900">
                <th className="text-left text-xs text-ash-500 font-display px-4 py-2.5">Page Path</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">Avg Position</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">Impressions</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">CTR</th>
                <th className="text-left text-xs text-ash-500 font-display px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageAggregates.map((p) => (
                <tr
                  key={p.page}
                  className="border-b border-char-800 last:border-0 hover:bg-char-800/50 transition-colors"
                >
                  <td className="px-4 py-2.5 max-w-xs">
                    <span className="font-mono text-xs text-ash-300 truncate block">
                      {shortPath(p.page)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-blue-400 font-display tabular-nums">
                      {fmtPos(p.avgPosition)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ash-300">
                    {fmtN(p.impressions)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-danger font-display tabular-nums">
                      {fmtPct(p.avgCTR)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] bg-warning/10 text-warning border border-warning/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Update title/meta description
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── GSC-09: Local Query Spotlight ───────────────────────────────────────────

interface LocalSpotlightProps {
  rows: GSCRow[];
  cities: string[];
}

function LocalQuerySpotlight({ rows, cities }: LocalSpotlightProps) {
  const localRows = useMemo(() => {
    const cityLower = cities.map((c) => c.toLowerCase().trim()).filter(Boolean);
    return rows
      .filter((r) => {
        const q = (r.keys[0] ?? '').toLowerCase();
        if (q.includes('near me')) return true;
        return cityLower.some((city) => q.includes(city));
      })
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);
  }, [rows, cities]);

  if (localRows.length === 0) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="font-display text-lg mb-1">Local Search Queries</h3>
          <p className="text-xs text-ash-500">
            No local queries found in GSC data.
            {cities.length === 0
              ? ' Add business locations in Settings to enable local query detection.'
              : ` Checked for: ${cities.slice(0, 5).join(', ')}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg mb-1">Local Search Queries</h3>
        <p className="text-xs text-ash-500 mb-1">
          Highest-priority local SEO opportunities — queries mentioning your market cities or "near me"
        </p>
        {cities.length > 0 && (
          <p className="text-xs text-ash-600">
            Matching cities: {cities.slice(0, 6).join(', ')}
            {cities.length > 6 ? ` +${cities.length - 6} more` : ''}
          </p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-char-700 bg-char-900">
                <th className="text-left text-xs text-ash-500 font-display px-4 py-2.5">Query</th>
                <th className="text-left text-xs text-ash-500 font-display px-4 py-2.5">Page</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">Position</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">Impressions</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">Clicks</th>
                <th className="text-right text-xs text-ash-500 font-display px-4 py-2.5">CTR</th>
              </tr>
            </thead>
            <tbody>
              {localRows.map((row, i) => {
                const query = row.keys[0] ?? '';
                const page = row.keys[1] ?? '';
                const isNearMe = query.toLowerCase().includes('near me');
                return (
                  <tr
                    key={i}
                    className="border-b border-char-800 last:border-0 hover:bg-char-800/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 max-w-xs">
                      <span className="text-ash-200 text-xs">{query}</span>
                      {isNearMe && (
                        <span className="ml-2 text-[10px] bg-success/10 text-success border border-success/30 px-1.5 py-0.5 rounded-full">
                          near me
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <span className="font-mono text-xs text-ash-400 truncate block">
                        {shortPath(page)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={
                          'font-display tabular-nums ' +
                          (row.position <= 3
                            ? 'text-success'
                            : row.position <= 10
                            ? 'text-yellow-400'
                            : 'text-ash-400')
                        }
                      >
                        {fmtPos(row.position)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ash-300">
                      {fmtN(row.impressions)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ash-300">
                      {fmtN(row.clicks)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ash-400">
                      {fmtPct(row.ctr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main GSC Tab ─────────────────────────────────────────────────────────────

export default function GSCTab({ results }: TabProps) {
  const { business } = useAuth();
  const { connection: gscConnection, loading: gscConnLoading } = useGSCConnection(business?.id);

  const [rows, setRows] = useState<GSCRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  // Cities from crawlData.markets (parsed from "City,State,Country" strings) and business locations
  const cities = useMemo(() => {
    const citySet = new Set<string>();

    // From crawl markets: "City,State,Country"
    const markets = results.crawlData.markets ?? [];
    for (const m of markets) {
      const city = m.split(',')[0]?.trim();
      if (city) citySet.add(city);
    }

    // From detected business
    const biz = results.crawlData.business;
    if (biz?.city) citySet.add(biz.city);

    return [...citySet].filter(Boolean);
  }, [results.crawlData.markets, results.crawlData.business]);

  useEffect(() => {
    if (!gscConnection?.connected || !business?.id || fetched) return;
    setLoading(true);
    setError(null);

    fetch('/api/gsc/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id }),
    })
      .then((r) => r.json().then((json) => {
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
        return json;
      }))
      .then((data: { rows: GSCRow[] }) => {
        setRows(data.rows || []);
        setFetched(true);
      })
      .catch((e: Error) => {
        setError(e.message || 'Failed to load GSC data');
        setFetched(true);
      })
      .finally(() => setLoading(false));
  }, [gscConnection?.connected, business?.id, fetched]);

  // Loading connection status
  if (gscConnLoading) {
    return <Skeleton />;
  }

  // Not connected
  if (!gscConnection?.connected) {
    return (
      <div className="card p-12 text-center space-y-4">
        <div className="text-4xl">📊</div>
        <h3 className="font-display text-lg text-ash-200">Connect GSC to see organic data</h3>
        <p className="text-sm text-ash-400 max-w-md mx-auto">
          Google Search Console shows real query data — clicks, impressions, position, and CTR
          for every page. Connect it to unlock organic insights here.
        </p>
        <Link
          href="/settings?tab=integrations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-flame-500 hover:bg-flame-400 text-white rounded-full text-sm font-display transition-colors"
        >
          Connect GSC in Settings
        </Link>
      </div>
    );
  }

  // Fetching data
  if (loading) {
    return <Skeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="text-3xl">⚠️</div>
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={() => { setFetched(false); setError(null); }}
          className="btn-ghost text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // No rows returned (connected but no data yet)
  if (fetched && rows.length === 0) {
    return (
      <div className="card p-12 text-center space-y-3">
        <div className="text-4xl">📭</div>
        <h3 className="font-display text-lg text-ash-200">No GSC data yet</h3>
        <p className="text-sm text-ash-400 max-w-md mx-auto">
          GSC is connected but returned no rows for the last 90 days. This can happen if the
          property was recently added or the site has very low search traffic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* GSC-06: Organic Summary */}
      <OrganicSummaryCard rows={rows} />

      {/* Divider */}
      <div className="border-t border-char-700" />

      {/* GSC-07: Quick Wins */}
      <QuickWinsGSC rows={rows} />

      {/* GSC-08: Low CTR */}
      <LowCTRReport rows={rows} />

      {/* GSC-09: Local Spotlight */}
      <div className="border-t border-char-700" />
      <LocalQuerySpotlight rows={rows} cities={cities} />

      {/* Footer note */}
      <p className="text-xs text-ash-600 text-center pb-2">
        Data from Google Search Console · Last 90 days · {fmtN(rows.length)} total rows
      </p>
    </div>
  );
}
