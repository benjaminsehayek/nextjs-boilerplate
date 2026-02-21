'use client';

import { useMemo } from 'react';
import type { TabProps } from './types';
import { StatGrid } from './shared/StatGrid';
import { IssueCard } from './shared/IssueCard';
import { formatBytes } from '@/lib/siteAudit/utils';

export default function OverviewTab({ results }: TabProps) {
  const { crawlData, issues } = results;
  const pages = crawlData.pages?.items || [];
  const resources = crawlData.resources?.items || [];
  const links = crawlData.links?.items || [];
  const duplicateTags = crawlData.duplicateTags?.items || [];
  const nonIndexable = crawlData.nonIndexable?.items || [];
  const redirectChains = crawlData.redirectChains?.items || [];

  const brokenLinks = links.filter((l) => l.status_code >= 400).length;
  const totalImageSize = resources
    .filter((r) => r.resource_type === 'image')
    .reduce((sum, r) => sum + (r.size || 0), 0);

  const topIssues = useMemo(
    () =>
      issues
        .filter((i) => i.severity === 'critical' || i.severity === 'warning')
        .slice(0, 10),
    [issues]
  );

  // Speed insights from pages with page_timing
  const speedInsights = useMemo(() => {
    const timedPages = pages.filter((p) => p.page_timing?.duration_time != null);
    if (timedPages.length === 0) return null;

    const loadTimes = timedPages.map((p) => p.page_timing!.duration_time!);
    const ttfbs = timedPages
      .filter((p) => p.page_timing?.waiting_time != null)
      .map((p) => p.page_timing!.waiting_time!);

    const avgLoad = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const avgTTFB = ttfbs.length > 0 ? ttfbs.reduce((a, b) => a + b, 0) / ttfbs.length : 0;
    const slowPages = loadTimes.filter((t) => t > 3000).length;

    return { avgLoad, avgTTFB, slowPages, timedCount: timedPages.length };
  }, [pages]);

  const domainInfo = crawlData.summary?.domain_info;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div>
        <h3 className="font-display text-lg mb-4">Summary</h3>
        <StatGrid
          stats={[
            { value: pages.length, label: 'Pages Crawled' },
            { value: resources.length, label: 'Total Resources' },
            { value: links.length, label: 'Links Found' },
            { value: brokenLinks, label: 'Broken Links', isWarning: brokenLinks > 0 },
            { value: duplicateTags.length, label: 'Duplicate Tags' },
            { value: nonIndexable.length, label: 'Non-Indexable' },
            { value: redirectChains.length, label: 'Redirect Chains' },
            { value: formatBytes(totalImageSize), label: 'Total Image Size' },
          ]}
        />
      </div>

      {/* Top Issues */}
      {topIssues.length > 0 && (
        <div>
          <h3 className="font-display text-lg mb-4">
            Top Issues
            <span className="text-ash-500 text-sm ml-2">({topIssues.length})</span>
          </h3>
          <div className="space-y-3">
            {topIssues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Domain Info */}
      {domainInfo && (
        <div>
          <h3 className="font-display text-lg mb-4">Domain Info</h3>
          <div className="card p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {domainInfo.name && (
                <div>
                  <div className="text-ash-500 text-xs uppercase font-display mb-1">Domain</div>
                  <div className="text-ash-200">{domainInfo.name}</div>
                </div>
              )}
              {domainInfo.server && (
                <div>
                  <div className="text-ash-500 text-xs uppercase font-display mb-1">Server</div>
                  <div className="text-ash-200">{domainInfo.server}</div>
                </div>
              )}
              {domainInfo.cms && (
                <div>
                  <div className="text-ash-500 text-xs uppercase font-display mb-1">CMS</div>
                  <div className="text-ash-200">{domainInfo.cms}</div>
                </div>
              )}
              {domainInfo.ip && (
                <div>
                  <div className="text-ash-500 text-xs uppercase font-display mb-1">IP Address</div>
                  <div className="text-ash-200 font-mono text-xs">{domainInfo.ip}</div>
                </div>
              )}
              <div>
                <div className="text-ash-500 text-xs uppercase font-display mb-1">SSL</div>
                <div className={domainInfo.ssl_info?.valid_certificate ? 'text-success' : 'text-danger'}>
                  {domainInfo.ssl_info?.valid_certificate ? 'Valid' : 'Invalid'}
                </div>
              </div>
              {domainInfo.total_pages != null && (
                <div>
                  <div className="text-ash-500 text-xs uppercase font-display mb-1">Total Pages</div>
                  <div className="text-ash-200">{domainInfo.total_pages}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Speed Insights */}
      {speedInsights && (
        <div>
          <h3 className="font-display text-lg mb-4">Speed Insights</h3>
          <StatGrid
            stats={[
              {
                value: (speedInsights.avgLoad / 1000).toFixed(2) + 's',
                label: 'Avg Load Time',
              },
              {
                value: (speedInsights.avgTTFB / 1000).toFixed(2) + 's',
                label: 'Avg TTFB',
              },
              {
                value: speedInsights.slowPages,
                label: 'Slow Pages (>3s)',
                isWarning: speedInsights.slowPages > 0,
              },
              {
                value: speedInsights.timedCount,
                label: 'Timed Pages',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
