'use client';

import type { ProgressTrackerProps } from './types';

const TASK_ICONS: Record<string, string> = {
  'Crawling Site': '\uD83D\uDD77\uFE0F',
  'Discovering Keywords': '\uD83D\uDD0D',
  'Enriching Volume Data': '\uD83D\uDCCA',
  'Classifying & Clustering': '\uD83C\uDFAF',
  'Calculating ROI': '\uD83D\uDCB0',
  'Building Content Map': '\uD83D\uDDFA\uFE0F',
  'Generating Calendar': '\uD83D\uDCC5',
  'Detecting Cannibalization': '\u26A0\uFE0F',
};

export default function ProgressTracker({ progress, domain }: ProgressTrackerProps) {
  const percentage = Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center animate-pulse">
            <span className="text-4xl">{'\uD83D\uDCDD'}</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Analyzing <span className="text-gradient-flame">{domain}</span>
          </h2>
          <p className="text-ash-400">
            Building your comprehensive content strategy...
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
            <span>{progress.completed} of {progress.total} tasks complete</span>
            <span>~{Math.max(1, Math.ceil((progress.total - progress.completed) * 0.5))} min remaining</span>
          </div>
        </div>

        {/* Current Task Highlight */}
        {progress.currentTask && (
          <div className="mb-6 p-4 bg-flame-500/10 border border-flame-500/30 rounded-btn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-flame-gradient flex items-center justify-center">
                <span className="spinner-sm border-white border-t-white"></span>
              </div>
              <div>
                <div className="font-display text-flame-500 mb-1">
                  {progress.currentTask}
                </div>
                <div className="text-xs text-ash-400">
                  Please wait...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {Object.keys(TASK_ICONS).map((taskName) => {
            const isCompleted = progress.tasks.includes(taskName);
            const isCurrent = progress.currentTask === taskName;

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
                    <span className="text-white text-xl">{'\u2713'}</span>
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
                  <div className="text-success text-2xl">{'\u2713'}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-char-900 rounded-btn border border-char-700">
          <div className="flex items-start gap-3">
            <span className="text-xl">{'\uD83D\uDCA1'}</span>
            <div>
              <p className="text-sm text-ash-300">
                <strong className="text-ash-100">What&apos;s happening?</strong> We&apos;re crawling your site, discovering keywords with ROI analysis, building a content map with gap detection, and creating a 12-week phased calendar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-ash-500">
        <p>
          You can safely navigate away. We&apos;ll save your progress and you can return to view results.
        </p>
      </div>
    </div>
  );
}
