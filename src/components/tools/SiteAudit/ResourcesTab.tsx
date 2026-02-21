'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledResource } from './types';
import { StatGrid } from './shared/StatGrid';
import { DataTable } from './shared/DataTable';
import { shortUrl, formatBytes } from '@/lib/siteAudit/utils';

export default function ResourcesTab({ results }: TabProps) {
  const resources = results.crawlData.resources?.items || [];

  const stats = useMemo(() => {
    const images = resources.filter((r) => r.resource_type === 'image');
    const scripts = resources.filter((r) => r.resource_type === 'script');
    const stylesheets = resources.filter((r) => r.resource_type === 'stylesheet');

    const imageSize = images.reduce((sum, r) => sum + (r.size || 0), 0);
    const scriptSize = scripts.reduce((sum, r) => sum + (r.size || 0), 0);
    const styleSize = stylesheets.reduce((sum, r) => sum + (r.size || 0), 0);

    const heavyImages = images.filter((r) => (r.size || 0) > 200 * 1024).length;
    const heavyScripts = scripts.filter((r) => (r.size || 0) > 100 * 1024).length;
    const brokenResources = resources.filter((r) => r.status_code >= 400).length;

    return {
      total: resources.length,
      imageCount: images.length,
      imageSize,
      scriptCount: scripts.length,
      scriptSize,
      styleCount: stylesheets.length,
      styleSize,
      heavyImages,
      heavyScripts,
      brokenResources,
    };
  }, [resources]);

  const columns = useMemo(
    () => [
      {
        key: 'url',
        label: 'URL',
        sortable: true,
        className: 'max-w-[300px]',
        render: (r: CrawledResource) => (
          <span className="font-mono text-xs text-ash-300 truncate block" title={r.url}>
            {shortUrl(r.url, 50)}
          </span>
        ),
      },
      {
        key: 'resource_type',
        label: 'Type',
        sortable: true,
        render: (r: CrawledResource) => (
          <span className="text-xs text-ash-400 capitalize">{r.resource_type}</span>
        ),
      },
      {
        key: 'size',
        label: 'Size',
        sortable: true,
        render: (r: CrawledResource) => (
          <span className="text-xs text-ash-300">{formatBytes(r.size || 0)}</span>
        ),
      },
      {
        key: 'status_code',
        label: 'Status',
        sortable: true,
        render: (r: CrawledResource) => {
          const color =
            r.status_code === 200
              ? 'text-success'
              : r.status_code >= 400
              ? 'text-danger'
              : 'text-warning';
          return <span className={color}>{r.status_code}</span>;
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg mb-4">Resource Analysis</h3>
        <StatGrid
          stats={[
            { value: stats.total, label: 'Total Resources' },
            { value: stats.imageCount, label: 'Images', sublabel: formatBytes(stats.imageSize) },
            { value: stats.scriptCount, label: 'Scripts', sublabel: formatBytes(stats.scriptSize) },
            { value: stats.styleCount, label: 'Stylesheets', sublabel: formatBytes(stats.styleSize) },
            { value: stats.heavyImages, label: 'Heavy Images (>200KB)', isWarning: stats.heavyImages > 0 },
            { value: stats.heavyScripts, label: 'Heavy Scripts (>100KB)', isWarning: stats.heavyScripts > 0 },
            { value: stats.brokenResources, label: 'Broken Resources', isWarning: stats.brokenResources > 0 },
          ]}
        />
      </div>

      <div>
        <h3 className="font-display text-lg mb-4">All Resources</h3>
        <div className="card p-4">
          <DataTable
            data={resources}
            columns={columns}
            searchable
            searchKeys={['url', 'resource_type']}
            emptyMessage="No resources found"
          />
        </div>
      </div>
    </div>
  );
}
