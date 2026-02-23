'use client';

import { useMemo } from 'react';
import type { TabProps } from './types';
import { StatGrid } from './shared/StatGrid';
import { IssueCard } from './shared/IssueCard';
import { formatBytes } from '@/lib/siteAudit/utils';

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

export default function OverviewTab({ results }: TabProps) {
  const { crawlData, issues } = results;
  const pages = crawlData.pages?.items || [];
  const resources = crawlData.resources?.items || [];
  const links = crawlData.links?.items || [];
  const duplicateTags = crawlData.duplicateTags?.items || [];
  const nonIndexable = crawlData.nonIndexable?.items || [];
  const redirectChains = crawlData.redirectChains?.items || [];
  const dro = crawlData.domainRankOverview;
  const psi = crawlData.pagespeedInsights;

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

  // Domain rank overview position distribution
  const org = dro?.organic;
  const totalRanking = org ? (
    org.pos_1 + org.pos_2_3 + org.pos_4_10 + org.pos_11_20 +
    org.pos_21_30 + org.pos_31_40 + org.pos_41_50 +
    org.pos_51_60 + org.pos_61_70 + org.pos_71_80 +
    org.pos_81_90 + org.pos_91_100
  ) : 0;

  // PSI CrUX category for display
  const psiMobileCategory = psi?.mobile?.fieldData?.overall_category
    ?? psi?.mobile?.originFieldData?.overall_category;
  const psiDesktopCategory = psi?.desktop?.fieldData?.overall_category
    ?? psi?.desktop?.originFieldData?.overall_category;

  function categoryColor(cat?: string) {
    if (cat === 'FAST') return 'text-success';
    if (cat === 'AVERAGE') return 'text-warning';
    if (cat === 'SLOW') return 'text-danger';
    return 'text-ash-400';
  }

  function categoryLabel(cat?: string) {
    if (!cat || cat === 'NONE') return 'No Data';
    return cat.charAt(0) + cat.slice(1).toLowerCase();
  }

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
            { value: nonIndexable.length, label: 'Non-Indexable', isWarning: nonIndexable.length > 0 },
            { value: redirectChains.length, label: 'Redirect Chains', isWarning: redirectChains.length > 0 },
            { value: formatBytes(totalImageSize), label: 'Total Image Size' },
          ]}
        />
      </div>

      {/* Domain Rank Overview — DataForSEO Labs */}
      {org && (
        <div>
          <h3 className="font-display text-lg mb-1">Organic Search Presence</h3>
          <p className="text-xs text-ash-500 mb-4">
            DataForSEO Labs · US organic rankings across all tracked keywords
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="card p-4 text-center">
              <div className="text-2xl font-display text-ash-100">{fmtN(org.count)}</div>
              <div className="text-xs text-ash-400 mt-1">Total Ranking Keywords</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-display text-success">{fmtN(org.etv)}</div>
              <div className="text-xs text-ash-400 mt-1">Est. Monthly Visits</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-display text-blue-400">{fmtUSD(org.estimated_paid_traffic_cost)}</div>
              <div className="text-xs text-ash-400 mt-1">Equivalent PPC Value</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-display text-yellow-400">{fmtN(org.pos_1 + org.pos_2_3 + org.pos_4_10)}</div>
              <div className="text-xs text-ash-400 mt-1">Top 10 Rankings</div>
            </div>
          </div>

          {/* Position Distribution Bar */}
          {totalRanking > 0 && (
            <div className="card p-4">
              <div className="text-xs text-ash-500 uppercase font-display mb-3">Position Distribution</div>
              <div className="space-y-2">
                {[
                  { label: '#1', count: org.pos_1, color: 'bg-yellow-400' },
                  { label: '#2–3', count: org.pos_2_3, color: 'bg-success' },
                  { label: '#4–10', count: org.pos_4_10, color: 'bg-blue-400' },
                  { label: '#11–20', count: org.pos_11_20, color: 'bg-ash-500' },
                  { label: '#21–50', count: org.pos_21_30 + org.pos_31_40 + org.pos_41_50, color: 'bg-char-600' },
                  { label: '#51–100', count: org.pos_51_60 + org.pos_61_70 + org.pos_71_80 + org.pos_81_90 + org.pos_91_100, color: 'bg-char-700' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-ash-400 w-14 text-right font-mono">{label}</span>
                    <div className="flex-1 bg-char-800 rounded h-5 overflow-hidden">
                      <div
                        className={`${color} h-full rounded transition-all duration-500 flex items-center px-2`}
                        style={{ width: `${Math.max((count / totalRanking) * 100, count > 0 ? 2 : 0)}%` }}
                      >
                        {count > 0 && <span className="text-[10px] font-display text-white">{count}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-ash-500 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
              {(org.is_new > 0 || org.is_lost > 0) && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-char-700 text-xs">
                  {org.is_new > 0 && (
                    <span className="text-success">+{org.is_new} new rankings</span>
                  )}
                  {org.is_lost > 0 && (
                    <span className="text-danger">−{org.is_lost} lost rankings</span>
                  )}
                  {org.is_up > 0 && (
                    <span className="text-blue-400">↑ {org.is_up} improved</span>
                  )}
                  {org.is_down > 0 && (
                    <span className="text-ash-500">↓ {org.is_down} declined</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PageSpeed Insights — Real User Data */}
      {(psiMobileCategory || psiDesktopCategory) && (
        <div>
          <h3 className="font-display text-lg mb-1">Real-User Performance (CrUX)</h3>
          <p className="text-xs text-ash-500 mb-4">
            Google PageSpeed Insights · Chrome User Experience Report field data for homepage
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {psiMobileCategory && (
              <div className="card p-4 text-center">
                <div className={`text-xl font-display ${categoryColor(psiMobileCategory)}`}>
                  {categoryLabel(psiMobileCategory)}
                </div>
                <div className="text-xs text-ash-400 mt-1">Mobile Speed</div>
              </div>
            )}
            {psiDesktopCategory && (
              <div className="card p-4 text-center">
                <div className={`text-xl font-display ${categoryColor(psiDesktopCategory)}`}>
                  {categoryLabel(psiDesktopCategory)}
                </div>
                <div className="text-xs text-ash-400 mt-1">Desktop Speed</div>
              </div>
            )}
            {psi?.mobile?.scores && (
              <div className="card p-4 text-center">
                <div className="text-xl font-display text-ash-100">{psi.mobile.scores.performance}</div>
                <div className="text-xs text-ash-400 mt-1">Mobile Perf Score</div>
              </div>
            )}
            {psi?.desktop?.scores && (
              <div className="card p-4 text-center">
                <div className="text-xl font-display text-ash-100">{psi.desktop.scores.performance}</div>
                <div className="text-xs text-ash-400 mt-1">Desktop Perf Score</div>
              </div>
            )}
          </div>

          {/* CrUX metrics table — prefer origin-level for more data coverage */}
          {(psi?.mobile?.originFieldData || psi?.mobile?.fieldData) && (() => {
            const fd = psi.mobile!.originFieldData ?? psi.mobile!.fieldData!;
            const metrics: Array<{ key: string; label: string; unit: string; good: number; poor: number; scale?: number }> = [
              { key: 'LARGEST_CONTENTFUL_PAINT_MS', label: 'LCP', unit: 'ms', good: 2500, poor: 4000 },
              { key: 'INTERACTION_TO_NEXT_PAINT', label: 'INP', unit: 'ms', good: 200, poor: 500 },
              { key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE', label: 'CLS', unit: '', good: 10, poor: 25, scale: 100 },
              { key: 'EXPERIMENTAL_TIME_TO_FIRST_BYTE', label: 'TTFB', unit: 'ms', good: 800, poor: 1800 },
            ];

            return (
              <div className="card p-4 mt-4">
                <div className="text-xs text-ash-500 uppercase font-display mb-3">Core Web Vitals (p75, origin, mobile)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.map(({ key, label, unit, good, poor, scale = 1 }) => {
                    const m = (fd as any)[key] as { percentile: number; category: string } | undefined;
                    if (!m) return null;
                    const val = Math.round(m.percentile / scale);
                    const isGood = val <= good;
                    const isPoor = val >= poor;
                    const colorClass = isGood ? 'text-success' : isPoor ? 'text-danger' : 'text-warning';
                    return (
                      <div key={key} className="text-center">
                        <div className={`text-lg font-display ${colorClass}`}>
                          {val}{unit}
                        </div>
                        <div className="text-xs text-ash-400 mt-0.5">{label}</div>
                        <div className={`text-[10px] ${colorClass}`}>{categoryLabel(m.category)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

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
                  {domainInfo.ssl_info?.valid_certificate ? 'Valid' : 'Invalid / Unknown'}
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

      {/* Speed Insights (crawl-based timing) */}
      {speedInsights && (
        <div>
          <h3 className="font-display text-lg mb-4">Crawl-Based Speed Insights</h3>
          <StatGrid
            stats={[
              { value: (speedInsights.avgLoad / 1000).toFixed(2) + 's', label: 'Avg Load Time' },
              { value: (speedInsights.avgTTFB / 1000).toFixed(2) + 's', label: 'Avg TTFB' },
              { value: speedInsights.slowPages, label: 'Slow Pages (>3s)', isWarning: speedInsights.slowPages > 0 },
              { value: speedInsights.timedCount, label: 'Timed Pages' },
            ]}
          />
        </div>
      )}
    </div>
  );
}
