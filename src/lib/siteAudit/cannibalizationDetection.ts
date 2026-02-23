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

export interface MarketKeywordConflict {
  market: string;           // full market string, e.g. "Vancouver, WA, United States"
  marketLabel: string;      // short label, e.g. "Vancouver, WA"
  conflicts: Array<{
    keyword: string;
    volume: number;         // national search volume (only indicative for local keywords)
    pages: Array<{
      url: string;
      path: string;
      urlType: UrlType;
      position: number;
    }>;
  }>;
  severity: 'high' | 'medium';
}

// ─── Exported Tier 4 Shape ──────────────────────────────────────────

export interface TitleConflict {
  sharedPhrase: string; // The most specific title phrase shared across pages in the group
  pages: Array<{
    url: string;
    path: string;
    title: string;
    urlType: UrlType;
  }>;
  severity: 'critical' | 'high';
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
      // No volume floor: local keywords tracked at city level have low national volumes
      // but are still actionable wrong-page signals.

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

// ─── TIER 3: Within-Market Keyword Conflict Detection ────────────────

/**
 * Detects keywords where 2+ domain pages are both ranking within the same local market.
 * This is true local cannibalization: Google shows both pages for the same search in the
 * same city, splitting traffic that should go to one authoritative page.
 *
 * Groups results by market so fixes are actionable per location.
 *
 * Note: Cross-market conflicts (page A in Vancouver, page B in Chehalis for the same keyword)
 * are NOT flagged — that's the INTENDED behavior of location pages serving different cities.
 */
export function detectMarketKeywordConflicts(
  markets: Record<string, MarketData>
): MarketKeywordConflict[] {
  const skipTypes: UrlType[] = ['contact', 'about', 'gallery', 'testimonials', 'faq', 'other'];
  const results: MarketKeywordConflict[] = [];

  for (const [market, md] of Object.entries(markets)) {
    // Within this market: keyword → best-ranking page per URL
    const kwUrlMap = new Map<string, {
      volume: number;
      urlMap: Map<string, { position: number; urlType: UrlType }>;
    }>();

    for (const item of md.items) {
      const url = item.ranked_serp_element.serp_item.url;
      const pos = item.ranked_serp_element.serp_item.rank_group || 0;
      if (!url || pos <= 0 || pos > 100) continue;

      const urlType = classifyUrlType(url);
      if (skipTypes.includes(urlType)) continue;

      const keyword = item.keyword_data.keyword.toLowerCase().trim();
      const volume = item.keyword_data.keyword_info?.search_volume || 0;

      if (!kwUrlMap.has(keyword)) {
        kwUrlMap.set(keyword, { volume, urlMap: new Map() });
      }
      const kw = kwUrlMap.get(keyword)!;
      // Keep only the best position per URL in this market
      const existing = kw.urlMap.get(url);
      if (!existing || pos < existing.position) {
        kw.urlMap.set(url, { position: pos, urlType });
      }
    }

    // Conflicts = keywords where 2+ different domain pages rank in this market
    const conflicts: MarketKeywordConflict['conflicts'] = [];
    for (const [keyword, data] of kwUrlMap.entries()) {
      if (data.urlMap.size < 2) continue;
      conflicts.push({
        keyword,
        volume: data.volume,
        pages: [...data.urlMap.entries()]
          .map(([url, info]) => ({
            url,
            path: relativePath(url),
            urlType: info.urlType,
            position: info.position,
          }))
          .sort((a, b) => a.position - b.position), // best rank first
      });
    }

    if (conflicts.length === 0) continue;

    // Sort: highest-ranking conflicts (lowest position number) first
    conflicts.sort((a, b) => (a.pages[0]?.position ?? 100) - (b.pages[0]?.position ?? 100));

    const parts = market.split(',');
    const marketLabel = parts.slice(0, 2).map(s => s.trim()).join(', ');
    const severity: 'high' | 'medium' = conflicts.length >= 3 ? 'high' : 'medium';

    results.push({ market, marketLabel, conflicts, severity });
  }

  // High severity first, then by conflict count
  return results.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return b.conflicts.length - a.conflicts.length;
  });
}

// ─── TIER 4: Title Conflict Detection ────────────────────────────────
//
// Detects pages that share exact phrase matches in their <title> tag first segment.
// Unlike the previous bigram approach, this KEEPS city names and state abbreviations
// so "Collision Repair Vancouver WA" in 3 titles is correctly flagged as a conflict.
//
// Uses 3-grams and 4-grams extracted from the raw title segment (before | separator),
// after removing only the brand name and punctuation.

const TITLE_STOPS = new Set([
  'the', 'a', 'an', 'in', 'of', 'for', 'to', 'at', 'by', 'and', 'or',
  'is', 'are', 'be', 'our', 'your', 'we', 'us', 'you', 'my', 'it',
  'this', 'that', 'with', 'from', 'on', 'near', 'me', 'get', 'all',
]);

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
 * Detects pages whose <title> tags share exact phrase matches (3-grams or 4-grams).
 * Works for unranked pages (new sites, AI-generated content) — no SERP data needed.
 *
 * Unlike the previous approach, city names and state abbreviations are KEPT in the
 * phrases, so "Collision Repair Vancouver WA" shared across 3 titles is correctly
 * flagged as critical (not lost when stripping geo tokens).
 *
 * Only the first segment of the title (before | – — separators) is compared.
 */
export function detectTitleConflicts(
  pages: CrawledPage[],
  domain: string,
): TitleConflict[] {
  const skipTypes: UrlType[] = ['contact', 'about', 'gallery', 'testimonials', 'faq', 'other'];

  // Brand name = domain without TLD
  const brandName = domain
    .replace(/\.(com|net|org|co|io|biz|info|us|ca|uk).*$/i, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .trim()
    .toLowerCase();

  interface TitleProfile {
    url: string;
    path: string;
    title: string;
    urlType: UrlType;
    grams: string[]; // 3-grams and 4-grams from the title segment
  }

  const profiles: TitleProfile[] = [];

  for (const page of pages) {
    if (page.status_code !== 200) continue;
    const title = page.meta?.title || '';
    if (!title) continue;

    const urlType = classifyUrlType(page.url);
    if (skipTypes.includes(urlType)) continue;

    // Take only the first segment (before | – —)
    const segment = title.split(/\s*[|–—]\s*/)[0].trim();
    if (!segment) continue;

    let raw = segment.toLowerCase();

    // Remove brand name
    if (brandName.length > 2) {
      raw = raw.replace(
        new RegExp('\\b' + brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'),
        ' '
      );
    }

    // Remove punctuation (keep alphanumeric + spaces — city names and state abbrevs stay)
    raw = raw.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // Tokenize, remove only pure stop words (NOT city names, NOT state abbrevs)
    const tokens = raw
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !TITLE_STOPS.has(t));

    if (tokens.length < 3) continue;

    // Build 3-grams and 4-grams
    const grams: string[] = [];
    for (let i = 0; i <= tokens.length - 3; i++) {
      grams.push(tokens.slice(i, i + 3).join(' '));
    }
    for (let i = 0; i <= tokens.length - 4; i++) {
      grams.push(tokens.slice(i, i + 4).join(' '));
    }

    if (grams.length === 0) continue;

    profiles.push({
      url: page.url,
      path: relativePath(page.url),
      title,
      urlType,
      grams: [...new Set(grams)],
    });
  }

  if (profiles.length < 2) return [];

  // Count how many pages contain each gram
  const gramFreq = new Map<string, number>();
  for (const profile of profiles) {
    for (const gram of profile.grams) {
      gramFreq.set(gram, (gramFreq.get(gram) || 0) + 1);
    }
  }

  // Only grams on 2+ pages are conflict signals — no upper-bound filter:
  // title conflicts are always worth reporting regardless of frequency.
  const conflictGrams = new Set<string>();
  for (const [gram, freq] of gramFreq.entries()) {
    if (freq >= 2) conflictGrams.add(gram);
  }

  if (conflictGrams.size === 0) return [];

  // Build gram → [page indices] for conflict grams only
  const gramIndex = new Map<string, number[]>();
  for (let i = 0; i < profiles.length; i++) {
    for (const gram of profiles[i].grams) {
      if (!conflictGrams.has(gram)) continue;
      if (!gramIndex.has(gram)) gramIndex.set(gram, []);
      gramIndex.get(gram)!.push(i);
    }
  }

  // Union-Find to group pages that share any conflict gram
  const parent = profiles.map((_, i) => i);
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(x: number, y: number) {
    parent[find(x)] = find(y);
  }

  for (const [, indices] of gramIndex.entries()) {
    for (let i = 0; i < indices.length - 1; i++) {
      union(indices[i], indices[i + 1]);
    }
  }

  // Group by union-find root
  const groups = new Map<number, number[]>();
  for (let i = 0; i < profiles.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const results: TitleConflict[] = [];

  for (const [, memberIndices] of groups.entries()) {
    if (memberIndices.length < 2) continue;

    const members = memberIndices.map((i) => profiles[i]);
    const memberSet = new Set(memberIndices);

    // Pick the best gram to display: prefer 4-grams (more specific) over 3-grams,
    // then by match count (how many group members share it).
    let bestGram = '';
    let bestScore = -1;
    for (const gram of conflictGrams) {
      const indices = gramIndex.get(gram) || [];
      const matchCount = indices.filter((i) => memberSet.has(i)).length;
      if (matchCount < 2) continue;
      const gramLen = gram.split(' ').length; // 3 or 4
      const score = gramLen * 1000 + matchCount;
      if (score > bestScore) {
        bestScore = score;
        bestGram = gram;
      }
    }

    if (!bestGram) continue;

    const urlTypes = members.map((m) => m.urlType);
    const severity: 'critical' | 'high' = members.length >= 3 ? 'critical' : 'high';
    const { type, fix } = contentConflictDescriptionAndFix(urlTypes);

    results.push({
      sharedPhrase: bestGram,
      pages: members.map((m) => ({
        url: m.url,
        path: m.path,
        title: m.title,
        urlType: m.urlType,
      })),
      severity,
      conflictType: type,
      conflictFix: fix,
    });
  }

  // Critical first, then by page count descending
  return results.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return b.pages.length - a.pages.length;
  });
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
