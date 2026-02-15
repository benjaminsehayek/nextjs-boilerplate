'use client';

import { ScoreRing } from '@/components/ui/ScoreRing';
import { scoreTailwind } from '@/types';
import type { ScoreOverviewProps } from './types';

const CATEGORY_ICONS: Record<string, string> = {
  meta: '🏷️',
  content: '📝',
  links: '🔗',
  images: '🖼️',
  performance: '⚡',
  schema: '📋',
  security: '🔒',
  mobile: '📱',
};

const CATEGORY_NAMES: Record<string, string> = {
  meta: 'Meta Data',
  content: 'Content',
  links: 'Links',
  images: 'Images',
  performance: 'Performance',
  schema: 'Schema',
  security: 'Security',
  mobile: 'Mobile',
};

export default function ScoreOverview({
  overallScore,
  categoryScores,
  lighthouseScores,
}: ScoreOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="card p-8">
        <div className="text-center">
          <h3 className="text-xl font-display mb-6 text-ash-300">Overall SEO Health</h3>
          <div className="flex justify-center mb-6">
            <ScoreRing score={overallScore} size={160} />
          </div>
          <p className="text-ash-400">
            Your site scored <span className={`font-display ${scoreTailwind(overallScore)}`}>{Math.round(overallScore)}/100</span> across all categories
          </p>
        </div>
      </div>

      {/* Category Scores */}
      <div>
        <h3 className="text-lg font-display mb-4 text-ash-300">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(categoryScores).map(([category, data]) => (
            <div key={category} className="card-interactive p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-btn bg-char-900 flex items-center justify-center text-xl flex-shrink-0">
                  {CATEGORY_ICONS[category] || '📊'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-ash-400 mb-1">
                    {CATEGORY_NAMES[category] || category}
                  </div>
                  <div className={`text-2xl font-display ${scoreTailwind(data.score)}`}>
                    {Math.round(data.score)}
                  </div>
                  {data.issueCount > 0 && (
                    <div className="text-xs text-ash-500 mt-1">
                      {data.issueCount} issue{data.issueCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lighthouse Scores (if available) */}
      {lighthouseScores && (
        <div>
          <h3 className="text-lg font-display mb-4 text-ash-300">Lighthouse Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(lighthouseScores).map(([metric, score]) => (
              <div key={metric} className="card p-4 text-center">
                <div className={`text-3xl font-display mb-1 ${scoreTailwind(score)}`}>
                  {Math.round(score)}
                </div>
                <div className="text-xs text-ash-400 capitalize">
                  {metric.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-2xl font-display text-ash-100">
            {Object.values(categoryScores).reduce((sum, cat) => sum + cat.issueCount, 0)}
          </div>
          <div className="text-sm text-ash-400">Total Issues Found</div>
        </div>

        <div className="card p-5 text-center">
          <div className="text-3xl mb-2">✓</div>
          <div className="text-2xl font-display text-success">
            {Object.values(categoryScores).filter(cat => cat.score >= 80).length}
          </div>
          <div className="text-sm text-ash-400">Categories Passing</div>
        </div>

        <div className="card p-5 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-2xl font-display text-danger">
            {Object.values(categoryScores).filter(cat => cat.score < 60).length}
          </div>
          <div className="text-sm text-ash-400">Categories Need Attention</div>
        </div>
      </div>
    </div>
  );
}
