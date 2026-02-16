'use client';

import { useState } from 'react';
import type { CannibalizationProps, CannibalizationIssue } from './types';
import { fmtN } from '@/lib/dataforseo';

const SEVERITY_COLORS = {
  high: 'bg-danger/10 text-danger border-danger/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const SEVERITY_ICONS = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

export default function Cannibalization({ issues, onResolve }: CannibalizationProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredIssues = issues.filter((issue) => {
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false;
    return true;
  });

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    // Sort by severity (high > medium > low)
    const severityOrder = { high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    // Then by search volume
    return b.searchVolume - a.searchVolume;
  });

  function handleIssueClick(issueId: string) {
    setExpandedIssue(expandedIssue === issueId ? null : issueId);
  }

  function handleResolve(issueId: string) {
    onResolve?.(issueId);
  }

  const highSeverityCount = issues.filter((i) => i.severity === 'high').length;
  const mediumSeverityCount = issues.filter((i) => i.severity === 'medium').length;
  const lowSeverityCount = issues.filter((i) => i.severity === 'low').length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg text-ash-200 mb-1">
              Keyword Cannibalization
            </h3>
            <p className="text-sm text-ash-500">
              {issues.length} potential cannibalization {issues.length === 1 ? 'issue' : 'issues'} detected
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-ash-500">Filter:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="input text-sm py-2"
            >
              <option value="all">All Severity</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">Total Issues</div>
            <div className="font-display text-2xl text-ash-200">
              {issues.length}
            </div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-danger/30">
            <div className="text-xs text-ash-500 mb-1">High Severity</div>
            <div className="font-display text-2xl text-danger">
              {highSeverityCount}
            </div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-warning/30">
            <div className="text-xs text-ash-500 mb-1">Medium Severity</div>
            <div className="font-display text-2xl text-warning">
              {mediumSeverityCount}
            </div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-blue-500/30">
            <div className="text-xs text-ash-500 mb-1">Low Severity</div>
            <div className="font-display text-2xl text-blue-400">
              {lowSeverityCount}
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-4 bg-char-900 border-flame-500/30">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <h4 className="font-display text-sm text-ash-200 mb-1">
              What is keyword cannibalization?
            </h4>
            <p className="text-sm text-ash-400">
              Keyword cannibalization occurs when multiple pages on your site compete for the same keyword, confusing search engines and splitting your ranking potential. Consolidate or differentiate your content to fix these issues.
            </p>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {sortedIssues.map((issue) => {
          const isExpanded = expandedIssue === issue.id;

          return (
            <div
              key={issue.id}
              className="card overflow-hidden transition-all hover:border-flame-500/30"
            >
              {/* Issue Header */}
              <button
                onClick={() => handleIssueClick(issue.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{SEVERITY_ICONS[issue.severity]}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-display text-lg text-ash-100">
                            {issue.keyword}
                          </h4>
                          <span
                            className={`text-xs px-2 py-1 rounded-btn border ${
                              SEVERITY_COLORS[issue.severity]
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <div className="text-sm text-ash-400">
                          {issue.competingPages.length} pages competing for this keyword
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-ash-500 mb-1">Search Volume</div>
                        <div className="font-display text-lg text-flame-500">
                          {fmtN(issue.searchVolume)}/mo
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ash-500 mb-1">Competing Pages</div>
                        <div className="font-display text-lg text-warning">
                          {issue.competingPages.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-2xl text-ash-500 transition-transform">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-char-700 p-5 bg-char-900 space-y-4">
                  {/* Competing Pages */}
                  <div>
                    <h5 className="font-display text-sm text-ash-400 mb-3">
                      Competing Pages:
                    </h5>
                    <div className="space-y-2">
                      {issue.competingPages.map((page, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-char-800 rounded-btn border border-char-700"
                        >
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-flame-500 hover:underline flex-1 truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {page.url}
                          </a>

                          <div className="flex items-center gap-4 ml-4">
                            {page.rank && (
                              <div>
                                <div className="text-xs text-ash-500">Rank</div>
                                <div className="font-display text-sm text-ash-200">
                                  #{page.rank}
                                </div>
                              </div>
                            )}
                            {page.traffic && (
                              <div>
                                <div className="text-xs text-ash-500">Traffic</div>
                                <div className="font-display text-sm text-ash-200">
                                  {fmtN(page.traffic)}/mo
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="p-4 bg-flame-500/10 border border-flame-500/30 rounded-btn">
                    <h5 className="font-display text-sm text-flame-500 mb-2">
                      Recommendation:
                    </h5>
                    <p className="text-sm text-ash-300">
                      {issue.recommendation}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-char-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(issue.id);
                      }}
                      className="btn-ghost text-sm"
                    >
                      Mark as Resolved
                    </button>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(issue.keyword)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View in Google
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedIssues.length === 0 && issues.length > 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="font-display text-lg text-ash-300 mb-2">
            No issues match your filter
          </h3>
          <p className="text-ash-500">
            Try adjusting your severity filter
          </p>
        </div>
      )}

      {issues.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="font-display text-lg text-ash-300 mb-2">
            No cannibalization issues detected
          </h3>
          <p className="text-ash-500">
            Your content strategy looks good! No competing pages found for the same keywords.
          </p>
        </div>
      )}
    </div>
  );
}
