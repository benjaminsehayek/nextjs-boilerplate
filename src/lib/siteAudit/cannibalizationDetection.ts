// Site Audit Cannibalization Detection
// Pure logic — no React, no browser APIs, no Supabase
//
// Processes market keyword items with _isCannibalized=true into rich
// CannibalizationConflict objects using the URL/intent/conflict classifiers.

import type {
  CannibalizationConflict,
  MarketData,
  KeywordIntent,
  UrlType,
} from '@/components/tools/SiteAudit/types';
import {
  classifyUrlType,
  classifyKeywordIntent,
  classifyConflictType,
} from './classifiers';

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Returns true when a lower-converting page type is outranking a better one.
 * E.g. homepage ranking for "service + city" when a dedicated service/location
 * page exists in the same SERP.
 */
function isWrongPageWinning(
  primaryType: UrlType,
  competitorType: UrlType,
  intent: KeywordIntent
): boolean {
  // Homepage shouldn't outrank a dedicated service/location page for commercial intent
  if (
    primaryType === 'homepage' &&
    (intent === 'local-commercial' || intent === 'commercial') &&
    (competitorType === 'service' || competitorType === 'location')
  ) {
    return true;
  }

  // Blog shouldn't outrank a service/location page for commercial intent
  if (
    primaryType === 'blog' &&
    (intent === 'local-commercial' || intent === 'commercial') &&
    (competitorType === 'service' || competitorType === 'location' || competitorType === 'homepage')
  ) {
    return true;
  }

  return false;
}

/**
 * Compute severity based on volume, primary position, and wrong-page-winning status.
 */
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

// ─── Main Detection Function ────────────────────────────────────────

/**
 * Build CannibalizationConflict[] from all markets' keyword data.
 *
 * Iterates every MarketKeywordItem with _isCannibalized=true, then:
 * 1. Sorts the _serpMatches by position (best first)
 * 2. Classifies primary + competitor page types
 * 3. Classifies keyword intent
 * 4. Classifies conflict type (returns description + actionable fix)
 * 5. Assigns severity
 *
 * Returns a flat sorted array: critical first, then high, then medium;
 * within each severity group sorted by search volume descending.
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

      // Sort: best position (lowest number) first
      const sorted = [...matches].sort((a, b) => a.position - b.position);
      const primary = sorted[0];
      const competingMatches = sorted.slice(1);

      const keyword = item.keyword_data.keyword;
      const volume = item.keyword_data.keyword_info?.search_volume || 0;
      const cpc = item.keyword_data.keyword_info?.cpc || 0;

      const primaryType = classifyUrlType(primary.url);

      // Use the highest-ranked competitor for conflict classification
      // (the one that's most likely stealing clicks from the primary)
      const topCompetitor = competingMatches[0];
      const competitorType = classifyUrlType(topCompetitor.url);

      const intent = classifyKeywordIntent(keyword, domain, trackedLocations);
      const conflictResult = classifyConflictType(primaryType, competitorType, intent);
      const wrongPageWinning = isWrongPageWinning(primaryType, competitorType, intent);

      // Position gap = difference between the worst-ranked and best-ranked competing URLs
      const positionGap = competingMatches[competingMatches.length - 1].position - primary.position;

      const severity = computeSeverity(volume, primary.position, wrongPageWinning);

      conflicts.push({
        keyword,
        volume,
        cpc,
        market: marketLocation,
        primary: {
          url: primary.url,
          path: primary.path,
          position: primary.position,
          title: primary.title,
          pageType: primaryType,
        },
        competitors: competingMatches.map((m) => ({
          url: m.url,
          path: m.path,
          position: m.position,
          title: m.title,
          pageType: classifyUrlType(m.url),
        })),
        positionGap,
        allMatches: matches,
        severity,
        intent,
        conflictType: conflictResult.type,
        conflictIcon: conflictResult.icon,
        conflictDescription: conflictResult.description,
        conflictFix: conflictResult.fix,
        primaryType,
        competitorType,
        wrongPageWinning,
      });
    }
  }

  // Sort: critical → high → medium, then by search volume descending within each group
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  conflicts.sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity];
    if (sev !== 0) return sev;
    return b.volume - a.volume;
  });

  return conflicts;
}
