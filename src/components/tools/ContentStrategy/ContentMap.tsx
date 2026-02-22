'use client';

import { useState, useMemo } from 'react';
import type { ContentMapProps, ContentMapItem } from './types';
import { fmtN } from '@/lib/dataforseo';

export default function ContentMap({ items, onSelectItem }: ContentMapProps) {
  const [filter, setFilter] = useState<'all' | 'existing' | 'gap'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => item.status === filter);
  }, [items, filter]);

  const stats = useMemo(() => {
    const existing = items.filter(i => i.status === 'existing');
    const gaps = items.filter(i => i.status === 'gap');
    return {
      existingCount: existing.length,
      gapCount: gaps.length,
      totalVolume: items.reduce((s, i) => s + i.totalVolume, 0),
      totalRoi: items.reduce((s, i) => s + i.totalRoi, 0),
      gapRoi: gaps.reduce((s, i) => s + i.totalRoi, 0),
    };
  }, [items]);

  const typeIcon = (t: string) => t === 'service' ? '🔧' : t === 'location' ? '📍' : '📝';
  const statusColor = (s: string) => s === 'existing' ? 'border-success/40' : s === 'gap' ? 'border-danger/40' : 'border-warning/40';
  const statusBadge = (s: string) => s === 'existing' ? 'bg-success/20 text-success' : s === 'gap' ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning';

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Existing Pages</div>
          <div className="font-display text-2xl text-success">{stats.existingCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Content Gaps</div>
          <div className="font-display text-2xl text-danger">{stats.gapCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Total Volume</div>
          <div className="font-display text-2xl text-flame-500">{fmtN(stats.totalVolume)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ash-500 mb-1">Gap ROI Potential</div>
          <div className="font-display text-2xl text-success">${fmtN(stats.gapRoi)}/mo</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        {(['all', 'existing', 'gap'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-btn text-sm font-display transition-colors ${
              filter === f ? 'bg-flame-500 text-white' : 'bg-char-800 text-ash-400 hover:text-ash-200'
            }`}
          >
            {f === 'all' ? `All (${items.length})` : f === 'existing' ? `Existing (${stats.existingCount})` : `Gaps (${stats.gapCount})`}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item, i) => (
          <div
            key={i}
            className={`card p-5 border-l-4 cursor-pointer hover:border-flame-500/30 transition-colors ${statusColor(item.status)}`}
            onClick={() => onSelectItem?.(item)}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{typeIcon(item.type)}</span>
                <h4 className="font-display text-ash-100">{item.title}</h4>
              </div>
              <span className={`px-2 py-0.5 rounded-btn text-xs flex-shrink-0 ${statusBadge(item.status)}`}>
                {item.status}
              </span>
            </div>

            <div className="text-xs text-ash-500 mb-3 truncate">{item.path}</div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <div className="text-xs text-ash-500">Keywords</div>
                <div className="font-display text-ash-200">{item.keywords.length}</div>
              </div>
              <div>
                <div className="text-xs text-ash-500">Volume</div>
                <div className="font-display text-flame-500">{fmtN(item.totalVolume)}</div>
              </div>
              <div>
                <div className="text-xs text-ash-500">ROI/mo</div>
                <div className="font-display text-success">${fmtN(item.totalRoi)}</div>
              </div>
            </div>

            {item.wordCount > 0 && (
              <div className="text-xs text-ash-500">{fmtN(item.wordCount)} words</div>
            )}

            <div className="flex flex-wrap gap-1 mt-2">
              {item.keywords.slice(0, 3).map((kw, j) => (
                <span key={j} className="text-xs px-2 py-0.5 bg-char-900 text-ash-400 rounded-btn border border-char-700">
                  {kw}
                </span>
              ))}
              {item.keywords.length > 3 && (
                <span className="text-xs text-ash-500">+{item.keywords.length - 3} more</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="font-display text-lg text-ash-300 mb-2">No content items match</h3>
          <p className="text-ash-500">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
