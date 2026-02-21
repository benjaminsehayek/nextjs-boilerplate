'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage } from './types';
import { DataTable } from './shared/DataTable';
import { StatGrid } from './shared/StatGrid';
import { shortUrl, scoreColorClass } from '@/lib/siteAudit/utils';
import { computePageHealth } from '@/lib/siteAudit/scoring';

interface HealthRow {
  url: string;
  health: number;
  status_code: number;
  word_count: number;
  load_time: number;
}

interface DistBucket {
  label: string;
  count: number;
  color: string;
}

export default function PageHealthTab({ results }: TabProps) {
  const pages = results.crawlData.pages?.items || [];

  const healthRows = useMemo((): HealthRow[] => {
    return pages
      .map((p) => ({
        url: p.url,
        health: computePageHealth(p),
        status_code: p.status_code,
        word_count: p.meta?.content?.plain_text_word_count ?? 0,
        load_time: p.page_timing?.duration_time ?? 0,
      }))
      .sort((a, b) => a.health - b.health);
  }, [pages]);

  const distribution = useMemo((): DistBucket[] => {
    const buckets = [
      { label: '90-100', count: 0, color: 'bg-success' },
      { label: '70-89', count: 0, color: 'bg-flame-500' },
      { label: '50-69', count: 0, color: 'bg-warning' },
      { label: '0-49', count: 0, color: 'bg-danger' },
    ];
    for (const row of healthRows) {
      if (row.health >= 90) buckets[0].count++;
      else if (row.health >= 70) buckets[1].count++;
      else if (row.health >= 50) buckets[2].count++;
      else buckets[3].count++;
    }
    return buckets;
  }, [healthRows]);

  const maxBucket = Math.max(...distribution.map((b) => b.count), 1);

  const avgHealth = useMemo(() => {
    if (healthRows.length === 0) return 0;
    return Math.round(healthRows.reduce((s, r) => s + r.health, 0) / healthRows.length);
  }, [healthRows]);

  const medianHealth = useMemo(() => {
    if (healthRows.length === 0) return 0;
    const sorted = [...healthRows].sort((a, b) => a.health - b.health);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return Math.round((sorted[mid - 1].health + sorted[mid].health) / 2);
    }
    return sorted[mid].health;
  }, [healthRows]);

  const healthyCount = healthRows.filter((r) => r.health > 80).length;
  const needsWorkCount = healthRows.filter((r) => r.health < 50).length;

  const columns = [
    {
      key: 'url',
      label: 'URL',
      sortable: true,
      render: (row: HealthRow) => (
        <span className="font-mono text-xs text-ash-300" title={row.url}>
          {shortUrl(row.url)}
        </span>
      ),
    },
    {
      key: 'health',
      label: 'Health Score',
      sortable: true,
      render: (row: HealthRow) => (
        <span className={`font-display font-bold ${scoreColorClass(row.health)}`}>
          {row.health}
        </span>
      ),
    },
    {
      key: 'status_code',
      label: 'Status',
      sortable: true,
      render: (row: HealthRow) => (
        <span className={row.status_code === 200 ? 'text-success' : 'text-danger'}>
          {row.status_code}
        </span>
      ),
    },
    {
      key: 'word_count',
      label: 'Word Count',
      sortable: true,
      render: (row: HealthRow) => (
        <span className="text-ash-300">{row.word_count.toLocaleString()}</span>
      ),
    },
    {
      key: 'load_time',
      label: 'Load Time',
      sortable: true,
      render: (row: HealthRow) => (
        <span className={row.load_time < 1 ? 'text-success' : row.load_time <= 3 ? 'text-warning' : 'text-danger'}>
          {row.load_time.toFixed(2)}s
        </span>
      ),
    },
  ];

  if (pages.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-display text-ash-300 mb-2">No Page Health Data</h3>
        <p className="text-ash-400">
          Page health scores will appear here after the scan completes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Distribution Chart */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">Health Score Distribution</h3>
        <div className="card p-6 space-y-3">
          {distribution.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="text-sm text-ash-400 w-16 text-right font-mono">
                {bucket.label}
              </span>
              <div className="flex-1 bg-char-800 rounded h-7 overflow-hidden">
                <div
                  className={`${bucket.color} h-full rounded transition-all duration-500 flex items-center px-2`}
                  style={{ width: `${Math.max((bucket.count / maxBucket) * 100, bucket.count > 0 ? 4 : 0)}%` }}
                >
                  {bucket.count > 0 && (
                    <span className="text-xs font-display text-white">{bucket.count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section>
        <StatGrid
          stats={[
            { value: avgHealth, label: 'Average Health' },
            { value: medianHealth, label: 'Median Health' },
            { value: healthyCount, label: 'Pages >80 (Healthy)' },
            {
              value: needsWorkCount,
              label: 'Pages <50 (Needs Work)',
              isWarning: needsWorkCount > 0,
            },
          ]}
        />
      </section>

      {/* Table */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">All Pages by Health</h3>
        <div className="card p-4">
          <DataTable
            data={healthRows}
            columns={columns}
            searchable
            searchKeys={['url']}
            pageSize={25}
            emptyMessage="No pages found"
          />
        </div>
      </section>
    </div>
  );
}
