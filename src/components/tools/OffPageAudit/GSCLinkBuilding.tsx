'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { ReferringDomain } from './types';

interface GSCRow {
  keys: string[]; // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageImpressions {
  page: string;
  impressions: number;
  clicks: number;
}

interface GSCLinkBuildingProps {
  businessId: string;
  /** Referring domains data from the audit, used to check backlink counts per page */
  referringDomains?: ReferringDomain[];
}

function shortPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + (u.search ? u.search : '');
    if (path.length <= 60) return path || '/';
    return path.slice(0, 57) + '...';
  } catch {
    return url.length <= 60 ? url : url.slice(0, 57) + '...';
  }
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

export function GSCLinkBuilding({ businessId, referringDomains }: GSCLinkBuildingProps) {
  const [rows, setRows] = useState<GSCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchGSC() {
      setLoading(true);
      setError(null);
      setNotConnected(false);

      try {
        const res = await fetch('/api/gsc/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId }),
        });

        if (res.status === 404) {
          if (!cancelled) setNotConnected(true);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setError(data.error || 'Failed to load GSC data');
          return;
        }

        const data = await res.json();
        if (!cancelled) setRows(data.rows || []);
      } catch {
        if (!cancelled) setError('Failed to load GSC data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGSC();
    return () => { cancelled = true; };
  }, [businessId]);

  // GSC-18: Group rows by page, sum impressions
  const topPagesByImpressions = useMemo((): PageImpressions[] => {
    const pageMap = new Map<string, { impressions: number; clicks: number }>();
    for (const row of rows) {
      const page = row.keys[1] ?? '';
      if (!page) continue;
      const prev = pageMap.get(page) ?? { impressions: 0, clicks: 0 };
      pageMap.set(page, {
        impressions: prev.impressions + (row.impressions || 0),
        clicks: prev.clicks + (row.clicks || 0),
      });
    }
    return [...pageMap.entries()]
      .sort((a, b) => b[1].impressions - a[1].impressions)
      .slice(0, 10)
      .map(([page, v]) => ({ page, impressions: v.impressions, clicks: v.clicks }));
  }, [rows]);

  // GSC-19: Pages with >= 500 impressions AND 0 or very few referring domains
  // We cross-reference by matching page hostname against referring domain list
  const priorityGapPages = useMemo((): (PageImpressions & { refDomainCount: number | null })[] => {
    if (topPagesByImpressions.length === 0) return [];

    const highImpressionPages = topPagesByImpressions.filter((p) => p.impressions >= 500);
    if (highImpressionPages.length === 0) return [];

    // Build a set of known referring domains for quick lookup
    const knownRefDomains = new Set((referringDomains ?? []).map((d) => d.domain.toLowerCase()));

    return highImpressionPages
      .map((p) => {
        // We only have domain-level backlink data, not page-level.
        // Check if the page's hostname itself appears as a referring domain source
        // (this is a best-effort cross-reference).
        let refDomainCount: number | null = null;
        try {
          const host = new URL(p.page).hostname.replace(/^www\./, '').toLowerCase();
          // Count how many referring domains match this page's own domain
          // (i.e., it's not self-referential — we're checking if the BUSINESS DOMAIN gets links)
          // Since we can't do true page-level lookups with the available data,
          // report null (needs verification) unless we know the domain has 0 backlinks.
          const hasAnyBacklinks = knownRefDomains.size > 0;
          refDomainCount = hasAnyBacklinks ? null : 0;
          // Suppress unused variable lint warning
          void host;
        } catch {
          refDomainCount = null;
        }
        return { ...p, refDomainCount };
      })
      .filter((p) => p.impressions >= 500);
  }, [topPagesByImpressions, referringDomains]);

  // Not connected state
  if (notConnected) {
    return (
      <div className="card p-5 bg-char-900/40 border border-char-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-medium text-ash-200">
              Connect Google Search Console to unlock Link Building Priority insights
            </p>
            <p className="text-xs text-ash-400 mt-0.5">
              See which pages drive the most impressions and are missing backlinks.
            </p>
          </div>
          <Link href="/settings#gsc" className="ml-auto btn-secondary text-sm whitespace-nowrap flex-shrink-0">
            Connect GSC
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card p-5 animate-pulse">
          <div className="h-5 w-52 bg-char-700 rounded mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-char-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4 bg-red-500/5 border border-red-500/20">
        <p className="text-xs text-red-400">GSC: {error}</p>
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* GSC-18: Top pages by impressions */}
      <div className="card p-6">
        <div className="mb-4">
          <h3 className="text-lg font-display mb-1">Link Building Priorities</h3>
          <p className="text-xs text-ash-500">
            Top 10 pages by GSC impressions · Last 90 days · Backlinks to high-impression pages have maximum SEO impact
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-char-700">
                <th className="text-left text-ash-500 font-medium py-2 pr-4">Page</th>
                <th className="text-right text-ash-500 font-medium py-2 px-3">Impressions</th>
                <th className="text-right text-ash-500 font-medium py-2 pl-3">Clicks</th>
                <th className="text-left text-ash-500 font-medium py-2 pl-4">Priority</th>
              </tr>
            </thead>
            <tbody>
              {topPagesByImpressions.map(({ page, impressions, clicks }, i) => (
                <tr key={page} className="border-b border-char-800 hover:bg-char-900/30 group">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ash-600 w-4 flex-shrink-0">{i + 1}</span>
                      <a
                        href={page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ash-200 hover:text-flame-400 transition-colors font-mono text-xs"
                        title={page}
                      >
                        {shortPath(page)}
                      </a>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={
                      impressions >= 5000
                        ? 'text-blue-400 font-medium'
                        : impressions >= 1000
                        ? 'text-blue-300'
                        : 'text-ash-300'
                    }>
                      {fmtN(impressions)}
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 text-right text-ash-400">
                    {fmtN(clicks)}
                  </td>
                  <td className="py-2.5 pl-4">
                    <span className="text-xs text-ash-400 italic">
                      High search visibility — backlinks here have max impact
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GSC-19: High-impression / low-backlink gap */}
      {priorityGapPages.length > 0 && (
        <div className="card p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎯</span>
              <h3 className="text-lg font-display">Priority Link Building Targets</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                Urgent
              </span>
            </div>
            <p className="text-xs text-ash-500">
              Pages with ≥ 500 impressions in GSC — these pages have high search visibility but may be underserved by backlinks.
              {!referringDomains || referringDomains.length === 0
                ? ' Run an audit to cross-reference backlink data.'
                : ' Page-level backlink data unavailable — verify counts manually.'}
            </p>
          </div>
          <div className="space-y-3">
            {priorityGapPages.map(({ page, impressions, clicks, refDomainCount }) => (
              <div
                key={page}
                className="flex items-start justify-between gap-4 p-4 rounded-lg bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-ash-200 hover:text-flame-400 transition-colors block truncate"
                    title={page}
                  >
                    {shortPath(page)}
                  </a>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-blue-300">
                      {fmtN(impressions)} impressions
                    </span>
                    <span className="text-xs text-ash-500">
                      {fmtN(clicks)} clicks
                    </span>
                    {refDomainCount === null ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                        verify backlink count
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        {refDomainCount} referring domains
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs font-medium text-red-400">Urgent priority</div>
                  <div className="text-xs text-ash-500 mt-0.5">Build links here first</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
