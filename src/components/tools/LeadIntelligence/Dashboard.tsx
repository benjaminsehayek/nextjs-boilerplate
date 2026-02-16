'use client';

import { useState } from 'react';
import type { DashboardProps, TimeRange } from './types';
import dynamic from 'next/dynamic';

// Lazy load components
const ChannelPerformance = dynamic(() => import('./ChannelPerformance'));
const SpendAnalysis = dynamic(() => import('./SpendAnalysis'));

export default function Dashboard({ data, connections, onTimeRangeChange }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'spend'>('overview');

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  const isPositiveROI = data.overallROI > 0;
  const connectedCount = connections.filter(c => c.connected).length;

  // Convert channel metrics to spend breakdown
  const spendBreakdown = data.channelMetrics
    .filter(m => m.spend > 0)
    .map(m => {
      // Map source to platform
      let platform: any = 'google_ads';
      if (m.source === 'lsa') platform = 'lsa';
      if (m.source === 'meta') platform = 'meta';
      if (m.source === 'organic') platform = 'search_console';
      if (m.source === 'gbp') platform = 'gbp';

      return {
        platform,
        spend: m.spend,
        percentage: (m.spend / data.totalSpend) * 100,
        leads: m.leads,
        revenue: m.revenue,
        roi: m.roi,
      };
    });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display text-gradient-flame mb-1">Lead Intelligence</h2>
            <p className="text-sm text-ash-400">
              {connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-char-900 rounded-btn p-1">
              {(['30', '60', '90'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => onTimeRangeChange(range)}
                  className={`px-4 py-1.5 rounded text-sm font-display transition-all ${
                    data.timeRange === range
                      ? 'bg-flame-500 text-white'
                      : 'text-ash-400 hover:text-ash-200'
                  }`}
                >
                  {range}d
                </button>
              ))}
            </div>

            <button className="btn-ghost">
              <span className="flex items-center gap-2">
                <span>📊</span>
                Export
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Total Leads</p>
          <p className="text-3xl font-display text-ash-200 mb-1">{data.totalLeads}</p>
          <p className="text-xs text-ash-500">Last {data.timeRange} days</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Total Spend</p>
          <p className="text-3xl font-display text-danger mb-1">
            {formatCurrency(data.totalSpend)}
          </p>
          <p className="text-xs text-ash-500">Across all channels</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Total Revenue</p>
          <p className="text-3xl font-display text-success mb-1">
            {formatCurrency(data.totalRevenue)}
          </p>
          <p className="text-xs text-ash-500">From converted leads</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Overall ROI</p>
          <p className={`text-3xl font-display mb-1 ${isPositiveROI ? 'text-success' : 'text-danger'}`}>
            {data.overallROI.toFixed(0)}%
          </p>
          <p className="text-xs text-ash-500">
            {isPositiveROI ? 'Profitable' : 'Needs attention'}
          </p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Avg Cost Per Lead</p>
          <p className="text-2xl font-display text-ash-200">
            {formatCurrency(data.avgCostPerLead)}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Avg Close Rate</p>
          <p className="text-2xl font-display text-ash-200">
            {data.avgCloseRate.toFixed(1)}%
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Top Channel</p>
          <p className="text-2xl font-display text-flame-500 capitalize">
            {data.topPerformingChannel.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Trend Chart */}
      {data.trendData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-display text-ash-200 mb-4">Performance Trends</h3>
          <div className="space-y-4">
            {/* Simple bar chart using CSS */}
            <div className="h-48 flex items-end gap-1">
              {data.trendData.map((point, index) => {
                const maxRevenue = Math.max(...data.trendData.map(p => p.revenue));
                const height = (point.revenue / maxRevenue) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                      <div
                        className="w-full bg-success rounded-t transition-all hover:bg-success/80 cursor-pointer"
                        style={{ height: `${height}%` }}
                        title={`${new Date(point.date).toLocaleDateString()}: ${formatCurrency(point.revenue)}`}
                      />
                    </div>
                    {index % Math.ceil(data.trendData.length / 7) === 0 && (
                      <span className="text-xs text-ash-500 mt-1">
                        {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-ash-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success" />
                <span>Revenue</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-char-700">
        <div className="flex gap-1">
          {[
            { id: 'overview' as const, name: 'Overview' },
            { id: 'channels' as const, name: 'Channel Performance' },
            { id: 'spend' as const, name: 'Spend Analysis' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-display text-sm transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-flame-500 text-flame-500'
                  : 'text-ash-400 hover:text-ash-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-display text-ash-200 mb-4">Recommendations</h3>
                <div className="space-y-3">
                  {data.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-char-900 rounded">
                      <span className="text-flame-500 text-xl">💡</span>
                      <p className="text-sm text-ash-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.channelMetrics.slice(0, 4).map((metric) => (
                <div key={metric.source} className="card p-5">
                  <h4 className="font-display text-ash-200 mb-3 capitalize">
                    {metric.source.replace('_', ' ')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-ash-500">Leads</p>
                      <p className="font-display text-ash-200">{metric.leads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ash-500">ROI</p>
                      <p className={`font-display ${metric.roi > 0 ? 'text-success' : 'text-danger'}`}>
                        {metric.roi.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <ChannelPerformance metrics={data.channelMetrics} timeRange={data.timeRange} />
        )}

        {activeTab === 'spend' && (
          <SpendAnalysis
            spendBreakdown={spendBreakdown}
            totalSpend={data.totalSpend}
            timeRange={data.timeRange}
          />
        )}
      </div>
    </div>
  );
}
