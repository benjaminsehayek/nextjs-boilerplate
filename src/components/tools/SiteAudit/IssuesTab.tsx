'use client';

import { useState, useMemo } from 'react';
import type { IssuesTabProps, Severity, Issue } from './types';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'danger', icon: '🔴' },
  warning: { label: 'Warning', color: 'ember-500', icon: '🟡' },
  notice: { label: 'Notice', color: 'info', icon: '🔵' },
};

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

export default function IssuesTab({ issues }: IssuesTabProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(issues.map(issue => issue.category));
    return Array.from(cats).sort();
  }, [issues]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
        return false;
      }
      if (selectedCategory !== 'all' && issue.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [issues, selectedSeverity, selectedCategory]);

  // Group by severity
  const issuesBySeverity = useMemo(() => {
    const grouped: Record<Severity, Issue[]> = {
      critical: [],
      warning: [],
      notice: [],
    };

    filteredIssues.forEach(issue => {
      grouped[issue.severity].push(issue);
    });

    return grouped;
  }, [filteredIssues]);

  function toggleIssue(id: string) {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (issues.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-display mb-2 text-success">
          No Issues Found
        </h3>
        <p className="text-ash-400">
          Your site passed all checks with flying colors!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Severity Filter */}
          <div className="flex-1">
            <div className="input-label mb-3">Filter by Severity</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSeverity('all')}
                className={`px-4 py-2 rounded-btn text-sm font-semibold transition-all ${
                  selectedSeverity === 'all'
                    ? 'bg-flame-gradient text-white'
                    : 'bg-char-700 text-ash-400 hover:bg-char-600'
                }`}
              >
                All Issues ({issues.length})
              </button>
              {(Object.keys(SEVERITY_CONFIG) as Severity[]).map(severity => {
                const count = issues.filter(i => i.severity === severity).length;
                if (count === 0) return null;

                return (
                  <button
                    key={severity}
                    onClick={() => setSelectedSeverity(severity)}
                    className={`px-4 py-2 rounded-btn text-sm font-semibold transition-all ${
                      selectedSeverity === severity
                        ? 'bg-flame-gradient text-white'
                        : 'bg-char-700 text-ash-400 hover:bg-char-600'
                    }`}
                  >
                    {SEVERITY_CONFIG[severity].icon} {SEVERITY_CONFIG[severity].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex-1">
            <div className="input-label mb-3">Filter by Category</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-btn text-sm font-semibold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-flame-gradient text-white'
                    : 'bg-char-700 text-ash-400 hover:bg-char-600'
                }`}
              >
                All Categories
              </button>
              {categories.map(category => {
                const count = issues.filter(i => i.category === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-btn text-sm font-semibold transition-all capitalize ${
                      selectedCategory === category
                        ? 'bg-flame-gradient text-white'
                        : 'bg-char-700 text-ash-400 hover:bg-char-600'
                    }`}
                  >
                    {CATEGORY_ICONS[category]} {category} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ash-400">No issues match the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.keys(SEVERITY_CONFIG) as Severity[]).map(severity => {
            const severityIssues = issuesBySeverity[severity];
            if (severityIssues.length === 0) return null;

            return (
              <div key={severity}>
                <h3 className="text-lg font-display mb-4 flex items-center gap-2">
                  <span>{SEVERITY_CONFIG[severity].icon}</span>
                  <span className={`text-${SEVERITY_CONFIG[severity].color}`}>
                    {SEVERITY_CONFIG[severity].label} Issues
                  </span>
                  <span className="text-ash-500">({severityIssues.length})</span>
                </h3>

                <div className="space-y-3">
                  {severityIssues.map(issue => {
                    const isExpanded = expandedIssues.has(issue.id);

                    return (
                      <div
                        key={issue.id}
                        className={`card border-l-4 overflow-hidden transition-all ${
                          severity === 'critical'
                            ? 'border-l-danger'
                            : severity === 'warning'
                            ? 'border-l-ember-500'
                            : 'border-l-info'
                        }`}
                      >
                        <button
                          onClick={() => toggleIssue(issue.id)}
                          className="w-full p-5 text-left hover:bg-char-700/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-xl">
                                  {CATEGORY_ICONS[issue.category]}
                                </span>
                                <h4 className="font-display text-ash-100">
                                  {issue.title}
                                </h4>
                                <span className={`tag tag-${SEVERITY_CONFIG[severity].color}`}>
                                  {issue.severity}
                                </span>
                                <span className="tag tag-info capitalize">
                                  {issue.category}
                                </span>
                              </div>
                              <p className="text-sm text-ash-400">
                                {issue.description}
                              </p>
                              {issue.affectedPages.length > 0 && (
                                <p className="text-xs text-ash-500 mt-2">
                                  Affects {issue.affectedPages.length} page
                                  {issue.affectedPages.length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            <div className="text-2xl text-ash-500">
                              {isExpanded ? '▼' : '▶'}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-char-700 bg-char-900 p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h5 className="input-label mb-2">How to Fix</h5>
                                <p className="text-sm text-ash-300">{issue.fix}</p>

                                <div className="flex items-center gap-4 mt-4">
                                  <div>
                                    <div className="input-label mb-1">Impact</div>
                                    <span className="tag tag-flame capitalize">
                                      {issue.impact}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="input-label mb-1">Effort</div>
                                    <span className="tag tag-info capitalize">
                                      {issue.effort}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {issue.affectedPages.length > 0 && (
                                <div>
                                  <h5 className="input-label mb-2">
                                    Affected Pages ({issue.affectedPages.length})
                                  </h5>
                                  <div className="max-h-40 overflow-y-auto space-y-1">
                                    {issue.affectedPages.slice(0, 10).map((page, i) => (
                                      <div
                                        key={i}
                                        className="text-xs text-ash-400 font-mono bg-char-800 p-2 rounded break-all"
                                      >
                                        {page}
                                      </div>
                                    ))}
                                    {issue.affectedPages.length > 10 && (
                                      <p className="text-xs text-ash-500 italic">
                                        ... and {issue.affectedPages.length - 10} more
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
