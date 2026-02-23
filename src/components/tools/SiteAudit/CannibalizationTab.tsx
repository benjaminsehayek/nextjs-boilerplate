'use client';

import { useMemo, useState } from 'react';
import type { TabProps, CannibalizationConflict, KeywordIntent, UrlType } from './types';
import { PAGE_TYPE_LABELS, INTENT_LABELS } from './types';
import {
  detectCannibalizationConflicts,
  detectWrongPageRankings,
  detectMarketKeywordConflicts,
  detectTitleConflicts,
  buildRankingPageMap,
  type WrongPageRanking,
  type MarketKeywordConflict,
  type TitleConflict,
  type RankingPage,
} from '@/lib/siteAudit/cannibalizationDetection';
import { StatGrid } from './shared/StatGrid';

// ─── Shared Sub-components ──────────────────────────────────────────


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

// ─── Specific Fix Generators (contextual advice using actual page paths) ────

function generateSpecificSerpFix(conflict: CannibalizationConflict): string {
  const kw = conflict.keyword;
  const primaryPath = conflict.primary.path || '/';
  const competitorPath = conflict.competitors[0]?.path || '/';
  const primaryLabel = PAGE_TYPE_LABELS[conflict.primaryType].label.toLowerCase();
  const competitorLabel = PAGE_TYPE_LABELS[conflict.competitorType].label.toLowerCase();

  if (conflict.wrongPageWinning) {
    return `1. Strengthen ${competitorPath} (your ${competitorLabel}) with more specific content about "${kw}", a prominent phone number, and photos of your work.\n2. Add a clear internal link from ${primaryPath} to ${competitorPath} using "${kw}" as the link text.\n3. Remove or reduce "${kw}"-specific content from ${primaryPath} — keep it broad so Google stops ranking it for this specific search.`;
  }
  return `For "${kw}", Google shows both ${primaryPath} (#${conflict.primary.position}) and ${competitorPath} (#${conflict.competitors[0]?.position}) — splitting traffic between two pages instead of concentrating it on one.\n\n${conflict.conflictFix}`;
}

function generateSpecificWrongPageFix(item: WrongPageRanking): string {
  const idealLabel = PAGE_TYPE_LABELS[item.idealPageType].label.toLowerCase();
  const pageLabel = PAGE_TYPE_LABELS[item.pageType].label.toLowerCase();
  const firstWords = item.keyword.split(' ').slice(0, 3).join(' ');

  if (item.pageType === 'blog') {
    return `1. Create a dedicated ${idealLabel} for "${item.keyword}" — put your phone number at the top, describe what you offer, and include your service area.\n2. Rewrite ${item.path} to answer a specific question instead (like "how much does ${firstWords} cost?" or "what to look for in a ${firstWords} company"). Keep it informational, not sales-focused.\n3. Add a link from the blog post to the new service page so visitors who are ready to hire can find it easily.`;
  }
  if (item.pageType === 'homepage') {
    return `1. Create or strengthen a dedicated ${idealLabel} for "${item.keyword}" with specific service information and a visible phone number.\n2. Add a link from your homepage to that ${idealLabel} using "${item.keyword}" as the link text (in your services section or navigation).\n3. Reduce how often "${item.keyword}" appears word-for-word on your homepage — mention the service, but don't optimize the homepage for this exact search phrase.`;
  }
  return `1. Create a dedicated ${idealLabel} for "${item.keyword}" with clear service information, your service area, and a prominent phone number / call-to-action.\n2. Link to it from ${item.path} using "${item.keyword}" as the anchor text.\n3. This tells Google which page you actually want to rank for this search.`;
}

function generateMarketConflictFix(item: MarketKeywordConflict): string {
  const city = item.marketLabel.split(',')[0].trim();

  // Collect all unique pages involved across all conflicts in this market
  const pageTypes = new Map<string, UrlType>();
  for (const c of item.conflicts) {
    for (const p of c.pages) {
      if (!pageTypes.has(p.path)) pageTypes.set(p.path, p.urlType);
    }
  }

  const servicePaths = [...pageTypes.entries()].filter(([, t]) => t === 'service').map(([p]) => p);
  const locationPaths = [...pageTypes.entries()].filter(([, t]) => t === 'location').map(([p]) => p);
  const homePaths = [...pageTypes.entries()].filter(([, t]) => t === 'homepage').map(([p]) => p);
  const topKw = item.conflicts[0]?.keyword || 'this keyword';

  if (servicePaths.length > 0 && locationPaths.length > 0) {
    const sp = servicePaths[0];
    const lp = locationPaths[0];
    return `In ${city}, your location page (${lp}) and main service page (${sp}) are both showing up for the same searches.\n\n1. Strengthen ${lp} for ${city} specifically: lead every section with "${city}", add the local address, local photos, and any customer reviews from ${city} customers.\n2. On ${sp}: remove or reduce city-specific mentions of "${city}" — keep it general so Google sends city searches to the location page.\n3. Link prominently from ${sp} to ${lp} so both visitors and Google understand which page owns ${city} searches.`;
  }
  if (homePaths.length > 0 && servicePaths.length > 0) {
    const sp = servicePaths[0];
    return `In ${city}, your homepage and ${sp} are competing for the same searches.\n\n1. Make ${sp} the authoritative page for "${topKw}" — add more detailed content, photos, and a visible phone number / call-to-action.\n2. On your homepage, mention the service briefly but link to ${sp} rather than repeating all the same content.\n3. Check that most internal links for this service point to ${sp}, not the homepage — this tells Google which page should rank.`;
  }
  if (locationPaths.length >= 2) {
    return `In ${city}, multiple location pages are appearing for the same searches — they're competing against each other.\n\n1. Identify which page best represents ${city} and strengthen it with city-specific content: local address, photos, and reviews.\n2. Check whether any of the other pages are accidentally targeting ${city} in their content or internal links and remove those mentions.\n3. If any of these pages truly duplicate each other, consolidate them with a 301 redirect to the strongest one.`;
  }

  const allPaths = [...pageTypes.keys()].join(', ');
  return `In ${city}, these pages are competing for the same ${item.conflicts.length} keyword${item.conflicts.length !== 1 ? 's' : ''}: ${allPaths}.\n\nFor each conflicting keyword, pick ONE page as the primary and:\n1. Strengthen that page — update its title, H1, and body content to clearly match what people search for in ${city}.\n2. On the competing page, change the topic focus so it covers something distinct.\n3. Add an internal link from the competing page to the primary page for "${topKw}".`;
}

function generateSpecificContentFix(item: TitleConflict): string {
  const topic = item.sharedPhrase || 'this topic';
  const servicePages = item.pages.filter(p => p.urlType === 'service');
  const locationPages = item.pages.filter(p => p.urlType === 'location');
  const blogPages = item.pages.filter(p => p.urlType === 'blog');

  if (servicePages.length > 0 && locationPages.length > 0) {
    const sp = servicePages[0];
    const locPaths = locationPages.map(p => p.path).join(', ');
    return `1. Keep ${sp.path} as your main "${topic}" page — it covers the service broadly for any visitor.\n2. For each city page (${locPaths}): rewrite the opening paragraph to lead with that specific city. Mention the city in the first sentence, add the local address, and include something unique to that location (a landmark, local customer review, or city-specific detail).\n3. Once each city page is genuinely different, Google will rank all of them — the main page for general searches, each city page for city-specific searches like "${topic}".`;
  }
  if (locationPages.length >= 2 && servicePages.length === 0) {
    return `Fix each page individually:\n1. Move the city name into the very first sentence (not just the title).\n2. Add that location's physical address, parking info, and a photo specific to that location.\n3. If you have reviews from customers in that city, add them to that city's page only.\nOnce each page has content that only makes sense for one specific city, they stop competing with each other.`;
  }
  if (blogPages.length > 0 && servicePages.length > 0) {
    const bp = blogPages[0];
    const sp = servicePages[0];
    return `1. Make ${sp.path} the definitive page for "${topic}" — add more content, photos of your work, and a clear call-to-action with your phone number.\n2. Rewrite ${bp.path} to answer a specific question about "${topic}" (like "how much does it cost?" or "how long does it take?") — keep it informational, not a sales page.\n3. Add a prominent link from the blog post to the service page so readers who are ready to hire can find it easily.`;
  }
  const paths = item.pages.map(p => p.path).join(', ');
  return `1. Pick ONE page as your primary "${topic}" page — usually the one with the cleanest, most relevant URL.\n2. Strengthen it: update the title and H1 to clearly match what people search for, add more unique content, and point internal links to it from other pages.\n3. Rewrite the other pages (${paths}) to cover related but distinct topics so each page is clearly about something different. Google will then rank each for its own unique angle instead of making them fight each other.`;
}

// ─── Tier 1: SERP-Verified Conflict Card ────────────────────────────

function SerpConflictCard({ conflict }: { conflict: CannibalizationConflict }) {
  const marketLabel = conflict.market.split(',')[0] || conflict.market;
  const specificFix = generateSpecificSerpFix(conflict);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-char-700">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-base">{conflict.conflictIcon}</span>
          <span className="text-sm font-display text-ash-200">{conflict.conflictType}</span>
          {conflict.severity === 'critical' && (
            <span className="text-[10px] bg-danger/20 text-danger border border-danger/30 px-2 py-0.5 rounded-full font-display uppercase">Urgent</span>
          )}
          {marketLabel && (
            <span className="text-[10px] text-ash-500 bg-char-700 px-2 py-0.5 rounded-full">📍 {marketLabel}</span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-2 mb-1">
          <span className="font-display text-ash-100">"{conflict.keyword}"</span>
          {conflict.volume > 0 && (
            <span className="text-xs text-ash-500">{conflict.volume.toLocaleString()} searches/month</span>
          )}
        </div>
        <p className="text-xs text-ash-400">
          Google is showing <strong className="text-ash-200">{conflict.competitors.length + 1} of your pages</strong> for this search — your pages are competing against each other instead of working together.
        </p>
      </div>

      {/* Competing pages */}
      <div className="px-4 py-3 space-y-2">
        <div className="text-[10px] text-ash-500 uppercase font-display">Your pages showing in this search</div>
        <div className="rounded bg-char-800 border border-char-600 p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] text-success font-display">Position #{conflict.primary.position}</span>
            <PageTypeChip type={conflict.primary.pageType} />
          </div>
          <div className="font-mono text-xs text-ash-200">{conflict.primary.path || '/'}</div>
          {conflict.primary.title && <div className="text-xs text-ash-500 mt-0.5">{conflict.primary.title}</div>}
        </div>
        {conflict.competitors.map((comp, idx) => (
          <div key={idx} className="rounded bg-char-800 border border-warning/30 p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] text-warning font-display">Also showing — position #{comp.position}</span>
              <PageTypeChip type={comp.pageType} />
            </div>
            <div className="font-mono text-xs text-ash-200">{comp.path || '/'}</div>
            {comp.title && <div className="text-xs text-ash-500 mt-0.5">{comp.title}</div>}
          </div>
        ))}
        {conflict.wrongPageWinning && (
          <div className="flex items-start gap-2 rounded bg-danger/10 border border-danger/20 p-2.5 mt-1">
            <span className="shrink-0 text-sm">⚠️</span>
            <span className="text-xs text-danger">
              The wrong page is winning — your <strong>{PAGE_TYPE_LABELS[conflict.competitorType].label.toLowerCase()}</strong> should rank here, not your <strong>{PAGE_TYPE_LABELS[conflict.primaryType].label.toLowerCase()}</strong>. This means ready-to-hire visitors are landing on the wrong page.
            </span>
          </div>
        )}
      </div>

      {/* Fix — always visible */}
      <div className="px-4 pb-4 pt-3 border-t border-char-700 bg-char-800/40">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-2">What to do</div>
        <p className="text-xs text-ash-300 leading-relaxed whitespace-pre-line">{specificFix}</p>
      </div>
    </div>
  );
}

// ─── Tier 2: Wrong Page Ranking Card ────────────────────────────────

function WrongPageCard({ item }: { item: WrongPageRanking }) {
  const marketLabel = item.market.split(',')[0] || item.market;
  const specificFix = generateSpecificWrongPageFix(item);
  const pageLabel = PAGE_TYPE_LABELS[item.pageType].label.toLowerCase();
  const idealLabel = PAGE_TYPE_LABELS[item.idealPageType].label.toLowerCase();

  const problemStatement = item.pageType === 'blog'
    ? `A blog post is ranking for "${item.keyword}" — but people searching that are ready to hire, not looking to read an article. They're likely leaving without calling.`
    : item.pageType === 'homepage'
    ? `Your homepage is ranking for "${item.keyword}" instead of a dedicated service page. Homepages are too general to convert service-intent visitors effectively.`
    : `A ${pageLabel} is showing up for "${item.keyword}" when a ${idealLabel} would convert this traffic much better.`;

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-char-700">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {item.severity === 'high' && (
            <span className="text-[10px] bg-warning/20 text-warning border border-warning/30 px-2 py-0.5 rounded-full font-display uppercase">High Priority</span>
          )}
          <IntentBadge intent={item.intent} />
          {marketLabel && (
            <span className="text-[10px] text-ash-500 bg-char-700 px-2 py-0.5 rounded-full">📍 {marketLabel}</span>
          )}
          {item.volume > 0 && (
            <span className="text-[10px] text-ash-500 bg-char-700 px-2 py-0.5 rounded-full">{item.volume.toLocaleString()} searches/month</span>
          )}
        </div>
        <p className="text-sm text-ash-200">{problemStatement}</p>
      </div>

      {/* Current vs ideal */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        <div className="rounded bg-char-800 border border-warning/30 p-3">
          <div className="text-[10px] text-warning font-display mb-1.5">Currently ranking at #{item.position}</div>
          <div className="font-mono text-xs text-ash-200 break-all">{item.path || '/'}</div>
          <div className="mt-2"><PageTypeChip type={item.pageType} /></div>
        </div>
        <div className="rounded bg-char-800 border border-success/30 p-3">
          <div className="text-[10px] text-success font-display mb-1.5">Should be ranking instead</div>
          <div className="text-xs text-ash-400 italic mb-2">No dedicated page exists yet</div>
          <PageTypeChip type={item.idealPageType} />
        </div>
      </div>

      {/* Fix — always visible */}
      <div className="px-4 pb-4 pt-3 border-t border-char-700 bg-char-800/40">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-2">What to do</div>
        <p className="text-xs text-ash-300 leading-relaxed whitespace-pre-line">{specificFix}</p>
      </div>
    </div>
  );
}

// ─── Tier 3: Market Keyword Conflict Card ────────────────────────────

function MarketConflictCard({ item }: { item: MarketKeywordConflict }) {
  const [showAll, setShowAll] = useState(false);
  const fix = generateMarketConflictFix(item);
  const displayConflicts = showAll ? item.conflicts : item.conflicts.slice(0, 10);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-char-700">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {item.severity === 'high' && (
            <span className="text-[10px] bg-warning/20 text-warning border border-warning/30 px-2 py-0.5 rounded-full font-display uppercase">High Priority</span>
          )}
          <span className="text-[10px] text-ash-400 bg-char-700 px-2 py-0.5 rounded-full">📍 {item.marketLabel}</span>
        </div>
        <p className="text-sm text-ash-200">
          <strong className="text-warning">{item.conflicts.length} keyword{item.conflicts.length !== 1 ? 's' : ''}</strong> where multiple pages from your site are competing against each other in this market.
        </p>
      </div>

      {/* Keyword conflict list */}
      <div className="px-4 py-3">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-2">Competing keywords in this market</div>
        <div className="space-y-2">
          {displayConflicts.map((conflict, i) => (
            <div key={i} className="rounded bg-char-800 border border-char-600 p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex-1 text-xs text-ash-200">{conflict.keyword}</span>
                {conflict.volume > 0 && (
                  <span className="text-[10px] text-ash-500 shrink-0">{conflict.volume.toLocaleString()} nat.</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conflict.pages.map((page, j) => (
                  <span
                    key={j}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      j === 0
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-warning/10 text-warning border-warning/20'
                    }`}
                  >
                    #{page.position} {page.path}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {item.conflicts.length > 10 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="mt-2 text-[10px] text-flame-400 hover:text-flame-300 transition-colors"
          >
            {showAll ? '▲ Show fewer' : `▼ Show ${item.conflicts.length - 10} more keywords`}
          </button>
        )}
      </div>

      {/* Fix — always visible */}
      <div className="px-4 pb-4 pt-3 border-t border-char-700 bg-char-800/40">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-2">What to do</div>
        <p className="text-xs text-ash-300 leading-relaxed whitespace-pre-line">{fix}</p>
      </div>
    </div>
  );
}

// ─── Tier 4: Title Conflict Card ─────────────────────────────────────

function TitleConflictCard({ item }: { item: TitleConflict }) {
  const n = item.pages.length;
  const specificFix = generateSpecificContentFix(item);
  const servicePages = item.pages.filter(p => p.urlType === 'service');
  const locationPages = item.pages.filter(p => p.urlType === 'location');

  let problemStatement: string;
  if (servicePages.length > 0 && locationPages.length > 0) {
    problemStatement = `Your main service page and ${locationPages.length} city page${locationPages.length > 1 ? 's' : ''} all have "${item.sharedPhrase}" in their title — they're competing against each other. Google will pick one to rank and mostly ignore the others.`;
  } else if (locationPages.length >= 3) {
    problemStatement = `${n} location pages all have "${item.sharedPhrase}" in their title. Google treats them as duplicates and ranks only the strongest one — leaving the others invisible.`;
  } else if (n >= 3) {
    problemStatement = `${n} pages on your site all have "${item.sharedPhrase}" in their title. Google will pick one to rank and mostly ignore the rest.`;
  } else {
    problemStatement = `These 2 pages both have "${item.sharedPhrase}" in their title — they're targeting the same search and competing against each other.`;
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-char-700">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {item.severity === 'critical' && (
            <span className="text-[10px] bg-danger/20 text-danger border border-danger/30 px-2 py-0.5 rounded-full font-display uppercase">Critical</span>
          )}
          <span className="text-[11px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-mono">
            {item.sharedPhrase}
          </span>
        </div>
        <p className="text-sm text-ash-200 leading-snug">{problemStatement}</p>
      </div>

      {/* Page list — full title visible */}
      <div className="px-4 py-3">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-2">Pages with matching title phrases</div>
        <div className="space-y-2">
          {item.pages.map((page, idx) => (
            <div key={idx} className="rounded bg-char-800 border border-char-600 p-3">
              <div className="flex items-center gap-2 mb-1">
                <PageTypeChip type={page.urlType} size="xs" />
                <span className="font-mono text-xs text-ash-200">{page.path || '/'}</span>
              </div>
              {page.title && (
                <div className="text-xs text-ash-400 leading-snug">{page.title}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fix — always visible */}
      <div className="px-4 pb-4 pt-3 border-t border-char-700 bg-char-800/40">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-2">What to do</div>
        <p className="text-xs text-ash-300 leading-relaxed whitespace-pre-line">{specificFix}</p>
      </div>
    </div>
  );
}

// ─── Ranking Pages Card ──────────────────────────────────────────────

function RankingPageCard({
  page,
  competingKeywords,
}: {
  page: RankingPage;
  competingKeywords: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const competingCount = page.keywords.filter((k) =>
    competingKeywords.has(k.keyword.toLowerCase())
  ).length;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <PageTypeChip type={page.urlType} />
              <span className="text-[10px] bg-char-700 text-ash-400 px-2 py-0.5 rounded-full">
                #{page.topPosition} best rank
              </span>
              {competingCount > 0 && (
                <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full">
                  ⚠️ {competingCount} competing kw{competingCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-ash-200 truncate" title={page.url}>
              {page.path || '/'}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-display text-ash-200">{page.kwCount}</div>
            <div className="text-[10px] text-ash-500">keywords</div>
            {page.totalEtv > 0 && (
              <div className="text-[10px] text-success mt-0.5">{Math.round(page.totalEtv)} ETV</div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-char-700">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-ash-400 hover:text-ash-200 transition-colors"
        >
          <span className="font-display">View {page.keywords.length} keyword{page.keywords.length !== 1 ? 's' : ''}</span>
          <span className="text-ash-500">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="px-4 pb-3">
            <div className="space-y-1">
              {page.keywords.slice(0, 30).map((kw, i) => {
                const isCompeting = competingKeywords.has(kw.keyword.toLowerCase());
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded px-2.5 py-1.5 text-xs ${
                      isCompeting ? 'bg-warning/10 border border-warning/20' : 'bg-char-800'
                    }`}
                  >
                    <span className={`text-[10px] font-display w-8 text-right shrink-0 ${
                      kw.position <= 3 ? 'text-success' : kw.position <= 10 ? 'text-ash-200' : 'text-ash-500'
                    }`}>
                      #{kw.position}
                    </span>
                    <span className={`flex-1 truncate ${isCompeting ? 'text-warning' : 'text-ash-300'}`}>
                      {kw.keyword}
                      {isCompeting && <span className="ml-1.5 text-[10px] opacity-70">⚔ cannibalized</span>}
                    </span>
                    {kw.volume > 0 && (
                      <span className="text-[10px] text-ash-500 shrink-0">{kw.volume.toLocaleString()}/mo</span>
                    )}
                    <span className="text-[10px] text-ash-600 truncate max-w-[100px] shrink-0">{kw.market.split(',')[0]}</span>
                  </div>
                );
              })}
              {page.keywords.length > 30 && (
                <div className="text-[10px] text-ash-500 text-center pt-1">
                  + {page.keywords.length - 30} more keywords
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────

type ActiveSection = 'all' | 'serp' | 'wrongpage' | 'ngram' | 'content' | 'rankings';

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

  const marketConflicts = useMemo(() => {
    if (!keywordsData?.markets) return [];
    return detectMarketKeywordConflicts(keywordsData.markets);
  }, [keywordsData]);

  // Total keyword-level conflicts across all markets (for stat display)
  const exactConflictCount = useMemo(
    () => marketConflicts.reduce((s, m) => s + m.conflicts.length, 0),
    [marketConflicts]
  );

  const contentOverlaps = useMemo(() => {
    if (pages.length === 0) return [];
    return detectTitleConflicts(pages, results.domain);
  }, [pages, results.domain]);

  const rankingPages = useMemo(() => {
    if (!keywordsData?.markets) return [];
    return buildRankingPageMap(keywordsData.markets);
  }, [keywordsData]);

  // Keywords that appear on 2+ domain pages — used to highlight competing keywords
  const competingKeywords = useMemo(() => {
    const kwToPages = new Map<string, Set<string>>();
    for (const page of rankingPages) {
      for (const kw of page.keywords) {
        const key = kw.keyword.toLowerCase();
        if (!kwToPages.has(key)) kwToPages.set(key, new Set());
        kwToPages.get(key)!.add(page.url);
      }
    }
    const competing = new Set<string>();
    for (const [kw, urlSet] of kwToPages.entries()) {
      if (urlSet.size >= 2) competing.add(kw);
    }
    return competing;
  }, [rankingPages]);

  const [activeSection, setActiveSection] = useState<ActiveSection>('all');

  const totalIssues = serpConflicts.length + wrongPageRankings.length + marketConflicts.length + contentOverlaps.length;
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
        <h3 className="text-xl font-display text-ash-300 mb-2">No Competing Pages Found</h3>
        <p className="text-ash-400 text-sm max-w-lg mx-auto">
          {hasKeywordData
            ? 'Each page on this site appears to target a distinct topic. No pages are competing against each other for the same searches.'
            : 'Pages have been checked for overlapping content. No pages are targeting the same topic with duplicate titles or headings.'}
        </p>
      </div>
    );
  }

  const sections: Array<{ id: ActiveSection; label: string; count: number; title: string }> = [
    { id: 'all', label: 'All Issues', count: totalIssues, title: '' },
    { id: 'serp', label: '✅ Confirmed Conflicts', count: serpConflicts.length, title: 'Confirmed Conflicts' },
    { id: 'wrongpage', label: '🎯 Wrong Page Showing Up', count: wrongPageRankings.length, title: 'Wrong Page Ranking' },
    { id: 'ngram', label: '⚔ Same Keywords', count: marketConflicts.length, title: 'Same Keywords' },
    { id: 'content', label: '📄 Duplicate Content', count: contentOverlaps.length, title: 'Duplicate Content' },
    ...(rankingPages.length > 0
      ? [{ id: 'rankings' as ActiveSection, label: '📈 All Rankings', count: rankingPages.length, title: 'All Rankings' }]
      : []),
  ].filter((s) => s.id === 'all' || s.id === 'rankings' || s.count > 0) as Array<{ id: ActiveSection; label: string; count: number; title: string }>;

  const totalVolume =
    serpConflicts.reduce((s, c) => s + c.volume, 0) +
    wrongPageRankings.reduce((s, w) => s + w.volume, 0);

  const criticalCount = serpConflicts.filter((c) => c.severity === 'critical').length +
    wrongPageRankings.filter((w) => w.severity === 'high').length;

  return (
    <div className="space-y-6">

      {/* Summary */}
      <div>
        <h3 className="font-display text-lg mb-1">Page Competition Analysis</h3>
        <p className="text-xs text-ash-500 mb-4">
          When multiple pages on your site target the same keywords, they compete against each other — Google picks one winner and the rest get less traffic. Each issue below tells you exactly which pages are fighting each other and what to do about it.
        </p>
        <StatGrid
          stats={[
            { value: totalIssues, label: 'Total Issues Found', isWarning: totalIssues > 0 },
            { value: criticalCount, label: 'High Priority', isWarning: criticalCount > 0 },
            { value: serpConflicts.length, label: 'Confirmed by Google', isWarning: serpConflicts.length > 0 },
            { value: wrongPageRankings.length, label: 'Wrong Page Ranking', isWarning: wrongPageRankings.length > 0 },
            { value: exactConflictCount, label: 'Local Keyword Conflicts', isWarning: exactConflictCount > 0 },
            { value: contentOverlaps.length, label: 'Title Phrase Conflicts', isWarning: contentOverlaps.length > 0 },
            {
              value: totalVolume > 0 ? totalVolume.toLocaleString() : '0',
              label: 'Searches Affected / Month',
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

      {/* ── Confirmed Conflicts (SERP-verified) ── */}
      {(activeSection === 'all' || activeSection === 'serp') && serpConflicts.length > 0 && (
        <div>
          <SectionHeader
            title="Confirmed: Multiple Pages in the Same Search Results"
            count={serpConflicts.length}
            badge="Verified by Google"
            description="Google is currently showing more than one of your pages when someone searches these keywords. This is confirmed — your pages are actively splitting traffic and rankings right now."
          />
          <div className="space-y-4">
            {serpConflicts.map((c, idx) => (
              <SerpConflictCard key={`${c.keyword}-${c.market}-${idx}`} conflict={c} />
            ))}
          </div>
        </div>
      )}

      {/* ── Wrong Page Ranking ── */}
      {(activeSection === 'all' || activeSection === 'wrongpage') && wrongPageRankings.length > 0 && (
        <div>
          <SectionHeader
            title="Wrong Type of Page Showing Up in Search"
            count={wrongPageRankings.length}
            description="These searches are ranking with a page that won't convert visitors into customers. Someone searching 'auto body shop near me' wants to call a business — not read a blog post. Even if the ranking looks good, visitors leave without calling."
          />
          <div className="space-y-4">
            {wrongPageRankings.map((item, idx) => (
              <WrongPageCard key={`${item.keyword}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Within-Market Keyword Conflicts ── */}
      {(activeSection === 'all' || activeSection === 'ngram') && marketConflicts.length > 0 && (
        <div>
          <SectionHeader
            title="Pages Competing in the Same Local Market"
            count={marketConflicts.length}
            description={`Multiple pages from your site are appearing in the same city's search results for the same keywords — ${exactConflictCount} total keyword conflicts across ${marketConflicts.length} market${marketConflicts.length !== 1 ? 's' : ''}. Google can only rank one page well per search; when two of yours compete, both get pushed down.`}
          />
          <div className="space-y-4">
            {marketConflicts.map((item, idx) => (
              <MarketConflictCard key={`${item.market}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Title Phrase Conflicts ── */}
      {(activeSection === 'all' || activeSection === 'content') && contentOverlaps.length > 0 && (
        <div>
          <SectionHeader
            title="Pages With Matching Title Phrases"
            count={contentOverlaps.length}
            description="These pages share exact keyword phrases in their <title> tags — including city and state names. Google reads page titles to decide what each page is about, so identical title phrases are one of the clearest cannibalization signals."
          />
          <div className="space-y-4">
            {contentOverlaps.map((item, idx) => (
              <TitleConflictCard key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── All Ranking Pages ── */}
      {activeSection === 'rankings' && rankingPages.length > 0 && (
        <div>
          <SectionHeader
            title="All Your Ranking Pages — Keyword Breakdown"
            count={rankingPages.length}
            description={`Every page on your site that currently ranks in Google, with the keywords each page ranks for. Keywords marked ⚔ appear on multiple pages — those are your active conflicts.`}
          />
          {competingKeywords.size > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded bg-warning/10 border border-warning/20 p-3">
              <span className="text-warning shrink-0">⚠️</span>
              <p className="text-xs text-warning">
                <strong>{competingKeywords.size} keyword{competingKeywords.size !== 1 ? 's' : ''}</strong> are being ranked by multiple pages at the same time.
                Expand each page below to see which keywords are being split.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {rankingPages.map((page, idx) => (
              <RankingPageCard key={`${page.url}-${idx}`} page={page} competingKeywords={competingKeywords} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
