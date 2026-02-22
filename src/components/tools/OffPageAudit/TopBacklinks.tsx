'use client';

import type { TopBacklinksProps } from './types';

function getRankColor(rank: number): string {
  if (rank >= 60) return 'text-success';
  if (rank >= 30) return 'text-heat-500';
  return 'text-danger';
}

function getRankBg(rank: number): string {
  if (rank >= 60) return 'bg-green-500/10';
  if (rank >= 30) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

export default function TopBacklinks({ backlinks }: TopBacklinksProps) {
  if (!backlinks || backlinks.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ash-400">No backlink data available</p>
      </div>
    );
  }

  const sorted = [...backlinks]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 20);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h3 className="font-display text-sm text-white">
          Top Backlinks{' '}
          <span className="text-ash-500 font-normal">({sorted.length})</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-ash-400 text-xs font-medium">Domain</th>
              <th className="px-4 py-3 text-ash-400 text-xs font-medium">Anchor</th>
              <th className="px-4 py-3 text-ash-400 text-xs font-medium text-center">Type</th>
              <th className="px-4 py-3 text-ash-400 text-xs font-medium text-right">Rank</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((link, index) => (
              <tr
                key={`${link.domain}-${link.url}-${index}`}
                className="border-b border-white/5 last:border-0 hover:bg-char-900/30 transition-colors"
              >
                {/* Domain */}
                <td className="px-4 py-3">
                  <span className="text-white text-sm block max-w-[200px] truncate">
                    {link.domain}
                  </span>
                </td>

                {/* Anchor */}
                <td className="px-4 py-3">
                  <span className="text-ash-300 text-sm block max-w-[250px] truncate">
                    {link.anchor || '(no anchor)'}
                  </span>
                </td>

                {/* Follow/NoFollow Badge */}
                <td className="px-4 py-3 text-center">
                  {link.dofollow ? (
                    <span className="inline-block px-2 py-0.5 rounded-btn text-xs font-medium text-success bg-green-500/10">
                      Follow
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-btn text-xs font-medium text-ash-400 bg-char-900">
                      NoFollow
                    </span>
                  )}
                </td>

                {/* Rank */}
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-btn text-xs font-semibold ${getRankColor(link.rank)} ${getRankBg(link.rank)}`}
                  >
                    {link.rank}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
