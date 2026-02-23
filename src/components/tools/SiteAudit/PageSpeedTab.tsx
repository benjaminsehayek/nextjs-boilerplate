'use client';

import { useMemo } from 'react';
import type { TabProps } from './types';
import { DataTable } from './shared/DataTable';
import { StatGrid } from './shared/StatGrid';
import { shortUrl, scoreColorClass } from '@/lib/siteAudit/utils';

const LH_CWV_AUDITS = [
  { key: 'first-contentful-paint', label: 'First Contentful Paint' },
  { key: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
  { key: 'total-blocking-time', label: 'Total Blocking Time' },
  { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
  { key: 'speed-index', label: 'Speed Index' },
  { key: 'interactive', label: 'Time to Interactive' },
] as const;

const PSI_OPPORTUNITY_AUDITS: Array<{ key: string; label: string }> = [
  { key: 'server-response-time', label: 'Server Response Time' },
  { key: 'render-blocking-resources', label: 'Render-Blocking Resources' },
  { key: 'uses-optimized-images', label: 'Unoptimized Images' },
  { key: 'uses-webp-images', label: 'Next-Gen Image Formats' },
  { key: 'uses-text-compression', label: 'Text Compression' },
  { key: 'uses-long-cache-ttl', label: 'Cache Policy' },
];

function timeColorClass(ms: number): string {
  if (ms < 1000) return 'text-success';
  if (ms <= 3000) return 'text-warning';
  return 'text-danger';
}

function cruxColorClass(category?: string): string {
  if (category === 'FAST') return 'text-success';
  if (category === 'AVERAGE') return 'text-warning';
  if (category === 'SLOW') return 'text-danger';
  return 'text-ash-400';
}

function cruxLabel(category?: string): string {
  if (!category || category === 'NONE') return 'No data';
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  return (
    <div className="card p-5 text-center">
      <div className={`text-4xl font-display ${scoreColorClass(score)}`}>{score}</div>
      <div className="text-sm text-ash-300 mt-2">{label}</div>
    </div>
  );
}

interface PageTimingRow {
  url: string;
  duration_time: number;
  waiting_time: number;
  time_to_interactive: number;
  dom_complete: number;
  connection_time: number;
  download_time: number;
  render_blocking: number;
}

export default function PageSpeedTab({ results }: TabProps) {
  const { lighthouseScores, crawlData } = results;
  const lhAudits = crawlData.lighthouse?.audits;
  const pages = crawlData.pages?.items || [];
  const psi = crawlData.pagespeedInsights;
  const mobileLh = (crawlData as any).lighthouseMobile as { categories?: Record<string, { score: number | null }> } | undefined;

  const timingRows = useMemo(() => {
    return pages
      .filter((p) => p.page_timing?.duration_time != null)
      .map((p): PageTimingRow => ({
        url: p.url,
        duration_time: p.page_timing?.duration_time ?? 0,
        waiting_time: p.page_timing?.waiting_time ?? 0,
        time_to_interactive: p.page_timing?.time_to_interactive ?? 0,
        dom_complete: p.page_timing?.dom_complete ?? 0,
        connection_time: p.page_timing?.connection_time ?? 0,
        download_time: p.page_timing?.download_time ?? 0,
        render_blocking:
          (p.meta?.render_blocking_scripts_count ?? 0) +
          (p.meta?.render_blocking_stylesheets_count ?? 0),
      }))
      .sort((a, b) => b.duration_time - a.duration_time);
  }, [pages]);

  const avgLoad = useMemo(() => {
    if (timingRows.length === 0) return 0;
    return timingRows.reduce((s, r) => s + r.duration_time, 0) / timingRows.length;
  }, [timingRows]);

  const renderMs = (ms: number) => (
    <span className={timeColorClass(ms)}>{(ms / 1000).toFixed(2)}s</span>
  );

  const columns = [
    {
      key: 'url',
      label: 'URL',
      sortable: true,
      render: (row: PageTimingRow) => (
        <span className="font-mono text-xs text-ash-300" title={row.url}>
          {shortUrl(row.url)}
        </span>
      ),
    },
    {
      key: 'duration_time',
      label: 'Load Time',
      sortable: true,
      render: (row: PageTimingRow) => renderMs(row.duration_time),
    },
    {
      key: 'waiting_time',
      label: 'TTFB',
      sortable: true,
      render: (row: PageTimingRow) => renderMs(row.waiting_time),
    },
    {
      key: 'connection_time',
      label: 'Connect',
      sortable: true,
      render: (row: PageTimingRow) =>
        row.connection_time > 0 ? renderMs(row.connection_time) : <span className="text-ash-500">--</span>,
    },
    {
      key: 'download_time',
      label: 'Download',
      sortable: true,
      render: (row: PageTimingRow) =>
        row.download_time > 0 ? renderMs(row.download_time) : <span className="text-ash-500">--</span>,
    },
    {
      key: 'time_to_interactive',
      label: 'TTI',
      sortable: true,
      render: (row: PageTimingRow) =>
        row.time_to_interactive > 0 ? renderMs(row.time_to_interactive) : <span className="text-ash-500">--</span>,
    },
    {
      key: 'dom_complete',
      label: 'DOM',
      sortable: true,
      render: (row: PageTimingRow) =>
        row.dom_complete > 0 ? renderMs(row.dom_complete) : <span className="text-ash-500">--</span>,
    },
    {
      key: 'render_blocking',
      label: 'Blocking',
      sortable: true,
      render: (row: PageTimingRow) => (
        <span className={row.render_blocking > 3 ? 'text-danger font-display' : row.render_blocking > 0 ? 'text-warning' : 'text-ash-500'}>
          {row.render_blocking > 0 ? row.render_blocking : '--'}
        </span>
      ),
    },
  ];

  const cwvMetrics: Array<{ key: string; label: string; unit: string; good: number; poor: number; scale?: number }> = [
    { key: 'LARGEST_CONTENTFUL_PAINT_MS', label: 'LCP', unit: 'ms', good: 2500, poor: 4000 },
    { key: 'INTERACTION_TO_NEXT_PAINT', label: 'INP', unit: 'ms', good: 200, poor: 500 },
    { key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE', label: 'CLS', unit: '', good: 10, poor: 25, scale: 100 },
    { key: 'EXPERIMENTAL_TIME_TO_FIRST_BYTE', label: 'TTFB', unit: 'ms', good: 800, poor: 1800 },
    { key: 'FIRST_CONTENTFUL_PAINT_MS', label: 'FCP', unit: 'ms', good: 1800, poor: 3000 },
  ];

  const hasPsiData = !!(psi?.mobile || psi?.desktop);
  const hasMobileLh = !!(mobileLh?.categories);

  return (
    <div className="space-y-8">

      {/* Real-User CrUX Field Data from PSI */}
      {hasPsiData && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-1">Real-User Experience (CrUX)</h3>
          <p className="text-xs text-ash-500 mb-4">
            Google PageSpeed Insights · Chrome User Experience Report · Homepage
          </p>

          {/* Overall category pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {(['mobile', 'desktop'] as const).flatMap((strat) => {
              const data = psi?.[strat];
              if (!data) return [];
              return [
                data.fieldData?.overall_category && (
                  <div key={`${strat}-page`} className="card p-4 text-center">
                    <div className={`text-xl font-display ${cruxColorClass(data.fieldData.overall_category)}`}>
                      {cruxLabel(data.fieldData.overall_category)}
                    </div>
                    <div className="text-xs text-ash-400 mt-1">{strat.charAt(0).toUpperCase() + strat.slice(1)} (page)</div>
                  </div>
                ),
                data.originFieldData?.overall_category && (
                  <div key={`${strat}-origin`} className="card p-4 text-center">
                    <div className={`text-xl font-display ${cruxColorClass(data.originFieldData.overall_category)}`}>
                      {cruxLabel(data.originFieldData.overall_category)}
                    </div>
                    <div className="text-xs text-ash-400 mt-1">{strat.charAt(0).toUpperCase() + strat.slice(1)} (origin)</div>
                  </div>
                ),
              ].filter(Boolean);
            })}
          </div>

          {/* CrUX metric grid — origin preferred, mobile */}
          {(psi?.mobile?.originFieldData || psi?.mobile?.fieldData) && (() => {
            const fd = psi!.mobile!.originFieldData ?? psi!.mobile!.fieldData!;
            return (
              <div className="card p-4">
                <div className="text-xs text-ash-500 uppercase font-display mb-3">
                  Core Web Vitals · p75 · Mobile · Origin
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {cwvMetrics.map(({ key, label, unit, good, poor, scale = 1 }) => {
                    const m = (fd as any)[key] as { percentile: number; category: string } | undefined;
                    if (!m) return null;
                    const val = Math.round(m.percentile / scale);
                    const isGood = val <= good;
                    const isPoor = val >= poor;
                    const colorClass = isGood ? 'text-success' : isPoor ? 'text-danger' : 'text-warning';
                    return (
                      <div key={key} className="text-center">
                        <div className={`text-xl font-display ${colorClass}`}>{val}{unit}</div>
                        <div className="text-xs text-ash-400 mt-0.5">{label}</div>
                        <div className={`text-[10px] ${colorClass} mt-0.5`}>{cruxLabel(m.category)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Lighthouse — Desktop */}
      {lighthouseScores && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">Lighthouse Scores — Desktop</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreRing score={lighthouseScores.performance} label="Performance" />
            <ScoreRing score={lighthouseScores.accessibility} label="Accessibility" />
            <ScoreRing score={lighthouseScores.bestPractices} label="Best Practices" />
            <ScoreRing score={lighthouseScores.seo} label="SEO" />
          </div>
        </section>
      )}

      {/* Lighthouse — Mobile */}
      {hasMobileLh && (() => {
        const cats = mobileLh!.categories!;
        const scores = {
          performance: Math.round((cats.performance?.score ?? 0) * 100),
          accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
          bestPractices: Math.round(((cats['best-practices'] as any)?.score ?? 0) * 100),
          seo: Math.round((cats.seo?.score ?? 0) * 100),
        };
        return (
          <section>
            <h3 className="text-lg font-display text-ash-100 mb-4">Lighthouse Scores — Mobile</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ScoreRing score={scores.performance} label="Performance" />
              <ScoreRing score={scores.accessibility} label="Accessibility" />
              <ScoreRing score={scores.bestPractices} label="Best Practices" />
              <ScoreRing score={scores.seo} label="SEO" />
            </div>
          </section>
        );
      })()}

      {/* Core Web Vitals — Lab (Desktop Lighthouse) */}
      {lhAudits && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">Core Web Vitals — Lab Data (Desktop)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {LH_CWV_AUDITS.map(({ key, label }) => {
              const audit = lhAudits[key];
              if (!audit) return null;
              const score = audit.score != null ? Math.round(audit.score * 100) : null;
              return (
                <div key={key} className="card p-4">
                  <div className="text-xs text-ash-400 uppercase mb-1">{label}</div>
                  <div className={`text-xl font-display ${score != null ? scoreColorClass(score) : 'text-ash-300'}`}>
                    {audit.displayValue || '---'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PSI Opportunities */}
      {psi?.mobile?.audits && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">Speed Opportunities (PSI)</h3>
          <div className="card p-4 divide-y divide-char-700">
            {PSI_OPPORTUNITY_AUDITS.map(({ key, label }) => {
              const val = (psi.mobile!.audits as any)[key];
              if (!val) return null;
              return (
                <div key={key} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <span className="text-sm text-ash-300">{label}</span>
                  <span className="text-sm font-mono text-ash-400 shrink-0">{val}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Page Timing Table — all crawled pages */}
      {timingRows.length > 0 && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">Page Timing — All Crawled Pages</h3>
          <StatGrid
            stats={[
              { value: `${(avgLoad / 1000).toFixed(2)}s`, label: 'Avg Load Time' },
              { value: timingRows.length, label: 'Pages Measured' },
              { value: timingRows.filter((r) => r.duration_time < 1000).length, label: 'Fast (<1s)' },
              {
                value: timingRows.filter((r) => r.duration_time > 3000).length,
                label: 'Slow (>3s)',
                isWarning: timingRows.filter((r) => r.duration_time > 3000).length > 0,
              },
              {
                value: timingRows.filter((r) => r.render_blocking > 3).length,
                label: 'Render-Blocking Issues',
                isWarning: timingRows.filter((r) => r.render_blocking > 3).length > 0,
              },
            ]}
          />
          <div className="mt-6 card p-4">
            <DataTable
              data={timingRows}
              columns={columns}
              searchable
              searchKeys={['url']}
              pageSize={25}
              emptyMessage="No page timing data available"
            />
          </div>
        </section>
      )}

      {/* Empty state */}
      {!lighthouseScores && !lhAudits && !hasPsiData && timingRows.length === 0 && (
        <div className="card p-12 text-center">
          <h3 className="text-xl font-display text-ash-300 mb-2">No Page Speed Data</h3>
          <p className="text-ash-400">
            Lighthouse, PageSpeed Insights, and timing data will appear here after the scan completes.
          </p>
        </div>
      )}
    </div>
  );
}
