'use client';

import type { EnhancedOffPageResults } from './types';

interface CitationScoreCardProps {
  results: EnhancedOffPageResults;
}

function computeCitationScore(results: EnhancedOffPageResults): {
  score: number;
  citationsComponent: number;
  napComponent: number;
  gbpClaimed: boolean;
  citationsFound: number;
  citationsTotal: number;
  napConsistency: number;
} {
  const citationsFound = results.citations?.filter((c) => c.found).length ?? 0;
  const citationsTotal = Math.max(results.citations?.length ?? 0, 20);

  // NAP consistency: average napScore from locations (0-100), or 100 if no location data
  let napConsistency = 100;
  if (results.locations && results.locations.length > 0) {
    const avg =
      results.locations.reduce((sum, loc) => sum + (loc.napScore ?? 0), 0) /
      results.locations.length;
    napConsistency = Math.round(avg);
  }

  // GBP claimed: check if any location has a GBP 'claimed' item marked complete
  let gbpClaimed = false;
  if (results.locations && results.locations.length > 0) {
    gbpClaimed = results.locations.some((loc) =>
      loc.gbp?.items?.some((item) => item.label?.toLowerCase().includes('claimed') && item.status === 'complete')
    );
    // Fallback: if any location has a GBP score > 0, assume claimed
    if (!gbpClaimed) {
      gbpClaimed = results.locations.some((loc) => (loc.gbpScore ?? 0) > 0);
    }
  }

  const citationsComponent = Math.round((citationsFound / 20) * 40);
  const napComponent = Math.round((napConsistency / 100) * 30);
  const gbpComponent = gbpClaimed ? 30 : 0;
  const score = Math.min(100, citationsComponent + napComponent + gbpComponent);

  return { score, citationsComponent, napComponent, gbpClaimed, citationsFound, citationsTotal, napConsistency };
}

function scoreColor(score: number): string {
  if (score >= 71) return 'text-emerald-400';
  if (score >= 41) return 'text-amber-400';
  return 'text-danger';
}

export function CitationScoreCard({ results }: CitationScoreCardProps) {
  const { score, citationsComponent, napComponent, gbpClaimed, citationsFound, napConsistency } =
    computeCitationScore(results);

  const color = scoreColor(score);

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-ash-300 uppercase tracking-wide">Citation Score</h3>
        <div className={`text-3xl font-display ${color}`}>{score}</div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        {/* Citations bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-ash-400">Citations</span>
            <span className="text-ash-300">{citationsFound}/20 dirs</span>
          </div>
          <div className="relative h-2 bg-char-900 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-flame-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (citationsComponent / 40) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-ash-500 mt-0.5">{citationsComponent}/40 pts</div>
        </div>

        {/* NAP bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-ash-400">NAP Consistency</span>
            <span className="text-ash-300">{napConsistency}%</span>
          </div>
          <div className="relative h-2 bg-char-900 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-ember-500 rounded-full transition-all"
              style={{ width: `${napConsistency}%` }}
            />
          </div>
          <div className="text-xs text-ash-500 mt-0.5">{napComponent}/30 pts</div>
        </div>

        {/* GBP status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-ash-400">GBP</span>
          <span className={`text-xs font-medium ${gbpClaimed ? 'text-emerald-400' : 'text-danger'}`}>
            {gbpClaimed ? '✓ Claimed' : '✗ Not found'}
          </span>
        </div>
      </div>
    </div>
  );
}
