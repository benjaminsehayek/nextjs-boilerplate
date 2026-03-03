// Unified 12-week content calendar builder
// Reuses data from existing site_audits + off_page_audits — zero new DataForSEO calls

import { calculateKeywordROI, calculateKeywordROIV2, matchService } from './roi';
import { classifyFunnel } from './funnel';
import { INDUSTRY_PROFILES } from './constants';
import {
  detectCannibalizationConflicts,
  detectWrongPageRankings,
} from '@/lib/siteAudit/cannibalizationDetection';
import type { CalendarItemV2, SimpleStrategyConfig } from '@/types';
import type { EnrichedKeyword } from './keywordResearch';

// ─── Input Types ─────────────────────────────────────────────────────

interface MarketKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info?: { search_volume: number; cpc: number };
  };
  ranked_serp_element?: {
    serp_item?: { rank_group: number; url: string };
  };
}

interface SiteAuditData {
  crawl_data?: {
    keywords?: {
      markets: Record<string, { items: MarketKeywordItem[] }>;
      locations?: string[];
    } | null;
    pages?: { items: Array<{ url: string; meta?: { title?: string; description?: string } }> };
    business?: { name?: string; city?: string } | null;
  };
  issues_data?: {
    quickWins?: Array<{
      id: string;
      title: string;
      description?: string;
      fix: string;
      impactScore: number;
      affectedPages: number;
      category?: string;
    }>;
    detailed?: Array<{ severity: string; title?: string; fix?: string; urls?: Array<{ url: string }> }>;
  };
  pages_data?: { items: Array<{ url: string; meta?: { title?: string } }> };
  domain?: string | null;
}

interface OffPageAuditData {
  citations?: Array<{ source: string; found: boolean; url?: string; domain?: string }>;
  link_gaps?: Array<{ domain: string; backlinks: number; domainRank: number }>;
  location_data?: Array<{
    name?: string;
    city?: string;
    gbp?: { items?: Array<{ label: string; status: string; points: number }> };
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Content-based ID — stable across audits when the same item reappears */
function makeId(type: string, content: string): string {
  const slug = content.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
  return `${type}-${slug}`;
}

/**
 * Extract significant topic words from a keyword.
 * Strips common stop/modifier words, then prefix-stems 6+ char words to catch
 * plurals and derivations (e.g. "repair" / "repairs" / "repairing" → "repai").
 */
function topicWords(kw: string): string[] {
  const STOP = new Set([
    'near', 'best', 'cheap', 'local', 'professional', 'affordable', 'licensed',
    'certified', 'residential', 'commercial', 'same', 'your', 'area', 'city',
    'the', 'and', 'for', 'with', 'from', 'how', 'what', 'when', 'why', 'does',
    'cost', 'much', 'need', 'tips', 'signs', 'guide', 'about', 'that', 'this',
    'will', 'can', 'should', 'have', 'they', 'there', 'here', 'find', 'hire',
  ]);
  return kw.toLowerCase()
    .split(/[\s\-_,]+/)
    .filter(w => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w))
    .map(w => w.length >= 6 ? w.slice(0, 5) : w);
}

/**
 * Returns true when two keywords share ≥ minOverlap stemmed topic words,
 * indicating they'd compete for the same search intent.
 */
function overlapsTopically(kw1: string, kw2: string, minOverlap = 2): boolean {
  const words2 = new Set(topicWords(kw2));
  let count = 0;
  for (const w of topicWords(kw1)) {
    if (words2.has(w) && ++count >= minOverlap) return true;
  }
  return false;
}

/** Collect all MarketKeywordItems from crawl_data.keywords.markets */
function collectAuditKeywords(audit: SiteAuditData): MarketKeywordItem[] {
  const markets = audit.crawl_data?.keywords?.markets;
  if (!markets) return [];
  const all: MarketKeywordItem[] = [];
  for (const market of Object.values(markets)) {
    for (const item of market.items || []) {
      all.push(item);
    }
  }
  return all;
}

/** Dedupe by keyword, keep highest volume */
function dedupeKeywords(items: MarketKeywordItem[]): MarketKeywordItem[] {
  const map = new Map<string, MarketKeywordItem>();
  for (const item of items) {
    const kw = item.keyword_data.keyword.toLowerCase();
    const existing = map.get(kw);
    const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
    const existingVol = existing?.keyword_data.keyword_info?.search_volume ?? 0;
    if (!existing || vol > existingVol) map.set(kw, item);
  }
  return Array.from(map.values());
}

/** Set of page URLs from the crawled site (lowercased) */
function buildPageUrlSet(audit: SiteAuditData): Set<string> {
  const items = audit.pages_data?.items ?? audit.crawl_data?.pages?.items ?? [];
  return new Set(items.map(p => p.url.toLowerCase()));
}

/**
 * Generate synthetic keywords from the industry profile when the keyword pool
 * is too thin to fill the 12-week calendar.
 *
 * Bottom-funnel: "[service] [city]" — feeds GBP posts + new service pages.
 * Informational: "cost of [service]", "how to [service]" — feeds blog posts.
 *
 * Conservative default volumes (100 / 50) ensure real keywords always rank
 * higher in ROI sorting, while synthetics fill any remaining calendar slots.
 */
function buildSyntheticKeywords(
  services: Array<{ name: string; profit: number; close: number }>,
  city: string,
  existingKwSet: Set<string>,
): { keywords: MarketKeywordItem[]; enrichedEntries: Array<[string, EnrichedKeyword]> } {
  const keywords: MarketKeywordItem[] = [];
  const enrichedEntries: Array<[string, EnrichedKeyword]> = [];
  const seen = new Set(existingKwSet);

  const localType: EnrichedKeyword['localType'] = city ? 'city_name' : 'near_me';
  const locationSuffix = city ? ` ${city.toLowerCase()}` : ' near me';

  // Bottom-funnel: service + location (up to 12 for full GBP post cadence)
  for (const svc of services.slice(0, 12)) {
    const kw = `${svc.name.toLowerCase()}${locationSuffix}`;
    const kwLower = kw.toLowerCase();
    if (!seen.has(kwLower)) {
      keywords.push({
        keyword_data: { keyword: kw, keyword_info: { search_volume: 100, cpc: 3 } },
      });
      enrichedEntries.push([kwLower, {
        keyword: kw, volume: 100, avgVolume: 100, seasonalMultiplier: 1.0,
        difficulty: null, competition: 'MEDIUM' as const, cpc: 3,
        isExternal: false, currentRank: null, hasLocalPack: true,
        funnel: 'bottom' as const, intent: 'transactional' as const, localType,
      }]);
      seen.add(kwLower);
    }
  }

  // "Near me" variants for top 5 services — extra GBP candidates when a city is also set
  // (users in "dallas" still search "plumber near me" — both forms are needed)
  if (city) {
    for (const svc of services.slice(0, 5)) {
      const kw = `${svc.name.toLowerCase()} near me`;
      const kwLower = kw.toLowerCase();
      if (!seen.has(kwLower)) {
        keywords.push({
          keyword_data: { keyword: kw, keyword_info: { search_volume: 80, cpc: 3 } },
        });
        enrichedEntries.push([kwLower, {
          keyword: kw, volume: 80, avgVolume: 80, seasonalMultiplier: 1.0,
          difficulty: null, competition: 'MEDIUM' as const, cpc: 3,
          isExternal: false, currentRank: null, hasLocalPack: true,
          funnel: 'bottom' as const, intent: 'transactional' as const, localType: 'near_me' as const,
        }]);
        seen.add(kwLower);
      }
    }
  }

  // Informational: two grammatically-safe templates for top 6 services → blog candidates.
  // "how to [service]" is intentionally omitted — it's grammatically wrong for most service
  // names (e.g. "how to collision repair", "how to paint job").
  const INFO_TEMPLATES: Array<[(svc: string) => string, EnrichedKeyword['funnel'], EnrichedKeyword['intent']]> = [
    [svc => `cost of ${svc}`, 'top', 'informational'],
    [svc => `${svc} pricing`, 'top', 'informational'],
  ];
  for (const svc of services.slice(0, 6)) {
    for (const [template, funnel, intent] of INFO_TEMPLATES) {
      const kw = template(svc.name.toLowerCase());
      const kwLower = kw.toLowerCase();
      if (!seen.has(kwLower)) {
        keywords.push({
          keyword_data: { keyword: kw, keyword_info: { search_volume: 50, cpc: 1 } },
        });
        enrichedEntries.push([kwLower, {
          keyword: kw, volume: 50, avgVolume: 50, seasonalMultiplier: 1.0,
          difficulty: null, competition: 'LOW' as const, cpc: 1,
          isExternal: false, currentRank: null, hasLocalPack: false,
          funnel, intent, localType: 'none' as const,
        }]);
        seen.add(kwLower);
      }
    }
  }

  return { keywords, enrichedEntries };
}

// ─── GBP Posts ────────────────────────────────────────────────────────

// Words that indicate editorial/informational content — not suitable for GBP service posts.
// Matched as whole words (split by whitespace) so "guidelines" doesn't trip on "guide".
const GBP_NOISE_WORDS = new Set([
  'information', 'news', 'article', 'faq', 'learn', 'guide', 'tips', 'blog', 'tutorial',
]);

function buildGBPItems(
  keywords: MarketKeywordItem[],
  cfg: SimpleStrategyConfig,
  count = 12,
  enrichedMap?: Map<string, EnrichedKeyword>,
  services?: Array<{ name: string; profit: number; close: number }>,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  // Exclude editorial/informational keywords — they make poor GBP service posts.
  // e.g. "important insurance information near me" → filtered out.
  const isServiceQuery = (kw: string) => {
    const words = new Set(kw.toLowerCase().split(/\s+/));
    return !GBP_NOISE_WORDS.has([...words].find(w => GBP_NOISE_WORDS.has(w)) ?? '');
  };

  const scored = keywords.filter(item => isServiceQuery(item.keyword_data.keyword)).map(item => {
    const kw = item.keyword_data.keyword;
    const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
    const enriched = enrichedMap?.get(kw.toLowerCase());
    const funnel = enriched?.funnel ?? classifyFunnel(kw);
    // Per-service economics — override cfg when a service match is found
    const svc = services ? matchService(kw, services) : null;
    const kwCfg = svc ? { ...cfg, profitPerJob: svc.profit, closeRate: svc.close } : cfg;
    const roi = enriched
      ? calculateKeywordROIV2(vol, kwCfg, {
          funnel: enriched.funnel,
          intent: enriched.intent,
          localType: enriched.localType,
          difficulty: enriched.difficulty,
          competition: enriched.competition,
          hasLocalPack: enriched.hasLocalPack,
          currentRank: enriched.currentRank,
        }).roi
      : calculateKeywordROI(vol, funnel, kwCfg.conversionRate, kwCfg.profitPerJob, kwCfg.closeRate).roi;
    return { kw, vol, funnel, roi, enriched: enriched ?? null };
  });

  // Prefer bottom-funnel; fall back to all keywords when pool is thin
  let pool = scored.filter(k => k.funnel === 'bottom' || k.funnel === 'middle');
  if (pool.length < Math.ceil(count / 2)) pool = scored;
  pool = pool.slice().sort((a, b) => b.roi - a.roi).slice(0, count);

  return pool.map((k, i) => {
    const signals = k.enriched
      ? [
          `${k.enriched.intent.charAt(0).toUpperCase() + k.enriched.intent.slice(1)} intent`,
          k.enriched.competition ? `Competition: ${k.enriched.competition}` : null,
          k.enriched.difficulty != null ? `KD: ${k.enriched.difficulty}` : null,
        ].filter(Boolean).join(' · ')
      : null;

    return {
      id: makeId('gbp', k.kw),
      type: 'gbp_post' as const,
      title: `GBP Post: ${k.kw}`,
      primaryKeyword: k.kw,
      keywords: [k.kw],
      action: `Publish a Google Business Profile post targeting "${k.kw}". Include a specific offer or callout and a direct CTA (call, book, or visit).`,
      rationale: signals
        ? `Est. ${k.vol.toLocaleString()} searches/mo · $${k.roi}/mo ROI · ${signals}`
        : `Est. ${k.vol.toLocaleString()} searches/mo · $${k.roi}/mo ROI potential at position 3`,
      priority: (i < 4 ? 'high' : i < 8 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      roiValue: k.roi,
    };
  });
}

// ─── Blog Posts (informational keyword gaps only) ────────────────────

/**
 * Blog posts are only recommended when there are genuine informational gaps —
 * keywords the site isn't already ranking well for (rank > 5 or not ranking).
 * If the site ranks top-5 for all relevant informational terms, no blogs are
 * added (no point writing content that duplicates existing ranked pages).
 */
function buildBlogItems(
  keywords: MarketKeywordItem[],
  cfg: SimpleStrategyConfig,
  count = 4,
  enrichedMap?: Map<string, EnrichedKeyword>,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const scored = keywords.map(item => {
    const kw = item.keyword_data.keyword;
    const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
    const enriched = enrichedMap?.get(kw.toLowerCase());
    const funnel = enriched?.funnel ?? classifyFunnel(kw);
    // Check whether the site already ranks well for this keyword
    const currentRank = enriched?.currentRank
      ?? item.ranked_serp_element?.serp_item?.rank_group
      ?? null;
    return { kw, vol, funnel, enriched: enriched ?? null, currentRank };
  });

  // Only target informational/top-funnel keywords where we're NOT already top-5.
  // Ranking top-5 means the page is doing its job — no new blog needed.
  const isGap = (k: typeof scored[0]) =>
    k.currentRank === null || k.currentRank > 5;

  // Blogs target informational intent — they don't compete with transactional
  // service pages or GBP posts even when they cover the same service topic,
  // because Google serves them on completely different SERPs.
  // (e.g. "cost of drain cleaning" and "drain cleaning vancouver" never compete)
  const topPool = scored
    .filter(k => (k.funnel === 'top' || k.enriched?.intent === 'informational') && isGap(k))
    .sort((a, b) => b.vol - a.vol);

  // If informational gap pool is thin, pull in mid-funnel non-transactional gaps
  const midPool = scored
    .filter(k => k.funnel === 'middle' && k.enriched?.intent !== 'transactional' && isGap(k))
    .sort((a, b) => b.vol - a.vol);

  // Topically deduplicate within the blog pool itself — no two blogs on the same topic
  const pool: typeof topPool = [];
  for (const candidate of [...topPool, ...midPool]) {
    if (!pool.some(p => overlapsTopically(p.kw, candidate.kw, 2))) pool.push(candidate);
    if (pool.length >= count) break;
  }

  // No gaps found → no blogs recommended (site is already well-covered)
  return pool.map((k, i) => {
    const slug = k.kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const signals = k.enriched?.difficulty != null ? ` · KD: ${k.enriched.difficulty}` : '';
    return {
      id: makeId('blog', k.kw),
      type: 'blog_post' as const,
      title: `Blog: ${k.kw}`,
      primaryKeyword: k.kw,
      keywords: [k.kw],
      action: `Write an 800–1,200 word blog post targeting "${k.kw}". Include an H1, 3–4 H2 sections, a FAQ block (3–5 questions), and at least one internal link to a relevant service page. Target URL: /blog/${slug}.`,
      rationale: `${k.vol.toLocaleString()} searches/mo · Informational gap — not ranking top-5 · builds topical authority${signals}`,
      priority: (i < 2 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
      roiValue: Math.round(k.vol * 0.005 * cfg.conversionRate * cfg.profitPerJob * (cfg.closeRate / 100)),
      targetUrl: `/blog/${slug}`,
    };
  });
}

// ─── Website Additions (keyword gaps) ────────────────────────────────

function buildWebsiteAdditions(
  keywords: MarketKeywordItem[],
  pageUrls: Set<string>,
  cfg: SimpleStrategyConfig,
  count = 8,
  enrichedMap?: Map<string, EnrichedKeyword>,
  services?: Array<{ name: string; profit: number; close: number }>,
  city?: string,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  // City stems: run the city name through topicWords() so multi-word cities work correctly.
  // "Los Angeles" → topicWords → ["angel"] (not "los a" which never matches anything).
  // "Vancouver" → ["vanco"]. Used to strip location words before comparing service terms,
  // so "dent repair vancouver" and "bumper repair vancouver" compare as ["dent","repai"]
  // vs ["bumpe","repai"] (1 overlap) — correctly treated as different service pages.
  const cityStems = city ? new Set(topicWords(city)) : null;

  // Topic words stripped of location — service terms only.
  const coreTopics = (kw: string): string[] =>
    topicWords(kw).filter(w => !cityStems || !cityStems.has(w));

  // Build topic sets for keywords the site currently ranks for (positions 1–20).
  // We only include 1-20: below that, the signal is too weak to block a new page.
  const rankedTopicSets: string[][] = keywords
    .filter(item => {
      const rank = item.ranked_serp_element?.serp_item?.rank_group;
      return rank != null && rank >= 1 && rank <= 20;
    })
    .map(item => coreTopics(item.keyword_data.keyword));

  // Returns true when a gap keyword overlaps topically (≥2 core service words)
  // with any already-ranked keyword — creating a new page would cannibalize it.
  const alreadyCoveredByRankedPage = (kw: string): boolean => {
    const candidateSet = new Set(coreTopics(kw));
    if (candidateSet.size < 2) return false; // too short to be meaningful
    return rankedTopicSets.some(rankedTopics => {
      let matches = 0;
      for (const w of rankedTopics) {
        if (candidateSet.has(w) && ++matches >= 2) return true;
      }
      return false;
    });
  };

  // Keywords where no site page is ranking in top 10.
  // Informational/top-funnel keywords (e.g. "cost of paint job") are excluded —
  // those belong in blog posts. Topically covered keywords are also excluded
  // (existing ranked page should be optimised instead of replaced by a new one).
  const gapsSorted = keywords
    .filter(item => {
      const rank = item.ranked_serp_element?.serp_item?.rank_group;
      if (rank !== undefined && rank !== null && rank <= 10) return false;
      const kw = item.keyword_data.keyword.toLowerCase();
      const enriched = enrichedMap?.get(kw);
      const funnel = enriched?.funnel ?? classifyFunnel(item.keyword_data.keyword);
      const intent = enriched?.intent;
      if (funnel === 'top' || intent === 'informational') return false;
      // Skip gap candidates whose topic is already covered by a ranking page
      if (alreadyCoveredByRankedPage(item.keyword_data.keyword)) return false;
      return true;
    })
    .map(item => {
      const kw = item.keyword_data.keyword;
      const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
      const enriched = enrichedMap?.get(kw.toLowerCase());
      const funnel = enriched?.funnel ?? classifyFunnel(kw);
      // Per-service economics — override cfg when a service match is found
      const svc = services ? matchService(kw, services) : null;
      const kwCfg = svc ? { ...cfg, profitPerJob: svc.profit, closeRate: svc.close } : cfg;
      const roi = enriched
        ? calculateKeywordROIV2(vol, kwCfg, {
            funnel: enriched.funnel,
            intent: enriched.intent,
            localType: enriched.localType,
            difficulty: enriched.difficulty,
            competition: enriched.competition,
            hasLocalPack: enriched.hasLocalPack,
            currentRank: enriched.currentRank,
          }).roi
        : calculateKeywordROI(vol, funnel, kwCfg.conversionRate, kwCfg.profitPerJob, kwCfg.closeRate).roi;
      return { kw, vol, funnel, roi, enriched: enriched ?? null };
    })
    .sort((a, b) => b.roi - a.roi);

  // Topically deduplicate — no two new service pages should target the same semantic topic.
  // Higher-ROI keyword wins; same-topic duplicates are dropped.
  // City is stripped before comparison so "dent repair vancouver" and
  // "bumper repair vancouver" are correctly treated as different services.
  const gapCoreTopics = (kw: string) => coreTopics(kw); // reuse city-stripped fn from above
  const gaps: typeof gapsSorted = [];
  for (const g of gapsSorted) {
    const gTopics = new Set(gapCoreTopics(g.kw));
    const isDupe = gaps.some(d => {
      const dTopics = gapCoreTopics(d.kw);
      let matches = 0;
      for (const w of dTopics) {
        if (gTopics.has(w) && ++matches >= 2) return true;
      }
      return false;
    });
    if (!isDupe) gaps.push(g);
    if (gaps.length >= count) break;
  }

  return gaps.map((k, i) => {
    const slug = k.kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suggestedUrl = `/services/${slug}`;
    const signals = k.enriched
      ? [
          k.enriched.competition ? `Competition: ${k.enriched.competition}` : null,
          k.enriched.difficulty != null ? `KD: ${k.enriched.difficulty}` : null,
        ].filter(Boolean).join(' · ')
      : null;

    return {
      id: makeId('add', suggestedUrl),
      type: 'website_addition' as const,
      title: `New Page: ${k.kw}`,
      primaryKeyword: k.kw,
      keywords: [k.kw],
      action: `Create a new service page targeting "${k.kw}" at ${suggestedUrl}. Include H1, meta title, meta description, FAQs, and a CTA.`,
      rationale: signals
        ? `No page ranks for this keyword · Est. $${k.roi}/mo ROI · ${signals}`
        : `No page currently ranks for this keyword · Est. $${k.roi}/mo ROI at top-3 position`,
      priority: (i < 3 ? 'high' : i < 6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      roiValue: k.roi,
      targetUrl: suggestedUrl,
    };
  });
}

// ─── Page Fix Tasks (technical SEO issues + cannibalization, per page) ───

type IssueEntry = { title: string; fix: string; impactScore: number };

/**
 * Build one fix task per page that bundles ALL problems for that page:
 * technical SEO issues (from quickWins) + keyword cannibalization conflicts.
 */
function buildPageFixTasks(
  audit: SiteAuditData,
  count = 8,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const urlToIssues = new Map<string, IssueEntry[]>();

  function addIssue(urlOrKey: string, entry: IssueEntry) {
    const existing = urlToIssues.get(urlOrKey) ?? [];
    existing.push(entry);
    urlToIssues.set(urlOrKey, existing);
  }

  // ── 1. Technical SEO issues from quickWins ─────────────────────────
  const quickWins = (audit.issues_data?.quickWins ?? [])
    .slice()
    .sort((a, b) => b.impactScore - a.impactScore);
  const detailed = audit.issues_data?.detailed ?? [];

  for (const qw of quickWins) {
    // Match quickWin to detailed entry (which has affected URL list) by title
    const matched = detailed.find(d =>
      d.urls?.length && d.title && (
        qw.title.toLowerCase().startsWith(d.title.toLowerCase().slice(0, 14)) ||
        d.title.toLowerCase().startsWith(qw.title.toLowerCase().slice(0, 14))
      )
    );

    // Filter out non-HTML resources — images, fonts, scripts, stylesheets, PDFs.
    // Attaching SEO fix tasks to asset files makes no sense and creates noise.
    const isAsset = (url: string) =>
      /\.(webp|jpg|jpeg|png|gif|svg|ico|pdf|css|js|woff2?|ttf|eot|mp4|mp3)(\?.*)?$/i.test(url) ||
      /\/assets\//i.test(url);

    const urls = (matched?.urls?.slice(0, 4).map(u => u.url) ?? []).filter(u => !isAsset(u));

    if (urls.length === 0) {
      // No specific URL — group as site-wide task
      addIssue(`__site__${qw.id || qw.title}`, {
        title: qw.title,
        fix: qw.fix,
        impactScore: qw.impactScore,
      });
    } else {
      for (const url of urls) {
        addIssue(url, { title: qw.title, fix: qw.fix, impactScore: qw.impactScore });
      }
    }
  }

  // ── 2. Cannibalization: SERP-verified conflicts (Tier 1) ───────────
  const markets = audit.crawl_data?.keywords?.markets;
  const domain = audit.domain ?? '';
  const locations = audit.crawl_data?.keywords?.locations ?? [];

  if (markets && domain) {
    const serpConflicts = detectCannibalizationConflicts(
      markets as any,
      domain,
      locations,
    );

    for (const conflict of serpConflicts) {
      const competitorPaths = conflict.competitors.map(c => c.path).join(', ');
      const impactScore = conflict.severity === 'critical' ? 9 : conflict.severity === 'high' ? 7 : 5;
      addIssue(conflict.primary.url, {
        title: `Keyword cannibalization: "${conflict.keyword}"`,
        fix: `This page and ${competitorPaths} are both ranking for "${conflict.keyword}" (${conflict.volume.toLocaleString()} searches/mo). ${conflict.conflictFix}`,
        impactScore,
      });
    }

    // ── 3. Wrong page winning (Tier 2) ────────────────────────────────
    const serpKeywords = new Set(serpConflicts.map(c => c.keyword));
    const wrongPageRankings = detectWrongPageRankings(
      markets as any,
      domain,
      locations,
      serpKeywords,
    );

    for (const wpr of wrongPageRankings) {
      addIssue(wpr.url, {
        title: `Wrong page ranking: "${wpr.keyword}"`,
        fix: `A ${wpr.pageType} page is winning for "${wpr.keyword}" (${wpr.intent}, position ${wpr.position}, ${wpr.volume.toLocaleString()} searches/mo). ${wpr.reason}`,
        impactScore: wpr.severity === 'high' ? 8 : 6,
      });
    }
  }

  // ── 4. Sort pages by total issue weight and create tasks ──────────
  const pages = Array.from(urlToIssues.entries())
    .map(([key, issues]) => ({
      url: key.startsWith('__site__') ? undefined : key,
      issues,
      topImpact: Math.max(...issues.map(iss => iss.impactScore)),
      totalImpact: issues.reduce((s, iss) => s + iss.impactScore, 0),
    }))
    .sort((a, b) => b.totalImpact - a.totalImpact || b.topImpact - a.topImpact)
    .slice(0, count);

  return pages.map(({ url, issues, topImpact }) => {
    const pathLabel = url
      ? url.replace(/^https?:\/\/[^/]+/, '') || '/'
      : 'site-wide';
    const n = issues.length;
    const fixList = issues.map(iss => `• ${iss.fix}`).join('\n');

    return {
      id: makeId('fix', url ?? issues[0]?.title ?? 'site-wide'),
      type: 'website_change' as const,
      title: `Fix ${n > 1 ? `${n} issues on` : 'issue on'} ${pathLabel}`,
      primaryKeyword: '',
      keywords: [],
      action: url
        ? `Fix the following ${n} issue${n > 1 ? 's' : ''} on ${url}:\n${fixList}`
        : `Fix the following ${n} site-wide issue${n > 1 ? 's' : ''}:\n${fixList}`,
      rationale: `${n} issue${n > 1 ? 's' : ''} found · Highest impact: ${issues[0].title} (${topImpact}/10)`,
      priority: topImpact >= 7 ? 'high' : topImpact >= 4 ? 'medium' : 'low',
      roiValue: 0,
      targetUrl: url,
    };
  });
}

// ─── Off-Page Posts (citations + link gaps) ───────────────────────────

// Universal citations every local business should be on
const UNIVERSAL_CITATIONS = [
  'Google Business Profile', 'Yelp', 'Facebook Business', 'Angi',
  'Better Business Bureau', 'Yellow Pages', 'Manta', 'Thumbtack',
  'Nextdoor', 'Foursquare', 'Apple Maps', 'Bing Places',
];

function buildOffPageItems(
  offPage: OffPageAuditData | null,
  count = 10,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  // No off-page audit has been run — don't guess. Return nothing so the calendar
  // isn't polluted with generic citation tasks the user didn't ask for.
  // Prompt them to run the Off-Page Audit tool instead.
  if (!offPage) return [];

  const items: Omit<CalendarItemV2, 'week' | 'status'>[] = [];

  // Missing citations from off-page audit
  const missingCitations = (offPage.citations ?? []).filter(c => !c.found);

  // Only use universal fallback when the audit ran but found no missing citations
  // (i.e. all known citations are present — surface a small reminder set, not the full list)
  const citationSources: string[] = missingCitations.length > 0
    ? missingCitations.map(c => c.source)
    : UNIVERSAL_CITATIONS.slice(0, 3);

  for (const source of citationSources.slice(0, Math.ceil(count * 0.65))) {
    items.push({
      id: makeId('cit', source),
      type: 'offpage_post' as const,
      title: `Submit to ${source}`,
      primaryKeyword: '',
      keywords: [],
      action: `Create or claim your business listing on ${source}. Ensure NAP (Name, Address, Phone) matches your Google Business Profile exactly. Add photos, business hours, and a keyword-rich description.`,
      rationale: missingCitations.length > 0
        ? `Missing citation on ${source} — citations improve local ranking trust signals`
        : `${source} is a high-authority citation source — consistent NAP improves local pack rankings`,
      priority: items.length < 3 ? 'high' : 'medium',
      roiValue: 0,
      targetPlatform: source,
    });
  }

  // Link gap opportunities
  const linkGaps = (offPage?.link_gaps ?? [])
    .sort((a, b) => b.domainRank - a.domainRank)
    .slice(0, Math.floor(count * 0.35));

  for (const gap of linkGaps) {
    items.push({
      id: makeId('link', gap.domain),
      type: 'offpage_post' as const,
      title: `Get link from ${gap.domain}`,
      primaryKeyword: '',
      keywords: [],
      action: `Reach out to ${gap.domain} (DR ${gap.domainRank}) for a backlink. Your competitors are already linked from this domain. Consider a guest post, resource mention, or partnership.`,
      rationale: `Competitor link gap · Domain Rank ${gap.domainRank} · ${gap.backlinks} backlinks to competitors`,
      priority: gap.domainRank >= 50 ? 'high' : 'medium',
      roiValue: 0,
      targetPlatform: gap.domain,
    });
  }

  return items.slice(0, count);
}

// ─── Week Distribution ────────────────────────────────────────────────

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Priority + ROI-driven week distribution.
 *
 * GBP posts: 1/week every week — publishing cadence, not priority-ordered.
 *
 * Everything else (fixes, new pages, off-page, blogs) is merged into a single
 * queue sorted by priority tier then ROI value. The highest-impact work always
 * lands in the earliest weeks regardless of type. This means:
 *   - A critical cannibalization fix (impact 9/10) beats a low-ROI citation
 *   - A high-ROI service page gap beats a medium-priority page fix
 *
 * Blogs are spaced at most 1 per 3 weeks (publishing cadence constraint).
 * All other types can appear in any week based purely on their priority/ROI rank.
 *
 * Max 3 non-GBP items per week — realistic workload for a small team.
 */
function distributeToWeeks(
  gbp: Omit<CalendarItemV2, 'week' | 'status'>[],
  blogs: Omit<CalendarItemV2, 'week' | 'status'>[],
  webAdds: Omit<CalendarItemV2, 'week' | 'status'>[],
  webFixes: Omit<CalendarItemV2, 'week' | 'status'>[],
  offPage: Omit<CalendarItemV2, 'week' | 'status'>[],
  numWeeks = 12,
): CalendarItemV2[] {
  const result: CalendarItemV2[] = [];

  // GBP: 1 per week, every week (consistent cadence)
  for (let w = 1; w <= numWeeks; w++) {
    const item = gbp[w - 1];
    if (item) result.push({ ...item, week: w, status: 'scheduled' });
  }

  // Track non-GBP slots filled per week
  const weekCounts = new Array(numWeeks + 1).fill(0);
  const MAX_PER_WEEK = 3;

  // Content items (page fixes + new pages) always before off-page tasks.
  // Within each group, sort by priority tier → ROI descending.
  // Off-page (citations, link outreach) fills remaining slots after content work is placed.
  const TYPE_RANK: Record<string, number> = { website_change: 0, website_addition: 0, offpage_post: 1 };
  const actionItems = [...webFixes, ...webAdds, ...offPage].sort((a, b) => {
    const td = (TYPE_RANK[a.type] ?? 0) - (TYPE_RANK[b.type] ?? 0);
    if (td !== 0) return td;
    const pd = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return pd !== 0 ? pd : b.roiValue - a.roiValue;
  });

  // Fill weeks with action items in priority order
  let w = 1;
  for (const item of actionItems) {
    while (w <= numWeeks && weekCounts[w] >= MAX_PER_WEEK) w++;
    if (w > numWeeks) break;
    result.push({ ...item, week: w, status: 'scheduled' });
    weekCounts[w]++;
  }

  // Insert blogs: max 1 per 3-week window, placed in whichever week has a free slot
  // Blogs are already filtered to genuine gaps — if none exist, this loop is empty
  let blogWindowStart = 1;
  for (const blog of blogs) {
    // Find a free slot in this 3-week window
    let placed = false;
    for (let bw = blogWindowStart; bw < blogWindowStart + 3 && bw <= numWeeks; bw++) {
      if (weekCounts[bw] < MAX_PER_WEEK) {
        result.push({ ...blog, week: bw, status: 'scheduled' });
        weekCounts[bw]++;
        blogWindowStart = bw + 3; // next blog at least 3 weeks later
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Window is full — find next available week after the window
      for (let bw = blogWindowStart + 3; bw <= numWeeks; bw++) {
        if (weekCounts[bw] < MAX_PER_WEEK) {
          result.push({ ...blog, week: bw, status: 'scheduled' });
          weekCounts[bw]++;
          blogWindowStart = bw + 3;
          break;
        }
      }
    }
  }

  return result.sort((a, b) => a.week - b.week || a.type.localeCompare(b.type));
}

// ─── Main Export ──────────────────────────────────────────────────────

export function buildUnifiedCalendar(
  siteAudit: SiteAuditData,
  offPageAudit: OffPageAuditData | null,
  cfg: SimpleStrategyConfig,
  enrichedKeywords?: EnrichedKeyword[],
  industryKey?: string,
): CalendarItemV2[] {
  // 0. Resolve per-service economics for this industry
  const industryProfile = industryKey
    ? INDUSTRY_PROFILES.find(p => p.key === industryKey || p.name.toLowerCase() === industryKey.toLowerCase())
    : null;
  const services = industryProfile?.services ?? undefined;

  // 1. Build keyword pool
  //    When enrichedKeywords provided: merge into MarketKeywordItem format + build lookup map
  //    When not provided: fall back to audit-only keywords (existing behaviour)
  let keywords: MarketKeywordItem[];
  let enrichedMap: Map<string, EnrichedKeyword> | undefined;

  if (enrichedKeywords && enrichedKeywords.length > 0) {
    // Convert enriched keywords to MarketKeywordItem shape so builders work unchanged
    keywords = enrichedKeywords.map(ek => ({
      keyword_data: {
        keyword: ek.keyword,
        keyword_info: { search_volume: ek.volume, cpc: ek.cpc ?? 0 },
      },
      ranked_serp_element: ek.currentRank != null
        ? { serp_item: { rank_group: ek.currentRank, url: '' } }
        : undefined,
    }));
    // Lookup map for enriched-ROI calculations inside builders
    enrichedMap = new Map(enrichedKeywords.map(ek => [ek.keyword.toLowerCase(), ek]));
  } else {
    const rawKeywords = collectAuditKeywords(siteAudit);
    keywords = dedupeKeywords(rawKeywords);
  }

  // 1b. Pad thin keyword pools with industry-derived synthetics.
  //     When the site audit + DataForSEO return fewer than 15 keywords (e.g. brand-new
  //     site, first run, API failure), the calendar would be nearly empty. Synthetic
  //     keywords from the industry profile guarantee a full 12-week plan:
  //       - Bottom-funnel "[service] [city]" → GBP posts + new service pages
  //       - Informational "cost of [service]" / "how to [service]" → blog posts
  //     Conservative default volumes (100 / 50) ensure real keywords always rank higher.
  const city = siteAudit.crawl_data?.business?.city ?? '';

  const MIN_KEYWORD_POOL = 15;
  if (keywords.length < MIN_KEYWORD_POOL && services) {
    const existingKwSet = new Set(keywords.map(k => k.keyword_data.keyword.toLowerCase()));
    const { keywords: synKws, enrichedEntries } = buildSyntheticKeywords(services, city, existingKwSet);
    keywords = [...keywords, ...synKws];
    if (enrichedEntries.length > 0) {
      enrichedMap = new Map([...(enrichedMap ?? new Map()), ...enrichedEntries]);
    }
  }

  // 2. Page URL set for gap detection
  const pageUrls = buildPageUrlSet(siteAudit);

  // 3. Build each item pool
  const gbpItems = buildGBPItems(keywords, cfg, 12, enrichedMap, services);
  const addItems = buildWebsiteAdditions(keywords, pageUrls, cfg, 8, enrichedMap, services, city);
  const blogItems = buildBlogItems(keywords, cfg, 6, enrichedMap);
  const fixItems = buildPageFixTasks(siteAudit, 8);
  const opItems = buildOffPageItems(offPageAudit, 10);

  // 3b. Reframe GBP posts that share a keyword with a new service page as
  //     "Promote New Page" announcements — this turns the overlap into a
  //     coordinated launch instead of a duplicate recommendation.
  const addKeywords = new Set(addItems.map(i => i.primaryKeyword.toLowerCase()));
  const gbpItemsFinal = gbpItems.map(item => {
    if (!item.primaryKeyword || !addKeywords.has(item.primaryKeyword.toLowerCase())) return item;
    const slug = item.primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      ...item,
      title: `GBP: Promote New "${item.primaryKeyword}" Page`,
      action: `After publishing the new "${item.primaryKeyword}" service page, announce it on Google Business Profile. Link to /services/${slug}, include a photo of recent work, highlight key benefits, and end with a call-to-action to book or call.`,
      rationale: `New page launch announcement · ${item.rationale}`,
    };
  });

  // 4. Distribute to weeks
  return distributeToWeeks(gbpItemsFinal, blogItems, addItems, fixItems, opItems, 12);
}
