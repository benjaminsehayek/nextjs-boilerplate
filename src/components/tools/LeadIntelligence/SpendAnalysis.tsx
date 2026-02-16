'use client';

import type { SpendAnalysisProps, Platform } from './types';

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: string; color: string }> = {
  google_ads: { name: 'Google Ads', icon: '🎯', color: 'text-success' },
  lsa: { name: 'LSA', icon: '🛠️', color: 'text-ember-500' },
  meta: { name: 'Meta Ads', icon: '📘', color: 'text-info' },
  search_console: { name: 'Search Console', icon: '🔍', color: 'text-flame-500' },
  gbp: { name: 'Google Business', icon: '📍', color: 'text-danger' },
};

export default function SpendAnalysis({ spendBreakdown, totalSpend, timeRange }: SpendAnalysisProps) {
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Sort by spend descending
  const sortedBreakdown = [...spendBreakdown].sort((a, b) => b.spend - a.spend);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display text-ash-200 mb-1">Ad Spend Analysis</h2>
          <p className="text-sm text-ash-400">Last {timeRange} days spending breakdown</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ash-500 mb-1">Total Spend</p>
          <p className="text-2xl font-display text-danger">{formatCurrency(totalSpend)}</p>
        </div>
      </div>

      {/* Visual Spend Breakdown */}
      {sortedBreakdown.length > 0 && (
        <div className="mb-6">
          <div className="h-8 rounded-full overflow-hidden flex">
            {sortedBreakdown.map((item, index) => {
              const config = PLATFORM_CONFIG[item.platform];
              const colors = [
                'bg-success',
                'bg-ember-500',
                'bg-info',
                'bg-flame-500',
                'bg-danger',
              ];

              return (
                <div
                  key={item.platform}
                  className={`${colors[index % colors.length]} relative group cursor-pointer`}
                  style={{ width: `${item.percentage}%` }}
                  title={`${config.name}: ${formatCurrency(item.spend)} (${item.percentage.toFixed(1)}%)`}
                >
                  {item.percentage > 10 && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-display text-white">
                      {item.percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform Details */}
      <div className="space-y-3">
        {sortedBreakdown.map((item) => {
          const config = PLATFORM_CONFIG[item.platform];
          const isPositiveROI = item.roi > 0;

          return (
            <div key={item.platform} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h3 className={`font-display text-sm ${config.color}`}>{config.name}</h3>
                    <p className="text-xs text-ash-500">{item.percentage.toFixed(1)}% of total spend</p>
                  </div>
                </div>
                <div className={`text-xl font-display ${isPositiveROI ? 'text-success' : 'text-danger'}`}>
                  {item.roi.toFixed(0)}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-ash-500 mb-1">Spend</p>
                  <p className="font-display text-danger">{formatCurrency(item.spend)}</p>
                </div>
                <div>
                  <p className="text-xs text-ash-500 mb-1">Leads</p>
                  <p className="font-display text-ash-200">{item.leads}</p>
                </div>
                <div>
                  <p className="text-xs text-ash-500 mb-1">Revenue</p>
                  <p className="font-display text-success">{formatCurrency(item.revenue)}</p>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="mt-3 h-1.5 bg-char-900 rounded-full overflow-hidden flex">
                <div
                  className="bg-danger"
                  style={{ width: `${Math.min((item.spend / (item.spend + item.revenue)) * 100, 100)}%` }}
                />
                <div
                  className="bg-success"
                  style={{ width: `${Math.min((item.revenue / (item.spend + item.revenue)) * 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sortedBreakdown.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-ash-400">No spend data available</p>
          <p className="text-sm text-ash-500 mt-1">Connect ad platforms to track spending</p>
        </div>
      )}

      {/* Summary Stats */}
      {sortedBreakdown.length > 0 && (
        <div className="mt-6 pt-6 border-t border-char-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-ash-500 mb-1">Total Leads</p>
              <p className="text-xl font-display text-ash-200">
                {sortedBreakdown.reduce((sum, item) => sum + item.leads, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-ash-500 mb-1">Total Revenue</p>
              <p className="text-xl font-display text-success">
                {formatCurrency(sortedBreakdown.reduce((sum, item) => sum + item.revenue, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-ash-500 mb-1">Avg Cost/Lead</p>
              <p className="text-xl font-display text-ash-200">
                {formatCurrency(
                  totalSpend / Math.max(1, sortedBreakdown.reduce((sum, item) => sum + item.leads, 0))
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-ash-500 mb-1">Overall ROI</p>
              <p className={`text-xl font-display ${
                sortedBreakdown.reduce((sum, item) => sum + item.roi, 0) > 0 ? 'text-success' : 'text-danger'
              }`}>
                {(
                  ((sortedBreakdown.reduce((sum, item) => sum + item.revenue, 0) - totalSpend) / totalSpend) * 100
                ).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
