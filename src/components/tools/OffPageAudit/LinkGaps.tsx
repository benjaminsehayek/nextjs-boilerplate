'use client';

import type { LinkGapsProps } from './types';

const TIER_CONFIG = {
  high: { label: 'High', color: 'text-danger', bg: 'bg-red-500/10' },
  medium: { label: 'Medium', color: 'text-heat-500', bg: 'bg-yellow-500/10' },
  low: { label: 'Low', color: 'text-ember-500', bg: 'bg-blue-500/10' },
} as const;

const TIER_ORDER = { high: 0, medium: 1, low: 2 } as const;

export default function LinkGaps({ gaps }: LinkGapsProps) {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ash-400">No link gap opportunities found</p>
      </div>
    );
  }

  const sorted = [...gaps].sort((a, b) => {
    const tierDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return b.domainRank - a.domainRank;
  });

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm text-white">Link Gap Opportunities</h3>
          <span className="text-ash-300 text-sm">
            <span className="text-white font-semibold">{gaps.length}</span> opportunities found
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-ash-400 text-xs font-medium">Domain</th>
              <th className="px-4 py-3 text-ash-400 text-xs font-medium text-right">
                Domain Rank
              </th>
              <th className="px-4 py-3 text-ash-400 text-xs font-medium text-right">
                # Competitors
              </th>
              <th className="px-4 py-3 text-ash-400 text-xs font-medium text-center">Tier</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((gap, index) => {
              const tierConfig = TIER_CONFIG[gap.tier];

              return (
                <tr
                  key={`${gap.domain}-${index}`}
                  className="border-b border-white/5 last:border-0 hover:bg-char-900/30 transition-colors"
                >
                  {/* Domain */}
                  <td className="px-4 py-3">
                    <span className="text-white text-sm">{gap.domain}</span>
                  </td>

                  {/* Domain Rank */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-ash-300 text-sm">{gap.domainRank}</span>
                  </td>

                  {/* Competitor Count */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-ash-300 text-sm">{gap.competitorCount}</span>
                  </td>

                  {/* Tier Badge */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-btn text-xs font-semibold ${tierConfig.color} ${tierConfig.bg}`}
                    >
                      {tierConfig.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
