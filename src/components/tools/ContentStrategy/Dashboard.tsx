'use client';

import { useState } from 'react';
import type {
  EnhancedDashboardProps,
  EnhancedTabId,
  EnhancedCalendarItem,
  ContentCalendarItem,
  DashboardProps,
  TabId,
} from './types';
import dynamic from 'next/dynamic';
import { fmtN } from '@/lib/dataforseo';
import { funnelBadgeBg } from '@/lib/contentStrategy/funnel';

// Lazy load heavy tab components
const KeywordClusters = dynamic(() => import('./KeywordClusters'));
const KeywordTable = dynamic(() => import('./KeywordTable'));
const ContentMap = dynamic(() => import('./ContentMap'));
const ContentCalendar = dynamic(() => import('./ContentCalendar'));
const ContentGenerator = dynamic(() => import('./ContentGenerator'));
const Cannibalization = dynamic(() => import('./Cannibalization'));
const ROIExplainer = dynamic(() => import('./ROIExplainer'));

// ── Enhanced Dashboard (new 6-tab layout) ────────────────────────

export default function Dashboard(props: EnhancedDashboardProps | DashboardProps) {
  const results = props.results;
  const isEnhanced = 'enhancedKeywords' in results && !!results.enhancedKeywords;

  if (isEnhanced) {
    return <EnhancedDashboard {...(props as EnhancedDashboardProps)} />;
  }
  return <LegacyDashboard {...(props as DashboardProps)} />;
}

// ── Enhanced 6-Tab Dashboard ─────────────────────────────────────

function EnhancedDashboard({ results, activeTab, onTabChange }: EnhancedDashboardProps) {
  const enhancedKw = results.enhancedKeywords || [];
  const contentMap = results.contentMap || [];
  const calendar = results.enhancedCalendar || [];
  const gaps = contentMap.filter(i => i.status === 'gap');
  const totalRoi = results.totalRoi ?? enhancedKw.reduce((s, k) => s + k.roi, 0);
  const totalLeads = results.totalLeads ?? enhancedKw.reduce((s, k) => s + k.monthlyLeads, 0);
  const contentGaps = results.contentGaps ?? gaps.length;

  // Funnel distribution
  const funnelCounts = { bottom: 0, middle: 0, top: 0 };
  const funnelVolume = { bottom: 0, middle: 0, top: 0 };
  for (const kw of enhancedKw) {
    funnelCounts[kw.funnel]++;
    funnelVolume[kw.funnel] += kw.searchVolume;
  }

  const tabs: Array<{ id: EnhancedTabId; name: string; badge?: number }> = [
    { id: 'overview', name: 'Overview' },
    { id: 'keywords', name: 'Keywords', badge: enhancedKw.length },
    { id: 'content-map', name: 'Content Map', badge: contentMap.length },
    { id: 'calendar', name: 'Calendar', badge: calendar.filter(c => c.pageType !== 'gbp').length },
    { id: 'generate', name: 'Generate', badge: gaps.length },
    { id: 'cannibalization', name: 'Cannibalization', badge: results.cannibalization.length },
  ];

  function exportJSON() {
    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-strategy-${results.domain}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
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
            <div className="flex items-center gap-3 text-sm text-ash-500">
              {results.services && results.services.length > 0 && (
                <span>{results.services.filter(s => s.enabled).length} services</span>
              )}
              {results.locations && results.locations.length > 0 && (
                <span>{results.locations.length} location{results.locations.length !== 1 ? 's' : ''}</span>
              )}
              <span>{fmtN(enhancedKw.length)} keywords</span>
              <span>Analyzed {new Date(results.analyzedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="btn-ghost text-sm">Export PDF</button>
            <button onClick={exportJSON} className="btn-ghost text-sm">Download JSON</button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Total Keywords</div>
          <div className="font-display text-2xl text-ash-100">{fmtN(enhancedKw.length)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Monthly ROI Potential</div>
          <div className="font-display text-2xl text-success">${fmtN(totalRoi)}/mo</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Monthly Leads</div>
          <div className="font-display text-2xl text-flame-500">{totalLeads.toFixed(1)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Content Gaps</div>
          <div className="font-display text-2xl text-danger">{contentGaps}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-char-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
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
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-flame-500 text-white' : 'bg-char-700 text-ash-400'
                }`}>
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
            {/* Funnel Distribution */}
            <div className="card p-6">
              <h3 className="font-display text-lg text-ash-200 mb-4">Funnel Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['bottom', 'middle', 'top'] as const).map(stage => {
                  const icons = { bottom: '💰', middle: '🔍', top: '📚' };
                  const labels = { bottom: 'Bottom (Buy)', middle: 'Middle (Compare)', top: 'Top (Learn)' };
                  const pct = enhancedKw.length ? Math.round((funnelCounts[stage] / enhancedKw.length) * 100) : 0;
                  return (
                    <div key={stage} className="p-4 bg-char-900 rounded-btn border border-char-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{icons[stage]}</span>
                        <span className={`px-2 py-0.5 rounded-btn text-xs ${funnelBadgeBg(stage)}`}>
                          {labels[stage]}
                        </span>
                      </div>
                      <div className="font-display text-2xl text-ash-100 mb-1">
                        {funnelCounts[stage]} <span className="text-sm text-ash-500">({pct}%)</span>
                      </div>
                      <div className="text-xs text-ash-500">{fmtN(funnelVolume[stage])} volume</div>
                      <div className="mt-2 h-2 bg-char-800 rounded-pill overflow-hidden">
                        <div className="h-full bg-flame-gradient" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top ROI Opportunities */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-ash-200">Top ROI Opportunities</h3>
                <button onClick={() => onTabChange('content-map')} className="text-flame-500 text-sm hover:underline">
                  View Content Map →
                </button>
              </div>
              <div className="space-y-3">
                {gaps.sort((a, b) => b.totalRoi - a.totalRoi).slice(0, 5).map((gap, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-char-900 rounded-btn border border-char-700 hover:border-flame-500/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{gap.type === 'service' ? '🔧' : gap.type === 'location' ? '📍' : '📝'}</span>
                        <span className="font-display text-ash-200">{gap.title}</span>
                        <span className="px-2 py-0.5 rounded-btn text-xs bg-danger/20 text-danger">gap</span>
                      </div>
                      <div className="text-xs text-ash-500">
                        {gap.keywords.length} keywords · {fmtN(gap.totalVolume)} volume
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-success">${fmtN(gap.totalRoi)}/mo</div>
                      <div className="text-xs text-ash-500">ROI potential</div>
                    </div>
                  </div>
                ))}
                {gaps.length === 0 && (
                  <div className="p-8 text-center text-ash-500">No content gaps found</div>
                )}
              </div>
            </div>

            {/* ROI Model Explainer */}
            <ROIExplainer />

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
                    <button onClick={() => onTabChange('cannibalization')} className="btn-primary text-sm">
                      Review Issues
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'keywords' && (
          <KeywordTable keywords={enhancedKw} />
        )}

        {activeTab === 'content-map' && (
          <ContentMap items={contentMap} />
        )}

        {activeTab === 'calendar' && (
          <ContentCalendar items={calendar} />
        )}

        {activeTab === 'generate' && (
          <ContentGenerator
            items={contentMap}
            domain={results.domain}
            industry={results.clusters?.[0]?.intent || ''}
          />
        )}

        {activeTab === 'cannibalization' && (
          <Cannibalization
            issues={results.cannibalization}
            onResolve={(id) => { console.log('Resolved:', id); }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="card p-4 text-center text-sm text-ash-500">
        <p>API Cost: ${results.apiCost.toFixed(4)} · Strategy ID: {results.strategyId.slice(0, 8)}...</p>
      </div>
    </div>
  );
}

// ── Legacy 4-Tab Dashboard (backward compat) ─────────────────────

function LegacyDashboard({ results, activeTab, onTabChange }: DashboardProps) {
  const [calendarUpdates, setCalendarUpdates] = useState<Record<string, Partial<ContentCalendarItem>>>({});

  const tabs: Array<{ id: TabId; name: string; badge?: number }> = [
    { id: 'overview', name: 'Overview' },
    { id: 'clusters', name: 'Keyword Clusters', badge: results.clusters.length },
    { id: 'calendar', name: 'Content Calendar', badge: results.calendar.length },
    { id: 'cannibalization', name: 'Cannibalization', badge: results.cannibalization.length },
  ];

  function handleCalendarUpdate(id: string, updates: Partial<ContentCalendarItem>) {
    setCalendarUpdates(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...updates } }));
  }

  function handleExportCalendar() {
    const csv = [
      ['Title', 'Priority', 'Content Type', 'Est. Traffic', 'Est. Value', 'Publish Date', 'Status', 'Keywords'].join(','),
      ...results.calendar.map(item =>
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

  const updatedCalendar = results.calendar.map(item => ({
    ...item,
    ...(calendarUpdates[item.id] || {}),
  }));

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
              Analyzed {new Date(results.analyzedAt).toLocaleDateString()} at{' '}
              {new Date(results.analyzedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="btn-ghost">Export PDF</button>
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
              Download JSON
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-char-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
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
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-flame-500 text-white' : 'bg-char-700 text-ash-400'
                }`}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Keywords', value: fmtN(results.totalKeywords), icon: '🎯', color: '' },
                { label: 'Total Search Volume', value: fmtN(results.totalSearchVolume), icon: '📊', color: '' },
                { label: 'Est. Monthly Traffic', value: fmtN(results.estimatedMonthlyTraffic), icon: '📈', color: 'text-flame-500' },
                { label: 'Est. Monthly Value', value: `$${fmtN(results.estimatedMonthlyValue)}`, icon: '💰', color: 'text-success' },
              ].map((stat, i) => (
                <div key={i} className="card p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-char-800 flex items-center justify-center">
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                    <div>
                      <div className="text-xs text-ash-500 mb-1">{stat.label}</div>
                      <div className={`font-display text-2xl ${stat.color || 'text-ash-100'}`}>{stat.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Intent Distribution */}
            <div className="card p-6">
              <h3 className="font-display text-lg text-ash-200 mb-4">Keyword Clusters by Intent</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['informational', 'navigational', 'transactional', 'commercial'] as const).map(intent => {
                  const count = results.clusters.filter(c => c.intent === intent).length;
                  const volume = results.clusters.filter(c => c.intent === intent).reduce((s, c) => s + c.totalVolume, 0);
                  const icons = { informational: '📚', navigational: '🧭', transactional: '💳', commercial: '🛍️' };
                  return (
                    <div key={intent} className="p-4 bg-char-900 rounded-btn border border-char-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{icons[intent]}</span>
                        <div className="text-sm font-display text-ash-300 capitalize">{intent}</div>
                      </div>
                      <div className="font-display text-2xl text-ash-100 mb-1">{count}</div>
                      <div className="text-xs text-ash-500">{fmtN(volume)} volume</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Opportunities */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-ash-200">Top Content Opportunities</h3>
                <button onClick={() => onTabChange('calendar')} className="text-flame-500 text-sm hover:underline">
                  View Full Calendar →
                </button>
              </div>
              <div className="space-y-3">
                {results.opportunities.slice(0, 5).map((opp, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-char-900 rounded-btn border border-char-700 hover:border-flame-500/30 transition-colors">
                    <div className="flex-1">
                      <div className="font-display text-ash-200 mb-1">{opp.cluster.name}</div>
                      <div className="flex items-center gap-2 text-xs text-ash-500">
                        <span className={`px-2 py-1 rounded-btn ${
                          opp.priority === 'high' ? 'bg-danger/10 text-danger'
                            : opp.priority === 'medium' ? 'bg-warning/10 text-warning'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>{opp.priority} priority</span>
                        <span>·</span>
                        <span>{opp.recommendedType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-ash-500 mb-1">Est. Traffic</div>
                        <div className="font-display text-flame-500">{fmtN(opp.estimatedTraffic)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-ash-500 mb-1">Est. Value</div>
                        <div className="font-display text-success">${fmtN(opp.estimatedValue)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {results.cannibalization.length > 0 && (
              <div className="card p-6 bg-warning/5 border-warning/30">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="font-display text-lg text-warning mb-2">Cannibalization Issues Detected</h3>
                    <p className="text-sm text-ash-300 mb-3">
                      Found {results.cannibalization.length} potential cannibalization{' '}
                      {results.cannibalization.length === 1 ? 'issue' : 'issues'}.
                    </p>
                    <button onClick={() => onTabChange('cannibalization')} className="btn-primary text-sm">Review Issues</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clusters' && (
          <KeywordClusters clusters={results.clusters} onClusterSelect={(c) => console.log('Selected:', c)} />
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={handleExportCalendar} className="btn-ghost text-sm">Export CSV</button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-char-700">
                    <th className="p-3 text-left text-xs text-ash-500">Title</th>
                    <th className="p-3 text-left text-xs text-ash-500">Priority</th>
                    <th className="p-3 text-left text-xs text-ash-500">Type</th>
                    <th className="p-3 text-left text-xs text-ash-500">Traffic</th>
                    <th className="p-3 text-left text-xs text-ash-500">Value</th>
                    <th className="p-3 text-left text-xs text-ash-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-char-800">
                  {updatedCalendar.map(item => (
                    <tr key={item.id} className="hover:bg-char-900/50">
                      <td className="p-3 font-display text-ash-200">{item.title}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-btn text-xs ${
                        item.priority === 'high' ? 'bg-danger/20 text-danger' : item.priority === 'medium' ? 'bg-warning/20 text-warning' : 'bg-blue-500/20 text-blue-400'
                      }`}>{item.priority}</span></td>
                      <td className="p-3 text-ash-400 text-xs">{item.contentType}</td>
                      <td className="p-3 text-flame-500 font-display">{fmtN(item.estimatedTraffic)}</td>
                      <td className="p-3 text-success font-display">${fmtN(item.estimatedValue)}</td>
                      <td className="p-3">
                        <select
                          value={calendarUpdates[item.id]?.status || item.status}
                          onChange={(e) => handleCalendarUpdate(item.id, { status: e.target.value as ContentCalendarItem['status'] })}
                          className="text-xs px-2 py-1 rounded-btn border border-char-700 bg-char-800 text-ash-300"
                        >
                          <option value="planned">Planned</option>
                          <option value="in-progress">In Progress</option>
                          <option value="published">Published</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'cannibalization' && (
          <Cannibalization issues={results.cannibalization} onResolve={(id) => console.log('Resolved:', id)} />
        )}
      </div>

      <div className="card p-4 text-center text-sm text-ash-500">
        <p>API Cost: ${results.apiCost.toFixed(4)} · Strategy ID: {results.strategyId.slice(0, 8)}...</p>
      </div>
    </div>
  );
}
