'use client';

import { useState } from 'react';
import type { DashboardProps, TabId, ContentCalendarItem } from './types';
import dynamic from 'next/dynamic';
import { fmtN } from '@/lib/dataforseo';

// Lazy load heavy tab components
const KeywordClusters = dynamic(() => import('./KeywordClusters'));
const ContentCalendar = dynamic(() => import('./ContentCalendar'));
const Cannibalization = dynamic(() => import('./Cannibalization'));

export default function Dashboard({ results, activeTab, onTabChange }: DashboardProps) {
  const [calendarUpdates, setCalendarUpdates] = useState<Record<string, Partial<ContentCalendarItem>>>({});

  const tabs: Array<{ id: TabId; name: string; badge?: number }> = [
    { id: 'overview', name: 'Overview' },
    { id: 'clusters', name: 'Keyword Clusters', badge: results.clusters.length },
    { id: 'calendar', name: 'Content Calendar', badge: results.calendar.length },
    { id: 'cannibalization', name: 'Cannibalization', badge: results.cannibalization.length },
  ];

  function handleCalendarUpdate(id: string, updates: Partial<ContentCalendarItem>) {
    setCalendarUpdates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...updates },
    }));
  }

  function handleExportCalendar() {
    const csv = [
      ['Title', 'Priority', 'Content Type', 'Est. Traffic', 'Est. Value', 'Publish Date', 'Status', 'Keywords'].join(','),
      ...results.calendar.map((item) =>
        [
          `"${item.title}"`,
          item.priority,
          item.contentType,
          item.estimatedTraffic,
          `$${item.estimatedValue.toFixed(2)}`,
          item.publishDate,
          calendarUpdates[item.id]?.status || item.status,
          `"${item.targetKeywords.join('; ')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-calendar-${results.domain}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const updatedCalendar = results.calendar.map((item) => ({
    ...item,
    ...(calendarUpdates[item.id] || {}),
  }));

  return (
    <div className="space-y-6">
      {/* Header with Domain and Export */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display mb-1">
              <span className="text-gradient-flame">{results.domain}</span>
            </h2>
            <p className="text-sm text-ash-500">
              Analyzed {new Date(results.analyzedAt).toLocaleDateString()} at{' '}
              {new Date(results.analyzedAt).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="btn-ghost"
            >
              <span className="flex items-center gap-2">
                <span>📄</span>
                Export PDF
              </span>
            </button>

            <button
              onClick={() => {
                const data = JSON.stringify(results, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `content-strategy-${results.domain}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="btn-ghost"
            >
              <span className="flex items-center gap-2">
                <span>💾</span>
                Download JSON
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-char-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-6 py-3 font-display text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-flame-500 text-flame-500'
                  : 'text-ash-400 hover:text-ash-200'
              }`}
            >
              {tab.name}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-flame-500 text-white'
                      : 'bg-char-700 text-ash-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-flame-gradient flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div>
                    <div className="text-xs text-ash-500 mb-1">Total Keywords</div>
                    <div className="font-display text-2xl text-ash-100">
                      {fmtN(results.totalKeywords)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <div className="text-xs text-ash-500 mb-1">Total Search Volume</div>
                    <div className="font-display text-2xl text-ash-100">
                      {fmtN(results.totalSearchVolume)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-flame-500/20 flex items-center justify-center">
                    <span className="text-2xl">📈</span>
                  </div>
                  <div>
                    <div className="text-xs text-ash-500 mb-1">Est. Monthly Traffic</div>
                    <div className="font-display text-2xl text-flame-500">
                      {fmtN(results.estimatedMonthlyTraffic)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div>
                    <div className="text-xs text-ash-500 mb-1">Est. Monthly Value</div>
                    <div className="font-display text-2xl text-success">
                      ${fmtN(results.estimatedMonthlyValue)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clusters Overview */}
            <div className="card p-6">
              <h3 className="font-display text-lg text-ash-200 mb-4">
                Keyword Clusters by Intent
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['informational', 'navigational', 'transactional', 'commercial'].map((intent) => {
                  const count = results.clusters.filter((c) => c.intent === intent).length;
                  const volume = results.clusters
                    .filter((c) => c.intent === intent)
                    .reduce((sum, c) => sum + c.totalVolume, 0);

                  const icons = {
                    informational: '📚',
                    navigational: '🧭',
                    transactional: '💳',
                    commercial: '🛍️',
                  };

                  return (
                    <div
                      key={intent}
                      className="p-4 bg-char-900 rounded-btn border border-char-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{icons[intent as keyof typeof icons]}</span>
                        <div className="text-sm font-display text-ash-300 capitalize">
                          {intent}
                        </div>
                      </div>
                      <div className="font-display text-2xl text-ash-100 mb-1">
                        {count}
                      </div>
                      <div className="text-xs text-ash-500">
                        {fmtN(volume)} volume
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Opportunities */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-ash-200">
                  Top Content Opportunities
                </h3>
                <button
                  onClick={() => onTabChange('calendar')}
                  className="text-flame-500 text-sm hover:underline"
                >
                  View Full Calendar →
                </button>
              </div>
              <div className="space-y-3">
                {results.opportunities.slice(0, 5).map((opp, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-char-900 rounded-btn border border-char-700 hover:border-flame-500/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-display text-ash-200 mb-1">
                        {opp.cluster.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ash-500">
                        <span className={`px-2 py-1 rounded-btn ${
                          opp.priority === 'high'
                            ? 'bg-danger/10 text-danger'
                            : opp.priority === 'medium'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {opp.priority} priority
                        </span>
                        <span>•</span>
                        <span>{opp.recommendedType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-ash-500 mb-1">Est. Traffic</div>
                        <div className="font-display text-flame-500">
                          {fmtN(opp.estimatedTraffic)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-ash-500 mb-1">Est. Value</div>
                        <div className="font-display text-success">
                          ${fmtN(opp.estimatedValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cannibalization Alert */}
            {results.cannibalization.length > 0 && (
              <div className="card p-6 bg-warning/5 border-warning/30">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="font-display text-lg text-warning mb-2">
                      Cannibalization Issues Detected
                    </h3>
                    <p className="text-sm text-ash-300 mb-3">
                      Found {results.cannibalization.length} potential keyword cannibalization{' '}
                      {results.cannibalization.length === 1 ? 'issue' : 'issues'} where multiple pages compete for the same keywords.
                    </p>
                    <button
                      onClick={() => onTabChange('cannibalization')}
                      className="btn-primary text-sm"
                    >
                      Review Issues
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clusters' && (
          <KeywordClusters
            clusters={results.clusters}
            onClusterSelect={(cluster) => {
              console.log('Selected cluster:', cluster);
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <ContentCalendar
            items={updatedCalendar}
            onItemUpdate={handleCalendarUpdate}
            onExport={handleExportCalendar}
          />
        )}

        {activeTab === 'cannibalization' && (
          <Cannibalization
            issues={results.cannibalization}
            onResolve={(id) => {
              console.log('Resolved issue:', id);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="card p-4 text-center text-sm text-ash-500">
        <p>
          API Cost: ${results.apiCost.toFixed(4)} • Strategy ID: {results.strategyId.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}
