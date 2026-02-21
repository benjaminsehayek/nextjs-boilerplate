'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage, NonIndexablePage } from './types';
import { StatGrid } from './shared/StatGrid';
import { DataTable } from './shared/DataTable';
import { shortUrl } from '@/lib/siteAudit/utils';

export default function TechnicalTab({ results }: TabProps) {
  const pages = results.crawlData.pages?.items || [];
  const nonIndexable = results.crawlData.nonIndexable?.items || [];
  const redirectChains = results.crawlData.redirectChains?.items || [];

  const stats = useMemo(() => {
    const httpPages = pages.filter((p) => p.url?.startsWith('http://') && !p.url?.startsWith('https://')).length;
    const brokenPages = pages.filter((p) => p.status_code >= 400).length;
    const missingCanonical = pages.filter((p) => !p.meta?.canonical).length;
    const mixedContent = pages.filter((p) => p.checks?.is_http).length;
    const missingDoctype = pages.filter((p) => p.checks?.no_doctype).length;
    const slowPages = pages.filter(
      (p) => p.page_timing?.duration_time != null && p.page_timing.duration_time > 3000
    ).length;

    return {
      nonIndexable: nonIndexable.length,
      httpPages,
      brokenPages,
      redirectChains: redirectChains.length,
      missingCanonical,
      mixedContent,
      missingDoctype,
      slowPages,
    };
  }, [pages, nonIndexable, redirectChains]);

  const brokenPages = useMemo(
    () => pages.filter((p) => p.status_code >= 400),
    [pages]
  );

  const nonIndexableColumns = useMemo(
    () => [
      {
        key: 'url',
        label: 'URL',
        sortable: true,
        className: 'max-w-[400px]',
        render: (p: NonIndexablePage) => (
          <span className="font-mono text-xs text-ash-300 truncate block" title={p.url}>
            {shortUrl(p.url)}
          </span>
        ),
      },
      {
        key: 'reason',
        label: 'Reason',
        sortable: true,
        render: (p: NonIndexablePage) => (
          <span className="text-xs text-ash-400">{p.reason || '--'}</span>
        ),
      },
    ],
    []
  );

  const brokenColumns = useMemo(
    () => [
      {
        key: 'url',
        label: 'URL',
        sortable: true,
        className: 'max-w-[400px]',
        render: (p: CrawledPage) => (
          <span className="font-mono text-xs text-ash-300 truncate block" title={p.url}>
            {shortUrl(p.url)}
          </span>
        ),
      },
      {
        key: 'status_code',
        label: 'Status Code',
        sortable: true,
        render: (p: CrawledPage) => (
          <span className="text-danger font-display">{p.status_code}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg mb-4">Technical SEO</h3>
        <StatGrid
          stats={[
            { value: stats.nonIndexable, label: 'Non-Indexable Pages', isWarning: stats.nonIndexable > 0 },
            { value: stats.httpPages, label: 'HTTP Pages', isWarning: stats.httpPages > 0 },
            { value: stats.brokenPages, label: 'Broken Pages (4xx+)', isWarning: stats.brokenPages > 0 },
            { value: stats.redirectChains, label: 'Redirect Chains', isWarning: stats.redirectChains > 0 },
            { value: stats.missingCanonical, label: 'Missing Canonical', isWarning: stats.missingCanonical > 0 },
            { value: stats.mixedContent, label: 'Mixed Content', isWarning: stats.mixedContent > 0 },
            { value: stats.missingDoctype, label: 'Missing DOCTYPE', isWarning: stats.missingDoctype > 0 },
            { value: stats.slowPages, label: 'Slow Pages (>3s)', isWarning: stats.slowPages > 0 },
          ]}
        />
      </div>

      {/* Non-Indexable Pages */}
      {nonIndexable.length > 0 && (
        <div>
          <h3 className="font-display text-lg mb-4">
            Non-Indexable Pages
            <span className="text-ash-500 text-sm ml-2">({nonIndexable.length})</span>
          </h3>
          <div className="card p-4">
            <DataTable
              data={nonIndexable}
              columns={nonIndexableColumns}
              searchable
              searchKeys={['url', 'reason']}
              emptyMessage="No non-indexable pages found"
            />
          </div>
        </div>
      )}

      {/* Broken Pages */}
      {brokenPages.length > 0 && (
        <div>
          <h3 className="font-display text-lg mb-4">
            Broken Pages
            <span className="text-ash-500 text-sm ml-2">({brokenPages.length})</span>
          </h3>
          <div className="card p-4">
            <DataTable
              data={brokenPages}
              columns={brokenColumns}
              searchable
              searchKeys={['url']}
              emptyMessage="No broken pages found"
            />
          </div>
        </div>
      )}
    </div>
  );
}
