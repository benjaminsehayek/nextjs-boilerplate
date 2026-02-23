// Site Audit Cannibalization Detection — Four-Tier Analysis
// Pure logic — no React, no browser APIs, no Supabase
//
// TIER 1: SERP-Verified (2+ domain URLs in the same SERP) — definitive but rare
// TIER 2: Wrong Page Ranking (right keyword, wrong page type for intent) — conversion killer
// TIER 3: N-gram Overlap (pages ranking for semantically overlapping keyword sets) — heuristic
// TIER 4: Content Overlap (title/H1 analysis for unranked/new pages) — catches AI-generated dupe content

import type {
  CannibalizationConflict,
  MarketData,
  KeywordIntent,
  UrlType,
  CrawledPage,
} from '@/components/tools/SiteAudit/types';
import {
  classifyUrlType,
  classifyKeywordIntent,
  classifyConflictType,
} from './classifiers';

// ─── Exported Tier 2 Shape ──────────────────────────────────────────

export interface WrongPageRanking {
  keyword: string;
  volume: number;
  cpc: number;
  position: number;
  url: string;
  path: string;
  pageType: UrlType;
  idealPageType: UrlType;
  intent: KeywordIntent;
  reason: string;
  severity: 'high' | 'medium';
  market: string;
  etv: number;
}

// ─── Exported Tier 3 Shape ──────────────────────────────────────────

export interface NgramOverlapConflict {
  pageA: {
    url: string;
    path: string;
    urlType: UrlType;
    topPosition: number;
    etv: number;
    kwCount: number;
  };
  pageB: {
    url: string;
    path: string;
    urlType: UrlType;
    topPosition: number;
    etv: number;
    kwCount: number;
  };
  sharedPhrases: string[];
  overlapPct: number; // 0–100
  sharedVolume: number;
  risk: 'high' | 'medium';
}

// ─── Exported Tier 4 Shape ──────────────────────────────────────────

export interface ContentOverlapGroup {
  pages: Array<{
    url: string;
    path: string;
    title: string;
    h1: string;
    urlType: UrlType;
  }>;
  sharedPhrases: string[]; // 2-word phrases shared by all pages in the group
  risk: 'high' | 'medium';
  conflictType: string;
  conflictFix: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function relativePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function isWrongPageWinning(
  primaryType: UrlType,
  competitorType: UrlType,
  intent: KeywordIntent
): boolean {
  if (
    primaryType === 'homepage' &&
    (intent === 'local-commercial' || intent === 'commercial') &&
    (competitorType === 'service' || competitorType === 'location')
  ) return true;

  if (
    primaryType === 'blog' &&
    (intent === 'local-commercial' || intent === 'commercial') &&
    (competitorType === 'service' || competitorType === 'location' || competitorType === 'homepage')
  ) return true;

  return false;
}

function computeSeverity(
  volume: number,
  position: number,
  wrongPageWinning: boolean
): 'critical' | 'high' | 'medium' {
  if (wrongPageWinning && (volume >= 200 || position <= 5)) return 'critical';
  if (volume >= 500 || (position <= 3 && wrongPageWinning)) return 'critical';
  if (volume >= 100 || position <= 10) return 'high';
  return 'medium';
}

// ─── TIER 1: SERP-Verified Cannibalization ──────────────────────────

/**
 * Detects cases where Google shows 2+ domain URLs for the same query.
 * Definitive but rare — Google limits same-domain results in top 20.
 */
export function detectCannibalizationConflicts(
  markets: Record<string, MarketData>,
  domain: string,
  trackedLocations: string[] = []
): CannibalizationConflict[] {
  const conflicts: CannibalizationConflict[] = [];

  for (const [marketLocation, marketData] of Object.entries(markets)) {
    for (const item of marketData.items) {
      if (!item._isCannibalized) continue;
      const matches = item._serpMatches || [];
      if (matches.length < 2) continue;

      const sorted = [...matches].sort((a, b) => a.position - b.position);
      const primary = sorted[0];
      const competingMatches = sorted.slice(1);

      const keyword = item.keyword_data.keyword;
      const volume = item.keyword_data.keyword_info?.search_volume || 0;
      const cpc = item.keyword_data.keyword_info?.cpc || 0;
      const primaryType = classifyUrlType(primary.url);
      const topCompetitor = competingMatches[0];
      const competitorType = classifyUrlType(topCompetitor.url);
      const intent = classifyKeywordIntent(keyword, domain, trackedLocations);
      const conflictResult = classifyConflictType(primaryType, competitorType, intent);
      const wrongPageWinning = isWrongPageWinning(primaryType, competitorType, intent);
      const positionGap = competingMatches[competingMatches.length - 1].position - primary.position;
      const severity = computeSeverity(volume, primary.position, wrongPageWinning);

      conflicts.push({
        keyword, volume, cpc, market: marketLocation,
        primary: {
          url: primary.url, path: primary.path, position: primary.position,
          title: primary.title, pageType: primaryType,
        },
        competitors: competingMatches.map((m) => ({
          url: m.url, path: m.path, position: m.position,
          title: m.title, pageType: classifyUrlType(m.url),
        })),
        positionGap, allMatches: matches, severity, intent,
        conflictType: conflictResult.type,
        conflictIcon: conflictResult.icon,
        conflictDescription: conflictResult.description,
        conflictFix: conflictResult.fix,
        primaryType, competitorType, wrongPageWinning,
      });
    }
  }

  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  conflicts.sort((a, b) => {
    const sev = sevOrder[a.severity] - sevOrder[b.severity];
    return sev !== 0 ? sev : b.volume - a.volume;
  });

  return conflicts;
}

// ─── TIER 2: Wrong Page Ranking ──────────────────────────────────────

/**
 * Detects keywords where a single page is ranking but it's the WRONG page type for
 * the keyword's intent. Not traditional cannibalization but equally damaging for conversions.
 * E.g. a blog post ranking #5 for "emergency plumber dallas" (commercial intent).
 */
export function detectWrongPageRankings(
  markets: Record<string, MarketData>,
  domain: string,
  trackedLocations: string[] = [],
  serpConflictKeywords: Set<string> = new Set()
): WrongPageRanking[] {
  const results: WrongPageRanking[] = [];
  const seen = new Set<string>(); // dedup keyword across markets

  for (const [marketLocation, marketData] of Object.entries(markets)) {
    for (const item of marketData.items) {
      const keyword = item.keyword_data.keyword;

      // Skip already-flagged cannibalization keywords
      if (serpConflictKeywords.has(keyword.toLowerCase())) continue;

      const position = item.ranked_serp_element.serp_item.rank_group || 0;
      if (position <= 0 || position > 20) continue; // only ranking pages

      const volume = item.keyword_data.keyword_info?.search_volume || 0;
      if (volume < 10) continue;

      const url = item.ranked_serp_element.serp_item.url;
      if (!url) continue;

      const dedupeKey = keyword.toLowerCase() + '::' + url;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const intent = classifyKeywordIntent(keyword, domain, trackedLocations);
      const pageType = classifyUrlType(url);
      const isCommercial = intent === 'local-commercial' || intent === 'commercial';

      let isMismatch = false;
      let reason = '';
      let idealPageType: UrlType = 'service';
      let severity: 'high' | 'medium' = 'medium';

      if (isCommercial && pageType === 'blog') {
        isMismatch = true;
        reason = 'Blog post ranking for a commercial keyword — visitors looking to hire land on an article instead of a service page.';
        idealPageType = 'service';
        severity = position <= 10 ? 'high' : 'medium';
      } else if (isCommercial && pageType === 'about') {
        isMismatch = true;
        reason = 'About page ranking for a commercial keyword — visitors looking for a service land on your team bio instead.';
        idealPageType = 'service';
        severity = 'medium';
      } else if (isCommercial && pageType === 'faq') {
        isMismatch = true;
        reason = 'FAQ page ranking for a commercial keyword — may convert much less than a dedicated service page.';
        idealPageType = 'service';
        severity = 'medium';
      } else if (intent === 'local-commercial' && pageType === 'homepage' && position > 5) {
        isMismatch = true;
        reason = 'Homepage ranking for a local keyword at a low position — a dedicated service or location page would likely rank higher and convert better.';
        idealPageType = 'location';
        severity = 'medium';
      } else if (isCommercial && pageType === 'gallery') {
        isMismatch = true;
        reason = 'Gallery/portfolio page ranking for a commercial keyword — visitors ready to hire land on photos instead of a service page.';
        idealPageType = 'service';
        severity = 'medium';
      }

      if (isMismatch) {
        results.push({
          keyword, volume, cpc: item.keyword_data.keyword_info?.cpc || 0,
          position, url, path: relativePath(url), pageType, idealPageType,
          intent, reason, severity,
          market: marketLocation,
          etv: item.ranked_serp_element.serp_item.etv || 0,
        });
      }
    }
  }

  const sevOrder: Record<string, number> = { high: 0, medium: 1 };
  results.sort((a, b) => {
    const s = sevOrder[a.severity] - sevOrder[b.severity];
    return s !== 0 ? s : b.volume - a.volume;
  });

  return results;
}

// ─── TIER 3: N-gram Overlap (Ranked Keywords) ────────────────────────

function buildNgrams(
  text: string,
  n: number
): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const grams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    grams.push(words.slice(i, i + n).join(' '));
  }
  return grams;
}

/**
 * Detects pages targeting semantically overlapping keyword sets by comparing
 * the n-grams of their ranked keywords. Catches cases where two pages rank for
 * similar-but-different keywords (e.g. "plumber dallas" vs "plumbing service dallas")
 * without appearing in the same SERP.
 */
export function detectNgramOverlaps(
  markets: Record<string, MarketData>,
  domain: string
): NgramOverlapConflict[] {
  // Build pageMap: URL → {items, etv, topPos}
  const pageMap = new Map<string, {
    items: Array<{ keyword: string; volume: number; position: number; etv: number }>;
    urlType: UrlType;
  }>();

  for (const [, marketData] of Object.entries(markets)) {
    for (const item of marketData.items) {
      const url = item.ranked_serp_element.serp_item.url;
      const pos = item.ranked_serp_element.serp_item.rank_group || 0;
      if (!url || pos <= 0 || pos > 100) continue; // only ranking pages

      if (!pageMap.has(url)) {
        pageMap.set(url, { items: [], urlType: classifyUrlType(url) });
      }
      pageMap.get(url)!.items.push({
        keyword: item.keyword_data.keyword,
        volume: item.keyword_data.keyword_info?.search_volume || 0,
        position: pos,
        etv: item.ranked_serp_element.serp_item.etv || 0,
      });
    }
  }

  // Skip utility page types that shouldn't be compared
  const skipTypes: UrlType[] = ['contact', 'about', 'gallery', 'testimonials', 'faq'];

  // Build ngram profiles per page (top 20 ngrams by volume)
  interface PageProfile {
    url: string;
    urlType: UrlType;
    ngrams: Map<string, { volume: number }>;
    topPosition: number;
    etv: number;
    kwCount: number;
  }

  const profiles: PageProfile[] = [];

  for (const [url, data] of pageMap.entries()) {
    if (skipTypes.includes(data.urlType)) continue;
    if (data.items.length === 0) continue;

    const ngramMap = new Map<string, { volume: number }>();

    for (const { keyword, volume } of data.items) {
      const bigrams = buildNgrams(keyword, 2);
      const trigrams = buildNgrams(keyword, 3);
      for (const gram of [...bigrams, ...trigrams]) {
        const existing = ngramMap.get(gram);
        if (existing) {
          existing.volume += volume;
        } else {
          ngramMap.set(gram, { volume });
        }
      }
    }

    // Keep top 20 by volume
    const sorted = [...ngramMap.entries()]
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, 20);
    const topNgrams = new Map(sorted);

    const positions = data.items.map((i) => i.position).filter((p) => p > 0);
    const etv = data.items.reduce((s, i) => s + i.etv, 0);

    profiles.push({
      url,
      urlType: data.urlType,
      ngrams: topNgrams,
      topPosition: positions.length > 0 ? Math.min(...positions) : 999,
      etv,
      kwCount: data.items.length,
    });
  }

  // Pairwise comparison
  const overlaps: NgramOverlapConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i];
      const b = profiles[j];

      const aKeys = [...a.ngrams.keys()];
      const bKeys = [...b.ngrams.keys()];
      const shared = aKeys.filter((g) => bKeys.includes(g));

      if (shared.length < 2) continue;

      const overlapPct = Math.round(
        (shared.length / Math.min(aKeys.length, bKeys.length)) * 100
      );

      if (overlapPct < 15 && shared.length < 3) continue;

      const pairKey = [a.url, b.url].sort().join('||');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const sharedVolume = shared.reduce((sum, g) => {
        const av = a.ngrams.get(g)?.volume || 0;
        const bv = b.ngrams.get(g)?.volume || 0;
        return sum + Math.max(av, bv);
      }, 0);

      const risk = overlapPct >= 50 ? 'high' : 'medium';

      overlaps.push({
        pageA: {
          url: a.url,
          path: relativePath(a.url),
          urlType: a.urlType,
          topPosition: a.topPosition,
          etv: a.etv,
          kwCount: a.kwCount,
        },
        pageB: {
          url: b.url,
          path: relativePath(b.url),
          urlType: b.urlType,
          topPosition: b.topPosition,
          etv: b.etv,
          kwCount: b.kwCount,
        },
        sharedPhrases: shared.slice(0, 6),
        overlapPct,
        sharedVolume,
        risk,
      });
    }
  }

  overlaps.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === 'high' ? -1 : 1;
    return b.sharedVolume - a.sharedVolume;
  });

  return overlaps;
}

// ─── TIER 4: Content Overlap (Title/H1 Analysis) ─────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'of', 'for', 'to', 'at', 'by', 'and', 'or', 'is',
  'are', 'be', 'our', 'your', 'we', 'us', 'you', 'my', 'it', 'this', 'that',
  'with', 'from', 'on', 'near', 'me', 'all', 'any', 'get', 'top', 'best',
  'local', 'licensed', 'professional', 'affordable', 'quality', 'trusted',
  'expert', 'experts', 'reliable', 'certified', 'experienced', 'leading',
  'premier', 'number', 'rated',
]);

// Generic phrases that would appear on almost every page — skip them
const GENERIC_BIGRAMS = new Set([
  'services near', 'near me', 'contact us', 'call us', 'call now',
  'learn more', 'our services', 'free quote', 'free estimate', 'get quote',
]);

function extractTargetTokens(
  page: CrawledPage,
  brandName: string,
  cityNames: string[]
): string[] {
  // H1 preferred over title
  const h1 = page.meta?.htags?.h1?.[0] || '';
  const title = page.meta?.title || '';
  let raw = (h1 || title).toLowerCase();

  // Strip brand suffix (everything after |, –, -)
  raw = raw.replace(/\s*[|–—\-].*$/, '').trim();

  // Remove brand name
  if (brandName.length > 2) {
    raw = raw.replace(new RegExp('\\b' + brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), ' ');
  }

  // Remove city names
  for (const city of cityNames) {
    if (city.length > 2) {
      raw = raw.replace(new RegExp('\\b' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), ' ');
    }
  }

  // Remove state abbreviations (2-letter)
  raw = raw.replace(/\b[a-z]{2}\b/g, ' ');

  // Remove punctuation
  raw = raw.replace(/[^a-z0-9\s]/g, ' ');

  // Tokenize, filter stop words
  return raw.split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function contentConflictDescriptionAndFix(types: UrlType[]): { type: string; fix: string } {
  const typeSet = new Set(types);
  if (typeSet.size === 1 && typeSet.has('service')) {
    return {
      type: 'Duplicate Service Pages',
      fix: 'Consolidate these pages or clearly differentiate them. Each service page should target a unique keyword cluster. Merge the weakest pages into the strongest one with a 301 redirect, or rewrite each to cover a distinct sub-service or modifier (e.g. "emergency" vs "residential" vs "commercial").',
    };
  }
  if (typeSet.size === 1 && typeSet.has('location')) {
    return {
      type: 'Duplicate Location Pages',
      fix: 'Location pages targeting the same service in the same city need substantial unique content. Add city-specific testimonials, local case studies, service area maps, and unique service descriptions. Aim for 60%+ unique content per page, not just swapped city names.',
    };
  }
  if (typeSet.has('service') && typeSet.has('location')) {
    return {
      type: 'Service vs. Location Page Overlap',
      fix: 'Ensure the service page targets your primary service broadly and the location page targets "service + city" specifically. Add hyper-local content to the location page (local stats, city-specific pricing, neighborhood mentions). Use clear internal linking to signal the right page for each query.',
    };
  }
  if (typeSet.has('blog')) {
    return {
      type: 'Blog Posts Targeting Same Topic',
      fix: 'Consolidate overlapping blog posts into a single comprehensive guide, using 301 redirects from the weaker posts. If keeping separate, clearly differentiate each post\'s angle (one as beginner guide, one as advanced tips, one as FAQ). Add strong internal links from blog posts to the relevant service page.',
    };
  }
  return {
    type: 'Pages Targeting Same Topic',
    fix: 'Review and differentiate each page to target a distinct keyword cluster. Update titles, H1s, and body content so each page addresses a unique user intent. Use a keyword mapping spreadsheet to ensure no two pages target the same primary keyword.',
  };
}

/**
 * Detects pages targeting the same keyword themes based on title/H1 content.
 * Works for unranked pages (new sites, AI-generated content) — no SERP data needed.
 * Groups pages by shared 2-word phrases extracted from their H1/title after
 * removing stop words, brand name, and city names.
 */
export function detectContentOverlaps(
  pages: CrawledPage[],
  domain: string,
  trackedLocations: string[] = []
): ContentOverlapGroup[] {
  // Only analyze indexable HTML pages
  const eligibleTypes: UrlType[] = ['service', 'location', 'blog', 'homepage'];
  const skipTypes: UrlType[] = ['contact', 'about', 'gallery', 'testimonials', 'faq', 'other'];

  // Brand name = domain without TLD
  const brandName = domain
    .replace(/\.(com|net|org|co|io|biz|info|us|ca|uk).*$/i, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .trim()
    .toLowerCase();

  // City names from tracked locations
  const cityNames = trackedLocations.map((loc) => {
    const parts = loc.split(',');
    return (parts[0] || '').trim().toLowerCase();
  }).filter((c) => c.length > 2);

  // Build page profiles
  interface PageProfile {
    url: string;
    path: string;
    title: string;
    h1: string;
    urlType: UrlType;
    tokens: string[];
    bigrams: string[];
  }

  const profiles: PageProfile[] = [];

  for (const page of pages) {
    if (page.status_code !== 200) continue;
    if (!page.meta?.title && !page.meta?.htags?.h1?.[0]) continue;

    const urlType = classifyUrlType(page.url);
    if (skipTypes.includes(urlType)) continue;

    const tokens = extractTargetTokens(page, brandName, cityNames);
    if (tokens.length < 2) continue;

    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      const gram = tokens[i] + ' ' + tokens[i + 1];
      if (!GENERIC_BIGRAMS.has(gram)) bigrams.push(gram);
    }

    if (bigrams.length === 0) continue;

    profiles.push({
      url: page.url,
      path: relativePath(page.url),
      title: page.meta?.title || '',
      h1: page.meta?.htags?.h1?.[0] || '',
      urlType,
      tokens,
      bigrams,
    });
  }

  if (profiles.length < 2) return [];

  // ── Bigram frequency filter ──────────────────────────────────────────
  // Exclude bigrams that appear on most pages of the site (e.g. "auto body"
  // on every page of an auto body shop). These are site-wide noise, not
  // indicators of cannibalization between specific pages.
  // Only use bigrams appearing on 2–30% of pages for grouping.
  const bigramFrequency = new Map<string, number>();
  for (const profile of profiles) {
    const uniqueBigrams = new Set(profile.bigrams);
    for (const gram of uniqueBigrams) {
      bigramFrequency.set(gram, (bigramFrequency.get(gram) || 0) + 1);
    }
  }
  const maxFreq = Math.max(2, Math.ceil(profiles.length * 0.3));
  const specificBigrams = new Set<string>();
  for (const [gram, freq] of bigramFrequency.entries()) {
    if (freq >= 2 && freq <= maxFreq) specificBigrams.add(gram);
  }

  // Build bigram → page indices (specific bigrams only)
  const bigramIndex = new Map<string, number[]>(); // bigram → profile indices
  for (let i = 0; i < profiles.length; i++) {
    for (const gram of profiles[i].bigrams) {
      if (!specificBigrams.has(gram)) continue; // skip domain-wide noise
      if (!bigramIndex.has(gram)) bigramIndex.set(gram, []);
      bigramIndex.get(gram)!.push(i);
    }
  }

  // Union-Find to group pages sharing specific bigrams
  const parent = profiles.map((_, i) => i);
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(x: number, y: number) {
    parent[find(x)] = find(y);
  }

  // Track which bigrams led to each union for reporting
  const pairSharedBigrams = new Map<string, Set<string>>();

  for (const [gram, indices] of bigramIndex.entries()) {
    if (indices.length < 2) continue;

    // Connect all pages sharing this bigram
    for (let i = 0; i < indices.length - 1; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        union(indices[i], indices[j]);
        const pairKey = [indices[i], indices[j]].sort().join('-');
        if (!pairSharedBigrams.has(pairKey)) pairSharedBigrams.set(pairKey, new Set());
        pairSharedBigrams.get(pairKey)!.add(gram);
      }
    }
  }

  // Group pages by root
  const groups = new Map<number, number[]>();
  for (let i = 0; i < profiles.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  // Build output groups
  const results: ContentOverlapGroup[] = [];

  for (const [, memberIndices] of groups.entries()) {
    if (memberIndices.length < 2) continue;

    const members = memberIndices.map((i) => profiles[i]);

    // Find specific bigrams shared by ALL members in the group
    const commonBigrams = members[0].bigrams.filter((gram) =>
      specificBigrams.has(gram) && members.every((m) => m.bigrams.includes(gram))
    );

    // Fall back to specific bigrams shared by at least half the members
    const frequentBigrams = commonBigrams.length > 0
      ? commonBigrams
      : [...bigramIndex.entries()]
          .filter(([gram, indices]) => {
            if (!specificBigrams.has(gram)) return false;
            const memberSet = new Set(memberIndices);
            const matchCount = indices.filter((i) => memberSet.has(i)).length;
            return matchCount >= Math.ceil(memberIndices.length / 2);
          })
          .map(([gram]) => gram);

    if (frequentBigrams.length === 0) continue;

    const urlTypes = members.map((m) => m.urlType);
    const risk = members.length >= 4 ? 'high' : members.length === 3 ? 'high' : 'medium';
    const { type, fix } = contentConflictDescriptionAndFix(urlTypes);

    results.push({
      pages: members.map((m) => ({
        url: m.url,
        path: m.path,
        title: m.title,
        h1: m.h1,
        urlType: m.urlType,
      })),
      sharedPhrases: frequentBigrams.slice(0, 5),
      risk,
      conflictType: type,
      conflictFix: fix,
    });
  }

  // Sort: high risk first, then by page count descending
  results.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === 'high' ? -1 : 1;
    return b.pages.length - a.pages.length;
  });

  return results;
}

// ─── Ranking Page Map ─────────────────────────────────────────────────────────
// Page-centric view: each domain page with all the keywords it ranks for.
// Used in the "Ranking Pages" section to show which pages compete for overlapping queries.

export interface RankingPage {
  url: string;
  path: string;
  urlType: UrlType;
  keywords: Array<{
    keyword: string;
    volume: number;
    position: number;
    market: string;
    etv: number;
  }>;
  topPosition: number;
  totalVolume: number;
  totalEtv: number;
  kwCount: number;
}

/**
 * Builds a page-centric view of all SERP keyword data.
 * Each entry = one domain URL + all keywords it ranks for across all markets.
 * Sorted by total ETV descending (highest-traffic pages first).
 */
export function buildRankingPageMap(
  markets: Record<string, MarketData>
): RankingPage[] {
  const pageMap = new Map<string, RankingPage>();

  for (const [market, md] of Object.entries(markets)) {
    for (const item of md.items) {
      const url = item.ranked_serp_element.serp_item.url;
      const pos = item.ranked_serp_element.serp_item.rank_group || 0;
      if (!url || pos <= 0 || pos > 100) continue;

      const keyword = item.keyword_data.keyword;
      const volume = item.keyword_data.keyword_info?.search_volume || 0;
      const etv = item.ranked_serp_element.serp_item.etv || 0;

      if (!pageMap.has(url)) {
        pageMap.set(url, {
          url,
          path: relativePath(url),
          urlType: classifyUrlType(url),
          keywords: [],
          topPosition: pos,
          totalVolume: 0,
          totalEtv: 0,
          kwCount: 0,
        });
      }

      const page = pageMap.get(url)!;
      page.keywords.push({ keyword, volume, position: pos, market, etv });
      page.totalVolume += volume;
      page.totalEtv += etv;
      page.kwCount++;
      if (pos < page.topPosition) page.topPosition = pos;
    }
  }

  // Sort keywords within each page by position (best rank first)
  for (const page of pageMap.values()) {
    page.keywords.sort((a, b) => a.position - b.position);
  }

  // Return sorted by ETV descending
  return [...pageMap.values()].sort((a, b) => b.totalEtv - a.totalEtv);
}
