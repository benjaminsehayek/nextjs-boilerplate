'use client';

import { useState } from 'react';
import { fmtN } from '@/lib/dataforseo';
import type { AnchorTextProps } from './types';

function getAnchorTypeColor(type: string): string {
  switch (type) {
    case 'exact': return 'text-danger';
    case 'partial': return 'text-heat-500';
    case 'branded': return 'text-success';
    case 'naked': return 'text-ember-500';
    case 'generic': return 'text-ash-400';
    default: return 'text-ash-400';
  }
}

function getAnchorTypeBadge(type: string): string {
  switch (type) {
    case 'exact': return 'bg-danger/10 border-danger/30 text-danger';
    case 'partial': return 'bg-heat-500/10 border-heat-500/30 text-heat-500';
    case 'branded': return 'bg-success/10 border-success/30 text-success';
    case 'naked': return 'bg-ember-500/10 border-ember-500/30 text-ember-500';
    case 'generic': return 'bg-char-700 border-char-600 text-ash-400';
    default: return 'bg-char-700 border-char-600 text-ash-400';
  }
}

function getAnchorTypeDescription(type: string): string {
  switch (type) {
    case 'exact': return 'Exact match keyword anchor';
    case 'partial': return 'Partial match keyword anchor';
    case 'branded': return 'Brand name anchor';
    case 'naked': return 'URL as anchor text';
    case 'generic': return 'Generic anchor (click here, etc.)';
    default: return 'Unknown type';
  }
}

export default function AnchorText({ anchors, totalBacklinks }: AnchorTextProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredAnchors = anchors.filter(anchor => {
    const matchesSearch = anchor.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || anchor.type === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate distribution by type
  const distribution = anchors.reduce((acc, anchor) => {
    acc[anchor.type] = (acc[anchor.type] || 0) + anchor.count;
    return acc;
  }, {} as Record<string, number>);

  const typePercentages = Object.entries(distribution).map(([type, count]) => ({
    type,
    count,
    percentage: (count / totalBacklinks) * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Distribution Overview */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4 text-ash-300">Anchor Text Distribution</h3>

        <div className="space-y-3 mb-6">
          {typePercentages.map(({ type, count, percentage }) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded-btn border capitalize ${getAnchorTypeBadge(type)}`}>
                    {type}
                  </span>
                  <span className="text-sm text-ash-400">
                    {getAnchorTypeDescription(type)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ash-400">{fmtN(count)}</span>
                  <span className={`font-display ${getAnchorTypeColor(type)}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-char-900 rounded-pill overflow-hidden">
                <div
                  className={`h-full ${type === 'exact' ? 'bg-danger' : type === 'partial' ? 'bg-heat-500' : type === 'branded' ? 'bg-success' : type === 'naked' ? 'bg-ember-500' : 'bg-ash-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Health Assessment */}
        <div className="p-4 bg-char-900 rounded-btn border border-char-700">
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {distribution.exact > totalBacklinks * 0.3 ? '⚠️' : distribution.branded > totalBacklinks * 0.4 ? '✅' : '💡'}
            </span>
            <div>
              <h4 className="font-display text-sm text-ash-300 mb-1">Anchor Profile Assessment</h4>
              <p className="text-sm text-ash-400">
                {distribution.exact > totalBacklinks * 0.3
                  ? 'Warning: High percentage of exact match anchors may look unnatural to Google. Consider diversifying your anchor text strategy.'
                  : distribution.branded > totalBacklinks * 0.4
                  ? 'Excellent: Your anchor profile looks natural with a healthy mix of branded and varied anchor text.'
                  : 'Your anchor text distribution is balanced. Continue building a diverse backlink profile.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search anchor text..."
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input md:w-48"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="exact">Exact Match</option>
            <option value="partial">Partial Match</option>
            <option value="branded">Branded</option>
            <option value="naked">Naked URL</option>
            <option value="generic">Generic</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-ash-400">
        <span>
          Showing {filteredAnchors.length} of {anchors.length} unique anchor texts
        </span>
      </div>

      {/* Anchor List */}
      <div className="space-y-2">
        {filteredAnchors.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-ash-400">No anchor texts found matching your filters</p>
          </div>
        ) : (
          filteredAnchors.map((anchor, index) => (
            <div key={`${anchor.text}-${index}`} className="card p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-btn border capitalize ${getAnchorTypeBadge(anchor.type)}`}>
                      {anchor.type}
                    </span>
                    <span className="text-sm text-ash-200 truncate">
                      "{anchor.text}"
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-ash-500 text-xs mb-1">Total Uses</div>
                      <div className="font-display text-flame-500">{fmtN(anchor.count)}</div>
                    </div>
                    <div>
                      <div className="text-ash-500 text-xs mb-1">Percentage</div>
                      <div className="font-display text-ember-500">{anchor.percentage.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-ash-500 text-xs mb-1">Follow</div>
                      <div className="font-display text-success">{fmtN(anchor.follow)}</div>
                    </div>
                    <div>
                      <div className="text-ash-500 text-xs mb-1">NoFollow</div>
                      <div className="font-display text-ash-400">{fmtN(anchor.nofollow)}</div>
                    </div>
                  </div>
                </div>

                {/* Percentage Bar */}
                <div className="flex-shrink-0 w-32">
                  <div className="h-2 bg-char-900 rounded-pill overflow-hidden">
                    <div
                      className="h-full bg-flame-gradient"
                      style={{ width: `${Math.min(100, anchor.percentage * 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recommendations */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4 text-ash-300">Optimization Recommendations</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <h4 className="font-display text-sm text-ash-300 mb-1">Diversify Anchor Text</h4>
              <p className="text-sm text-ash-400">
                Aim for a natural mix: 40-50% branded, 20-30% partial match, 15-20% generic, 10-15% naked URLs, and less than 10% exact match.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <h4 className="font-display text-sm text-ash-300 mb-1">Avoid Over-Optimization</h4>
              <p className="text-sm text-ash-400">
                Too many exact match keywords can trigger Google's over-optimization penalties. Keep exact match anchors under 10%.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🎯</span>
            <div>
              <h4 className="font-display text-sm text-ash-300 mb-1">Focus on Quality</h4>
              <p className="text-sm text-ash-400">
                Prioritize high-quality backlinks from authoritative domains over manipulating anchor text ratios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
