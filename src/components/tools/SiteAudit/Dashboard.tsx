'use client';

import { useState } from 'react';
import type { DashboardProps, TabId } from './types';
import ScoreOverview from './ScoreOverview';
import dynamic from 'next/dynamic';

// Lazy load heavy tab components
const IssuesTab = dynamic(() => import('./IssuesTab'));
const PagesTab = dynamic(() => import('./PagesTab'));
const QuickWins = dynamic(() => import('./QuickWins'));

export default function Dashboard({ results, activeTab, onTabChange }: DashboardProps) {
  const [quickWinCompletions, setQuickWinCompletions] = useState<Record<string, boolean>>({});

  const tabs: Array<{ id: TabId; name: string; badge?: number }> = [
    { id: 'overview', name: 'Overview' },
    {
      id: 'issues',
      name: 'Issues',
      badge: results.issuesCritical + results.issuesWarning,
    },
    { id: 'pages', name: 'Pages', badge: results.pageCount },
  ];

  function handleToggleQuickWin(id: string) {
    setQuickWinCompletions(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
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
                a.download = `site-audit-${results.domain}-${new Date().toISOString().split('T')[0]}.json`;
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

      {/* Quick Wins Section (always visible) */}
      {results.quickWins.length > 0 && (
        <QuickWins
          quickWins={results.quickWins.map(qw => ({
            ...qw,
            completed: quickWinCompletions[qw.id] || false,
          }))}
          onToggleComplete={handleToggleQuickWin}
        />
      )}

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
          <ScoreOverview
            overallScore={results.overallScore}
            categoryScores={results.categoryScores}
            lighthouseScores={results.lighthouseScores}
          />
        )}

        {activeTab === 'issues' && <IssuesTab issues={results.issues} />}

        {activeTab === 'pages' && <PagesTab pages={results.pages} />}
      </div>

      {/* Footer */}
      <div className="card p-4 text-center text-sm text-ash-500">
        <p>
          API Cost: ${results.apiCost.toFixed(4)} • Scan ID: {results.auditId.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}
