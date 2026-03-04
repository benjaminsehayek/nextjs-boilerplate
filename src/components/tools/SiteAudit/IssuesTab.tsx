'use client';

import { useState, useMemo, useEffect } from 'react';
import type { IssuesTabProps } from './types';
import { FilterChips } from './shared/FilterChips';
import { IssueCard } from './shared/IssueCard';

type SortMode = 'severity' | 'page' | 'type';
type GroupMode = 'issue-type' | 'by-page';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  notice: 2,
};

const LS_KEY = 'site-audit-sort';
const LS_GROUP_KEY = 'site-audit-group';

const SEV_CHIP: Record<string, string> = {
  critical: 'bg-danger/20 text-danger',
  warning: 'bg-warning/20 text-warning',
  notice: 'bg-char-700 text-ash-400',
};

export default function IssuesTab({ issues, quickWins }: IssuesTabProps) {
  const [activeSeverity, setActiveSeverity] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('severity');
  const [groupMode, setGroupMode] = useState<GroupMode>('issue-type');

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as SortMode | null;
      if (saved && ['severity', 'page', 'type'].includes(saved)) {
        setSortMode(saved);
      }
      const savedGroup = localStorage.getItem(LS_GROUP_KEY) as GroupMode | null;
      if (savedGroup && ['issue-type', 'by-page'].includes(savedGroup)) {
        setGroupMode(savedGroup);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  function handleSortChange(mode: SortMode) {
    setSortMode(mode);
    try {
      localStorage.setItem(LS_KEY, mode);
    } catch {
      // ignore
    }
  }

  function handleGroupChange(mode: GroupMode) {
    setGroupMode(mode);
    try {
      localStorage.setItem(LS_GROUP_KEY, mode);
    } catch {
      // ignore
    }
  }

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
    const filtered = issues.filter((issue) => {
      if (activeSeverity !== 'all' && issue.severity !== activeSeverity) return false;
      if (activeCategory !== 'all' && issue.category !== activeCategory) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'severity') {
        const sa = SEVERITY_ORDER[a.severity] ?? 99;
        const sb = SEVERITY_ORDER[b.severity] ?? 99;
        if (sa !== sb) return sa - sb;
        return b.impact - a.impact;
      }
      if (sortMode === 'page') {
        return b.count - a.count;
      }
      // type = category alphabetical
      return a.category.localeCompare(b.category);
    });
  }, [issues, activeSeverity, activeCategory, sortMode]);

  // Group by page mapping
  const pageGroups = useMemo(() => {
    if (groupMode !== 'by-page') return null;
    const map = new Map<string, typeof filteredIssues>();
    for (const issue of filteredIssues) {
      for (const u of issue.urls) {
        const pageUrl = u.url;
        if (!map.has(pageUrl)) map.set(pageUrl, []);
        map.get(pageUrl)!.push(issue);
      }
      // Also add issues with no URLs under a "(no URL)" key
      if (issue.urls.length === 0) {
        const key = '(no specific URL)';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(issue);
      }
    }
    // Sort pages by issue count descending
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredIssues, groupMode]);

  if (issues.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-display mb-2 text-success">No Issues Found</h3>
        <p className="text-ash-400">Your site passed all checks with flying colors!</p>
      </div>
    );
  }

  const SORT_OPTIONS: { id: SortMode; label: string }[] = [
    { id: 'severity', label: 'Severity' },
    { id: 'page', label: 'Page Count' },
    { id: 'type', label: 'Type' },
  ];

  const GROUP_OPTIONS: { id: GroupMode; label: string }[] = [
    { id: 'issue-type', label: 'Issue Type' },
    { id: 'by-page', label: 'By Page' },
  ];

  return (
    <div className="space-y-6">
      {/* Sort + Group Controls */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs text-ash-500 uppercase font-display tracking-wide">Sort by:</span>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSortChange(opt.id)}
                className={`px-3 py-1.5 text-xs rounded-btn transition-all font-display ${
                  sortMode === opt.id
                    ? 'bg-char-700 text-ash-100'
                    : 'text-ash-500 hover:text-ash-300'
                }`}
              >
                {opt.label}{sortMode === opt.id && ' ▼'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ash-500 uppercase font-display tracking-wide">Group by:</span>
          <div className="flex gap-1">
            {GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleGroupChange(opt.id)}
                className={`px-3 py-1.5 text-xs rounded-btn transition-all font-display ${
                  groupMode === opt.id
                    ? 'bg-char-700 text-ash-100'
                    : 'text-ash-500 hover:text-ash-300'
                }`}
              >
                {opt.label}{groupMode === opt.id && ' ▼'}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {/* Issues List — By Page grouping */}
      {groupMode === 'by-page' && pageGroups !== null ? (
        filteredIssues.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-ash-400">No issues match the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pageGroups.map(([pageUrl, pageIssues]) => (
              <details key={pageUrl} className="card overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-char-800 list-none">
                  <span className="text-sm font-mono text-ash-300 truncate flex-1 min-w-0 mr-3">{pageUrl}</span>
                  <span className="shrink-0 text-xs bg-char-700 text-ash-400 rounded-full px-2 py-0.5">
                    {pageIssues.length} issue{pageIssues.length !== 1 ? 's' : ''}
                  </span>
                </summary>
                <div className="px-4 pb-3 border-t border-char-700 pt-2 space-y-1">
                  {pageIssues.map((issue, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-ash-400 py-0.5">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-display ${SEV_CHIP[issue.severity] ?? SEV_CHIP.notice}`}>
                        {issue.severity}
                      </span>
                      <span className="truncate">{issue.title}</span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )
      ) : (
        /* Default: issue-type grouping */
        filteredIssues.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-ash-400">No issues match the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
