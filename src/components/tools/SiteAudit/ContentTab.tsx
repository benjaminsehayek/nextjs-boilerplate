'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage } from './types';
import { StatGrid } from './shared/StatGrid';
import { DataTable } from './shared/DataTable';
import { shortUrl } from '@/lib/siteAudit/utils';

export default function ContentTab({ results }: TabProps) {
  const pages = results.crawlData.pages?.items || [];
  const duplicateContent = results.crawlData.duplicateContent?.items || [];

  const stats = useMemo(() => {
    let thinContent = 0;
    let veryThin = 0;
    let missingH1 = 0;
    let multipleH1 = 0;
    let lowReadability = 0;

    pages.forEach((p) => {
      const wordCount = p.meta?.content?.plain_text_word_count || 0;
      const h1s = p.meta?.htags?.h1 || [];
      const ari = p.meta?.content?.automated_readability_index;

      if (wordCount < 300) thinContent++;
      if (wordCount < 100) veryThin++;
      if (h1s.length === 0) missingH1++;
      if (h1s.length > 1) multipleH1++;
      if (ari != null && ari > 14) lowReadability++;
    });

    return { thinContent, veryThin, missingH1, multipleH1, lowReadability, duplicateCount: duplicateContent.length };
  }, [pages, duplicateContent]);

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
        key: 'word_count',
        label: 'Word Count',
        sortable: true,
        render: (p: CrawledPage) => {
          const wc = p.meta?.content?.plain_text_word_count || 0;
          const color = wc < 100 ? 'text-danger' : wc < 300 ? 'text-warning' : 'text-success';
          return <span className={`font-display ${color}`}>{wc}</span>;
        },
      },
      {
        key: 'h1',
        label: 'H1',
        sortable: false,
        className: 'max-w-[200px]',
        render: (p: CrawledPage) => {
          const h1s = p.meta?.htags?.h1 || [];
          if (h1s.length === 0) return <em className="text-danger text-xs">Missing</em>;
          return (
            <span className="text-xs text-ash-300 truncate block" title={h1s[0]}>
              {h1s[0]}
            </span>
          );
        },
      },
      {
        key: 'readability',
        label: 'Readability (ARI)',
        sortable: true,
        render: (p: CrawledPage) => {
          const ari = p.meta?.content?.automated_readability_index;
          if (ari == null) return <span className="text-ash-500">--</span>;
          const color = ari > 14 ? 'text-danger' : 'text-ash-300';
          return <span className={color}>{ari.toFixed(1)}</span>;
        },
      },
      {
        key: 'status_code',
        label: 'Status',
        sortable: true,
        render: (p: CrawledPage) => (
          <span className={p.status_code === 200 ? 'text-success' : 'text-danger'}>
            {p.status_code}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg mb-4">Content Quality</h3>
        <StatGrid
          stats={[
            { value: stats.thinContent, label: 'Thin Content (<300)', isWarning: stats.thinContent > 0 },
            { value: stats.veryThin, label: 'Very Thin (<100)', isWarning: stats.veryThin > 0 },
            { value: stats.missingH1, label: 'Missing H1', isWarning: stats.missingH1 > 0 },
            { value: stats.multipleH1, label: 'Multiple H1', isWarning: stats.multipleH1 > 0 },
            { value: stats.lowReadability, label: 'Low Readability (ARI >14)', isWarning: stats.lowReadability > 0 },
            { value: stats.duplicateCount, label: 'Duplicate Content', isWarning: stats.duplicateCount > 0 },
          ]}
        />
      </div>

      <div>
        <h3 className="font-display text-lg mb-4">Page Content</h3>
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
    </div>
  );
}
