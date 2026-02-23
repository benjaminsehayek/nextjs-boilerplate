'use client';

import { useMemo, useState } from 'react';
import type { TabProps, CannibalizationConflict, KeywordIntent, UrlType } from './types';
import { PAGE_TYPE_LABELS, INTENT_LABELS } from './types';
import {
  detectCannibalizationConflicts,
  detectWrongPageRankings,
  detectExactKeywordConflicts,
  detectContentOverlaps,
  buildRankingPageMap,
  type WrongPageRanking,
  type ExactKeywordConflict,
  type ContentOverlapGroup,
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

function generateSpecificExactConflictFix(item: ExactKeywordConflict): string {
  const n = item.sharedKeywords.length;
  const topKw = item.sharedKeywords[0].keyword;
  const stronger = item.pageA.bestPosition <= item.pageB.bestPosition ? item.pageA : item.pageB;
  const weaker = stronger === item.pageA ? item.pageB : item.pageA;
  const typeA = PAGE_TYPE_LABELS[item.pageA.urlType].label.toLowerCase();
  const typeB = PAGE_TYPE_LABELS[item.pageB.urlType].label.toLowerCase();

  if (item.pageA.urlType === 'service' && item.pageB.urlType === 'location') {
    const sp = item.pageA;
    const lp = item.pageB;
    return `1. Keep ${sp.path} (your ${typeA}) as the main page for "${topKw}" — it covers the service broadly.\n2. Update ${lp.path} (your ${typeB}) to lead with its specific city in the first sentence, add the local address, and include city-specific details. This makes it clearly different from the service page.\n3. Once each page covers something distinct, Google can rank both — the service page for general searches and the city page for local ones.`;
  }
  if (item.pageA.urlType === 'location' && item.pageB.urlType === 'service') {
    const sp = item.pageB;
    const lp = item.pageA;
    return `1. Keep ${sp.path} (your ${typeB}) as the main page for "${topKw}" — it covers the service broadly.\n2. Update ${lp.path} (your ${typeA}) to lead with its specific city in the first sentence, add the local address, and include city-specific details. This makes it clearly different from the service page.\n3. Once each page covers something distinct, Google can rank both — the service page for general searches and the city page for local ones.`;
  }
  if (item.pageA.urlType === 'location' && item.pageB.urlType === 'location') {
    return `1. Each location page needs content that only makes sense for that specific city. For ${item.pageA.path}: start with the city name in sentence one, add the address, parking info, and local photos.\n2. Same for ${item.pageB.path}: make it clearly about that city, not just a copy with a different city name swapped in.\n3. Once both pages are genuinely different, they stop competing. Google will rank each one for searches in its respective city.`;
  }

  return `1. Choose ${stronger.path} as your primary page for "${topKw}" — it currently ranks better (#${stronger.bestPosition} vs #${weaker.bestPosition}).\n2. Strengthen it: add more content, photos, and internal links pointing to it from related pages.\n3. Update ${weaker.path} to focus on a related but different angle — change its title and H1 so it covers a distinct topic. This gives Google a reason to rank both pages for different searches instead of treating them as competitors.\n4. Add an internal link from ${weaker.path} to ${stronger.path} for "${topKw}".`;
}

function generateSpecificContentFix(group: ContentOverlapGroup): string {
  const topic = group.sharedPhrases[0] || 'this topic';
  const servicePages = group.pages.filter(p => p.urlType === 'service');
  const locationPages = group.pages.filter(p => p.urlType === 'location');
  const blogPages = group.pages.filter(p => p.urlType === 'blog');

  if (servicePages.length > 0 && locationPages.length > 0) {
    const sp = servicePages[0];
    const locPaths = locationPages.map(p => p.path).join(', ');
    return `1. Keep ${sp.path} as your main "${topic}" page — it covers the service broadly for any visitor.\n2. For each city page (${locPaths}): rewrite the opening paragraph to lead with that specific city. Mention the city in the first sentence, add the local address, and include something unique to that location (a landmark, local customer review, or city-specific detail).\n3. Once each city page is genuinely different, Google will rank all of them — the main page for general searches, each city page for city-specific searches like "${topic} Chehalis WA".`;
  }
  if (locationPages.length >= 2 && servicePages.length === 0) {
    return `Fix each page individually:\n1. Move the city name into the very first sentence (not just the title).\n2. Add that location's physical address, parking info, and a photo specific to that location.\n3. If you have reviews from customers in that city, add them to that city's page only.\nOnce each page has content that only makes sense for one specific city, they stop competing with each other.`;
  }
  if (blogPages.length > 0 && servicePages.length > 0) {
    const bp = blogPages[0];
    const sp = servicePages[0];
    return `1. Make ${sp.path} the definitive page for "${topic}" — add more content, photos of your work, and a clear call-to-action with your phone number.\n2. Rewrite ${bp.path} to answer a specific question about "${topic}" (like "how much does it cost?" or "how long does it take?") — keep it informational, not a sales page.\n3. Add a prominent link from the blog post to the service page so readers who are ready to hire can find it easily.`;
  }
  const paths = group.pages.map(p => p.path).join(', ');
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

// ─── Tier 3: Exact Keyword Conflict Card ─────────────────────────────

function ExactConflictCard({ item }: { item: ExactKeywordConflict }) {
  const [showAll, setShowAll] = useState(false);
  const specificFix = generateSpecificExactConflictFix(item);
  const displayKws = showAll ? item.sharedKeywords : item.sharedKeywords.slice(0, 8);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-char-700">
        <p className="text-sm text-ash-200 mb-1">
          These 2 pages rank for <strong className="text-warning">{item.sharedKeywords.length} of the same keyword{item.sharedKeywords.length !== 1 ? 's' : ''}</strong> — Google splits traffic between them instead of sending it all to one.
        </p>
        {item.totalSharedVolume > 0 && (
          <p className="text-xs text-ash-500">{item.totalSharedVolume.toLocaleString()} combined monthly searches affected</p>
        )}
      </div>

      {/* Page pair */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2">
        {[item.pageA, item.pageB].map((page, idx) => (
          <div key={idx} className="rounded bg-char-800 border border-char-600 p-3">
            <div className="flex items-center justify-between gap-1 mb-2">
              <PageTypeChip type={page.urlType} size="xs" />
              <span className="text-[10px] text-ash-500">Best: #{page.bestPosition}</span>
            </div>
            <div className="font-mono text-xs text-ash-200">{page.path || '/'}</div>
            {page.etv > 0 && (
              <div className="text-[10px] text-success mt-1">{Math.round(page.etv)} est. monthly visits</div>
            )}
          </div>
        ))}
      </div>

      {/* Shared keyword list */}
      <div className="px-4 pb-3">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-1.5">Keywords both pages rank for</div>
        <div className="space-y-1">
          {displayKws.map((kw, i) => (
            <div key={i} className="flex items-center gap-2 rounded bg-char-800 px-2.5 py-1.5">
              <span className="flex-1 text-xs text-ash-200">{kw.keyword}</span>
              {kw.volume > 0 && (
                <span className="text-[10px] text-ash-500 shrink-0">{kw.volume.toLocaleString()}/mo</span>
              )}
              <span className="text-[10px] text-ash-500 shrink-0 font-mono">
                #{kw.positionA} vs #{kw.positionB}
              </span>
            </div>
          ))}
        </div>
        {item.sharedKeywords.length > 8 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="mt-2 text-[10px] text-flame-400 hover:text-flame-300 transition-colors"
          >
            {showAll ? '▲ Show fewer' : `▼ Show ${item.sharedKeywords.length - 8} more keywords`}
          </button>
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

// ─── Tier 4: Content Overlap Card ───────────────────────────────────

function ContentOverlapCard({ group }: { group: ContentOverlapGroup }) {
  const topic = group.sharedPhrases[0] || 'this topic';
  const n = group.pages.length;
  const specificFix = generateSpecificContentFix(group);
  const servicePages = group.pages.filter(p => p.urlType === 'service');
  const locationPages = group.pages.filter(p => p.urlType === 'location');

  let problemStatement: string;
  if (servicePages.length > 0 && locationPages.length > 0) {
    problemStatement = `Your main service page and ${locationPages.length} city page${locationPages.length > 1 ? 's' : ''} all target "${topic}" — they're competing against each other. Google will pick one to rank and mostly ignore the others.`;
  } else if (locationPages.length >= 3) {
    problemStatement = `${n} location pages cover "${topic}" with nearly identical content. Google treats them as duplicates and ranks only the strongest one — leaving the others invisible.`;
  } else {
    problemStatement = `${n} pages on your site all target "${topic}". Google will pick one to rank and mostly ignore the rest — you're splitting your chances unnecessarily.`;
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-char-700">
        <p className="text-sm text-ash-200 leading-snug mb-2">{problemStatement}</p>
        {group.sharedPhrases.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-ash-500">These pages all contain:</span>
            {group.sharedPhrases.map((phrase) => (
              <span key={phrase} className="text-[11px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-mono">
                {phrase}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Page list — full title visible */}
      <div className="px-4 py-3">
        <div className="text-[10px] text-ash-500 uppercase font-display mb-2">Pages competing against each other</div>
        <div className="space-y-2">
          {group.pages.map((page, idx) => (
            <div key={idx} className="rounded bg-char-800 border border-char-600 p-3">
              <div className="flex items-center gap-2 mb-1">
                <PageTypeChip type={page.urlType} size="xs" />
                <span className="font-mono text-xs text-ash-200">{page.path || '/'}</span>
              </div>
              {(page.h1 || page.title) && (
                <div className="text-xs text-ash-400 leading-snug">
                  {page.h1 || page.title}
                </div>
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

  const exactConflicts = useMemo(() => {
    if (!keywordsData?.markets) return [];
    return detectExactKeywordConflicts(keywordsData.markets);
  }, [keywordsData]);

  const contentOverlaps = useMemo(() => {
    if (pages.length === 0) return [];
    return detectContentOverlaps(
      pages, results.domain, keywordsData?.locations || []
    );
  }, [pages, results.domain, keywordsData]);

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

  const totalIssues = serpConflicts.length + wrongPageRankings.length + exactConflicts.length + contentOverlaps.length;
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
    { id: 'ngram', label: '⚔ Same Keywords', count: exactConflicts.length, title: 'Same Keywords' },
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
            { value: exactConflicts.length, label: 'Same-Keyword Conflicts', isWarning: exactConflicts.length > 0 },
            { value: contentOverlaps.length, label: 'Duplicate Content Groups', isWarning: contentOverlaps.length > 0 },
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

      {/* ── Exact Keyword Conflicts ── */}
      {(activeSection === 'all' || activeSection === 'ngram') && exactConflicts.length > 0 && (
        <div>
          <SectionHeader
            title="Pages Ranking for the Same Keywords"
            count={exactConflicts.length}
            description="Every pair of pages on this site that rank for the exact same keyword — confirmed by comparing their actual ranking keyword lists across all tracked markets. Google splits traffic between these pages instead of concentrating it on one."
          />
          <div className="space-y-4">
            {exactConflicts.map((item, idx) => (
              <ExactConflictCard key={`${item.pageA.url}-${item.pageB.url}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Duplicate Content ── */}
      {(activeSection === 'all' || activeSection === 'content') && contentOverlaps.length > 0 && (
        <div>
          <SectionHeader
            title="Multiple Pages Targeting the Same Topic"
            count={contentOverlaps.length}
            description="These pages have titles and headings covering the same subject — a common result of AI-generated or templated content. Google will pick one page to rank and treat the others as near-duplicates, even if you created each page to serve a different city or service."
          />
          <div className="space-y-4">
            {contentOverlaps.map((group, idx) => (
              <ContentOverlapCard key={idx} group={group} />
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
