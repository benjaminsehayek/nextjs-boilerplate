'use client';

import type { EnhancedProgressTrackerProps } from './types';

const DOMAIN_TASKS: Record<string, string> = {
  'Backlink Summary': '🔗',
  'Referring Domains': '🌐',
  'Top Backlinks': '📎',
  'Anchor Text': '🏷️',
  'Link Velocity': '📈',
  'Citation Detection': '📋',
  'Social Detection': '📱',
  'Competitor Discovery': '🏆',
  'Link Gaps': '🔍',
  'Quality Assessment': '⭐',
};

const LOCATION_TASKS: Record<string, string> = {
  'GBP Profile': '🏢',
  'Reviews': '⭐',
  'NAP Analysis': '📍',
  'Brand Mentions': '💬',
};

export default function ProgressTracker({ progress, domain, locationCount }: EnhancedProgressTrackerProps) {
  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const isDomainPhase = progress.phase === 'domain';
  const domainTaskNames = Object.keys(DOMAIN_TASKS);
  const locationTaskNames = Object.keys(LOCATION_TASKS);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center animate-pulse">
            <span className="text-4xl">🔗</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Analyzing <span className="text-gradient-flame">{domain}</span>
          </h2>
          <p className="text-ash-400">
            {isDomainPhase ? 'Running domain analysis...' : 'Analyzing locations...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="input-label">Progress</span>
            <span className="font-display text-flame-500">{percentage}%</span>
          </div>
          <div className="h-3 bg-char-900 rounded-pill overflow-hidden">
            <div
              className="h-full bg-flame-gradient transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-ash-500">
            <span>{progress.completed} of {progress.total} checks complete</span>
            <span>~{Math.max(1, Math.ceil((progress.total - progress.completed) * 0.3))} min remaining</span>
          </div>
        </div>

        {/* Domain Phase Tasks */}
        <div className="mb-4">
          <div className="text-xs font-display text-ash-500 uppercase tracking-wider mb-3">Domain Analysis</div>
          <div className="space-y-2">
            {domainTaskNames.map((taskName, index) => {
              const isCompleted = progress.tasks.includes(taskName);
              const isCurrent = !isCompleted && isDomainPhase && index === progress.tasks.filter(t => domainTaskNames.includes(t)).length;

              return (
                <div
                  key={taskName}
                  className={`flex items-center gap-3 p-2.5 rounded-btn transition-all ${
                    isCompleted
                      ? 'bg-success/10 border border-success/30'
                      : isCurrent
                      ? 'bg-flame-500/10 border border-flame-500/30'
                      : 'bg-char-800 border border-char-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-success' : isCurrent ? 'bg-flame-gradient animate-pulse' : 'bg-char-700'
                  }`}>
                    {isCompleted ? (
                      <span className="text-white text-sm">✓</span>
                    ) : (
                      <span className="text-sm">{DOMAIN_TASKS[taskName]}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-display ${isCompleted ? 'text-success' : isCurrent ? 'text-flame-500' : 'text-ash-400'}`}>
                      {taskName}
                    </div>
                  </div>
                  {isCompleted && <span className="text-success text-sm">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Phase Tasks */}
        {locationCount > 0 && (
          <div>
            <div className="text-xs font-display text-ash-500 uppercase tracking-wider mb-3 mt-6">
              Location Analysis ({locationCount} location{locationCount !== 1 ? 's' : ''})
            </div>
            <div className="space-y-2">
              {locationTaskNames.map((taskName) => {
                const isCompleted = progress.tasks.includes(taskName);
                const isCurrent = !isCompleted && !isDomainPhase && progress.currentTask === taskName;

                return (
                  <div
                    key={taskName}
                    className={`flex items-center gap-3 p-2.5 rounded-btn transition-all ${
                      isCompleted
                        ? 'bg-success/10 border border-success/30'
                        : isCurrent
                        ? 'bg-flame-500/10 border border-flame-500/30'
                        : 'bg-char-800 border border-char-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? 'bg-success' : isCurrent ? 'bg-flame-gradient animate-pulse' : 'bg-char-700'
                    }`}>
                      {isCompleted ? (
                        <span className="text-white text-sm">✓</span>
                      ) : (
                        <span className="text-sm">{LOCATION_TASKS[taskName]}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-display ${isCompleted ? 'text-success' : isCurrent ? 'text-flame-500' : 'text-ash-400'}`}>
                        {taskName}
                      </div>
                    </div>
                    {isCompleted && <span className="text-success text-sm">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-char-900 rounded-btn border border-char-700">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <p className="text-sm text-ash-300">
              <strong className="text-ash-100">Comprehensive analysis</strong> — We're checking backlinks, citations across 45 directories,
              social presence, competitor link gaps, reviews, NAP consistency, and GBP completeness.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-ash-500">
        <p>You can safely navigate away. We'll save your progress and you can return to view results.</p>
      </div>
    </div>
  );
}
