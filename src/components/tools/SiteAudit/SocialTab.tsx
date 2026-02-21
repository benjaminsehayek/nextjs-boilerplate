'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage } from './types';
import { DataTable } from './shared/DataTable';
import { StatGrid } from './shared/StatGrid';
import { shortUrl } from '@/lib/siteAudit/utils';

interface SocialRow {
  url: string;
  ogTitle: boolean;
  ogDescription: boolean;
  ogImage: boolean;
  ogType: string;
}

function CheckMark({ present }: { present: boolean }) {
  return present ? (
    <span className="text-success font-bold">&#10003;</span>
  ) : (
    <span className="text-danger font-bold">&#10005;</span>
  );
}

export default function SocialTab({ results }: TabProps) {
  const pages = results.crawlData.pages?.items || [];

  const rows = useMemo((): SocialRow[] => {
    return pages.map((p) => {
      const smt = p.meta?.social_media_tags || {};
      return {
        url: p.url,
        ogTitle: !!smt['og:title'],
        ogDescription: !!smt['og:description'],
        ogImage: !!smt['og:image'],
        ogType: smt['og:type'] || '',
      };
    });
  }, [pages]);

  const withOg = rows.filter((r) => r.ogTitle || r.ogDescription).length;
  const missingOg = rows.length - withOg;
  const withImage = rows.filter((r) => r.ogImage).length;
  const missingImage = rows.length - withImage;

  const columns = [
    {
      key: 'url',
      label: 'URL',
      sortable: true,
      render: (row: SocialRow) => (
        <span className="font-mono text-xs text-ash-300" title={row.url}>
          {shortUrl(row.url)}
        </span>
      ),
    },
    {
      key: 'ogTitle',
      label: 'og:title',
      sortable: true,
      render: (row: SocialRow) => <CheckMark present={row.ogTitle} />,
      className: 'text-center',
    },
    {
      key: 'ogDescription',
      label: 'og:description',
      sortable: true,
      render: (row: SocialRow) => <CheckMark present={row.ogDescription} />,
      className: 'text-center',
    },
    {
      key: 'ogImage',
      label: 'og:image',
      sortable: true,
      render: (row: SocialRow) => <CheckMark present={row.ogImage} />,
      className: 'text-center',
    },
    {
      key: 'ogType',
      label: 'og:type',
      sortable: true,
      render: (row: SocialRow) => (
        <span className="text-ash-300 text-sm">{row.ogType || '---'}</span>
      ),
    },
  ];

  if (pages.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-display text-ash-300 mb-2">No Social Data</h3>
        <p className="text-ash-400">
          Open Graph tag analysis will appear here after the scan completes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">Open Graph Overview</h3>
        <StatGrid
          stats={[
            { value: withOg, label: 'Pages with OG Tags' },
            {
              value: missingOg,
              label: 'Pages Missing OG Tags',
              isWarning: missingOg > 0,
            },
            { value: withImage, label: 'Pages with og:image' },
            {
              value: missingImage,
              label: 'Pages Missing og:image',
              isWarning: missingImage > 0,
            },
          ]}
        />
      </section>

      {/* Table */}
      <section>
        <h3 className="text-lg font-display text-ash-100 mb-4">All Pages</h3>
        <div className="card p-4">
          <DataTable
            data={rows}
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
