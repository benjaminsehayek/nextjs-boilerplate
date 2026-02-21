'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledLink, RedirectChain } from './types';
import { StatGrid } from './shared/StatGrid';
import { DataTable } from './shared/DataTable';
import { shortUrl } from '@/lib/siteAudit/utils';

export default function LinksTab({ results }: TabProps) {
  const links = results.crawlData.links?.items || [];
  const redirectChains = results.crawlData.redirectChains?.items || [];

  const stats = useMemo(() => {
    const total = links.length;
    const broken = links.filter((l) => l.status_code >= 400).length;
    const redirects = links.filter((l) => l.status_code >= 300 && l.status_code < 400).length;
    const internal = links.filter((l) => l.type === 'internal').length;
    const external = links.filter((l) => l.type === 'external').length;

    return { total, broken, redirects, internal, external, chains: redirectChains.length };
  }, [links, redirectChains]);

  const brokenLinks = useMemo(
    () => links.filter((l) => l.status_code >= 400),
    [links]
  );

  const brokenColumns = useMemo(
    () => [
      {
        key: 'link_to',
        label: 'URL',
        sortable: true,
        className: 'max-w-[250px]',
        render: (l: CrawledLink) => (
          <span className="font-mono text-xs text-ash-300 truncate block" title={l.link_to || l.url || ''}>
            {shortUrl(l.link_to || l.url || '')}
          </span>
        ),
      },
      {
        key: 'link_from',
        label: 'From',
        sortable: true,
        className: 'max-w-[200px]',
        render: (l: CrawledLink) => (
          <span className="font-mono text-xs text-ash-400 truncate block" title={l.link_from || l.page_from || ''}>
            {shortUrl(l.link_from || l.page_from || '')}
          </span>
        ),
      },
      {
        key: 'status_code',
        label: 'Status',
        sortable: true,
        render: (l: CrawledLink) => (
          <span className="text-danger font-display">{l.status_code}</span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (l: CrawledLink) => (
          <span className="text-xs text-ash-400 capitalize">{l.type || '--'}</span>
        ),
      },
    ],
    []
  );

  const chainColumns = useMemo(
    () => [
      {
        key: 'chain',
        label: 'Redirect Chain',
        sortable: false,
        render: (r: RedirectChain) => {
          const urls = r.chain?.map((c) => shortUrl(c.url, 40)) || [shortUrl(r.url || '', 40)];
          return (
            <span className="font-mono text-xs text-ash-300 break-all">
              {urls.join(' \u2192 ')}
            </span>
          );
        },
      },
      {
        key: 'hops',
        label: 'Hops',
        sortable: true,
        render: (r: RedirectChain) => (
          <span className="font-display">{r.chain?.length || 1}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg mb-4">Link Analysis</h3>
        <StatGrid
          stats={[
            { value: stats.total, label: 'Total Links' },
            { value: stats.broken, label: 'Broken Links', isWarning: stats.broken > 0 },
            { value: stats.redirects, label: 'Redirect Links' },
            { value: stats.internal, label: 'Internal Links' },
            { value: stats.external, label: 'External Links' },
            { value: stats.chains, label: 'Redirect Chains', isWarning: stats.chains > 0 },
          ]}
        />
      </div>

      {/* Broken Links Table */}
      <div>
        <h3 className="font-display text-lg mb-4">
          Broken Links
          <span className="text-ash-500 text-sm ml-2">({brokenLinks.length})</span>
        </h3>
        <div className="card p-4">
          <DataTable
            data={brokenLinks}
            columns={brokenColumns}
            searchable
            searchKeys={['link_to', 'link_from', 'url', 'page_from']}
            emptyMessage="No broken links found"
          />
        </div>
      </div>

      {/* Redirect Chains Table */}
      {redirectChains.length > 0 && (
        <div>
          <h3 className="font-display text-lg mb-4">
            Redirect Chains
            <span className="text-ash-500 text-sm ml-2">({redirectChains.length})</span>
          </h3>
          <div className="card p-4">
            <DataTable
              data={redirectChains}
              columns={chainColumns}
              emptyMessage="No redirect chains found"
            />
          </div>
        </div>
      )}
    </div>
  );
}
