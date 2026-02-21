'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage } from './types';
import { DataTable } from './shared/DataTable';
import { StatGrid } from './shared/StatGrid';
import { shortUrl, scoreColorClass } from '@/lib/siteAudit/utils';

const CWV_AUDITS = [
  { key: 'first-contentful-paint', label: 'First Contentful Paint' },
  { key: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
  { key: 'total-blocking-time', label: 'Total Blocking Time' },
  { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
  { key: 'speed-index', label: 'Speed Index' },
  { key: 'interactive', label: 'Time to Interactive' },
] as const;

function timeColorClass(seconds: number): string {
  if (seconds < 1) return 'text-success';
  if (seconds <= 3) return 'text-warning';
  return 'text-danger';
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const colorClass = scoreColorClass(score);
  return (
    <div className="card p-5 text-center">
      <div className={`text-4xl font-display ${colorClass}`}>{score}</div>
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
}

export default function PageSpeedTab({ results }: TabProps) {
  const { lighthouseScores, crawlData } = results;
  const audits = crawlData.lighthouse?.audits;
  const pages = crawlData.pages?.items || [];

  const timingRows = useMemo(() => {
    return pages
      .filter((p) => p.page_timing?.duration_time != null)
      .map((p): PageTimingRow => ({
        url: p.url,
        duration_time: p.page_timing?.duration_time ?? 0,
        waiting_time: p.page_timing?.waiting_time ?? 0,
        time_to_interactive: p.page_timing?.time_to_interactive ?? 0,
        dom_complete: p.page_timing?.dom_complete ?? 0,
      }))
      .sort((a, b) => b.duration_time - a.duration_time);
  }, [pages]);

  const avgLoad = useMemo(() => {
    if (timingRows.length === 0) return 0;
    return timingRows.reduce((s, r) => s + r.duration_time, 0) / timingRows.length;
  }, [timingRows]);

  const renderTime = (seconds: number) => (
    <span className={timeColorClass(seconds)}>{seconds.toFixed(2)}s</span>
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
      render: (row: PageTimingRow) => renderTime(row.duration_time),
    },
    {
      key: 'waiting_time',
      label: 'TTFB',
      sortable: true,
      render: (row: PageTimingRow) => renderTime(row.waiting_time),
    },
    {
      key: 'time_to_interactive',
      label: 'TTI',
      sortable: true,
      render: (row: PageTimingRow) => renderTime(row.time_to_interactive),
    },
    {
      key: 'dom_complete',
      label: 'DOM Complete',
      sortable: true,
      render: (row: PageTimingRow) => renderTime(row.dom_complete),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Lighthouse Scores */}
      {lighthouseScores && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">Lighthouse Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreRing score={lighthouseScores.performance} label="Performance" />
            <ScoreRing score={lighthouseScores.accessibility} label="Accessibility" />
            <ScoreRing score={lighthouseScores.bestPractices} label="Best Practices" />
            <ScoreRing score={lighthouseScores.seo} label="SEO" />
          </div>
        </section>
      )}

      {/* Core Web Vitals */}
      {audits && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">Core Web Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CWV_AUDITS.map(({ key, label }) => {
              const audit = audits[key];
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

      {/* Page Timing Stats */}
      {timingRows.length > 0 && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">Page Timing</h3>

          <StatGrid
            stats={[
              { value: `${avgLoad.toFixed(2)}s`, label: 'Avg Load Time' },
              { value: timingRows.length, label: 'Pages Measured' },
              {
                value: timingRows.filter((r) => r.duration_time < 1).length,
                label: 'Fast (<1s)',
              },
              {
                value: timingRows.filter((r) => r.duration_time > 3).length,
                label: 'Slow (>3s)',
                isWarning: timingRows.filter((r) => r.duration_time > 3).length > 0,
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

      {/* Fallback */}
      {!lighthouseScores && !audits && timingRows.length === 0 && (
        <div className="card p-12 text-center">
          <h3 className="text-xl font-display text-ash-300 mb-2">No Page Speed Data</h3>
          <p className="text-ash-400">
            Lighthouse and page timing data will appear here after the scan completes.
          </p>
        </div>
      )}
    </div>
  );
}
