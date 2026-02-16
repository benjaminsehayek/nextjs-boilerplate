'use client';

import { useState } from 'react';
import type { DashboardProps, TabId } from './types';
import dynamic from 'next/dynamic';

// Lazy load heavy tab components
const BacklinkOverview = dynamic(() => import('./BacklinkOverview'));
const ReferringDomains = dynamic(() => import('./ReferringDomains'));
const AnchorText = dynamic(() => import('./AnchorText'));
const CompetitorCompare = dynamic(() => import('./CompetitorCompare'));

export default function Dashboard({ results, activeTab, onTabChange }: DashboardProps) {
  const [domainSortBy, setDomainSortBy] = useState<'backlinks' | 'domainRank' | 'toxicity'>('backlinks');

  const tabs: Array<{ id: TabId; name: string; badge?: number }> = [
    { id: 'overview', name: 'Overview' },
    {
      id: 'domains',
      name: 'Referring Domains',
      badge: results.referringDomains.length,
    },
    {
      id: 'anchors',
      name: 'Anchor Text',
      badge: results.anchors.length,
    },
  ];

  // Only show competitors tab if we have competitor data
  if (results.competitors.length > 0) {
    tabs.push({
      id: 'competitors',
      name: 'Competitors',
      badge: results.competitors.length,
    });
  }

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
              Scanned {new Date(results.completedAt).toLocaleDateString()} at{' '}
              {new Date(results.completedAt).toLocaleTimeString()}
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
                a.download = `off-page-audit-${results.domain}-${new Date().toISOString().split('T')[0]}.json`;
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

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-flame-500 mb-1">
            {results.metrics.domainRating}
          </div>
          <div className="text-xs text-ash-400">Domain Rating</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-ember-500 mb-1">
            {results.metrics.qualityScore}
          </div>
          <div className="text-xs text-ash-400">Quality Score</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-success mb-1">
            {results.metrics.totalBacklinks > 1000
              ? `${(results.metrics.totalBacklinks / 1000).toFixed(1)}K`
              : results.metrics.totalBacklinks}
          </div>
          <div className="text-xs text-ash-400">Total Backlinks</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-ash-200 mb-1">
            {results.metrics.referringDomains}
          </div>
          <div className="text-xs text-ash-400">Referring Domains</div>
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
          <BacklinkOverview metrics={results.metrics} />
        )}

        {activeTab === 'domains' && (
          <ReferringDomains
            domains={results.referringDomains}
            sortBy={domainSortBy}
            onSortChange={setDomainSortBy}
          />
        )}

        {activeTab === 'anchors' && (
          <AnchorText
            anchors={results.anchors}
            totalBacklinks={results.metrics.totalBacklinks}
          />
        )}

        {activeTab === 'competitors' && (
          <CompetitorCompare
            yourDomain={results.domain}
            yourMetrics={results.metrics}
            competitors={results.competitors}
          />
        )}
      </div>

      {/* Footer */}
      <div className="card p-4 text-center text-sm text-ash-500">
        <p>
          API Cost: ${results.apiCost.toFixed(4)} • Audit ID: {results.auditId.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}
