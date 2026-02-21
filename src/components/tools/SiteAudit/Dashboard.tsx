'use client';

import { useState } from 'react';
import type { DashboardProps, TabId } from './types';
import ScoreOverview from './ScoreOverview';
import dynamic from 'next/dynamic';

// Lazy load tab components
const OverviewTab = dynamic(() => import('./OverviewTab'));
const IssuesTab = dynamic(() => import('./IssuesTab'));
const MetaTab = dynamic(() => import('./MetaTab'));
const ContentTab = dynamic(() => import('./ContentTab'));
const LinksTab = dynamic(() => import('./LinksTab'));
const ResourcesTab = dynamic(() => import('./ResourcesTab'));
const TechnicalTab = dynamic(() => import('./TechnicalTab'));
const PagesTab = dynamic(() => import('./PagesTab'));
const PageSpeedTab = dynamic(() => import('./PageSpeedTab'));
const SocialTab = dynamic(() => import('./SocialTab'));
const LocalRankingsTab = dynamic(() => import('./LocalRankingsTab'));
const PageHealthTab = dynamic(() => import('./PageHealthTab'));
const StructureTab = dynamic(() => import('./StructureTab'));

export default function Dashboard({ results, activeTab, onTabChange }: DashboardProps) {
  const [quickWinCompletions, setQuickWinCompletions] = useState<Record<string, boolean>>({});

  const tabs: Array<{ id: TabId; name: string; badge?: number }> = [
    { id: 'overview', name: 'Overview' },
    { id: 'issues', name: 'Issues', badge: results.issuesCritical + results.issuesWarning },
    { id: 'meta', name: 'Meta Tags', badge: results.categoryScores.meta?.issues },
    { id: 'content', name: 'Content', badge: results.categoryScores.content?.issues },
    { id: 'links', name: 'Links', badge: results.categoryScores.links?.issues },
    { id: 'resources', name: 'Resources', badge: results.categoryScores.resources?.issues },
    { id: 'technical', name: 'Technical', badge: results.categoryScores.technical?.issues },
    { id: 'pages', name: 'All Pages' },
    { id: 'pagespeed', name: 'Page Speed' },
    { id: 'social', name: 'Social/OG' },
    { id: 'localrankings', name: 'Local Rankings' },
    { id: 'pagehealth', name: 'Page Health' },
    { id: 'structure', name: 'Structure' },
  ];

  function handleCategoryClick(category: string) {
    // Map score categories to tabs
    const tabMap: Record<string, TabId> = {
      meta: 'meta',
      content: 'content',
      links: 'links',
      resources: 'resources',
      performance: 'pagespeed',
      accessibility: 'pagespeed',
      technical: 'technical',
      seo: 'overview',
      social: 'social',
      security: 'technical',
    };
    const tab = tabMap[category];
    if (tab) onTabChange(tab);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display mb-1">
              <span className="text-gradient-flame">{results.domain}</span>
            </h2>
            <p className="text-sm text-ash-500">
              {results.pageCount} pages crawled · Scanned {new Date(results.completedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="btn-ghost text-sm">
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Score Overview */}
      <ScoreOverview
        overallScore={results.overallScore}
        categoryScores={results.categoryScores}
        lighthouseScores={results.lighthouseScores}
        onCategoryClick={handleCategoryClick}
      />

      {/* Tab Navigation */}
      <div className="border-b border-char-700 -mx-1">
        <div className="flex gap-0.5 overflow-x-auto px-1 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={
                'px-4 py-2.5 font-display text-xs whitespace-nowrap transition-all border-b-2 ' +
                (activeTab === tab.id
                  ? 'border-flame-500 text-flame-500'
                  : 'border-transparent text-ash-400 hover:text-ash-200')
              }
            >
              {tab.name}
              {tab.badge != null && tab.badge > 0 && (
                <span
                  className={
                    'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ' +
                    (activeTab === tab.id
                      ? 'bg-flame-500 text-white'
                      : 'bg-char-700 text-ash-400')
                  }
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
        {activeTab === 'overview' && <OverviewTab results={results} />}
        {activeTab === 'issues' && <IssuesTab issues={results.issues} quickWins={results.quickWins} />}
        {activeTab === 'meta' && <MetaTab results={results} />}
        {activeTab === 'content' && <ContentTab results={results} />}
        {activeTab === 'links' && <LinksTab results={results} />}
        {activeTab === 'resources' && <ResourcesTab results={results} />}
        {activeTab === 'technical' && <TechnicalTab results={results} />}
        {activeTab === 'pages' && <PagesTab pages={results.crawlData.pages?.items || []} domain={results.domain} />}
        {activeTab === 'pagespeed' && <PageSpeedTab results={results} />}
        {activeTab === 'social' && <SocialTab results={results} />}
        {activeTab === 'localrankings' && <LocalRankingsTab results={results} />}
        {activeTab === 'pagehealth' && <PageHealthTab results={results} />}
        {activeTab === 'structure' && <StructureTab results={results} />}
      </div>

      {/* Footer */}
      <div className="card p-4 text-center text-sm text-ash-500">
        API Cost: ${results.apiCost.toFixed(4)} · Scan ID: {results.auditId.slice(0, 8)}
      </div>
    </div>
  );
}
