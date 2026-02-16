'use client';

import type { ChannelPerformanceProps, LeadSource, LeadMetric } from './types';

const SOURCE_CONFIG: Record<LeadSource, { name: string; color: string; bgColor: string }> = {
  ppc: { name: 'Google Ads (PPC)', color: 'text-success', bgColor: 'bg-success' },
  lsa: { name: 'Local Service Ads', color: 'text-ember-500', bgColor: 'bg-ember-500' },
  meta: { name: 'Meta Ads', color: 'text-info', bgColor: 'bg-info' },
  organic: { name: 'Organic Search', color: 'text-flame-500', bgColor: 'bg-flame-500' },
  gbp: { name: 'Google Business', color: 'text-danger', bgColor: 'bg-danger' },
  direct: { name: 'Direct Traffic', color: 'text-ash-400', bgColor: 'bg-ash-400' },
  referral: { name: 'Referral', color: 'text-heat-500', bgColor: 'bg-heat-500' },
};

const CONFIDENCE_CONFIG = {
  high: { label: 'High', color: 'text-success', bgColor: 'bg-success/10' },
  medium: { label: 'Medium', color: 'text-ember-500', bgColor: 'bg-ember-500/10' },
  low: { label: 'Low', color: 'text-danger', bgColor: 'bg-danger/10' },
};

export default function ChannelPerformance({
  metrics,
  timeRange,
  onSourceClick,
}: ChannelPerformanceProps) {
  // Sort by ROI descending
  const sortedMetrics = [...metrics].sort((a, b) => b.roi - a.roi);

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatPercent(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display text-ash-200 mb-1">Channel Performance</h2>
          <p className="text-sm text-ash-400">Last {timeRange} days ROI breakdown</p>
        </div>
      </div>

      <div className="space-y-4">
        {sortedMetrics.map((metric) => {
          const config = SOURCE_CONFIG[metric.source];
          const confidenceConfig = CONFIDENCE_CONFIG[metric.confidence];
          const isPositiveROI = metric.roi > 0;
          const isPositiveTrend = metric.trend > 0;

          return (
            <div
              key={metric.source}
              className={`card p-5 ${onSourceClick ? 'cursor-pointer hover:border-flame-500 transition-all' : ''}`}
              onClick={() => onSourceClick?.(metric.source)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${config.bgColor}`} />
                  <div>
                    <h3 className="font-display text-ash-200">{config.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${confidenceConfig.color}`}>
                        {confidenceConfig.label} confidence
                      </span>
                      {metric.trend !== 0 && (
                        <span className={`text-xs ${isPositiveTrend ? 'text-success' : 'text-danger'}`}>
                          {formatPercent(metric.trend)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-display ${isPositiveROI ? 'text-success' : 'text-danger'}`}>
                    {metric.roi.toFixed(0)}% ROI
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-ash-500 mb-1">Leads</p>
                  <p className="text-lg font-display text-ash-200">{metric.leads}</p>
                </div>
                <div>
                  <p className="text-xs text-ash-500 mb-1">Cost/Lead</p>
                  <p className="text-lg font-display text-ash-200">
                    {formatCurrency(metric.costPerLead)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ash-500 mb-1">Close Rate</p>
                  <p className="text-lg font-display text-ash-200">
                    {metric.closeRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ash-500 mb-1">Revenue/Lead</p>
                  <p className="text-lg font-display text-success">
                    {formatCurrency(metric.revenuePerLead)}
                  </p>
                </div>
              </div>

              {/* Financial Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-ash-400">
                  <span>Spend: {formatCurrency(metric.spend)}</span>
                  <span>Revenue: {formatCurrency(metric.revenue)}</span>
                </div>
                <div className="h-2 bg-char-900 rounded-full overflow-hidden flex">
                  <div
                    className="bg-danger"
                    style={{ width: `${Math.min((metric.spend / (metric.spend + metric.revenue)) * 100, 100)}%` }}
                  />
                  <div
                    className="bg-success"
                    style={{ width: `${Math.min((metric.revenue / (metric.spend + metric.revenue)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedMetrics.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-ash-400">No channel data available yet</p>
          <p className="text-sm text-ash-500 mt-1">Connect platforms to start tracking performance</p>
        </div>
      )}
    </div>
  );
}
