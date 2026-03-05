'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Keyword } from './types';

interface GSCRow {
  keys: string[]; // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCTrafficEntry {
  clicks: number;
  avgPosition: number;
}

interface SuggestedKeyword {
  query: string;
  impressions: number;
}

interface GSCInsightsProps {
  businessId: string;
  scanKeywords: Keyword[];
  /** Called when user wants to start a new scan for a suggested keyword */
  onSuggestKeyword?: (keyword: string) => void;
}

export function GSCInsights({ businessId, scanKeywords, onSuggestKeyword }: GSCInsightsProps) {
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

  // Build query → {clicks, avgPosition} map (aggregate across pages)
  const gscMap = useMemo((): Map<string, GSCTrafficEntry> => {
    const map = new Map<string, { totalClicks: number; weightedPos: number; totalImpressions: number }>();
    for (const row of rows) {
      const query = (row.keys[0] ?? '').toLowerCase();
      if (!query) continue;
      const prev = map.get(query) ?? { totalClicks: 0, weightedPos: 0, totalImpressions: 0 };
      map.set(query, {
        totalClicks: prev.totalClicks + row.clicks,
        weightedPos: prev.weightedPos + row.position * (row.impressions || 1),
        totalImpressions: prev.totalImpressions + (row.impressions || 1),
      });
    }

    const result = new Map<string, GSCTrafficEntry>();
    for (const [query, v] of map.entries()) {
      result.set(query, {
        clicks: v.totalClicks,
        avgPosition: v.totalImpressions > 0 ? v.weightedPos / v.totalImpressions : 0,
      });
    }
    return result;
  }, [rows]);

  // Build impressions-only map (query → total impressions) for suggestions
  const impressionsMap = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const query = (row.keys[0] ?? '').toLowerCase();
      if (!query) continue;
      map.set(query, (map.get(query) ?? 0) + (row.impressions || 0));
    }
    return map;
  }, [rows]);

  // Tracked keyword texts (lowercased) for quick lookup
  const trackedSet = useMemo(
    () => new Set(scanKeywords.map((k) => k.text.toLowerCase())),
    [scanKeywords],
  );

  // GSC-15: Suggested keywords — >= 50 impressions, not already tracked
  const suggestedKeywords = useMemo((): SuggestedKeyword[] => {
    return [...impressionsMap.entries()]
      .filter(([query, impressions]) => impressions >= 50 && !trackedSet.has(query))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, impressions]) => ({ query, impressions }));
  }, [impressionsMap, trackedSet]);

  if (notConnected) {
    return (
      <div className="card p-5 bg-char-900/40 border border-char-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-medium text-ash-200">
              Connect Google Search Console to unlock GSC Traffic insights
            </p>
            <p className="text-xs text-ash-400 mt-0.5">
              See clicks and avg position for each keyword next to your grid scan results.
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
      <div className="card p-5 animate-pulse">
        <div className="h-4 w-40 bg-char-700 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-char-700 rounded" />
          ))}
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

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* GSC-14: Traffic column card */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-1">GSC Traffic by Keyword</h3>
        <p className="text-xs text-ash-500 mb-4">
          Google Search Console clicks + avg position for scanned keywords · Last 90 days
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-char-700">
                <th className="text-left text-ash-500 font-medium py-2 pr-4">Keyword</th>
                <th className="text-right text-ash-500 font-medium py-2 px-3">Clicks</th>
                <th className="text-right text-ash-500 font-medium py-2 px-3">Avg Position</th>
                <th className="text-right text-ash-500 font-medium py-2 pl-3">Impressions</th>
              </tr>
            </thead>
            <tbody>
              {scanKeywords.map((kw) => {
                const entry = gscMap.get(kw.text.toLowerCase());
                const impressions = impressionsMap.get(kw.text.toLowerCase()) ?? 0;
                return (
                  <tr key={kw.id} className="border-b border-char-800 hover:bg-char-900/30">
                    <td className="py-2.5 pr-4 font-medium text-ash-200">{kw.text}</td>
                    <td className="py-2.5 px-3 text-right">
                      {entry ? (
                        <span className="text-green-400 font-medium">{entry.clicks}</span>
                      ) : (
                        <span className="text-ash-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {entry && entry.avgPosition > 0 ? (
                        <span className={
                          entry.avgPosition <= 3
                            ? 'text-emerald-400'
                            : entry.avgPosition <= 10
                            ? 'text-yellow-400'
                            : 'text-ash-400'
                        }>
                          #{entry.avgPosition.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-ash-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-ash-400">
                      {impressions > 0 ? impressions.toLocaleString() : <span className="text-ash-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GSC-15: Suggested keywords */}
      {suggestedKeywords.length > 0 && (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-display mb-1">Suggested Keywords</h3>
              <p className="text-xs text-ash-500">
                {suggestedKeywords.length} high-traffic {suggestedKeywords.length === 1 ? 'query' : 'queries'} not yet tracked in grid scans
                (≥ 50 impressions in GSC)
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {suggestedKeywords.map(({ query, impressions }) => (
              <div
                key={query}
                className="flex items-center justify-between p-3 bg-char-900/30 rounded-lg hover:bg-char-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ash-200">{query}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    {impressions.toLocaleString()} impressions
                  </span>
                </div>
                {onSuggestKeyword && (
                  <button
                    onClick={() => onSuggestKeyword(query)}
                    className="text-xs px-3 py-1.5 rounded-btn bg-flame-500/20 text-flame-400 hover:bg-flame-500/30 transition-colors whitespace-nowrap"
                    title="Start a new grid scan for this keyword"
                  >
                    + Track in Grid
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight inline badge for the All Keywords Summary table.
 * Reads from an already-fetched gscMap instead of fetching again.
 */
interface GSCBadgeProps {
  keyword: string;
  gscMap: Map<string, GSCTrafficEntry>;
}

export function GSCBadge({ keyword, gscMap }: GSCBadgeProps) {
  const entry = gscMap.get(keyword.toLowerCase());
  if (!entry) return <span className="text-ash-600 text-xs">—</span>;

  return (
    <span className="text-xs text-ash-300 whitespace-nowrap">
      <span className="text-green-400 font-medium">{entry.clicks} clicks</span>
      {entry.avgPosition > 0 && (
        <span className="text-ash-500"> · pos {entry.avgPosition.toFixed(1)}</span>
      )}
    </span>
  );
}
