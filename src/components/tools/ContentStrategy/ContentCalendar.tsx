'use client';

import { useState } from 'react';
import type { EnhancedCalendarProps, EnhancedCalendarItem, CalendarPhase } from './types';
import { fmtN } from '@/lib/dataforseo';

const PHASE_COLORS: Record<CalendarPhase, string> = {
  Foundation: 'border-flame-500/40 bg-flame-500/5',
  Geographic: 'border-ember-500/40 bg-ember-500/5',
  Authority: 'border-blue-500/40 bg-blue-500/5',
  Ongoing: 'border-char-600/40 bg-char-800/50',
};

const PHASE_BADGES: Record<CalendarPhase, string> = {
  Foundation: 'bg-flame-500/20 text-flame-500',
  Geographic: 'bg-ember-500/20 text-ember-500',
  Authority: 'bg-blue-500/20 text-blue-400',
  Ongoing: 'bg-char-700 text-ash-400',
};

const TYPE_ICONS: Record<string, string> = {
  service: '\uD83D\uDD27',
  location: '\uD83D\uDCCD',
  blog: '\uD83D\uDCDD',
  gbp: '\uD83D\uDCE3',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-char-700 text-ash-400',
  'in-progress': 'bg-flame-500/10 text-flame-500',
  published: 'bg-success/10 text-success',
};

export default function ContentCalendar({ items, onItemUpdate }: EnhancedCalendarProps) {
  const [filterPhase, setFilterPhase] = useState<CalendarPhase | 'all'>('all');

  const filtered = filterPhase === 'all' ? items : items.filter(i => i.phase === filterPhase);

  // Group by week
  const weeks = new Map<number, EnhancedCalendarItem[]>();
  for (const item of filtered) {
    if (!weeks.has(item.week)) weeks.set(item.week, []);
    weeks.get(item.week)!.push(item);
  }

  const phaseForWeek = (w: number): CalendarPhase => {
    if (w <= 4) return 'Foundation';
    if (w <= 8) return 'Geographic';
    return 'Authority';
  };

  const totalRoi = items.filter(i => i.pageType !== 'gbp').reduce((s, i) => s + i.totalRoi, 0);
  const totalContent = items.filter(i => i.pageType !== 'gbp').length;

  function handleStatusChange(id: string, status: EnhancedCalendarItem['status']) {
    onItemUpdate?.(id, { status });
  }

  function exportCSV() {
    const rows = [
      ['Week', 'Phase', 'Priority', 'Type', 'Title', 'Primary Keyword', 'Volume', 'ROI/mo', 'Status'].join(','),
      ...items.map(item => [
        item.week,
        item.phase,
        item.calendarPriority,
        item.pageType,
        `"${item.title}"`,
        `"${item.primaryKeyword}"`,
        item.totalVolume,
        item.totalRoi,
        item.status,
      ].join(','))
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-calendar-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg text-ash-200 mb-1">12-Week Content Calendar</h3>
            <p className="text-sm text-ash-500">{totalContent} content pieces across 4 phases</p>
          </div>
          <button onClick={exportCSV} className="btn-ghost text-sm">Export CSV</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">Content Pieces</div>
            <div className="font-display text-2xl text-ash-200">{totalContent}</div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">Total ROI Potential</div>
            <div className="font-display text-2xl text-success">${fmtN(totalRoi)}/mo</div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">GBP Posts</div>
            <div className="font-display text-2xl text-ash-200">12</div>
          </div>
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="text-xs text-ash-500 mb-1">Duration</div>
            <div className="font-display text-2xl text-flame-500">12 weeks</div>
          </div>
        </div>
      </div>

      {/* Phase Legend + Filter */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterPhase('all')}
            className={`px-4 py-2 rounded-btn text-sm font-display transition-colors ${
              filterPhase === 'all' ? 'bg-flame-500 text-white' : 'bg-char-800 text-ash-400 hover:text-ash-200'
            }`}
          >
            All Phases
          </button>
          {(['Foundation', 'Geographic', 'Authority', 'Ongoing'] as CalendarPhase[]).map(phase => (
            <button
              key={phase}
              onClick={() => setFilterPhase(phase)}
              className={`px-4 py-2 rounded-btn text-sm font-display transition-colors ${
                filterPhase === phase ? 'bg-flame-500 text-white' : `${PHASE_BADGES[phase]} hover:opacity-80`
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      {/* Week-by-week layout */}
      {Array.from(weeks.entries()).sort(([a], [b]) => a - b).map(([week, weekItems]) => {
        const phase = phaseForWeek(week);
        const isPhaseStart = week === 1 || week === 5 || week === 9;

        return (
          <div key={week}>
            {/* Phase header */}
            {isPhaseStart && (
              <div className="mb-4 mt-8 first:mt-0">
                <h3 className="font-display text-lg text-ash-200 mb-1">
                  {phase === 'Foundation' && 'Weeks 1-4: Foundation'}
                  {phase === 'Geographic' && 'Weeks 5-8: Geographic Expansion'}
                  {phase === 'Authority' && 'Weeks 9-12: Authority Building'}
                </h3>
                <p className="text-sm text-ash-500">
                  {phase === 'Foundation' && 'Core service pages to establish topical authority'}
                  {phase === 'Geographic' && 'Location-specific pages to capture local search'}
                  {phase === 'Authority' && 'Blog content to build expertise and trust'}
                </p>
              </div>
            )}

            {/* Week card */}
            <div className="mb-4">
              <div className="text-sm font-display text-ash-400 mb-2">Week {week}</div>
              <div className="space-y-2">
                {weekItems.map(item => (
                  <div
                    key={item.id}
                    className={`card p-4 border-l-4 ${PHASE_COLORS[item.phase]}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span>{TYPE_ICONS[item.pageType] || ''}</span>
                          <h4 className="font-display text-ash-100">{item.title}</h4>
                          <span className={`px-2 py-0.5 rounded-btn text-xs ${PHASE_BADGES[item.phase]}`}>
                            {item.phase}
                          </span>
                        </div>

                        {item.primaryKeyword && (
                          <div className="text-xs text-ash-500 mb-2">
                            Primary: <span className="text-ash-300">{item.primaryKeyword}</span>
                          </div>
                        )}

                        {item.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.keywords.slice(0, 4).map((kw, j) => (
                              <span key={j} className="text-xs px-2 py-0.5 bg-char-900 text-ash-400 rounded-btn border border-char-700">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.pageType !== 'gbp' && (
                          <div className="flex items-center gap-4 text-xs text-ash-500">
                            <span>Volume: <span className="text-flame-500 font-display">{fmtN(item.totalVolume)}</span></span>
                            <span>ROI: <span className="text-success font-display">${fmtN(item.totalRoi)}/mo</span></span>
                          </div>
                        )}
                      </div>

                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as EnhancedCalendarItem['status'])}
                        className={`text-xs px-2 py-1 rounded-btn border border-char-700 ${STATUS_COLORS[item.status]}`}
                      >
                        <option value="planned">Planned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">&#x1F4C5;</div>
          <h3 className="font-display text-lg text-ash-300 mb-2">No items match your filter</h3>
          <p className="text-ash-500">Try selecting a different phase</p>
        </div>
      )}
    </div>
  );
}
