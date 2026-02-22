'use client';

import type { LinkVelocityProps } from './types';

const TREND_CONFIG = {
  growing: { label: 'Growing', color: 'text-success', bg: 'bg-green-500/10' },
  stable: { label: 'Stable', color: 'text-heat-500', bg: 'bg-yellow-500/10' },
  declining: { label: 'Declining', color: 'text-danger', bg: 'bg-red-500/10' },
} as const;

export default function LinkVelocity({ data }: LinkVelocityProps) {
  const { months, trend, netChange } = data;

  const totalNew = months.reduce((sum, m) => sum + m.newBacklinks, 0);
  const totalLost = months.reduce((sum, m) => sum + m.lostBacklinks, 0);
  const maxValue = Math.max(
    ...months.map((m) => Math.max(m.newBacklinks, m.lostBacklinks)),
    1,
  );

  const trendConfig = TREND_CONFIG[trend];

  const summaryCards = [
    { label: 'Total New', value: totalNew, color: 'text-success' },
    { label: 'Total Lost', value: totalLost, color: 'text-danger' },
    {
      label: 'Net Change',
      value: netChange >= 0 ? `+${netChange}` : `${netChange}`,
      color: netChange >= 0 ? 'text-success' : 'text-danger',
    },
    {
      label: 'Trend',
      value: trendConfig.label,
      color: trendConfig.color,
      isBadge: true,
      badgeBg: trendConfig.bg,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="card p-4 text-center">
            <p className="text-ash-400 text-xs mb-1">{card.label}</p>
            {card.isBadge ? (
              <span
                className={`inline-block px-3 py-1 rounded-btn text-sm font-semibold ${card.color} ${card.badgeBg}`}
              >
                {card.value}
              </span>
            ) : (
              <p className={`font-display text-xl font-bold ${card.color}`}>{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="card p-5">
        <h3 className="font-display text-sm text-white mb-4">Monthly Link Velocity</h3>
        <div className="space-y-3">
          {months.map((month) => {
            const newWidth = (month.newBacklinks / maxValue) * 100;
            const lostWidth = (month.lostBacklinks / maxValue) * 100;

            return (
              <div key={month.date} className="flex items-center gap-3">
                <span className="text-ash-400 text-xs w-20 shrink-0 text-right">
                  {month.date}
                </span>
                <div className="flex-1 space-y-1">
                  {/* New backlinks bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-4 bg-char-900 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-green-500/70 rounded-lg transition-all duration-300"
                        style={{ width: `${newWidth}%` }}
                      />
                    </div>
                    <span className="text-success text-xs w-10 text-right">
                      +{month.newBacklinks}
                    </span>
                  </div>
                  {/* Lost backlinks bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-4 bg-char-900 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-red-500/70 rounded-lg transition-all duration-300"
                        style={{ width: `${lostWidth}%` }}
                      />
                    </div>
                    <span className="text-danger text-xs w-10 text-right">
                      -{month.lostBacklinks}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500/70" />
            <span className="text-ash-400 text-xs">New</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500/70" />
            <span className="text-ash-400 text-xs">Lost</span>
          </div>
        </div>
      </div>
    </div>
  );
}
