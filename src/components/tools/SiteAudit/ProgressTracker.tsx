'use client';

import { useRef, useEffect } from 'react';
import type { ProgressTrackerProps } from './types';
import { formatTime, crawlProgressPercent } from '@/lib/siteAudit/utils';

export default function ProgressTracker({ progress, domain }: ProgressTrackerProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress.log.length]);

  const pct = progress.phase === 'complete'
    ? 100
    : progress.phase === 'crawling'
      ? crawlProgressPercent(progress.pagesCrawled, progress.pagesInQueue, false) * 0.4
      : progress.phase === 'fetching'
        ? 40 + (progress.completed / Math.max(1, progress.total)) * 30
        : progress.phase === 'analyzing' || progress.phase === 'keywords'
          ? 70 + (progress.completed / Math.max(1, progress.total)) * 30
          : (progress.completed / Math.max(1, progress.total)) * 10;

  const phaseLabel: Record<string, string> = {
    submitting: 'Starting crawl...',
    crawling: 'Crawling ' + domain,
    fetching: 'Fetching detailed reports...',
    analyzing: 'Analyzing results...',
    keywords: 'Keyword intelligence...',
    complete: 'Complete!',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">
            {phaseLabel[progress.phase] || 'Processing...'}
          </h2>
          <span className="text-ash-400 text-sm font-mono">
            {formatTime(progress.elapsedSeconds)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-char-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-flame-gradient rounded-full transition-all duration-500"
            style={{ width: Math.round(pct) + '%' }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-ash-400">
          <span>
            {progress.phase === 'crawling'
              ? progress.pagesCrawled + ' / ~' + (progress.pagesCrawled + progress.pagesInQueue) + ' pages'
              : progress.completed + ' / ' + progress.total + ' tasks'}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>

        {/* Stats Row */}
        {progress.phase === 'crawling' && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-char-700">
            <div className="text-center">
              <div className="text-xl font-display">{progress.pagesCrawled}</div>
              <div className="text-xs text-ash-500">Crawled</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-display">{progress.pagesInQueue}</div>
              <div className="text-xs text-ash-500">In Queue</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-display">{formatTime(progress.elapsedSeconds)}</div>
              <div className="text-xs text-ash-500">Elapsed</div>
            </div>
          </div>
        )}
      </div>

      {/* Log */}
      <div className="card">
        <div className="p-4 border-b border-char-700">
          <h3 className="font-display text-sm text-ash-400">Activity Log</h3>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
          {progress.log.length === 0 && (
            <p className="text-ash-500">Waiting for crawl to start...</p>
          )}
          {progress.log.map((entry, i) => (
            <div
              key={i}
              className={
                'flex items-start gap-2 ' +
                (entry.level === 'success'
                  ? 'text-success'
                  : entry.level === 'warning'
                    ? 'text-warning'
                    : entry.level === 'error'
                      ? 'text-danger'
                      : 'text-ash-400')
              }
            >
              <span className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-current" />
              <span>{entry.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
