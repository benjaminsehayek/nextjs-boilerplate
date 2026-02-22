'use client';

import { useState } from 'react';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { fmtN } from '@/lib/dataforseo';
import type { DomainTabProps } from './types';
import CitationsGrid from './CitationsGrid';
import TopBacklinks from './TopBacklinks';
import LinkGaps from './LinkGaps';
import SocialPresence from './SocialPresence';
import LinkVelocity from './LinkVelocity';
import Recommendations from './Recommendations';

function Section({ id, title, open, onToggle, children, badge }: {
  id: string; title: string; open: boolean; onToggle: (id: string) => void;
  children: React.ReactNode; badge?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-char-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-ash-400 text-sm">{open ? '▼' : '▶'}</span>
          <h3 className="font-display text-lg text-ash-200">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 text-xs rounded-btn bg-char-700 text-ash-400">{badge}</span>
          )}
        </div>
      </button>
      {open && <div className="px-5 pb-5 border-t border-char-700 pt-4">{children}</div>}
    </div>
  );
}

export default function DomainTab({ results, onNavigateTab }: DomainTabProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['recommendations', 'citations']));

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scores = results.categoryScores;
  const overall = scores?.overall ?? results.metrics.domainRating;
  const followPct = results.metrics.totalBacklinks > 0
    ? Math.round((results.metrics.followLinks / results.metrics.totalBacklinks) * 100)
    : 0;
  const citationsFound = results.citations?.filter(c => c.found).length ?? 0;
  const citationsTotal = results.citations?.length ?? 0;
  const spamRisk = results.metrics.toxicScore < 10 ? 'Low' : results.metrics.toxicScore < 20 ? 'Moderate' : 'High';
  const spamColor = results.metrics.toxicScore < 10 ? 'text-success' : results.metrics.toxicScore < 20 ? 'text-ember-500' : 'text-danger';

  const categories = [
    { label: 'Authority', score: scores?.authority ?? 0 },
    { label: 'Citations', score: scores?.citations ?? 0 },
    { label: 'Quality', score: scores?.quality ?? 0 },
    { label: 'Local Links', score: scores?.localLinks ?? 0 },
    { label: 'Anchors', score: scores?.anchors ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Score Ring */}
      <div className="card p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={overall} size={140} />
          <div>
            <h2 className="text-2xl font-display mb-1">
              Domain Analysis: <span className="text-gradient-flame">{results.domain}</span>
            </h2>
            <p className="text-ash-400">
              Overall domain off-page SEO score based on 5 category analysis
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-flame-500 mb-1">{fmtN(results.metrics.totalBacklinks)}</div>
          <div className="text-xs text-ash-400">Backlinks</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-ember-500 mb-1">{fmtN(results.metrics.referringDomains)}</div>
          <div className="text-xs text-ash-400">Ref. Domains</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-ash-200 mb-1">{results.metrics.domainRating}</div>
          <div className="text-xs text-ash-400">Domain Rank</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-success mb-1">{citationsFound}/{citationsTotal}</div>
          <div className="text-xs text-ash-400">Citations</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-2xl font-display mb-1 ${spamColor}`}>{results.metrics.toxicScore}</div>
          <div className="text-xs text-ash-400">Spam Score</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-heat-500 mb-1">{results.linkGaps?.length ?? 0}</div>
          <div className="text-xs text-ash-400">Link Gaps</div>
        </div>
      </div>

      {/* 5 Category Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map(cat => (
          <div key={cat.label} className="card p-4 text-center">
            <div className="flex justify-center mb-2">
              <ScoreRing score={cat.score} size={80} showGrade={false} />
            </div>
            <div className="font-display text-sm text-ash-300">{cat.label}</div>
          </div>
        ))}
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {results.recommendations && results.recommendations.length > 0 && (
          <Section id="recommendations" title="Recommendations" open={openSections.has('recommendations')} onToggle={toggle} badge={`${results.recommendations.length}`}>
            <Recommendations recommendations={results.recommendations} />
          </Section>
        )}

        {results.citations && results.citations.length > 0 && (
          <Section id="citations" title="Citations" open={openSections.has('citations')} onToggle={toggle} badge={`${citationsFound}/${citationsTotal}`}>
            <CitationsGrid citations={results.citations} />
          </Section>
        )}

        <Section id="link-profile" title="Link Profile" open={openSections.has('link-profile')} onToggle={toggle}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm text-ash-400">Dofollow: {followPct}%</span>
              <span className="text-sm text-ash-400">Nofollow: {100 - followPct}%</span>
            </div>
            <div className="h-4 bg-char-900 rounded-pill overflow-hidden flex">
              <div className="bg-success h-full" style={{ width: `${followPct}%` }} />
              <div className="bg-ash-500 h-full" style={{ width: `${100 - followPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-char-900/30 rounded-lg">
                <div className="text-2xl font-display text-success">{fmtN(results.metrics.followLinks)}</div>
                <div className="text-xs text-ash-400">Dofollow Links</div>
              </div>
              <div className="p-4 bg-char-900/30 rounded-lg">
                <div className="text-2xl font-display text-ash-400">{fmtN(results.metrics.nofollowLinks)}</div>
                <div className="text-xs text-ash-400">Nofollow Links</div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="spam" title="Spam Analysis" open={openSections.has('spam')} onToggle={toggle} badge={spamRisk}>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-display ${spamColor}`}>{results.metrics.toxicScore}</div>
              <div className="text-sm text-ash-400 mt-1">Spam Score</div>
            </div>
            <div>
              <div className={`text-lg font-display ${spamColor}`}>{spamRisk} Risk</div>
              <p className="text-sm text-ash-400 mt-1">
                {results.metrics.toxicScore < 10
                  ? 'Excellent! Your backlink profile appears clean with minimal spam signals.'
                  : results.metrics.toxicScore < 20
                  ? 'Moderate spam signals detected. Review suspicious referring domains.'
                  : 'High spam score detected. Consider disavowing toxic backlinks in Google Search Console.'}
              </p>
            </div>
          </div>
        </Section>

        {results.topBacklinks && results.topBacklinks.length > 0 && (
          <Section id="top-backlinks" title="Top Backlinks" open={openSections.has('top-backlinks')} onToggle={toggle} badge={`${results.topBacklinks.length}`}>
            <TopBacklinks backlinks={results.topBacklinks} />
          </Section>
        )}

        {results.competitors.length > 0 && (
          <Section id="competitors" title="Competitors" open={openSections.has('competitors')} onToggle={toggle} badge={`${results.competitors.length}`}>
            <div className="flex items-center justify-between">
              <p className="text-ash-400">{results.competitors.length} competitor(s) analyzed</p>
              <button onClick={() => onNavigateTab('competitors')} className="btn-ghost text-sm">
                View Full Comparison →
              </button>
            </div>
          </Section>
        )}

        {results.linkGaps && results.linkGaps.length > 0 && (
          <Section id="link-gaps" title="Link Gap Opportunities" open={openSections.has('link-gaps')} onToggle={toggle} badge={`${results.linkGaps.length}`}>
            <LinkGaps gaps={results.linkGaps} />
          </Section>
        )}

        {results.toxicLinks && results.toxicLinks.length > 0 && (
          <Section id="toxic-links" title="Toxic Links" open={openSections.has('toxic-links')} onToggle={toggle} badge={`${results.toxicLinks.length}`}>
            <div className="space-y-2">
              {results.toxicLinks.map((link, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-char-900/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ash-200 truncate max-w-[200px]">{link.domain}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-btn border ${
                      link.reason === 'pbn' ? 'bg-danger/10 border-danger/30 text-danger' :
                      link.reason === 'spam_tld' ? 'bg-heat-500/10 border-heat-500/30 text-heat-500' :
                      'bg-ember-500/10 border-ember-500/30 text-ember-500'
                    }`}>
                      {link.reason === 'pbn' ? 'PBN' : link.reason === 'spam_tld' ? 'Spam TLD' : 'Random Domain'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-ash-400">
                    <span>{fmtN(link.backlinks)} links</span>
                    <span>Rank: {link.rank}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {results.socialPresence && (
          <Section id="social" title="Social Presence" open={openSections.has('social')} onToggle={toggle} badge={`${results.socialPresence.filter(s => s.found).length}/8`}>
            <SocialPresence platforms={results.socialPresence} />
          </Section>
        )}

        {results.linkVelocity && (
          <Section id="velocity" title="Link Velocity" open={openSections.has('velocity')} onToggle={toggle} badge={results.linkVelocity.trend}>
            <LinkVelocity data={results.linkVelocity} />
          </Section>
        )}
      </div>
    </div>
  );
}
