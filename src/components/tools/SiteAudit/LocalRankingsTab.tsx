'use client';

import type { JSX } from 'react';
import { useMemo } from 'react';
import type { TabProps, MarketKeywordItem, MarketData } from './types';
import { DataTable } from './shared/DataTable';
import { StatGrid } from './shared/StatGrid';
import { shortUrl } from '@/lib/siteAudit/utils';

interface KeywordRow {
  keyword: string;
  position: number;
  url: string;
  market: string;
  mapsRank: number | 'NF' | null;
  _isCannibalized: boolean;
  serpFeatures: string[];
}

// ─── SERP Feature Badges ─────────────────────────────────────────────

const SERP_FEATURE_META: Record<string, { label: string; icon: string; color: string }> = {
  local_pack:       { label: 'Local Pack',         icon: '📍', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  maps:             { label: 'Local Pack',         icon: '📍', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  featured_snippet: { label: 'Featured Snippet',  icon: '⭐', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  ai_overview:      { label: 'AI Overview',        icon: '⭐', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  people_also_ask:  { label: 'PAA',                icon: '💬', color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  images:           { label: 'Images',             icon: '🖼', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
};

// Canonical feature key to avoid showing duplicates (e.g. maps = local_pack)
const FEATURE_CANONICAL: Record<string, string> = { maps: 'local_pack', ai_overview: 'featured_snippet' };

function SerpFeatureBadges({ features, position }: { features: string[]; position: number }) {
  const seen = new Set<string>();
  const rendered: JSX.Element[] = [];

  for (const f of features) {
    const key = FEATURE_CANONICAL[f] ?? f;
    const meta = SERP_FEATURE_META[key];
    if (!meta || seen.has(key)) continue;
    seen.add(key);
    rendered.push(
      <span
        key={key}
        title={meta.label}
        className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border ${meta.color}`}
      >
        {meta.icon} {meta.label}
      </span>
    );
  }

  if (rendered.length === 0) return null;

  const hasLocalPack = features.some(f => f === 'local_pack' || f === 'maps');
  const notTop3 = position === 0 || position > 3;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {rendered}
      {hasLocalPack && notTop3 && (
        <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border bg-flame-500/15 text-flame-400 border-flame-500/20">
          GBP optimization priority
        </span>
      )}
    </div>
  );
}

interface CannibalizationWarning {
  keyword: string;
  market: string;
  urls: string[];
}

function positionColorClass(pos: number): string {
  if (pos === 1) return 'text-yellow-400';
  if (pos <= 3) return 'text-success';
  if (pos <= 10) return 'text-blue-400';
  if (pos <= 20) return 'text-ash-400';
  return 'text-danger';
}

export default function LocalRankingsTab({ results }: TabProps) {
  const keywordsData = results.crawlData.keywords;

  // Process raw market data into flat keyword rows
  const { rows, cannibalizationWarnings, marketCount } = useMemo(() => {
    if (!keywordsData?.markets) {
      return { rows: [] as KeywordRow[], cannibalizationWarnings: [] as CannibalizationWarning[], marketCount: 0 };
    }

    const markets = keywordsData.markets;
    const allRows: KeywordRow[] = [];
    const cannWarnings: CannibalizationWarning[] = [];
    const cannMap = new Map<string, CannibalizationWarning>();

    for (const [marketName, marketData] of Object.entries(markets)) {
      const items = marketData.items || [];
      for (const item of items) {
        const kw = item.keyword_data?.keyword || '';
        const pos = item.ranked_serp_element?.serp_item?.rank_group ?? 0;
        const url = item.ranked_serp_element?.serp_item?.url || '';
        const mapsRank = item._mapsRank ?? null;

        allRows.push({
          keyword: kw,
          position: pos,
          url,
          market: marketName,
          mapsRank,
          _isCannibalized: !!item._isCannibalized,
          serpFeatures: item.serp_item_types ?? [],
        });

        // Track cannibalization
        if (item._isCannibalized) {
          const key = `${kw}::${marketName}`;
          if (!cannMap.has(key)) {
            cannMap.set(key, { keyword: kw, market: marketName, urls: [url] });
          } else {
            const existing = cannMap.get(key)!;
            if (!existing.urls.includes(url)) {
              existing.urls.push(url);
            }
          }
        }
      }
    }

    // Sort by position ascending
    allRows.sort((a, b) => a.position - b.position);

    return {
      rows: allRows,
      cannibalizationWarnings: Array.from(cannMap.values()).filter((w) => w.urls.length > 1),
      marketCount: Object.keys(markets).length,
    };
  }, [keywordsData]);

  // Empty state
  if (!keywordsData || !keywordsData.markets || rows.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-display text-ash-300 mb-2">No Keyword Data Available</h3>
        <p className="text-ash-400">
          Local keyword rankings will appear here once keyword data has been collected.
          This requires business detection and market discovery during the crawl.
        </p>
      </div>
    );
  }

  const page1Rankings = rows.filter((r) => r.position >= 1 && r.position <= 10).length;
  const page2Opportunities = rows.filter((r) => r.position >= 11 && r.position <= 20).length;

  const columns = [
    {
      key: 'keyword',
      label: 'Keyword',
      sortable: true,
      render: (row: KeywordRow) => (
        <div>
          <span className="text-ash-100 text-sm font-medium">{row.keyword}</span>
          {row.serpFeatures.length > 0 && (
            <SerpFeatureBadges features={row.serpFeatures} position={row.position} />
          )}
        </div>
      ),
    },
    {
      key: 'position',
      label: 'Position',
      sortable: true,
      render: (row: KeywordRow) => (
        <span className={`font-display font-bold ${positionColorClass(row.position)}`}>
          #{row.position}
        </span>
      ),
    },
    {
      key: 'url',
      label: 'URL',
      sortable: true,
      render: (row: KeywordRow) => (
        <span className="font-mono text-xs text-ash-300" title={row.url}>
          {shortUrl(row.url)}
        </span>
      ),
    },
    {
      key: 'market',
      label: 'Market',
      sortable: true,
      render: (row: KeywordRow) => (
        <span className="text-ash-300 text-sm">{row.market}</span>
      ),
    },
    {
      key: 'mapsRank',
      label: 'Maps Rank',
      sortable: true,
      render: (row: KeywordRow) => {
        if (row.mapsRank == null) return <span className="text-ash-500">---</span>;
        if (row.mapsRank === 'NF') return <span className="text-ash-500">NF</span>;
        return (
          <span className={row.mapsRank <= 3 ? 'text-success font-display' : 'text-ash-300'}>
            #{row.mapsRank}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">Ranking Overview</h3>
        <StatGrid
          stats={[
            { value: rows.length, label: 'Total Ranking Keywords' },
            { value: page1Rankings, label: 'Page 1 Rankings (1-10)' },
            {
              value: page2Opportunities,
              label: 'Page 2 Opportunities (11-20)',
              sublabel: 'Close to page 1',
            },
            { value: marketCount, label: 'Markets Tracked' },
          ]}
        />
      </section>

      {/* Keyword Table */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">All Rankings</h3>
        <div className="card p-4">
          <DataTable
            data={rows}
            columns={columns}
            searchable
            searchKeys={['keyword', 'url', 'market']}
            pageSize={25}
            emptyMessage="No keyword rankings found"
          />
        </div>
      </section>

      {/* Cannibalization Warnings */}
      {cannibalizationWarnings.length > 0 && (
        <section>
          <h3 className="text-lg font-display text-danger mb-4">
            Cannibalization Warnings
            <span className="text-sm text-ash-400 font-normal ml-2">
              {cannibalizationWarnings.length} conflicts
            </span>
          </h3>
          <div className="space-y-3">
            {cannibalizationWarnings.map((warning, i) => (
              <div key={i} className="card p-4 border-l-4 border-l-danger">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-sm text-ash-100 font-medium mb-1">
                      &quot;{warning.keyword}&quot;
                      <span className="text-ash-500 ml-2">in {warning.market}</span>
                    </div>
                    <div className="text-xs text-ash-400 mb-2">
                      Multiple pages competing for the same keyword:
                    </div>
                    <div className="space-y-1">
                      {warning.urls.map((url, j) => (
                        <div key={j} className="font-mono text-xs text-warning">
                          {shortUrl(url)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
