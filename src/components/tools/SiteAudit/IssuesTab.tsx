'use client';

import { useState, useMemo } from 'react';
import type { IssuesTabProps } from './types';
import { FilterChips } from './shared/FilterChips';
import { IssueCard } from './shared/IssueCard';

export default function IssuesTab({ issues, quickWins }: IssuesTabProps) {
  const [activeSeverity, setActiveSeverity] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(issues.map((i) => i.category));
    return Array.from(cats).sort();
  }, [issues]);

  const severityChips = useMemo(() => {
    const counts: Record<string, number> = { all: issues.length };
    issues.forEach((i) => {
      counts[i.severity] = (counts[i.severity] || 0) + 1;
    });
    return [
      { id: 'all', label: 'All', count: counts.all, active: activeSeverity === 'all' },
      { id: 'critical', label: 'Critical', count: counts.critical || 0, active: activeSeverity === 'critical' },
      { id: 'warning', label: 'Warning', count: counts.warning || 0, active: activeSeverity === 'warning' },
      { id: 'notice', label: 'Notice', count: counts.notice || 0, active: activeSeverity === 'notice' },
    ];
  }, [issues, activeSeverity]);

  const categoryChips = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return [
      { id: 'all', label: 'All', count: issues.length, active: activeCategory === 'all' },
      ...categories.map((cat) => ({
        id: cat,
        label: cat,
        count: counts[cat] || 0,
        active: activeCategory === cat,
      })),
    ];
  }, [issues, categories, activeCategory]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (activeSeverity !== 'all' && issue.severity !== activeSeverity) return false;
      if (activeCategory !== 'all' && issue.category !== activeCategory) return false;
      return true;
    });
  }, [issues, activeSeverity, activeCategory]);

  if (issues.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-display mb-2 text-success">No Issues Found</h3>
        <p className="text-ash-400">Your site passed all checks with flying colors!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Severity Filter */}
      <div>
        <div className="input-label mb-2">Severity</div>
        <FilterChips
          chips={severityChips}
          onToggle={(id) => setActiveSeverity(id)}
        />
      </div>

      {/* Category Filter */}
      <div>
        <div className="input-label mb-2">Category</div>
        <FilterChips
          chips={categoryChips}
          onToggle={(id) => setActiveCategory(id)}
        />
      </div>

      {/* Count */}
      <div className="text-sm text-ash-400">
        Showing {filteredIssues.length} of {issues.length} issues
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ash-400">No issues match the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
