'use client';

import { useState, useMemo } from 'react';
import type { CalendarItemV2, CalendarItemType } from '@/types';
import CalendarItemCard from './CalendarItemCard';

interface UnifiedCalendarProps {
  items: CalendarItemV2[];
  businessName: string;
  domain: string;
  industry: string;
  city?: string;
  lastGeneratedAt: string | null;
  hasNewerAudit: boolean;
  onRefresh: () => void;
  onStatusChange: (id: string, status: 'scheduled' | 'done' | 'skipped') => void;
  refreshing?: boolean;
}

type FilterType = 'all' | CalendarItemType;

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  gbp_post: 'GBP Posts',
  website_addition: 'New Pages',
  website_change: 'Page Fixes',
  offpage_post: 'Off-Page',
};

const TYPE_COLOR: Record<CalendarItemType, string> = {
  gbp_post: 'bg-sky-400',
  offpage_post: 'bg-emerald-400',
  website_addition: 'bg-amber-400',
  website_change: 'bg-orange-400',
};

export default function UnifiedCalendar({
  items, businessName, domain, industry, city,
  lastGeneratedAt, hasNewerAudit, onRefresh, onStatusChange, refreshing,
}: UnifiedCalendarProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1, 2, 3]));

  const weeks = useMemo(() => {
    const map = new Map<number, CalendarItemV2[]>();
    for (let w = 1; w <= 12; w++) map.set(w, []);
    for (const item of items) {
      const wItems = map.get(item.week) ?? [];
      if (filter === 'all' || item.type === filter) wItems.push(item);
      map.set(item.week, wItems);
    }
    return map;
  }, [items, filter]);

  // Summary counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { gbp_post: 0, website_addition: 0, website_change: 0, offpage_post: 0 };
    for (const item of items) c[item.type] = (c[item.type] ?? 0) + 1;
    return c;
  }, [items]);

  const totalRoi = useMemo(() => items.reduce((s, i) => s + i.roiValue, 0), [items]);
  const doneCount = useMemo(() => items.filter(i => i.status === 'done').length, [items]);

  function toggleWeek(w: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(w) ? next.delete(w) : next.add(w);
      return next;
    });
  }

  const isStale = hasNewerAudit || (lastGeneratedAt
    ? Date.now() - new Date(lastGeneratedAt).getTime() > 30 * 24 * 60 * 60 * 1000
    : false);

  return (
    <div className="space-y-6">
      {/* Refresh banner */}
      {isStale && (
        <div className="card p-4 border-flame-500/40 bg-flame-500/5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-display text-ash-200">
              {hasNewerAudit ? 'New audit data available' : 'Strategy data is over 30 days old'}
            </p>
            <p className="text-xs text-ash-500">Refresh to regenerate the calendar with the latest audit results.</p>
          </div>
          <button onClick={onRefresh} disabled={refreshing} className="btn-primary text-sm whitespace-nowrap">
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['gbp_post', 'website_addition', 'website_change', 'offpage_post'] as CalendarItemType[]).map(type => (
          <div key={type} className="card p-3 text-center">
            <div className={`w-2 h-2 rounded-full ${TYPE_COLOR[type]} mx-auto mb-1`} />
            <div className="font-display text-xl text-ash-100">{counts[type] ?? 0}</div>
            <div className="text-xs text-ash-500">{FILTER_LABELS[type]}</div>
          </div>
        ))}
        <div className="card p-3 text-center">
          <div className="font-display text-xl text-success">${totalRoi.toLocaleString()}</div>
          <div className="text-xs text-ash-500">Est. /mo ROI</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-xs text-ash-500 mb-2">
          <span>{doneCount} of {items.length} completed</span>
          <span>{Math.round((doneCount / Math.max(items.length, 1)) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-char-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-flame-gradient rounded-full transition-all"
            style={{ width: `${(doneCount / Math.max(items.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'gbp_post', 'website_addition', 'website_change', 'offpage_post'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? 'bg-flame-500 border-flame-500 text-white'
                : 'border-char-600 text-ash-400 hover:border-flame-500/50'
            }`}
          >
            {FILTER_LABELS[f]}
            {f !== 'all' && <span className="ml-1 opacity-60">({counts[f] ?? 0})</span>}
          </button>
        ))}

        {!isStale && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="ml-auto text-xs btn-ghost py-1.5"
          >
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
        )}
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(week => {
          const weekItems = weeks.get(week) ?? [];
          const isOpen = expandedWeeks.has(week);
          const doneInWeek = weekItems.filter(i => i.status === 'done').length;

          // Don't render empty weeks when filtered
          if (filter !== 'all' && weekItems.length === 0) return null;

          return (
            <div key={week} className="card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-char-700/30 transition-colors"
                onClick={() => toggleWeek(week)}
              >
                <div className="w-8 h-8 rounded-full bg-char-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-display text-ash-300">W{week}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm text-ash-200">Week {week}</span>
                    <span className="text-xs text-ash-600">
                      {weekItems.length} item{weekItems.length !== 1 ? 's' : ''}
                    </span>
                    {doneInWeek > 0 && (
                      <span className="text-xs text-success">{doneInWeek} done</span>
                    )}
                  </div>
                  {/* Type dots preview */}
                  <div className="flex gap-1 mt-1">
                    {weekItems.map(item => (
                      <div
                        key={item.id}
                        className={`w-1.5 h-1.5 rounded-full ${TYPE_COLOR[item.type]} ${item.status === 'done' ? 'opacity-40' : ''}`}
                        title={item.type}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-ash-600 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && weekItems.length > 0 && (
                <div className="border-t border-char-700 p-4 space-y-3">
                  {weekItems.map(item => (
                    <CalendarItemCard
                      key={item.id}
                      item={item}
                      businessName={businessName}
                      domain={domain}
                      industry={industry}
                      city={city}
                      onStatusChange={onStatusChange}
                    />
                  ))}
                </div>
              )}

              {isOpen && weekItems.length === 0 && (
                <div className="border-t border-char-700 px-4 py-6 text-center text-sm text-ash-500">
                  No items this week
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
