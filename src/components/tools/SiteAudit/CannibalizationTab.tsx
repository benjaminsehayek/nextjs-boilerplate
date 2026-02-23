'use client';

import { useMemo, useState } from 'react';
import type { TabProps, CannibalizationConflict, KeywordIntent, UrlType } from './types';
import { PAGE_TYPE_LABELS, INTENT_LABELS } from './types';
import {
  detectCannibalizationConflicts,
  detectWrongPageRankings,
  detectNgramOverlaps,
  detectContentOverlaps,
  type WrongPageRanking,
  type NgramOverlapConflict,
  type ContentOverlapGroup,
} from '@/lib/siteAudit/cannibalizationDetection';
import { StatGrid } from './shared/StatGrid';

// ─── Shared Sub-components ──────────────────────────────────────────

function SeverityBadge({ severity }: { severity: 'critical' | 'high' | 'medium' }) {
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

function RiskBadge({ risk }: { risk: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-warning/20 text-warning border border-warning/30',
    medium: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    low: 'bg-char-700 text-ash-400 border border-char-600',
  };
  return (
    <span className={`text-[10px] font-display uppercase px-2 py-0.5 rounded-full ${styles[risk]}`}>
      {risk} risk
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

function PageTypeChip({ type, size = 'sm' }: { type: UrlType; size?: 'sm' | 'xs' }) {
  const info = PAGE_TYPE_LABELS[type];
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'xs' ? 'text-[10px]' : 'text-[11px]'} text-ash-400`}>
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </span>
  );
}

function SectionHeader({
  title,
  count,
  badge,
  description,
}: {
  title: string;
  count: number;
  badge?: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-1">
        <h3 className="font-display text-lg">{title}</h3>
        <span className="text-sm text-ash-500">({count})</span>
        {badge && (
          <span className="text-[10px] bg-danger/20 text-danger border border-danger/30 px-2 py-0.5 rounded-full font-display uppercase">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-ash-500">{description}</p>
    </div>
  );
}

// ─── Tier 1: SERP-Verified Conflict Card ────────────────────────────

function SerpConflictCard({ conflict }: { conflict: CannibalizationConflict }) {
  const [expanded, setExpanded] = useState(false);
  const marketLabel = conflict.market.split(',')[0] || conflict.market;

  return (
    <div className="card p-0 overflow-hidden">
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
              <span className="text-xs text-ash-500">{conflict.volume.toLocaleString()} searches/mo</span>
            )}
            {conflict.cpc > 0 && (
              <span className="text-xs text-ash-500">CPC ${conflict.cpc.toFixed(2)}</span>
            )}
          </div>
          <div className="text-xs text-ash-500 mt-0.5">{conflict.conflictType}</div>
        </div>
      </div>

      <div className="px-4 pb-3 space-y-2">
        <div className="rounded bg-char-800 border border-char-600 p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] text-success uppercase font-display">Ranking #{conflict.primary.position}</span>
            <PageTypeChip type={conflict.primary.pageType} />
          </div>
          <div className="font-mono text-xs text-ash-300 truncate" title={conflict.primary.url}>
            {conflict.primary.path || '/'}
          </div>
          {conflict.primary.title && (
            <div className="text-[11px] text-ash-500 mt-0.5 truncate">{conflict.primary.title}</div>
          )}
        </div>

        {conflict.competitors.map((comp, idx) => (
          <div key={idx} className="rounded bg-char-800 border border-warning/20 p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] text-warning uppercase font-display">Competing #{comp.position}</span>
              <PageTypeChip type={comp.pageType} />
            </div>
            <div className="font-mono text-xs text-ash-300 truncate" title={comp.url}>
              {comp.path || '/'}
            </div>
            {comp.title && (
              <div className="text-[11px] text-ash-500 mt-0.5 truncate">{comp.title}</div>
            )}
          </div>
        ))}

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

// ─── Tier 2: Wrong Page Ranking Card ────────────────────────────────

function WrongPageCard({ item }: { item: WrongPageRanking }) {
  const [expanded, setExpanded] = useState(false);
  const marketLabel = item.market.split(',')[0] || item.market;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <SeverityBadge severity={item.severity} />
          <IntentBadge intent={item.intent} />
          {marketLabel && (
            <span className="text-[10px] text-ash-500 bg-char-700 px-2 py-0.5 rounded-full">
              📍 {marketLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-display text-ash-100 text-base">{item.keyword}</span>
          {item.volume > 0 && (
            <span className="text-xs text-ash-500">{item.volume.toLocaleString()} searches/mo</span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded bg-char-800 border border-warning/20 p-3">
            <div className="text-[10px] text-warning uppercase font-display mb-1">Currently Ranking #{item.position}</div>
            <div className="font-mono text-xs text-ash-300 truncate" title={item.url}>
              {item.path || '/'}
            </div>
            <div className="mt-1.5"><PageTypeChip type={item.pageType} /></div>
          </div>
          <div className="rounded bg-char-800 border border-success/20 p-3">
            <div className="text-[10px] text-success uppercase font-display mb-1">Should Be Ranking</div>
            <div className="text-xs text-ash-400 italic mb-1.5">No dedicated page exists</div>
            <PageTypeChip type={item.idealPageType} />
          </div>
        </div>
      </div>

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
              <p className="text-sm text-ash-300 leading-relaxed">{item.reason}</p>
            </div>
            <div>
              <div className="text-[11px] text-ash-500 uppercase font-display mb-1">How to Fix</div>
              <p className="text-sm text-ash-200 leading-relaxed">
                Create a dedicated{' '}
                <strong>{PAGE_TYPE_LABELS[item.idealPageType].label.toLowerCase()}</strong> targeting
                "{item.keyword}" with conversion-focused content, a clear CTA, and strong on-page
                optimization. Once it ranks, the current{' '}
                <strong>{PAGE_TYPE_LABELS[item.pageType].label.toLowerCase()}</strong> can be re-angled
                toward a different, intent-appropriate keyword.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tier 3: N-gram Overlap Card ────────────────────────────────────

function NgramCard({ item }: { item: NgramOverlapConflict }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <RiskBadge risk={item.risk} />
          <span className="text-xs text-ash-500">{item.overlapPct}% keyword overlap</span>
          {item.sharedVolume > 0 && (
            <span className="text-xs text-ash-500">{item.sharedVolume.toLocaleString()} combined volume</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[item.pageA, item.pageB].map((page, idx) => (
            <div key={idx} className="rounded bg-char-800 border border-char-600 p-3">
              <div className="flex items-center justify-between gap-1 mb-1">
                <PageTypeChip type={page.urlType} size="xs" />
                {page.topPosition < 999 && (
                  <span className="text-[10px] text-ash-500">#{page.topPosition}</span>
                )}
              </div>
              <div className="font-mono text-xs text-ash-300 truncate" title={page.url}>
                {page.path || '/'}
              </div>
              <div className="text-[10px] text-ash-500 mt-1">
                {page.kwCount} keyword{page.kwCount !== 1 ? 's' : ''}
                {page.etv > 0 && ` · ${Math.round(page.etv)} ETV`}
              </div>
            </div>
          ))}
        </div>

        {item.sharedPhrases.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-ash-500 self-center">Shared phrases:</span>
            {item.sharedPhrases.map((phrase) => (
              <span key={phrase} className="text-[10px] bg-char-700 text-ash-300 px-2 py-0.5 rounded-full font-mono">
                {phrase}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-char-700">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-ash-400 hover:text-ash-200 transition-colors"
        >
          <span className="font-display">How to fix this</span>
          <span className="text-ash-500">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="px-4 pb-4">
            <p className="text-sm text-ash-200 leading-relaxed">
              These two pages are competing for the same keyword themes (shared phrases: {item.sharedPhrases.join(', ')}).
              Google may split ranking authority between them. Differentiate each page by targeting a distinct
              keyword cluster — update titles, H1s, and content so each page addresses a unique user intent.
              Use a canonical tag on the weaker page pointing to the stronger one if they&apos;re truly duplicative.
              Strengthen internal links to the page you want to rank for each shared phrase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tier 4: Content Overlap Card ───────────────────────────────────

function ContentOverlapCard({ group }: { group: ContentOverlapGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <RiskBadge risk={group.risk} />
          <span className="text-xs text-ash-500">{group.pages.length} pages targeting same topic</span>
        </div>

        <div className="text-xs font-display text-ash-300 mb-2">{group.conflictType}</div>

        {group.sharedPhrases.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-[10px] text-ash-500 self-center">Shared topic:</span>
            {group.sharedPhrases.map((phrase) => (
              <span key={phrase} className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-mono">
                {phrase}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          {group.pages.map((page, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded bg-char-800 px-3 py-2">
              <PageTypeChip type={page.urlType} size="xs" />
              <span className="font-mono text-xs text-ash-300 truncate flex-1" title={page.url}>
                {page.path || '/'}
              </span>
              {(page.h1 || page.title) && (
                <span className="text-[10px] text-ash-500 truncate max-w-[200px]" title={page.h1 || page.title}>
                  {page.h1 || page.title}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-char-700">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-ash-400 hover:text-ash-200 transition-colors"
        >
          <span className="font-display">How to fix this</span>
          <span className="text-ash-500">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="px-4 pb-4">
            <p className="text-sm text-ash-200 leading-relaxed">{group.conflictFix}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────

type ActiveSection = 'all' | 'serp' | 'wrongpage' | 'ngram' | 'content';

export default function CannibalizationTab({ results }: TabProps) {
  const keywordsData = results.crawlData.keywords;
  const pages = results.crawlData.pages?.items || [];

  const serpConflicts = useMemo(() => {
    if (!keywordsData?.markets) return [];
    return detectCannibalizationConflicts(
      keywordsData.markets, results.domain, keywordsData.locations || []
    );
  }, [keywordsData, results.domain]);

  const wrongPageRankings = useMemo(() => {
    if (!keywordsData?.markets) return [];
    const serpKws = new Set(serpConflicts.map((c) => c.keyword.toLowerCase()));
    return detectWrongPageRankings(
      keywordsData.markets, results.domain, keywordsData.locations || [], serpKws
    );
  }, [keywordsData, results.domain, serpConflicts]);

  const ngramOverlaps = useMemo(() => {
    if (!keywordsData?.markets) return [];
    return detectNgramOverlaps(keywordsData.markets, results.domain);
  }, [keywordsData, results.domain]);

  const contentOverlaps = useMemo(() => {
    if (pages.length === 0) return [];
    return detectContentOverlaps(
      pages, results.domain, keywordsData?.locations || []
    );
  }, [pages, results.domain, keywordsData]);

  const [activeSection, setActiveSection] = useState<ActiveSection>('all');

  const totalIssues = serpConflicts.length + wrongPageRankings.length + ngramOverlaps.length + contentOverlaps.length;
  const hasKeywordData = !!keywordsData?.markets;
  const hasAnyData = totalIssues > 0;

  // No data at all
  if (!hasKeywordData && pages.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-xl font-display text-ash-300 mb-2">No Data Available</h3>
        <p className="text-ash-400 text-sm">Run a full scan to enable cannibalization analysis.</p>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-display text-ash-300 mb-2">No Cannibalization Detected</h3>
        <p className="text-ash-400 text-sm max-w-lg mx-auto">
          {hasKeywordData
            ? 'No keyword conflicts, wrong-page rankings, or overlapping content found. Your page targeting looks clean.'
            : 'Pages have been analyzed for content overlap. No duplicate targeting detected across crawled pages.'}
        </p>
      </div>
    );
  }

  const sections: Array<{ id: ActiveSection; label: string; count: number; title: string }> = [
    { id: 'all', label: 'All Issues', count: totalIssues, title: '' },
    { id: 'serp', label: '🎯 SERP Conflicts', count: serpConflicts.length, title: 'SERP-Verified' },
    { id: 'wrongpage', label: '🔄 Wrong Page', count: wrongPageRankings.length, title: 'Wrong Page Ranking' },
    { id: 'ngram', label: '📊 Keyword Overlap', count: ngramOverlaps.length, title: 'N-gram' },
    { id: 'content', label: '📄 Content Overlap', count: contentOverlaps.length, title: 'Content' },
  ].filter((s) => s.id === 'all' || s.count > 0) as Array<{ id: ActiveSection; label: string; count: number; title: string }>;

  const totalVolume =
    serpConflicts.reduce((s, c) => s + c.volume, 0) +
    wrongPageRankings.reduce((s, w) => s + w.volume, 0);

  const criticalCount = serpConflicts.filter((c) => c.severity === 'critical').length +
    wrongPageRankings.filter((w) => w.severity === 'high').length;

  return (
    <div className="space-y-6">

      {/* Summary */}
      <div>
        <h3 className="font-display text-lg mb-1">Keyword Cannibalization</h3>
        <p className="text-xs text-ash-500 mb-4">
          Multi-tier analysis: SERP-verified conflicts, wrong page type rankings, keyword theme overlaps,
          and content-based duplicate detection for unranked pages.
        </p>
        <StatGrid
          stats={[
            { value: totalIssues, label: 'Total Issues', isWarning: totalIssues > 0 },
            { value: criticalCount, label: 'High Priority', isWarning: criticalCount > 0 },
            { value: serpConflicts.length, label: 'SERP Conflicts', isWarning: serpConflicts.length > 0 },
            { value: wrongPageRankings.length, label: 'Wrong Page Ranking', isWarning: wrongPageRankings.length > 0 },
            { value: ngramOverlaps.length, label: 'Keyword Overlaps' },
            { value: contentOverlaps.length, label: 'Content Overlaps', isWarning: contentOverlaps.length > 0 },
            {
              value: totalVolume > 0 ? totalVolume.toLocaleString() : '0',
              label: 'Monthly Searches at Risk',
              isWarning: totalVolume > 0,
            },
          ]}
        />
      </div>

      {/* Section filter tabs */}
      <div className="flex flex-wrap gap-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={
              'px-3 py-1.5 text-xs font-display rounded-full border transition-all ' +
              (activeSection === s.id
                ? 'bg-flame-500 border-flame-500 text-white'
                : 'border-char-600 text-ash-400 hover:text-ash-200')
            }
          >
            {s.label}
            {s.count > 0 && <span className="ml-1.5 opacity-70">({s.count})</span>}
          </button>
        ))}
      </div>

      {/* ── Tier 1: SERP-Verified ── */}
      {(activeSection === 'all' || activeSection === 'serp') && serpConflicts.length > 0 && (
        <div>
          <SectionHeader
            title="SERP-Verified Conflicts"
            count={serpConflicts.length}
            badge="Definitive"
            description="Google is currently showing multiple pages from your site for the same search query. This definitively confirms cannibalization — your pages are splitting ranking authority right now."
          />
          <div className="space-y-4">
            {serpConflicts.map((c, idx) => (
              <SerpConflictCard key={`${c.keyword}-${c.market}-${idx}`} conflict={c} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tier 2: Wrong Page Ranking ── */}
      {(activeSection === 'all' || activeSection === 'wrongpage') && wrongPageRankings.length > 0 && (
        <div>
          <SectionHeader
            title="Wrong Page Type Ranking"
            count={wrongPageRankings.length}
            description="Keywords where the ranking page type doesn't match the search intent. A blog post ranking for a commercial keyword, for example, sends ready-to-hire visitors to an article instead of a service page — losing conversions even if the ranking looks good."
          />
          <div className="space-y-4">
            {wrongPageRankings.map((item, idx) => (
              <WrongPageCard key={`${item.keyword}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tier 3: N-gram Keyword Overlap ── */}
      {(activeSection === 'all' || activeSection === 'ngram') && ngramOverlaps.length > 0 && (
        <div>
          <SectionHeader
            title="Keyword Theme Overlap"
            count={ngramOverlaps.length}
            description="Page pairs that rank for overlapping keyword themes — they're not in the same SERP but both rank for semantically related queries. As your site grows, these pages will increasingly compete against each other, diluting authority for both."
          />
          <div className="space-y-4">
            {ngramOverlaps.map((item, idx) => (
              <NgramCard key={`${item.pageA.url}-${item.pageB.url}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tier 4: Content/Title Overlap ── */}
      {(activeSection === 'all' || activeSection === 'content') && contentOverlaps.length > 0 && (
        <div>
          <SectionHeader
            title="Content Theme Overlap"
            count={contentOverlaps.length}
            description="Pages with titles and H1s targeting the same keyword theme — detected from your crawled content, not SERP data. This catches AI-generated or templated content where multiple pages cover the same topic before rankings are even established."
          />
          <div className="space-y-4">
            {contentOverlaps.map((group, idx) => (
              <ContentOverlapCard key={idx} group={group} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
