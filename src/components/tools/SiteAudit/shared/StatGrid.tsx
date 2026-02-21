'use client';

import type { StatBoxData } from '../types';

export function StatGrid({ stats }: { stats: StatBoxData[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className={
            'card p-4 text-center ' +
            (stat.isWarning ? 'border-warning/30' : '')
          }
        >
          <div className={'text-2xl font-display ' + (stat.isWarning ? 'text-warning' : '')}>
            {stat.value}
          </div>
          <div className="text-sm text-ash-300 mt-1">{stat.label}</div>
          {stat.sublabel && (
            <div className="text-xs text-ash-500 mt-0.5">{stat.sublabel}</div>
          )}
        </div>
      ))}
    </div>
  );
}
