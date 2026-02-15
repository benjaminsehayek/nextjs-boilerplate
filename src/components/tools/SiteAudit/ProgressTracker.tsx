'use client';

import type { ProgressTrackerProps } from './types';

const TASK_ICONS: Record<string, string> = {
  'Meta Data': '🏷️',
  'Content': '📝',
  'Links': '🔗',
  'Images': '🖼️',
  'Performance': '⚡',
  'Schema': '📋',
  'Security': '🔒',
  'Mobile': '📱',
};

export default function ProgressTracker({ progress, domain }: ProgressTrackerProps) {
  const percentage = Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center animate-pulse">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Analyzing <span className="text-gradient-flame">{domain}</span>
          </h2>
          <p className="text-ash-400">
            Please wait while we perform a comprehensive audit...
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
            <span>~{Math.max(1, Math.ceil((progress.total - progress.completed) * 0.5))} min remaining</span>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {Object.keys(TASK_ICONS).map((taskName, index) => {
            const isCompleted = progress.tasks.includes(taskName);
            const isCurrent = index === progress.completed && !isCompleted;

            return (
              <div
                key={taskName}
                className={`flex items-center gap-3 p-3 rounded-btn transition-all ${
                  isCompleted
                    ? 'bg-success/10 border border-success/30'
                    : isCurrent
                    ? 'bg-flame-500/10 border border-flame-500/30'
                    : 'bg-char-800 border border-char-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-success'
                      : isCurrent
                      ? 'bg-flame-gradient animate-pulse'
                      : 'bg-char-700'
                  }`}
                >
                  {isCompleted ? (
                    <span className="text-white text-xl">✓</span>
                  ) : isCurrent ? (
                    <span className="spinner-sm border-white border-t-white"></span>
                  ) : (
                    <span className="text-xl">{TASK_ICONS[taskName]}</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className={`font-display ${isCompleted ? 'text-success' : isCurrent ? 'text-flame-500' : 'text-ash-400'}`}>
                    {taskName}
                  </div>
                  <div className="text-xs text-ash-500">
                    {isCompleted ? 'Complete' : isCurrent ? 'In progress...' : 'Waiting...'}
                  </div>
                </div>

                {isCompleted && (
                  <div className="text-success text-2xl">✓</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-char-900 rounded-btn border border-char-700">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm text-ash-300">
                <strong className="text-ash-100">Did you know?</strong> We're analyzing 8 critical SEO categories including meta tags, content quality, link structure, image optimization, performance metrics, schema markup, security, and mobile responsiveness.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-ash-500">
        <p>
          You can safely navigate away. We'll save your progress and you can return to view results.
        </p>
      </div>
    </div>
  );
}
