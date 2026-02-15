'use client';

import type { QuickWinsProps } from './types';

export default function QuickWins({ quickWins, onToggleComplete }: QuickWinsProps) {
  const completedCount = quickWins.filter(qw => qw.completed).length;
  const totalImpact = quickWins.reduce((sum, qw) => sum + qw.impactScore, 0);
  const completedImpact = quickWins
    .filter(qw => qw.completed)
    .reduce((sum, qw) => sum + qw.impactScore, 0);

  if (quickWins.length === 0) {
    return null;
  }

  return (
    <div className="card p-6 bg-flame-500/5 border-flame-500/30">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-flame-gradient flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="text-xl font-display text-gradient-flame">
                Quick Wins
              </h3>
              <p className="text-sm text-ash-400">
                High-impact fixes you can complete quickly
              </p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-display text-flame-500">
            {completedCount}/{quickWins.length}
          </div>
          <div className="text-xs text-ash-500">Completed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-ash-400">Overall Progress</span>
          <span className="text-xs text-flame-500 font-semibold">
            {Math.round((completedCount / quickWins.length) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-char-900 rounded-pill overflow-hidden">
          <div
            className="h-full bg-flame-gradient transition-all duration-500"
            style={{ width: `${(completedCount / quickWins.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Quick Wins List */}
      <div className="space-y-3">
        {quickWins.map((quickWin, index) => (
          <div
            key={quickWin.id}
            className={`bg-char-800 rounded-btn border transition-all ${
              quickWin.completed
                ? 'border-success/30 bg-success/5'
                : 'border-char-700 hover:border-flame-500/30'
            }`}
          >
            <label className="flex items-start gap-4 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={quickWin.completed || false}
                onChange={() => onToggleComplete(quickWin.id)}
                className="mt-1 w-5 h-5 rounded accent-flame-500 cursor-pointer"
              />

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-ash-500">
                        #{index + 1}
                      </span>
                      <h4
                        className={`font-display text-sm ${
                          quickWin.completed
                            ? 'text-success line-through'
                            : 'text-ash-100'
                        }`}
                      >
                        {quickWin.title}
                      </h4>
                    </div>
                    <p
                      className={`text-xs ${
                        quickWin.completed ? 'text-ash-500' : 'text-ash-400'
                      }`}
                    >
                      {quickWin.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="tag tag-flame text-xs">
                        Impact: {quickWin.impactScore}
                      </span>
                      <span className="tag tag-info text-xs">
                        {quickWin.estimatedTime}
                      </span>
                    </div>
                    {quickWin.affectedPages > 0 && (
                      <span className="text-xs text-ash-500">
                        {quickWin.affectedPages} page{quickWin.affectedPages !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`bg-char-900 rounded p-3 text-xs mt-3 ${
                    quickWin.completed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="text-ash-500 mb-1 font-semibold">
                    💡 How to Fix:
                  </div>
                  <div className="text-ash-300">{quickWin.fix}</div>
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-char-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-display text-ash-100">
              {quickWins.length}
            </div>
            <div className="text-xs text-ash-500">Total Quick Wins</div>
          </div>
          <div>
            <div className="text-2xl font-display text-flame-500">
              {totalImpact}
            </div>
            <div className="text-xs text-ash-500">Total Impact Score</div>
          </div>
          <div>
            <div className="text-2xl font-display text-success">
              {completedImpact}
            </div>
            <div className="text-xs text-ash-500">Impact Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
