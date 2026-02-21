'use client';

import type { ScoreOverviewProps, ScoreCategoryId, CategoryScore } from './types';
import { scoreColorClass } from '@/lib/siteAudit/utils';

const CATEGORY_ICONS: Record<string, string> = {
  meta: '🏷️',
  content: '📝',
  links: '🔗',
  resources: '📦',
  performance: '⚡',
  accessibility: '♿',
  technical: '🔧',
  seo: '🔍',
  social: '💬',
  security: '🔒',
};

export default function ScoreOverview({
  overallScore,
  categoryScores,
  lighthouseScores,
  onCategoryClick,
}: ScoreOverviewProps) {
  // SVG score ring
  const r = 68;
  const circ = 2 * Math.PI * r;
  const offset = circ - (overallScore / 100) * circ;

  return (
    <div className="space-y-6">
      {/* Score Ring + Category Cards */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Score Ring */}
          <div className="shrink-0 relative">
            <svg viewBox="0 0 160 160" width="160" height="160">
              <circle
                cx="80" cy="80" r={r}
                fill="none" stroke="var(--char-700, #374151)" strokeWidth="8"
              />
              <circle
                cx="80" cy="80" r={r}
                fill="none"
                stroke={overallScore >= 80 ? 'var(--success, #22c55e)' : overallScore >= 50 ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)'}
                strokeWidth="8"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={'text-4xl font-display ' + scoreColorClass(overallScore)}>
                {overallScore}
              </span>
              <span className="text-xs text-ash-500">Overall Health</span>
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
            {Object.entries(categoryScores)
              .filter(([k]) => k !== '_overall')
              .filter((entry): entry is [string, CategoryScore] => typeof entry[1] === 'object')
              .map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => onCategoryClick?.(key as ScoreCategoryId)}
                  className="card p-3 text-left hover:bg-char-800 transition-colors"
                  style={{ borderLeftWidth: '3px', borderLeftColor: cat.score >= 80 ? 'var(--success)' : cat.score >= 50 ? 'var(--warning)' : 'var(--danger)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{CATEGORY_ICONS[key] || '📊'}</span>
                    <span className={'font-display text-lg ' + scoreColorClass(cat.score)}>
                      {cat.score}
                    </span>
                  </div>
                  <div className="text-xs text-ash-400">{cat.label}</div>
                  {cat.issues > 0 && (
                    <div className="text-[10px] text-ash-500 mt-0.5">
                      {cat.issues} issue{cat.issues !== 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Lighthouse Scores */}
      {lighthouseScores && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(lighthouseScores).map(([metric, score]) => (
            <div key={metric} className="card p-4 text-center">
              <div className={'text-2xl font-display mb-1 ' + scoreColorClass(score)}>
                {score}
              </div>
              <div className="text-xs text-ash-400 capitalize">
                {metric.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
