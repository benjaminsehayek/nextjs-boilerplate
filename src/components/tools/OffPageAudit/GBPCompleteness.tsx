'use client';

import { ScoreRing } from '@/components/ui/ScoreRing';
import type { GBPCompletenessProps } from './types';

export default function GBPCompleteness({ gbp }: GBPCompletenessProps) {
  const totalEarned = gbp.items.reduce((sum, item) => sum + item.points, 0);
  const totalPossible = gbp.items.reduce((sum, item) => sum + item.maxPoints, 0);

  const statusIcon = (status: 'complete' | 'partial' | 'missing') => {
    switch (status) {
      case 'complete':
        return <span className="text-success text-lg">✓</span>;
      case 'partial':
        return <span className="text-ember-500 text-lg">◐</span>;
      case 'missing':
        return <span className="text-danger text-lg">✗</span>;
    }
  };

  const statusColor = (status: 'complete' | 'partial' | 'missing') => {
    switch (status) {
      case 'complete':
        return 'text-success';
      case 'partial':
        return 'text-ember-500';
      case 'missing':
        return 'text-danger';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Score Ring */}
      <div className="card p-6 flex items-center gap-6">
        <ScoreRing score={gbp.score} size={100} />
        <div>
          <h3 className="text-lg font-display text-ash-300">GBP Completeness</h3>
          <p className="text-sm text-ash-500 mt-1">
            {totalEarned} / {totalPossible} points earned
          </p>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-500/10">
              <th className="text-left text-xs text-ash-500 uppercase tracking-wide p-4">
                Item
              </th>
              <th className="text-center text-xs text-ash-500 uppercase tracking-wide p-4 w-24">
                Status
              </th>
              <th className="text-right text-xs text-ash-500 uppercase tracking-wide p-4 w-28">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {gbp.items.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-ash-500/5 last:border-b-0"
              >
                <td className="p-4 text-sm text-ash-300">{item.label}</td>
                <td className="p-4 text-center">{statusIcon(item.status)}</td>
                <td className={`p-4 text-sm text-right font-display ${statusColor(item.status)}`}>
                  {item.points} / {item.maxPoints}
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="border-t-2 border-ash-500/20 bg-char-900/30">
              <td className="p-4 text-sm font-display text-ash-300">Total</td>
              <td className="p-4" />
              <td className="p-4 text-sm text-right font-display text-flame-500">
                {totalEarned} / {totalPossible}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
