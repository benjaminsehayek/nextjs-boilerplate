'use client';

import type { RecommendationsProps } from './types';

export default function Recommendations({
  recommendations,
  title = 'Recommendations',
}: RecommendationsProps) {
  const priorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-btn bg-danger/15 text-danger">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-btn bg-ember-500/15 text-ember-500">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-btn bg-blue-500/15 text-blue-400">
            Low
          </span>
        );
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-display text-ash-300">{title}</h3>
        <div className="card p-6 text-center">
          <div className="text-3xl mb-3 text-success">✓</div>
          <p className="text-success font-display text-lg">
            No recommendations — great work!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-display text-ash-300">{title}</h3>
      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="card p-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {priorityBadge(rec.priority)}
              <span className="inline-block text-xs px-2 py-0.5 rounded-btn bg-char-900/30 text-ash-500">
                {rec.category}
              </span>
            </div>
            <h4 className="font-display text-ash-300">{rec.title}</h4>
            <p className="text-sm text-ash-400 leading-relaxed">{rec.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
