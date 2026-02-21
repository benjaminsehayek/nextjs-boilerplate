'use client';

import { useState } from 'react';
import type { DetailedIssue } from '../types';
import { shortUrl } from '@/lib/siteAudit/utils';

export function IssueCard({ issue }: { issue: DetailedIssue }) {
  const [expanded, setExpanded] = useState(false);

  const sevColors: Record<string, string> = {
    critical: 'border-danger bg-danger/5',
    warning: 'border-warning bg-warning/5',
    notice: 'border-ash-500 bg-char-800',
  };
  const sevDot: Record<string, string> = {
    critical: 'bg-danger',
    warning: 'bg-warning',
    notice: 'bg-ash-500',
  };
  const effortLabel: Record<string, string> = {
    easy: '~' + issue.timeMin + ' min',
    medium: '~' + issue.timeMin + ' min',
    hard: '~' + issue.timeMin + ' min',
  };

  return (
    <div className={'card border ' + (sevColors[issue.severity] || sevColors.notice)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <span className={'shrink-0 w-2.5 h-2.5 mt-1.5 rounded-full ' + (sevDot[issue.severity] || sevDot.notice)} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm">{issue.title}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-ash-400">
            <span>{issue.category}</span>
            <span>·</span>
            <span>Impact: {issue.impact}/5</span>
            <span>·</span>
            <span>{issue.effort}</span>
            <span>·</span>
            <span>{effortLabel[issue.effort]}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="font-display text-lg">{issue.count}</span>
          <span className={'transition-transform text-ash-400 ' + (expanded ? 'rotate-90' : '')}>▶</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-char-700 pt-3 space-y-3">
          <div>
            <div className="text-xs text-ash-500 uppercase font-display mb-1">Why it matters</div>
            <p className="text-sm text-ash-300">{issue.why}</p>
          </div>
          <div>
            <div className="text-xs text-ash-500 uppercase font-display mb-1">How to fix</div>
            <p className="text-sm text-ash-300" dangerouslySetInnerHTML={{ __html: issue.fix }} />
          </div>
          {issue.urls.length > 0 && (
            <div>
              <div className="text-xs text-ash-500 uppercase font-display mb-1">
                Affected URLs ({issue.urls.length}{issue.count > issue.urls.length ? ' of ' + issue.count : ''})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {issue.urls.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono text-ash-400">
                    {u.status != null && (
                      <span className={
                        'shrink-0 px-1.5 py-0.5 rounded text-[10px] ' +
                        (typeof u.status === 'number' && u.status >= 400
                          ? 'bg-danger/20 text-danger'
                          : 'bg-char-700 text-ash-500')
                      }>
                        {u.status}
                      </span>
                    )}
                    <span className="truncate">{shortUrl(u.url, 80)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
