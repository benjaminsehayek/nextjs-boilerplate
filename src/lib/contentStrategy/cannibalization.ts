// Cannibalization detection

import type { CrawledPage } from './contentMap';

export interface CannibalizationIssue {
  id: string;
  keyword: string;
  searchVolume: number;
  severity: 'high' | 'medium' | 'warning';
  competingPages: Array<{
    url: string;
    title: string;
    rank?: number;
    traffic?: number;
  }>;
  recommendation: string;
}

/**
 * Detect cannibalization: multiple pages targeting the same keyword.
 *
 * Severity:
 *   high    — 3+ pages targeting same keyword
 *   medium  — 2 pages targeting same keyword
 *   warning — new gap would overlap with existing page
 */
export function detectCannibalization(
  keywords: Array<{ keyword: string; searchVolume: number; assignedPage: string | null }>,
  crawledPages: CrawledPage[],
): CannibalizationIssue[] {
  const issues: CannibalizationIssue[] = [];
  const processed = new Set<string>();

  // Group keywords by their text
  const kwMap = new Map<string, typeof keywords>();
  for (const kw of keywords) {
    const key = kw.keyword.toLowerCase();
    if (!kwMap.has(key)) kwMap.set(key, []);
    kwMap.get(key)!.push(kw);
  }

  // For each keyword, find all crawled pages that could target it
  for (const [keyword, kwInstances] of kwMap) {
    if (processed.has(keyword)) continue;
    processed.add(keyword);

    const volume = kwInstances[0].searchVolume;
    const keywordWords = keyword.split(/\s+/).filter(w => w.length > 2);
    if (keywordWords.length === 0) continue;

    // Find pages whose title or H1 contains most of the keyword words
    const matchingPages: CannibalizationIssue['competingPages'] = [];

    for (const page of crawledPages) {
      const pageText = `${page.title} ${page.h1}`.toLowerCase();
      let matchCount = 0;
      for (const word of keywordWords) {
        if (pageText.includes(word)) matchCount++;
      }
      if (matchCount / keywordWords.length >= 0.6) {
        matchingPages.push({
          url: page.url,
          title: page.title,
        });
      }
    }

    if (matchingPages.length >= 3) {
      issues.push({
        id: `cannibal-${issues.length}`,
        keyword,
        searchVolume: volume,
        severity: 'high',
        competingPages: matchingPages,
        recommendation: `${matchingPages.length} pages compete for "${keyword}". Consolidate into one authoritative page and redirect or de-optimize the others.`,
      });
    } else if (matchingPages.length === 2) {
      issues.push({
        id: `cannibal-${issues.length}`,
        keyword,
        searchVolume: volume,
        severity: 'medium',
        competingPages: matchingPages,
        recommendation: `Two pages target "${keyword}". Choose one to be the primary page and add a canonical tag or merge the content.`,
      });
    }
  }

  return issues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, warning: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity] || b.searchVolume - a.searchVolume;
  });
}
