'use client';

import type { CitationsGridProps } from './types';

const TIER_CONFIG = {
  critical: { label: 'Critical', color: 'text-flame-500', border: 'border-flame-500/30' },
  high: { label: 'High', color: 'text-ember-500', border: 'border-ember-500/30' },
  medium: { label: 'Medium', color: 'text-ash-300', border: 'border-ash-300/30' },
  low: { label: 'Low', color: 'text-ash-400', border: 'border-ash-400/30' },
} as const;

const TIERS = ['critical', 'high', 'medium', 'low'] as const;

export default function CitationsGrid({ citations }: CitationsGridProps) {
  const foundCount = citations.filter((c) => c.found).length;
  const totalCount = citations.length || 45;
  const progressPercent = Math.round((foundCount / totalCount) * 100);

  const grouped = TIERS.reduce(
    (acc, tier) => {
      acc[tier] = citations.filter((c) => c.tier === tier);
      return acc;
    },
    {} as Record<(typeof TIERS)[number], typeof citations>,
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-white">Citation Coverage</h3>
          <span className="text-ash-300 text-sm">
            <span className="text-white font-semibold">{foundCount}</span> / {totalCount} citations
            found
          </span>
        </div>
        <div className="w-full h-3 bg-char-900 rounded-lg overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ember-500 to-flame-500 rounded-lg transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-ash-400 text-xs mt-2">{progressPercent}% coverage</p>
      </div>

      {/* Tier Sections */}
      {TIERS.map((tier) => {
        const items = grouped[tier];
        if (!items || items.length === 0) return null;

        const tierFoundCount = items.filter((c) => c.found).length;
        const config = TIER_CONFIG[tier];

        return (
          <div key={tier}>
            <div className="flex items-center gap-3 mb-3">
              <h4 className={`font-display text-sm font-semibold ${config.color}`}>
                {config.label}
              </h4>
              <span className="text-ash-500 text-xs">
                {tierFoundCount} / {items.length} found
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((citation) => (
                <div
                  key={`${citation.domain}-${citation.name}`}
                  className={`card p-3 border ${citation.found ? 'border-green-500/20' : 'border-red-500/10'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white text-sm truncate">{citation.name}</span>
                    {citation.found ? (
                      <span className="text-success text-xs font-medium whitespace-nowrap flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Found
                      </span>
                    ) : (
                      <span className="text-danger text-xs font-medium whitespace-nowrap">
                        Missing
                      </span>
                    )}
                  </div>
                  <p className="text-ash-500 text-xs mt-1 truncate">{citation.domain}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
