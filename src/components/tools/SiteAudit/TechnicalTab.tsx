'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage, NonIndexablePage, RedirectChain } from './types';
import { StatGrid } from './shared/StatGrid';
import { DataTable } from './shared/DataTable';
import { shortUrl } from '@/lib/siteAudit/utils';

// Domain-level checks sourced from on_page/summary → domain_info.checks
const DOMAIN_CHECK_LABELS: Array<{ key: string; label: string; goodWhenTrue: boolean }> = [
  { key: 'sitemap', label: 'Sitemap found', goodWhenTrue: true },
  { key: 'robots_txt', label: 'Robots.txt found', goodWhenTrue: true },
  { key: 'is_https', label: 'HTTPS enabled', goodWhenTrue: true },
  { key: 'www_redirect', label: 'WWW redirect configured', goodWhenTrue: true },
  { key: 'http_to_https_redirect', label: 'HTTP → HTTPS redirect', goodWhenTrue: true },
  { key: 'no_index', label: 'Site-wide noindex', goodWhenTrue: false },
  { key: 'no_follow', label: 'Site-wide nofollow', goodWhenTrue: false },
  { key: 'redirect_loop', label: 'Redirect loop detected', goodWhenTrue: false },
];

export default function TechnicalTab({ results }: TabProps) {
  const pages = results.crawlData.pages?.items || [];
  const nonIndexable = results.crawlData.nonIndexable?.items || [];
  const redirectChains = results.crawlData.redirectChains?.items || [];
  const domainInfo = results.crawlData.summary?.domain_info;
  const domainChecks = domainInfo?.checks as Record<string, unknown> | undefined;

  const stats = useMemo(() => {
    // Use checks.is_http (consistent with issueDetection.ts)
    const httpPages = pages.filter((p) => p.checks?.is_http).length;
    const brokenPages = pages.filter((p) => p.status_code >= 400).length;
    // Use checks.no_canonical (consistent with issueDetection.ts)
    const missingCanonical = pages.filter((p) => p.checks?.no_canonical).length;
    // Fixed bug: was using is_http — mixed content = HTTPS pages with HTTP resource links
    const mixedContent = pages.filter((p) => p.checks?.https_to_http_links).length;
    const missingDoctype = pages.filter((p) => p.checks?.no_doctype).length;
    const slowPages = pages.filter(
      (p) => p.page_timing?.duration_time != null && p.page_timing.duration_time > 3000
    ).length;
    const orphanPages = pages.filter((p) => p.checks?.is_orphan_page).length;
    const metaRefresh = pages.filter((p) => p.checks?.has_meta_refresh_redirect).length;
    const notSeoFriendly = pages.filter((p) => p.checks?.seo_friendly_url === false).length;

    return {
      nonIndexable: nonIndexable.length,
      httpPages,
      brokenPages,
      redirectChains: redirectChains.length,
      missingCanonical,
      mixedContent,
      missingDoctype,
      slowPages,
      orphanPages,
      metaRefresh,
      notSeoFriendly,
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
      {
        key: 'status_code',
        label: 'Status',
        sortable: true,
        render: (p: NonIndexablePage) => (
          <span className={`font-display text-xs ${(p.status_code ?? 200) < 400 ? 'text-ash-300' : 'text-danger'}`}>
            {p.status_code || '--'}
          </span>
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

  const chainColumns = useMemo(
    () => [
      {
        key: 'chain',
        label: 'Redirect Chain',
        sortable: false,
        render: (r: RedirectChain) => {
          const hops = r.chain?.map((c) => shortUrl(c.url, 40)) || [shortUrl(r.url || '', 40)];
          return (
            <span className="font-mono text-xs text-ash-300 break-all">
              {hops.join(' → ')}
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

  const hasDomainInfo = !!(domainChecks || domainInfo?.ssl_info || domainInfo?.cms || domainInfo?.server);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div>
        <h3 className="font-display text-lg mb-4">Technical SEO</h3>
        <StatGrid
          stats={[
            { value: stats.nonIndexable, label: 'Non-Indexable Pages', isWarning: stats.nonIndexable > 0 },
            { value: stats.httpPages, label: 'HTTP (Not HTTPS) Pages', isWarning: stats.httpPages > 0 },
            { value: stats.brokenPages, label: 'Broken Pages (4xx+)', isWarning: stats.brokenPages > 0 },
            { value: stats.redirectChains, label: 'Redirect Chains', isWarning: stats.redirectChains > 0 },
            { value: stats.missingCanonical, label: 'Missing Canonical', isWarning: stats.missingCanonical > 0 },
            { value: stats.mixedContent, label: 'Mixed Content (HTTPS→HTTP)', isWarning: stats.mixedContent > 0 },
            { value: stats.missingDoctype, label: 'Missing DOCTYPE', isWarning: stats.missingDoctype > 0 },
            { value: stats.slowPages, label: 'Slow Pages (>3s)', isWarning: stats.slowPages > 0 },
            { value: stats.orphanPages, label: 'Orphan Pages', isWarning: stats.orphanPages > 0 },
            { value: stats.metaRefresh, label: 'Meta Refresh Redirects', isWarning: stats.metaRefresh > 0 },
            { value: stats.notSeoFriendly, label: 'Non-SEO-Friendly URLs', isWarning: stats.notSeoFriendly > 0 },
          ]}
        />
      </div>

      {/* Domain-Level Checks */}
      {hasDomainInfo && (
        <div>
          <h3 className="font-display text-lg mb-4">Domain-Level Checks</h3>
          <div className="card p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* SSL from domain_info.ssl_info */}
              {domainInfo?.ssl_info?.valid_certificate != null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className={domainInfo.ssl_info.valid_certificate ? 'text-success' : 'text-danger'}>
                    {domainInfo.ssl_info.valid_certificate ? '✓' : '✗'}
                  </span>
                  <span className="text-ash-300">SSL certificate valid</span>
                </div>
              )}
              {domainInfo?.cms && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ash-500">CMS:</span>
                  <span className="text-ash-200 font-medium">{domainInfo.cms}</span>
                </div>
              )}
              {domainInfo?.server && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ash-500">Server:</span>
                  <span className="text-ash-200 font-medium">{domainInfo.server}</span>
                </div>
              )}
              {domainInfo?.ip && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ash-500">IP:</span>
                  <span className="text-ash-200 font-mono text-xs">{domainInfo.ip}</span>
                </div>
              )}
              {/* Named domain checks from summary.domain_info.checks */}
              {domainChecks && DOMAIN_CHECK_LABELS.map(({ key, label, goodWhenTrue }) => {
                const val = domainChecks[key];
                if (val == null) return null;
                const isGood = goodWhenTrue ? Boolean(val) : !Boolean(val);
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className={isGood ? 'text-success' : 'text-danger'}>
                      {isGood ? '✓' : '✗'}
                    </span>
                    <span className="text-ash-300">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

      {/* Redirect Chains */}
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
