'use client';

import { useState, useMemo } from 'react';
import { scoreTailwind, grade } from '@/types';
import type { PagesTabProps } from './types';

type SortField = 'url' | 'score' | 'status_code' | 'word_count' | 'load_time';
type SortDirection = 'asc' | 'desc';

export default function PagesTab({ pages }: PagesTabProps) {
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  const sortedPages = useMemo(() => {
    const sorted = [...pages].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'url') {
        aVal = aVal?.toString().toLowerCase() || '';
        bVal = bVal?.toString().toLowerCase() || '';
      }

      if (aVal === undefined) aVal = 0;
      if (bVal === undefined) bVal = 0;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return sorted;
  }, [pages, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function togglePage(url: string) {
    setExpandedPage(expandedPage === url ? null : url);
  }

  if (pages.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-xl font-display mb-2 text-ash-300">
          No Pages Analyzed
        </h3>
        <p className="text-ash-400">
          Page data will appear here after the scan completes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-ash-100 mb-1">
            {pages.length}
          </div>
          <div className="text-xs text-ash-400">Total Pages</div>
        </div>

        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-success mb-1">
            {pages.filter(p => p.score >= 80).length}
          </div>
          <div className="text-xs text-ash-400">Healthy Pages</div>
        </div>

        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-ember-500 mb-1">
            {pages.filter(p => p.score >= 60 && p.score < 80).length}
          </div>
          <div className="text-xs text-ash-400">Need Improvement</div>
        </div>

        <div className="card p-4 text-center">
          <div className="text-2xl font-display text-danger mb-1">
            {pages.filter(p => p.score < 60).length}
          </div>
          <div className="text-xs text-ash-400">Critical Issues</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="input-label">Sort by:</span>
          {[
            { field: 'score' as SortField, label: 'Score' },
            { field: 'url' as SortField, label: 'URL' },
            { field: 'status_code' as SortField, label: 'Status' },
            { field: 'word_count' as SortField, label: 'Words' },
            { field: 'load_time' as SortField, label: 'Load Time' },
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`px-3 py-1 rounded-btn text-sm transition-all ${
                sortField === field
                  ? 'bg-flame-gradient text-white'
                  : 'bg-char-700 text-ash-400 hover:bg-char-600'
              }`}
            >
              {label}{' '}
              {sortField === field && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          ))}
        </div>
      </div>

      {/* Pages List */}
      <div className="space-y-3">
        {sortedPages.map(page => {
          const isExpanded = expandedPage === page.url;

          return (
            <div
              key={page.url}
              className={`card border-l-4 overflow-hidden ${scoreTailwind(page.score).replace('text-', 'border-l-')}`}
            >
              <button
                onClick={() => togglePage(page.url)}
                className="w-full p-5 text-left hover:bg-char-700/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className={`text-3xl font-display ${scoreTailwind(page.score)}`}>
                        {Math.round(page.score)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-ash-100 truncate">
                          {page.url}
                        </div>
                        <div className="text-xs text-ash-500">
                          {page.title || 'No title'}
                        </div>
                      </div>
                      <span className={`tag ${page.status_code === 200 ? 'tag-success' : 'tag-danger'}`}>
                        {page.status_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-ash-500">
                      {page.word_count !== undefined && (
                        <span>📝 {page.word_count} words</span>
                      )}
                      {page.images !== undefined && (
                        <span>🖼️ {page.images} images</span>
                      )}
                      {page.links_internal !== undefined && (
                        <span>🔗 {page.links_internal} internal links</span>
                      )}
                      {page.load_time !== undefined && (
                        <span>⚡ {(page.load_time / 1000).toFixed(2)}s</span>
                      )}
                    </div>
                  </div>

                  <div className="text-2xl text-ash-500">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-char-700 bg-char-900 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Meta Data */}
                    <div>
                      <h5 className="input-label mb-3">Meta Data</h5>
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-ash-500 mb-1">Title</div>
                          <div className="text-sm text-ash-300">
                            {page.title || <em className="text-danger">Missing</em>}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-ash-500 mb-1">Description</div>
                          <div className="text-sm text-ash-300">
                            {page.meta_description || (
                              <em className="text-danger">Missing</em>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-ash-500 mb-1">H1</div>
                          <div className="text-sm text-ash-300">
                            {page.h1 || <em className="text-danger">Missing</em>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div>
                      <h5 className="input-label mb-3">Page Metrics</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {page.word_count !== undefined && (
                          <div className="bg-char-800 p-3 rounded-btn">
                            <div className="text-xs text-ash-500 mb-1">Word Count</div>
                            <div className="text-lg font-display text-ash-100">
                              {page.word_count}
                            </div>
                          </div>
                        )}
                        {page.images !== undefined && (
                          <div className="bg-char-800 p-3 rounded-btn">
                            <div className="text-xs text-ash-500 mb-1">Images</div>
                            <div className="text-lg font-display text-ash-100">
                              {page.images}
                            </div>
                          </div>
                        )}
                        {page.links_internal !== undefined && (
                          <div className="bg-char-800 p-3 rounded-btn">
                            <div className="text-xs text-ash-500 mb-1">Internal Links</div>
                            <div className="text-lg font-display text-ash-100">
                              {page.links_internal}
                            </div>
                          </div>
                        )}
                        {page.links_external !== undefined && (
                          <div className="bg-char-800 p-3 rounded-btn">
                            <div className="text-xs text-ash-500 mb-1">External Links</div>
                            <div className="text-lg font-display text-ash-100">
                              {page.links_external}
                            </div>
                          </div>
                        )}
                        {page.load_time !== undefined && (
                          <div className="bg-char-800 p-3 rounded-btn">
                            <div className="text-xs text-ash-500 mb-1">Load Time</div>
                            <div className="text-lg font-display text-ash-100">
                              {(page.load_time / 1000).toFixed(2)}s
                            </div>
                          </div>
                        )}
                        {page.size !== undefined && (
                          <div className="bg-char-800 p-3 rounded-btn">
                            <div className="text-xs text-ash-500 mb-1">Page Size</div>
                            <div className="text-lg font-display text-ash-100">
                              {(page.size / 1024).toFixed(0)} KB
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Issues */}
                    {page.issues && page.issues.length > 0 && (
                      <div className="md:col-span-2">
                        <h5 className="input-label mb-3">
                          Issues on this Page ({page.issues.length})
                        </h5>
                        <div className="space-y-2">
                          {page.issues.slice(0, 5).map((issue, i) => (
                            <div
                              key={i}
                              className="bg-char-800 p-3 rounded-btn flex items-start gap-2"
                            >
                              <span
                                className={`tag tag-${
                                  issue.severity === 'critical'
                                    ? 'danger'
                                    : issue.severity === 'warning'
                                    ? 'warning'
                                    : 'info'
                                }`}
                              >
                                {issue.severity}
                              </span>
                              <div className="flex-1 text-sm text-ash-300">
                                {issue.title}
                              </div>
                            </div>
                          ))}
                          {page.issues.length > 5 && (
                            <p className="text-xs text-ash-500 italic">
                              ... and {page.issues.length - 5} more issues
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
}
