'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage } from './types';
import { DataTable } from './shared/DataTable';
import { StatGrid } from './shared/StatGrid';
import { shortUrl, scoreColorClass } from '@/lib/siteAudit/utils';

interface DepthBucket {
  label: string;
  count: number;
}

interface DeepPageRow {
  url: string;
  click_depth: number;
  status_code: number;
  onpage_score: number;
}

interface ResourceTypeStat {
  label: string;
  count: number;
}

export default function StructureTab({ results }: TabProps) {
  const pages = results.crawlData.pages?.items || [];
  const resources = results.crawlData.resources?.items || [];

  // Click depth distribution
  const depthBuckets = useMemo((): DepthBucket[] => {
    const counts: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 };
    for (const p of pages) {
      const d = p.click_depth ?? 0;
      if (d >= 5) counts['5+']++;
      else counts[String(d)]++;
    }
    return [
      { label: '0', count: counts['0'] },
      { label: '1', count: counts['1'] },
      { label: '2', count: counts['2'] },
      { label: '3', count: counts['3'] },
      { label: '4', count: counts['4'] },
      { label: '5+', count: counts['5+'] },
    ];
  }, [pages]);

  const maxDepthCount = Math.max(...depthBuckets.map((b) => b.count), 1);

  // Stats
  const avgDepth = useMemo(() => {
    if (pages.length === 0) return 0;
    const total = pages.reduce((s, p) => s + (p.click_depth ?? 0), 0);
    return (total / pages.length).toFixed(1);
  }, [pages]);

  const maxDepth = useMemo(() => {
    return pages.reduce((m, p) => Math.max(m, p.click_depth ?? 0), 0);
  }, [pages]);

  const shallowPages = pages.filter((p) => (p.click_depth ?? 0) <= 1).length;
  const deepPages = pages.filter((p) => (p.click_depth ?? 0) >= 4).length;

  // Resource type distribution
  const resourceTypes = useMemo((): ResourceTypeStat[] => {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      const type = r.resource_type || 'other';
      counts[type] = (counts[type] || 0) + 1;
    }
    // Also count HTML pages from crawlData.pages
    const htmlCount = pages.length;
    return [
      { label: 'HTML Pages', count: htmlCount },
      { label: 'Images', count: counts['image'] || 0 },
      { label: 'Scripts', count: counts['script'] || 0 },
      { label: 'Stylesheets', count: counts['stylesheet'] || 0 },
      { label: 'Other', count: counts['other'] || 0 },
    ];
  }, [pages, resources]);

  // Deep pages table (click_depth > 3)
  const deepPageRows = useMemo((): DeepPageRow[] => {
    return pages
      .filter((p) => (p.click_depth ?? 0) > 3)
      .map((p) => ({
        url: p.url,
        click_depth: p.click_depth ?? 0,
        status_code: p.status_code,
        onpage_score: p.onpage_score ?? 0,
      }))
      .sort((a, b) => b.click_depth - a.click_depth);
  }, [pages]);

  const deepColumns = [
    {
      key: 'url',
      label: 'URL',
      sortable: true,
      render: (row: DeepPageRow) => (
        <span className="font-mono text-xs text-ash-300" title={row.url}>
          {shortUrl(row.url)}
        </span>
      ),
    },
    {
      key: 'click_depth',
      label: 'Click Depth',
      sortable: true,
      render: (row: DeepPageRow) => (
        <span className="text-warning font-display">{row.click_depth}</span>
      ),
    },
    {
      key: 'status_code',
      label: 'Status',
      sortable: true,
      render: (row: DeepPageRow) => (
        <span className={row.status_code === 200 ? 'text-success' : 'text-danger'}>
          {row.status_code}
        </span>
      ),
    },
    {
      key: 'onpage_score',
      label: 'On-Page Score',
      sortable: true,
      render: (row: DeepPageRow) => (
        <span className={`font-display ${scoreColorClass(row.onpage_score)}`}>
          {row.onpage_score > 0 ? row.onpage_score.toFixed(0) : '---'}
        </span>
      ),
    },
  ];

  if (pages.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-display text-ash-300 mb-2">No Structure Data</h3>
        <p className="text-ash-400">
          Site structure analysis will appear here after the scan completes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Click Depth Distribution */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">Click Depth Distribution</h3>
        <div className="card p-6 space-y-3">
          {depthBuckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="text-sm text-ash-400 w-10 text-right font-mono">
                {bucket.label}
              </span>
              <div className="flex-1 bg-char-800 rounded h-7 overflow-hidden">
                <div
                  className="bg-flame-500 h-full rounded transition-all duration-500 flex items-center px-2"
                  style={{ width: `${Math.max((bucket.count / maxDepthCount) * 100, bucket.count > 0 ? 4 : 0)}%` }}
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
            { value: avgDepth, label: 'Average Click Depth' },
            { value: maxDepth, label: 'Max Click Depth' },
            { value: shallowPages, label: 'Pages at Depth 0-1' },
            {
              value: deepPages,
              label: 'Deep Pages (4+)',
              isWarning: deepPages > 0,
            },
          ]}
        />
      </section>

      {/* URL Type Distribution */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">Resource Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {resourceTypes.map((rt) => (
            <div key={rt.label} className="card p-4 text-center">
              <div className="text-2xl font-display text-ash-100">{rt.count}</div>
              <div className="text-sm text-ash-300 mt-1">{rt.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Deep Pages Table */}
      {deepPageRows.length > 0 && (
        <section>
          <h3 className="text-lg font-display text-ash-100 mb-4">
            Deep Pages (Depth &gt; 3)
            <span className="text-sm text-ash-400 font-normal ml-2">
              {deepPageRows.length} pages
            </span>
          </h3>
          <div className="card p-4">
            <DataTable
              data={deepPageRows}
              columns={deepColumns}
              searchable
              searchKeys={['url']}
              pageSize={25}
              emptyMessage="No deep pages found"
            />
          </div>
        </section>
      )}
    </div>
  );
}
