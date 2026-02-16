'use client';

import { useState } from 'react';
import type { ContentCalendarProps, ContentCalendarItem, ContentType, Priority } from './types';
import { fmtN } from '@/lib/dataforseo';

const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  'blog': '📝',
  'landing-page': '🎯',
  'guide': '📚',
  'video': '🎥',
  'infographic': '📊',
  'case-study': '💼',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-danger/10 text-danger border-danger/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-char-700 text-ash-400',
  'in-progress': 'bg-flame-500/10 text-flame-500',
  published: 'bg-success/10 text-success',
};

export default function ContentCalendar({ items, onItemUpdate, onExport }: ContentCalendarProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'traffic'>('value');

  const filteredItems = items.filter((item) => {
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
      case 'traffic':
        return b.estimatedTraffic - a.estimatedTraffic;
      case 'value':
      default:
        return b.estimatedValue - a.estimatedValue;
    }
  });

  function handleStatusChange(id: string, status: ContentCalendarItem['status']) {
    onItemUpdate?.(id, { status });
  }

  function handleExport() {
    if (onExport) {
      onExport();
    } else {
      // Default CSV export
      const csv = [
        ['Title', 'Priority', 'Content Type', 'Est. Traffic', 'Est. Value', 'Publish Date', 'Status', 'Keywords'].join(','),
        ...sortedItems.map((item) =>
          [
            `"${item.title}"`,
            item.priority,
            item.contentType,
            item.estimatedTraffic,
            `$${item.estimatedValue.toFixed(2)}`,
            item.publishDate,
            item.status,
            `"${item.targetKeywords.join('; ')}"`,
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-calendar-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  }

  const totalEstimatedTraffic = items.reduce((sum, item) => sum + item.estimatedTraffic, 0);
  const totalEstimatedValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg text-ash-200 mb-1">
              Content Calendar
            </h3>
            <p className="text-sm text-ash-500">
              {items.length} content pieces planned
            </p>
          </div>

          <button
            onClick={handleExport}
            className="btn-ghost"
          >
            <span className="flex items-center gap-2">
              <span>📥</span>
              Export CSV
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">Total Content</div>
            <div className="font-display text-2xl text-ash-200">
              {items.length}
            </div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">Est. Monthly Traffic</div>
            <div className="font-display text-2xl text-flame-500">
              {fmtN(totalEstimatedTraffic)}
            </div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">Est. Monthly Value</div>
            <div className="font-display text-2xl text-success">
              ${fmtN(totalEstimatedValue)}
            </div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">High Priority</div>
            <div className="font-display text-2xl text-danger">
              {items.filter((i) => i.priority === 'high').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ash-500">View:</span>
              <div className="flex gap-1 p-1 bg-char-900 rounded-btn">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-btn text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-flame-500 text-white'
                      : 'text-ash-400 hover:text-ash-200'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded-btn text-sm transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-flame-500 text-white'
                      : 'text-ash-400 hover:text-ash-200'
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-ash-500">Priority:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="input text-sm py-2"
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-ash-500">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input text-sm py-2"
              >
                <option value="all">All</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-ash-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input text-sm py-2"
            >
              <option value="value">Estimated Value</option>
              <option value="traffic">Estimated Traffic</option>
              <option value="date">Publish Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Items */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="card p-5 hover:border-flame-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{CONTENT_TYPE_ICONS[item.contentType]}</span>
                    <div className="flex-1">
                      <h4 className="font-display text-lg text-ash-100 mb-2">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-1 rounded-btn border ${
                            PRIORITY_COLORS[item.priority]
                          }`}
                        >
                          {item.priority} priority
                        </span>
                        <span className="text-xs px-2 py-1 rounded-btn bg-char-700 text-ash-400">
                          {item.contentType}
                        </span>
                        <span className="text-xs text-ash-500">
                          📅 {new Date(item.publishDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs text-ash-500 mb-1">Target Keywords:</div>
                    <div className="flex flex-wrap gap-2">
                      {item.targetKeywords.slice(0, 5).map((kw, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-char-900 text-ash-300 rounded-btn border border-char-700"
                        >
                          {kw}
                        </span>
                      ))}
                      {item.targetKeywords.length > 5 && (
                        <span className="text-xs px-2 py-1 text-ash-500">
                          +{item.targetKeywords.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-ash-500 mb-1">Est. Traffic</div>
                      <div className="font-display text-lg text-flame-500">
                        {fmtN(item.estimatedTraffic)}/mo
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-ash-500 mb-1">Est. Value</div>
                      <div className="font-display text-lg text-success">
                        ${fmtN(item.estimatedValue)}/mo
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-ash-500 mb-1">Status</div>
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                        className={`text-xs px-2 py-1 rounded-btn border ${
                          STATUS_COLORS[item.status]
                        }`}
                      >
                        <option value="planned">Planned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="card p-6">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="font-display text-lg text-ash-300 mb-2">
              Calendar View Coming Soon
            </h3>
            <p className="text-ash-500">
              Use list view for now to manage your content schedule
            </p>
          </div>
        </div>
      )}

      {sortedItems.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="font-display text-lg text-ash-300 mb-2">
            No content items match your filters
          </h3>
          <p className="text-ash-500">
            Try adjusting your filter settings
          </p>
        </div>
      )}
    </div>
  );
}
