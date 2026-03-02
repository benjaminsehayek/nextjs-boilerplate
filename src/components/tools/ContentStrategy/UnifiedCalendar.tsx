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
  onContentGenerated?: (id: string, content: string) => void;
  refreshing?: boolean;
}

type FilterType = 'all' | CalendarItemType;

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  gbp_post: 'GBP Posts',
  blog_post: 'Blogs',
  website_addition: 'New Pages',
  website_change: 'Page Fixes',
  offpage_post: 'Off-Page',
};

const TYPE_META: Record<CalendarItemType, { label: string; chip: string; dot: string; icon: string }> = {
  gbp_post:         { label: 'GBP Post',  chip: 'bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30',                  dot: 'bg-sky-400',     icon: '📍' },
  blog_post:        { label: 'Blog Post', chip: 'bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30',        dot: 'bg-violet-400',  icon: '✍️' },
  offpage_post:     { label: 'Off-Page',  chip: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30',    dot: 'bg-emerald-400', icon: '🔗' },
  website_addition: { label: 'New Page',  chip: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30',            dot: 'bg-amber-400',   icon: '📄' },
  website_change:   { label: 'Fix Page',  chip: 'bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30',        dot: 'bg-orange-400',  icon: '🔧' },
};

const TYPE_DOT: Record<CalendarItemType, string> = {
  gbp_post: 'bg-sky-400',
  blog_post: 'bg-violet-400',
  offpage_post: 'bg-emerald-400',
  website_addition: 'bg-amber-400',
  website_change: 'bg-orange-400',
};

// ── Date helpers ───────────────────────────────────────────────────────

/** Return the Monday of the week that is `weekIndex` weeks from this week. */
function getWeekMonday(weekIndex: number): Date {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon
  const daysToMonday = day === 0 ? -6 : 1 - day;
  const result = new Date(today);
  result.setDate(today.getDate() + daysToMonday + weekIndex * 7);
  return result;
}

/** "Mar 3–7" */
function formatWeekRange(weekIndex: number): string {
  const mon = getWeekMonday(weekIndex);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const start = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = fri.toLocaleDateString('en-US', { day: 'numeric' });
  return `${start}–${end}`;
}

/** "March 2026" or "Mar – Apr 2026" for a 4-week span starting at weekIndex. */
function getSectionLabel(startWeekIndex: number): string {
  const startMon = getWeekMonday(startWeekIndex);
  const endSun = getWeekMonday(startWeekIndex + 3);
  endSun.setDate(endSun.getDate() + 6);
  if (startMon.getMonth() === endSun.getMonth()) {
    return startMon.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const s = startMon.toLocaleDateString('en-US', { month: 'short' });
  const e = endSun.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

/** Strip verbose prefixes so chips are short. */
function chipTitle(item: CalendarItemV2): string {
  return item.title
    .replace(/^GBP Post:\s*/i, '')
    .replace(/^New Page:\s*/i, '')
    .replace(/^Fix \d+ issues? on\s*/i, '')
    .replace(/^Fix issue on\s*/i, '')
    .replace(/^Submit to\s*/i, '')
    .replace(/^Get link from\s*/i, '')
    .replace(/^Fix:\s*/i, '')
    || item.title;
}

// ── Main component ─────────────────────────────────────────────────────

export default function UnifiedCalendar({
  items, businessName, domain, industry, city,
  lastGeneratedAt, hasNewerAudit, onRefresh, onStatusChange, onContentGenerated, refreshing,
}: UnifiedCalendarProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Derive selected item from items prop so status updates propagate automatically
  const selectedItem = useMemo(
    () => items.find(i => i.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  const weeks = useMemo(() => {
    const map = new Map<number, CalendarItemV2[]>();
    for (let w = 1; w <= 12; w++) map.set(w, []);
    for (const item of items) {
      if (filter === 'all' || item.type === filter) {
        const arr = map.get(item.week) ?? [];
        arr.push(item);
        map.set(item.week, arr);
      }
    }
    return map;
  }, [items, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { gbp_post: 0, blog_post: 0, website_addition: 0, website_change: 0, offpage_post: 0 };
    for (const item of items) c[item.type] = (c[item.type] ?? 0) + 1;
    return c;
  }, [items]);

  const totalRoi = useMemo(() => items.reduce((s, i) => s + i.roiValue, 0), [items]);
  const doneCount = useMemo(() => items.filter(i => i.status === 'done').length, [items]);

  const isStale = hasNewerAudit || (lastGeneratedAt
    ? Date.now() - new Date(lastGeneratedAt).getTime() > 30 * 24 * 60 * 60 * 1000
    : false);

  // 3 sections of 4 weeks; week numbers are 1-based
  const sections = [
    { label: getSectionLabel(0), weekNums: [1, 2, 3, 4] },
    { label: getSectionLabel(4), weekNums: [5, 6, 7, 8] },
    { label: getSectionLabel(8), weekNums: [9, 10, 11, 12] },
  ];

  return (
    <div className="space-y-6">
      {/* Stale banner */}
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

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {(['gbp_post', 'blog_post', 'website_addition', 'website_change', 'offpage_post'] as CalendarItemType[]).map(type => (
          <button
            key={type}
            onClick={() => setFilter(f => f === type ? 'all' : type)}
            className={`card p-3 text-center transition-colors text-left ${
              filter === type ? 'border-flame-500/50 bg-flame-500/5' : 'hover:border-char-600'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${TYPE_DOT[type]} mx-auto mb-1`} />
            <div className="font-display text-xl text-ash-100">{counts[type] ?? 0}</div>
            <div className="text-xs text-ash-500">{FILTER_LABELS[type]}</div>
          </button>
        ))}
        <div className="card p-3 text-center">
          <div className="font-display text-xl text-success">${totalRoi.toLocaleString()}</div>
          <div className="text-xs text-ash-500">Est. /mo ROI</div>
        </div>
      </div>

      {/* Progress + refresh */}
      <div className="flex items-center gap-4">
        <div className="flex-1 card p-3">
          <div className="flex items-center justify-between text-xs text-ash-500 mb-1.5">
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
        {!isStale && (
          <button onClick={onRefresh} disabled={refreshing} className="btn-ghost text-xs py-2 px-3">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'gbp_post', 'blog_post', 'website_addition', 'website_change', 'offpage_post'] as FilterType[]).map(f => (
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
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div className="space-y-8">
        {sections.map(({ label, weekNums }, sectionIdx) => {
          const hasVisible = weekNums.some(w => (weeks.get(w) ?? []).length > 0);
          if (filter !== 'all' && !hasVisible) return null;

          return (
            <div key={sectionIdx}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="font-display text-sm text-ash-300 whitespace-nowrap">{label}</span>
                <div className="flex-1 h-px bg-char-700" />
              </div>

              {/* 4-column week grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {weekNums.map(week => {
                  const weekItems = weeks.get(week) ?? [];
                  return (
                    <div
                      key={week}
                      className="bg-char-800 border border-char-700 rounded-card min-h-[140px] p-2.5 flex flex-col"
                    >
                      {/* Week header */}
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <span className="text-[10px] font-display text-ash-500">Wk {week}</span>
                        <span className="text-[10px] text-ash-700">{formatWeekRange(week - 1)}</span>
                      </div>

                      {/* Event chips */}
                      <div className="space-y-1 flex-1">
                        {weekItems.map(item => {
                          const meta = TYPE_META[item.type];
                          const isSelected = selectedItemId === item.id;
                          const isDone = item.status === 'done';
                          const isSkipped = item.status === 'skipped';

                          return (
                            <button
                              key={item.id}
                              onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                              title={item.title}
                              className={`w-full text-left rounded-btn px-1.5 py-1 text-[11px] flex items-start gap-1 leading-tight transition-all ${meta.chip} ${
                                isDone ? 'opacity-50' : ''
                              } ${isSkipped ? 'opacity-25' : ''} ${
                                isSelected ? 'ring-1 ring-white/30 brightness-125' : ''
                              }`}
                            >
                              <span className="flex-shrink-0 text-[10px] mt-px">{meta.icon}</span>
                              <span className={`truncate ${isDone ? 'line-through' : ''}`}>
                                {chipTitle(item)}
                              </span>
                            </button>
                          );
                        })}
                        {weekItems.length === 0 && (
                          <div className="flex-1 flex items-center justify-center pt-6">
                            <span className="text-[10px] text-ash-800">—</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Side detail panel ─────────────────────────────────────────── */}
      {selectedItem && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSelectedItemId(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-char-900 border-l border-char-700 shadow-2xl z-50 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-char-700 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_DOT[selectedItem.type]}`} />
                <span className="text-xs text-ash-400 truncate">
                  {TYPE_META[selectedItem.type].label} · Week {selectedItem.week}
                </span>
              </div>
              <button
                onClick={() => setSelectedItemId(null)}
                className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-char-700 text-ash-500 hover:text-ash-200 transition-colors text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-4">
              <CalendarItemCard
                key={selectedItem.id}
                item={selectedItem}
                businessName={businessName}
                domain={domain}
                industry={industry}
                city={city}
                onStatusChange={onStatusChange}
                onContentGenerated={onContentGenerated}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
