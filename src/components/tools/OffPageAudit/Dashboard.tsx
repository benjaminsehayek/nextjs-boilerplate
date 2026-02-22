'use client';

import { useState } from 'react';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { fmtN } from '@/lib/dataforseo';
import type {
  EnhancedDashboardProps,
  EnhancedTabId,
  EnhancedOffPageResults,
  DashboardProps,
} from './types';
import dynamic from 'next/dynamic';

const DomainTab = dynamic(() => import('./DomainTab'));
const LocationTab = dynamic(() => import('./LocationTab'));
const ReferringDomains = dynamic(() => import('./ReferringDomains'));
const AnchorText = dynamic(() => import('./AnchorText'));
const CompetitorCompare = dynamic(() => import('./CompetitorCompare'));
const Recommendations = dynamic(() => import('./Recommendations'));
const BacklinkOverview = dynamic(() => import('./BacklinkOverview'));

function isEnhanced(results: any): results is EnhancedOffPageResults {
  return !!results.categoryScores;
}

export default function Dashboard(props: DashboardProps | EnhancedDashboardProps) {
  const { results, activeTab } = props;
  const onTabChange = props.onTabChange as (tab: string) => void;
  const [domainSortBy, setDomainSortBy] = useState<'backlinks' | 'domainRank' | 'toxicity'>('backlinks');

  if (!isEnhanced(results)) {
    return <LegacyDashboard results={results} activeTab={activeTab as any} onTabChange={onTabChange} domainSortBy={domainSortBy} setDomainSortBy={setDomainSortBy} />;
  }

  const enhanced = results as EnhancedOffPageResults;
  const overall = enhanced.categoryScores?.overall ?? enhanced.metrics.domainRating;
  const citationsFound = enhanced.citations?.filter(c => c.found).length ?? 0;
  const locationCount = enhanced.locations?.length ?? 0;

  const tabs: Array<{ id: EnhancedTabId; name: string; badge?: number; score?: number }> = [
    { id: 'overview', name: 'Overview' },
    { id: 'domain', name: 'Domain', score: overall },
    { id: 'anchors', name: 'Anchor Text', badge: enhanced.anchors.length },
  ];
  if (enhanced.competitors.length > 0) {
    tabs.push({ id: 'competitors', name: 'Competitors', badge: enhanced.competitors.length });
  }
  if (enhanced.locations) {
    for (const loc of enhanced.locations) {
      tabs.push({
        id: `location-${loc.locationId}`,
        name: loc.name.length > 20 ? loc.name.slice(0, 20) + '...' : loc.name,
        score: loc.overallScore,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display mb-1">
              <span className="text-gradient-flame">{enhanced.domain}</span>
            </h2>
            <p className="text-sm text-ash-500">
              Scanned {new Date(enhanced.completedAt).toLocaleDateString()} at{' '}
              {new Date(enhanced.completedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="btn-ghost">
              <span className="flex items-center gap-2"><span>📄</span>Export PDF</span>
            </button>
            <button
              onClick={() => {
                const data = JSON.stringify(enhanced, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `off-page-audit-${enhanced.domain}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="btn-ghost"
            >
              <span className="flex items-center gap-2"><span>💾</span>Download JSON</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-flame-500 mb-1">{overall}</div>
          <div className="text-xs text-ash-400">Overall Score</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-ember-500 mb-1">{fmtN(enhanced.metrics.totalBacklinks)}</div>
          <div className="text-xs text-ash-400">Total Backlinks</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-success mb-1">{citationsFound}/{enhanced.citations?.length ?? 0}</div>
          <div className="text-xs text-ash-400">Citations Found</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-ash-200 mb-1">{locationCount}</div>
          <div className="text-xs text-ash-400">Locations</div>
        </div>
      </div>

      <div className="border-b border-char-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-5 py-3 font-display text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-2 border-flame-500 text-flame-500'
                  : 'text-ash-400 hover:text-ash-200'
              }`}
            >
              {tab.name}
              {tab.score !== undefined && (
                <span className={`px-1.5 py-0.5 text-xs rounded-btn ${
                  activeTab === tab.id ? 'bg-flame-500 text-white' : 'bg-char-700 text-ash-400'
                }`}>{tab.score}</span>
              )}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-btn ${
                  activeTab === tab.id ? 'bg-flame-500 text-white' : 'bg-char-700 text-ash-400'
                }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab results={enhanced} onTabChange={onTabChange} />}
        {activeTab === 'domain' && <DomainTab results={enhanced} onNavigateTab={onTabChange} />}
        {activeTab === 'anchors' && <AnchorText anchors={enhanced.anchors} totalBacklinks={enhanced.metrics.totalBacklinks} />}
        {activeTab === 'competitors' && (
          <CompetitorCompare yourDomain={enhanced.domain} yourMetrics={enhanced.metrics} competitors={enhanced.competitors} />
        )}
        {enhanced.locations?.map(loc => (
          activeTab === `location-${loc.locationId}` && (
            <LocationTab
              key={loc.locationId}
              location={loc}
              domainScore={overall}
              businessName={enhanced.domain}
              businessCategories={[]}
              onNavigateTab={onTabChange}
            />
          )
        ))}
      </div>

      <div className="card p-4 text-center text-sm text-ash-500">
        <p>API Cost: ${enhanced.apiCost.toFixed(4)} · Audit ID: {enhanced.auditId.slice(0, 8)}...</p>
      </div>
    </div>
  );
}

function OverviewTab({ results, onTabChange }: { results: EnhancedOffPageResults; onTabChange: (tab: EnhancedTabId) => void }) {
  const overall = results.categoryScores?.overall ?? results.metrics.domainRating;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-6 mb-4">
          <ScoreRing score={overall} size={100} />
          <div>
            <h3 className="text-lg font-display text-ash-200">Domain Health</h3>
            <p className="text-sm text-ash-400">{results.domain}</p>
            <button onClick={() => onTabChange('domain')} className="text-flame-500 text-sm mt-1 hover:underline">
              View full domain analysis →
            </button>
          </div>
        </div>
        {results.categoryScores && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(results.categoryScores)
              .filter(([k]) => k !== 'overall')
              .map(([key, score]) => (
                <div key={key} className="text-center p-2 bg-char-900/30 rounded-lg">
                  <div className="text-lg font-display text-ash-200">{score}</div>
                  <div className="text-xs text-ash-500 capitalize">{key === 'localLinks' ? 'Local' : key}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {results.locations && results.locations.length > 0 && (
        <div>
          <h3 className="text-lg font-display text-ash-200 mb-4">Locations ({results.locations.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...results.locations]
              .sort((a, b) => b.overallScore - a.overallScore)
              .map(loc => (
                <button
                  key={loc.locationId}
                  onClick={() => onTabChange(`location-${loc.locationId}`)}
                  className="card-interactive p-5 text-left"
                >
                  <div className="flex items-start gap-4">
                    <ScoreRing score={loc.overallScore} size={64} showGrade={false} />
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-ash-200 truncate">{loc.name}</div>
                      <div className="text-xs text-ash-400 truncate">{loc.city}, {loc.state}</div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center">
                          <div className="text-sm font-display text-ember-500">
                            {loc.reviews.rating > 0 ? `${loc.reviews.rating.toFixed(1)}★` : 'N/A'}
                          </div>
                          <div className="text-xs text-ash-500">Rating</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-display text-ash-200">{loc.reviews.totalCount}</div>
                          <div className="text-xs text-ash-500">Reviews</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-display text-success">{loc.napScore}%</div>
                          <div className="text-xs text-ash-500">NAP</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {results.recommendations && results.recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-display text-ash-200 mb-4">All Recommendations</h3>
          <Recommendations recommendations={results.recommendations} />
        </div>
      )}
    </div>
  );
}

function LegacyDashboard({ results, activeTab, onTabChange, domainSortBy, setDomainSortBy }: {
  results: any; activeTab: string; onTabChange: (tab: any) => void;
  domainSortBy: 'backlinks' | 'domainRank' | 'toxicity';
  setDomainSortBy: (v: 'backlinks' | 'domainRank' | 'toxicity') => void;
}) {
  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'domains', name: 'Referring Domains', badge: results.referringDomains?.length },
    { id: 'anchors', name: 'Anchor Text', badge: results.anchors?.length },
  ];
  if (results.competitors?.length > 0) {
    tabs.push({ id: 'competitors', name: 'Competitors', badge: results.competitors.length });
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display mb-1"><span className="text-gradient-flame">{results.domain}</span></h2>
            <p className="text-sm text-ash-500">Scanned {new Date(results.completedAt).toLocaleDateString()}</p>
          </div>
          <button onClick={() => window.print()} className="btn-ghost">📄 Export PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-flame-500 mb-1">{results.metrics.domainRating}</div>
          <div className="text-xs text-ash-400">Domain Rating</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-ember-500 mb-1">{results.metrics.qualityScore}</div>
          <div className="text-xs text-ash-400">Quality Score</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-success mb-1">{fmtN(results.metrics.totalBacklinks)}</div>
          <div className="text-xs text-ash-400">Total Backlinks</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-ash-200 mb-1">{results.metrics.referringDomains}</div>
          <div className="text-xs text-ash-400">Referring Domains</div>
        </div>
      </div>

      <div className="border-b border-char-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className={`px-6 py-3 font-display text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'border-b-2 border-flame-500 text-flame-500' : 'text-ash-400 hover:text-ash-200'
              }`}>
              {tab.name}
              {tab.badge > 0 && <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-flame-500 text-white' : 'bg-char-700 text-ash-400'}`}>{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && <BacklinkOverview metrics={results.metrics} />}
        {activeTab === 'domains' && <ReferringDomains domains={results.referringDomains} sortBy={domainSortBy} onSortChange={setDomainSortBy} />}
        {activeTab === 'anchors' && <AnchorText anchors={results.anchors} totalBacklinks={results.metrics.totalBacklinks} />}
        {activeTab === 'competitors' && <CompetitorCompare yourDomain={results.domain} yourMetrics={results.metrics} competitors={results.competitors} />}
      </div>

      <div className="card p-4 text-center text-sm text-ash-500">
        <p>API Cost: ${results.apiCost.toFixed(4)} · Audit ID: {results.auditId.slice(0, 8)}...</p>
      </div>
    </div>
  );
}
