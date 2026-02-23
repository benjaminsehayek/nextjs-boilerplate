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
    const broken = links.filter((l) => l.status_code >= 400 || l.status_code === 0).length;
    const redirects = links.filter((l) => l.status_code >= 300 && l.status_code < 400).length;
    const internal = links.filter((l) => l.type === 'internal').length;
    const external = links.filter((l) => l.type === 'external').length;
    const dofollow = links.filter((l) => l.dofollow === true).length;
    const nofollow = links.filter((l) => l.dofollow === false).length;

    return { total, broken, redirects, internal, external, dofollow, nofollow, chains: redirectChains.length };
  }, [links, redirectChains]);

  const brokenLinks = useMemo(
    () => links.filter((l) => l.status_code >= 400 || l.status_code === 0),
    [links]
  );

  const externalLinks = useMemo(
    () => links.filter((l) => l.type === 'external').slice(0, 200),
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
          <span className="text-danger font-display">{l.status_code || 0}</span>
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

  const externalColumns = useMemo(
    () => [
      {
        key: 'link_to',
        label: 'External URL',
        sortable: true,
        className: 'max-w-[280px]',
        render: (l: CrawledLink) => (
          <span className="font-mono text-xs text-ash-300 truncate block" title={l.link_to || l.url || ''}>
            {shortUrl(l.link_to || l.url || '', 60)}
          </span>
        ),
      },
      {
        key: 'link_from',
        label: 'From Page',
        sortable: true,
        className: 'max-w-[200px]',
        render: (l: CrawledLink) => (
          <span className="font-mono text-xs text-ash-400 truncate block" title={l.link_from || l.page_from || ''}>
            {shortUrl(l.link_from || l.page_from || '')}
          </span>
        ),
      },
      {
        key: 'dofollow',
        label: 'Follow',
        sortable: true,
        render: (l: CrawledLink) => {
          if (l.dofollow == null) return <span className="text-ash-500 text-xs">--</span>;
          return (
            <span className={`text-xs font-display ${l.dofollow ? 'text-success' : 'text-ash-400'}`}>
              {l.dofollow ? 'Dofollow' : 'Nofollow'}
            </span>
          );
        },
      },
      {
        key: 'status_code',
        label: 'Status',
        sortable: true,
        render: (l: CrawledLink) => {
          const code = l.status_code;
          const colorClass = !code || code === 0 ? 'text-ash-500' : code >= 400 ? 'text-danger' : code >= 300 ? 'text-warning' : 'text-success';
          return <span className={`font-display text-xs ${colorClass}`}>{code || '--'}</span>;
        },
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
              {urls.join(' → ')}
            </span>
          );
        },
      },
      {
        key: 'hops',
        label: 'Hops',
        sortable: true,
        render: (r: RedirectChain) => {
          const count = r.chain?.length || 1;
          return (
            <span className={`font-display ${count > 2 ? 'text-danger' : 'text-warning'}`}>
              {count}
            </span>
          );
        },
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
            { value: stats.redirects, label: 'Redirect Links', isWarning: stats.redirects > 0 },
            { value: stats.internal, label: 'Internal Links' },
            { value: stats.external, label: 'External Links' },
            { value: stats.dofollow, label: 'Dofollow' },
            { value: stats.nofollow, label: 'Nofollow' },
            { value: stats.chains, label: 'Redirect Chains', isWarning: stats.chains > 0 },
          ]}
        />
      </div>

      {/* Dofollow ratio bar */}
      {(stats.dofollow + stats.nofollow) > 0 && (
        <div className="card p-4">
          <div className="text-xs text-ash-500 uppercase font-display mb-3">Link Follow Ratio</div>
          <div className="flex rounded overflow-hidden h-6">
            <div
              className="bg-success flex items-center justify-center text-[10px] text-white font-display transition-all"
              style={{ width: `${(stats.dofollow / (stats.dofollow + stats.nofollow)) * 100}%` }}
            >
              {stats.dofollow > 0 && `${Math.round((stats.dofollow / (stats.dofollow + stats.nofollow)) * 100)}% Dofollow`}
            </div>
            <div
              className="bg-ash-600 flex items-center justify-center text-[10px] text-ash-300 font-display transition-all"
              style={{ width: `${(stats.nofollow / (stats.dofollow + stats.nofollow)) * 100}%` }}
            >
              {stats.nofollow > 0 && `${Math.round((stats.nofollow / (stats.dofollow + stats.nofollow)) * 100)}% Nofollow`}
            </div>
          </div>
        </div>
      )}

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
            emptyMessage="No broken links found — great!"
          />
        </div>
      </div>

      {/* External Links Table */}
      {externalLinks.length > 0 && (
        <div>
          <h3 className="font-display text-lg mb-4">
            External Links
            <span className="text-ash-500 text-sm ml-2">
              ({stats.external}{stats.external > 200 ? ', showing first 200' : ''})
            </span>
          </h3>
          <div className="card p-4">
            <DataTable
              data={externalLinks}
              columns={externalColumns}
              searchable
              searchKeys={['link_to', 'link_from', 'url', 'page_from']}
              pageSize={25}
              emptyMessage="No external links found"
            />
          </div>
        </div>
      )}

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
