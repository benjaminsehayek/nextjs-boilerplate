'use client';

import { useState } from 'react';
import { ScoreRing } from '@/components/ui/ScoreRing';
import type { LocationTabProps } from './types';
import ReviewsPanel from './ReviewsPanel';
import GBPCompleteness from './GBPCompleteness';
import NAPConsistency from './NAPConsistency';
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

export default function LocationTab({ location, domainScore, businessName, businessCategories, onNavigateTab }: LocationTabProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['reviews']));

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={location.overallScore} size={140} />
          <div>
            <h2 className="text-2xl font-display mb-1">
              <span className="text-gradient-flame">{location.name}</span>
            </h2>
            <p className="text-ash-400">
              {location.address}, {location.city}, {location.state}
            </p>
            {location.phone && (
              <p className="text-ash-500 text-sm mt-1">{location.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-ember-500 mb-1">
            {location.reviews.rating > 0 ? `${location.reviews.rating.toFixed(1)} ★` : 'N/A'}
          </div>
          <div className="text-xs text-ash-400">Rating</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-flame-500 mb-1">{location.reviews.totalCount}</div>
          <div className="text-xs text-ash-400">Reviews</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-success mb-1">{location.gbpScore}%</div>
          <div className="text-xs text-ash-400">GBP Complete</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-ash-200 mb-1">{location.napScore}%</div>
          <div className="text-xs text-ash-400">NAP Consistency</div>
        </div>
      </div>

      {/* Score Formula */}
      <div className="card p-4 bg-char-900/30 text-center text-sm text-ash-400">
        Score = Reviews (40%) + NAP (25%) + GBP (35%)
      </div>

      {/* 3 Category Score Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="flex justify-center mb-2">
            <ScoreRing score={location.reviewsScore} size={80} showGrade={false} />
          </div>
          <div className="font-display text-sm text-ash-300">Reviews</div>
        </div>
        <div className="card p-4 text-center">
          <div className="flex justify-center mb-2">
            <ScoreRing score={location.napScore} size={80} showGrade={false} />
          </div>
          <div className="font-display text-sm text-ash-300">NAP</div>
        </div>
        <div className="card p-4 text-center">
          <div className="flex justify-center mb-2">
            <ScoreRing score={location.gbpScore} size={80} showGrade={false} />
          </div>
          <div className="font-display text-sm text-ash-300">GBP</div>
        </div>
      </div>

      {/* Domain Foundation */}
      <div className="card p-4 bg-char-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScoreRing score={domainScore} size={48} showGrade={false} />
            <div>
              <div className="font-display text-sm text-ash-300">Domain Foundation</div>
              <div className="text-xs text-ash-500">Domain analysis provides the foundation for this location</div>
            </div>
          </div>
          <button onClick={() => onNavigateTab('domain')} className="btn-ghost text-sm">
            View Domain →
          </button>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        <Section id="reviews" title="Reviews" open={openSections.has('reviews')} onToggle={toggle}
          badge={`${location.reviews.rating.toFixed(1)} ★ (${location.reviews.totalCount})`}>
          <ReviewsPanel
            reviews={location.reviews}
            businessName={businessName}
            businessCategory={businessCategories[0] || ''}
            businessCity={location.city}
            businessPhone={location.phone}
          />
        </Section>

        <Section id="gbp" title="GBP Completeness" open={openSections.has('gbp')} onToggle={toggle}
          badge={`${location.gbpScore}%`}>
          <GBPCompleteness gbp={location.gbp} />
        </Section>

        <Section id="nap" title="NAP Consistency" open={openSections.has('nap')} onToggle={toggle}
          badge={`${location.napScore}%`}>
          <NAPConsistency nap={location.nap} />
        </Section>

        {location.recommendations.length > 0 && (
          <Section id="recommendations" title="Location Recommendations" open={openSections.has('recommendations')} onToggle={toggle}
            badge={`${location.recommendations.length}`}>
            <Recommendations recommendations={location.recommendations} title="Location Recommendations" />
          </Section>
        )}

        {location.brandMentions.length > 0 && (
          <Section id="brand-mentions" title="Unlinked Brand Mentions" open={openSections.has('brand-mentions')} onToggle={toggle}
            badge={`${location.brandMentions.length}`}>
            <div className="space-y-3">
              <p className="text-sm text-ash-400 mb-3">
                These sites mention your business but don't link back. Reach out to request a backlink.
              </p>
              {location.brandMentions.map((mention, i) => (
                <div key={i} className="p-4 bg-char-900/30 rounded-lg">
                  <div className="font-display text-sm text-ash-200 mb-1">{mention.title}</div>
                  <a
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-flame-500 hover:underline truncate block mb-2"
                  >
                    {mention.url}
                  </a>
                  <p className="text-xs text-ash-400">{mention.snippet}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
