'use client';

import type { ChecklistResult, ChecklistItem } from '@/types';

interface PublishChecklistProps {
  result: ChecklistResult;
  onPublish?: () => void;
  publishing?: boolean;
}

function CheckIcon({ passed }: { passed: boolean }) {
  if (passed) {
    return (
      <svg className="w-4 h-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4 text-ember-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

function ChecklistRow({ item, isWarning }: { item: ChecklistItem; isWarning?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {isWarning ? <WarningIcon /> : <CheckIcon passed={item.passed} />}
      <div className="min-w-0">
        <span className={`text-sm ${item.passed ? 'text-ash-200' : isWarning ? 'text-ember-400' : 'text-red-300'}`}>
          {item.label}
        </span>
        {item.detail && (
          <p className={`text-xs mt-0.5 ${isWarning ? 'text-ember-400/70' : 'text-red-400/70'}`}>
            {item.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PublishChecklist({ result, onPublish, publishing }: PublishChecklistProps) {
  return (
    <div className="publish-checklist">
      <h4 className="text-sm font-semibold text-ash-100 mb-3">
        Publish Checklist
      </h4>

      <div className="space-y-1 mb-4">
        {/* Show blocking items first */}
        {result.blocking.map((item, i) => (
          <ChecklistRow key={`block-${i}`} item={item} />
        ))}

        {/* Then warnings */}
        {result.warnings.map((item, i) => (
          <ChecklistRow key={`warn-${i}`} item={item} isWarning />
        ))}

        {/* All-clear message */}
        {result.passed && result.warnings.length === 0 && (
          <div className="flex items-center gap-2 py-1.5">
            <CheckIcon passed />
            <span className="text-sm text-success">All checks passed</span>
          </div>
        )}
      </div>

      {/* Publish button */}
      {onPublish && (
        <button
          onClick={onPublish}
          disabled={!result.passed || publishing}
          className="btn-primary w-full text-sm"
        >
          {publishing
            ? 'Publishing...'
            : result.passed
              ? 'Publish Page'
              : 'Fix blocking issues to publish'}
        </button>
      )}

      {!result.passed && (
        <p className="text-xs text-red-400 mt-2">
          {result.blocking.length} blocking issue(s) must be resolved before publishing.
        </p>
      )}
    </div>
  );
}
