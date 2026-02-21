'use client';

import { useMemo } from 'react';
import type { PagesTabProps, CrawledPage } from './types';
import { DataTable } from './shared/DataTable';
import { shortUrl, scoreColorClass } from '@/lib/siteAudit/utils';

export default function PagesTab({ pages, domain }: PagesTabProps) {
  const columns = useMemo(
    () => [
      {
        key: 'url',
        label: 'URL',
        sortable: true,
        className: 'max-w-[200px]',
        render: (p: CrawledPage) => (
          <span className="font-mono text-xs text-ash-300 truncate block" title={p.url}>
            {shortUrl(p.url)}
          </span>
        ),
      },
      {
        key: 'status_code',
        label: 'Status',
        sortable: true,
        render: (p: CrawledPage) => {
          const color =
            p.status_code === 200
              ? 'text-success'
              : p.status_code >= 300 && p.status_code < 400
              ? 'text-warning'
              : 'text-danger';
          return <span className={`font-display ${color}`}>{p.status_code}</span>;
        },
      },
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        className: 'max-w-[200px]',
        render: (p: CrawledPage) => {
          const title = p.meta?.title;
          const truncated = title && title.length > 50 ? title.slice(0, 50) + '...' : title;
          return (
            <span className="text-xs text-ash-300 truncate block" title={title || ''}>
              {truncated || <em className="text-ash-500">No title</em>}
            </span>
          );
        },
      },
      {
        key: 'word_count',
        label: 'Words',
        sortable: true,
        render: (p: CrawledPage) => {
          const wc = p.meta?.content?.plain_text_word_count || 0;
          return <span className="text-xs text-ash-300">{wc}</span>;
        },
      },
      {
        key: 'load_time',
        label: 'Load Time',
        sortable: true,
        render: (p: CrawledPage) => {
          const duration = p.page_timing?.duration_time;
          if (duration == null) return <span className="text-ash-500">--</span>;
          const seconds = (duration / 1000).toFixed(1);
          const color = duration > 3000 ? 'text-danger' : duration > 1500 ? 'text-warning' : 'text-success';
          return <span className={`text-xs ${color}`}>{seconds}s</span>;
        },
      },
      {
        key: 'onpage_score',
        label: 'Score',
        sortable: true,
        render: (p: CrawledPage) => {
          const score = p.onpage_score;
          if (score == null) return <span className="text-ash-500">--</span>;
          return (
            <span className={`font-display ${scoreColorClass(score)}`}>
              {Math.round(score)}
            </span>
          );
        },
      },
      {
        key: 'click_depth',
        label: 'Depth',
        sortable: true,
        render: (p: CrawledPage) => (
          <span className="text-xs text-ash-300">{p.click_depth ?? '--'}</span>
        ),
      },
    ],
    []
  );

  if (pages.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-display mb-2 text-ash-300">No Pages Analyzed</h3>
        <p className="text-ash-400">Page data will appear here after the scan completes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">
          All Pages
          <span className="text-ash-500 text-sm ml-2">({pages.length})</span>
        </h3>
      </div>

      <div className="card p-4">
        <DataTable
          data={pages}
          columns={columns}
          searchable
          searchKeys={['url']}
          emptyMessage="No pages found"
        />
      </div>
    </div>
  );
}
