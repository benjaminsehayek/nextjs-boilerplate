'use client';

import { useMemo, useState } from 'react';
import type { TabProps, CannibalizationConflict, KeywordIntent, UrlType } from './types';
import { PAGE_TYPE_LABELS, INTENT_LABELS } from './types';
import { detectCannibalizationConflicts } from '@/lib/siteAudit/cannibalizationDetection';
import { StatGrid } from './shared/StatGrid';

// ─── Sub-components ─────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: CannibalizationConflict['severity'] }) {
  const styles = {
    critical: 'bg-danger/20 text-danger border border-danger/30',
    high: 'bg-warning/20 text-warning border border-warning/30',
    medium: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };
  return (
    <span className={`text-[10px] font-display uppercase px-2 py-0.5 rounded-full ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function IntentBadge({ intent }: { intent: KeywordIntent }) {
  const info = INTENT_LABELS[intent];
  return (
    <span className="text-[10px] text-ash-400 bg-char-700 px-2 py-0.5 rounded-full">
      {info.icon} {info.label}
    </span>
  );
}

function PageTypeChip({ type }: { type: UrlType }) {
  const info = PAGE_TYPE_LABELS[type];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ash-400">
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </span>
  );
}

function ConflictCard({ conflict }: { conflict: CannibalizationConflict }) {
  const [expanded, setExpanded] = useState(false);

  const marketLabel = conflict.market.split(',')[0] || conflict.market;

  return (
    <div className="card p-0 overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div className="text-2xl shrink-0 mt-0.5">{conflict.conflictIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <SeverityBadge severity={conflict.severity} />
            <IntentBadge intent={conflict.intent} />
            {marketLabel && (
              <span className="text-[10px] text-ash-500 bg-char-700 px-2 py-0.5 rounded-full">
                📍 {marketLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-display text-ash-100 text-base">{conflict.keyword}</span>
            {conflict.volume > 0 && (
              <span className="text-xs text-ash-500">
                {conflict.volume.toLocaleString()} searches/mo
              </span>
            )}
            {conflict.cpc > 0 && (
              <span className="text-xs text-ash-500">CPC ${conflict.cpc.toFixed(2)}</span>
            )}
          </div>

          <div className="text-xs text-ash-500 mt-0.5">{conflict.conflictType}</div>
        </div>
      </div>

      {/* URLs section */}
      <div className="px-4 pb-3 space-y-2">
        {/* Primary (winning) page */}
        <div className="rounded bg-char-800 border border-char-600 p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] text-success uppercase font-display tracking-wide">
              Ranking #{conflict.primary.position}
            </span>
            <PageTypeChip type={conflict.primary.pageType} />
          </div>
          <div
            className="font-mono text-xs text-ash-300 truncate"
            title={conflict.primary.url}
          >
            {conflict.primary.path || '/'}
          </div>
          {conflict.primary.title && (
            <div className="text-[11px] text-ash-500 mt-0.5 truncate" title={conflict.primary.title}>
              {conflict.primary.title}
            </div>
          )}
        </div>

        {/* Competing pages */}
        {conflict.competitors.map((comp, idx) => (
          <div
            key={idx}
            className="rounded bg-char-800 border border-warning/20 p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] text-warning uppercase font-display tracking-wide">
                Competing #{comp.position}
              </span>
              <PageTypeChip type={comp.pageType} />
            </div>
            <div
              className="font-mono text-xs text-ash-300 truncate"
              title={comp.url}
            >
              {comp.path || '/'}
            </div>
            {comp.title && (
              <div className="text-[11px] text-ash-500 mt-0.5 truncate" title={comp.title}>
                {comp.title}
              </div>
            )}
          </div>
        ))}

        {/* Wrong page winning alert */}
        {conflict.wrongPageWinning && (
          <div className="flex items-start gap-2 rounded bg-danger/10 border border-danger/20 p-2.5">
            <span className="text-danger text-sm shrink-0">⚠️</span>
            <span className="text-xs text-danger">
              Wrong page winning — a{' '}
              <strong>{PAGE_TYPE_LABELS[conflict.competitorType].label.toLowerCase()}</strong>{' '}
              should rank here instead of the{' '}
              <strong>{PAGE_TYPE_LABELS[conflict.primaryType].label.toLowerCase()}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Expandable: description + fix */}
      <div className="border-t border-char-700">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-ash-400 hover:text-ash-200 transition-colors"
        >
          <span className="font-display">Why this matters + how to fix it</span>
          <span className="text-ash-500">{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <div className="text-[11px] text-ash-500 uppercase font-display mb-1">Why This Matters</div>
              <p className="text-sm text-ash-300 leading-relaxed">{conflict.conflictDescription}</p>
            </div>
            <div>
              <div className="text-[11px] text-ash-500 uppercase font-display mb-1">How to Fix</div>
              <p className="text-sm text-ash-200 leading-relaxed">{conflict.conflictFix}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────

export default function CannibalizationTab({ results }: TabProps) {
  const keywordsData = results.crawlData.keywords;

  const conflicts = useMemo(() => {
    if (!keywordsData?.markets) return [];
    return detectCannibalizationConflicts(
      keywordsData.markets,
      results.domain,
      keywordsData.locations || []
    );
  }, [keywordsData, results.domain]);

  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');

  const markets = useMemo(() => {
    const seen = new Set<string>();
    for (const c of conflicts) seen.add(c.market);
    return Array.from(seen);
  }, [conflicts]);

  const filtered = useMemo(() => {
    return conflicts.filter((c) => {
      if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
      if (marketFilter !== 'all' && c.market !== marketFilter) return false;
      return true;
    });
  }, [conflicts, severityFilter, marketFilter]);

  const stats = useMemo(() => {
    const critical = conflicts.filter((c) => c.severity === 'critical').length;
    const high = conflicts.filter((c) => c.severity === 'high').length;
    const medium = conflicts.filter((c) => c.severity === 'medium').length;
    const totalVolume = conflicts.reduce((s, c) => s + c.volume, 0);
    const wrongPageWinning = conflicts.filter((c) => c.wrongPageWinning).length;
    return { critical, high, medium, totalVolume, wrongPageWinning };
  }, [conflicts]);

  // No data states
  if (!keywordsData?.markets) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-xl font-display text-ash-300 mb-2">No Keyword Data</h3>
        <p className="text-ash-400 text-sm">
          Run a full scan with market detection enabled. Cannibalization analysis requires
          SERP ranking data from the keyword intelligence step.
        </p>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-display text-ash-300 mb-2">No Cannibalization Detected</h3>
        <p className="text-ash-400 text-sm">
          None of the tracked keywords have multiple domain pages competing in the same SERP.
          Your page targeting looks clean!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Summary */}
      <div>
        <h3 className="font-display text-lg mb-1">Keyword Cannibalization</h3>
        <p className="text-xs text-ash-500 mb-4">
          Keywords where multiple pages on your site compete in the same Google results —
          splitting ranking authority and reducing conversion potential.
        </p>
        <StatGrid
          stats={[
            { value: conflicts.length, label: 'Conflicts Found', isWarning: conflicts.length > 0 },
            { value: stats.critical, label: 'Critical', isWarning: stats.critical > 0 },
            { value: stats.high, label: 'High Priority', isWarning: stats.high > 0 },
            { value: stats.medium, label: 'Medium Priority' },
            {
              value: stats.totalVolume > 0 ? stats.totalVolume.toLocaleString() : '0',
              label: 'Monthly Searches at Risk',
              isWarning: stats.totalVolume > 0,
            },
            {
              value: stats.wrongPageWinning,
              label: 'Wrong Page Winning',
              isWarning: stats.wrongPageWinning > 0,
            },
          ]}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Severity filter */}
        <div className="flex gap-1">
          {(['all', 'critical', 'high', 'medium'] as const).map((s) => {
            const count = s === 'all' ? conflicts.length : stats[s as 'critical' | 'high' | 'medium'];
            return (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={
                  'px-3 py-1 text-xs font-display rounded-full border transition-all ' +
                  (severityFilter === s
                    ? 'bg-flame-500 border-flame-500 text-white'
                    : 'border-char-600 text-ash-400 hover:text-ash-200')
                }
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Market filter */}
        {markets.length > 1 && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => setMarketFilter('all')}
              className={
                'px-3 py-1 text-xs font-display rounded-full border transition-all ' +
                (marketFilter === 'all'
                  ? 'bg-char-600 border-char-500 text-ash-200'
                  : 'border-char-600 text-ash-400 hover:text-ash-200')
              }
            >
              All Markets
            </button>
            {markets.map((m) => {
              const label = m.split(',')[0] || m;
              return (
                <button
                  key={m}
                  onClick={() => setMarketFilter(m)}
                  className={
                    'px-3 py-1 text-xs font-display rounded-full border transition-all ' +
                    (marketFilter === m
                      ? 'bg-char-600 border-char-500 text-ash-200'
                      : 'border-char-600 text-ash-400 hover:text-ash-200')
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Conflict count after filter */}
      {filtered.length !== conflicts.length && (
        <p className="text-xs text-ash-500">
          Showing {filtered.length} of {conflicts.length} conflicts
        </p>
      )}

      {/* Conflict cards */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-ash-500 text-sm">
          No conflicts match the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((conflict, idx) => (
            <ConflictCard key={`${conflict.keyword}-${conflict.market}-${idx}`} conflict={conflict} />
          ))}
        </div>
      )}
    </div>
  );
}
