// Site Audit SERP Checks — organic rankings, maps rankings, cannibalization detection
// Pure logic — no React, no browser APIs, no Supabase

import { dfsCall } from '@/lib/dataforseo';
import type {
  ExtractedKeyword,
  MarketData,
  MarketKeywordItem,
  MapsRankingData,
  SerpMatch,
  LogEntry,
} from '@/components/tools/SiteAudit/types';

type Logger = (message: string, level?: LogEntry['level']) => void;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Parse a domain from a full URL for matching.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

/**
 * Extract relative URL path from full URL.
 */
function relativePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Retry a location string in "City, State, Country" spaced format
 * when DataForSEO returns error 40501 (location not recognized).
 * "Dallas,Texas,United States" → "Dallas, Texas, United States"
 */
function spaceLocation(location: string): string {
  return location.split(',').map((p) => p.trim()).join(', ');
}

/**
 * Filter keywords to exclude those containing other cities' names.
 * For a given market, we don't want to search keywords that mention
 * a different city (e.g., searching "plumber dallas" in the Houston market).
 */
function filterKeywordsForMarket(
  keywords: ExtractedKeyword[],
  marketCity: string,
  allCities: string[]
): ExtractedKeyword[] {
  const otherCities = allCities
    .filter((c) => c.toLowerCase() !== marketCity.toLowerCase())
    .map((c) => c.toLowerCase());

  return keywords.filter((kw) => {
    const lower = kw.keyword.toLowerCase();
    // Keep if the keyword doesn't contain any other city's name
    return !otherCities.some((city) => lower.includes(city));
  });
}

// ─── Organic SERP Checks ─────────────────────────────────────────

/**
 * Check organic SERP rankings for extracted keywords across all markets.
 *
 * For each location/market:
 * 1. Filters keywords (excludes those mentioning other cities), takes top 50
 * 2. Calls DataForSEO serp/google/organic/live/regular
 * 3. Finds ALL domain matches in results (multiple = cannibalization)
 * 4. Builds MarketKeywordItem with _serpMatches, _isCannibalized, _localSerp data
 * 5. Computes per-market position distribution
 *
 * @returns Record of market location → MarketData
 */
export async function checkLocalSerps(
  keywords: ExtractedKeyword[],
  domain: string,
  locations: string[],
  log: Logger,
  onTaskComplete?: (taskName: string) => void
): Promise<{
  markets: Record<string, MarketData>;
  mapsData: Record<string, Record<string, MapsRankingData>>;
}> {
  const markets: Record<string, MarketData> = {};
  const mapsData: Record<string, Record<string, MapsRankingData>> = {};
  const domainLower = domain.toLowerCase().replace(/^www\./, '');

  // Extract all city names for cross-filtering
  const allCities = locations.map((loc) => {
    const parts = loc.split(',');
    return (parts[0] || '').trim();
  });

  for (const location of locations) {
    const parts = location.split(',');
    const marketCity = (parts[0] || '').trim();
    const marketLabel = marketCity || location;

    log('Checking SERPs for ' + marketLabel + '...');

    // Filter and limit keywords for this market
    const filtered = filterKeywordsForMarket(keywords, marketCity, allCities);
    const marketKeywords = filtered.slice(0, 50);

    if (marketKeywords.length === 0) {
      log('  No keywords for ' + marketLabel + ' — skipping', 'warning');
      continue;
    }

    // Build SERP request tasks (one per keyword)
    const serpTasks = marketKeywords.map((kw) => ({
      keyword: kw.keyword,
      location_name: location,
      language_code: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 20,
    }));

    try {
      let data: any;
      try {
        data = await dfsCall<any>('serp/google/organic/live/regular', serpTasks);
      } catch (err: any) {
        // Check for location not recognized error (40501) — retry with spaced format
        if (err.message && (err.message.includes('40501') || err.message.includes('location'))) {
          log('  Location format rejected, retrying with spaced format...', 'warning');
          const spacedTasks = serpTasks.map((t) => ({
            ...t,
            location_name: spaceLocation(t.location_name),
          }));
          data = await dfsCall<any>('serp/google/organic/live/regular', spacedTasks);
        } else {
          throw err;
        }
      }

      const items: MarketKeywordItem[] = [];
      let pos1 = 0, pos2_3 = 0, pos4_10 = 0, pos11_20 = 0;
      let totalEtv = 0, totalPaidCost = 0;

      const tasks = data.tasks || [];
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (!task || task.status_code !== 20000) continue;

        const result = task.result?.[0];
        if (!result) continue;

        const keyword = marketKeywords[i]?.keyword || '';
        const serpItems = result.items || [];

        // Find ALL domain matches in SERP results
        const serpMatches: SerpMatch[] = [];
        for (const si of serpItems) {
          if (!si.url) continue;
          const itemDomain = extractDomain(si.url);
          if (itemDomain === domainLower || itemDomain === 'www.' + domainLower) {
            serpMatches.push({
              url: si.url,
              path: relativePath(si.url),
              position: si.rank_group || si.rank_absolute || 999,
              title: si.title || '',
              description: si.description || '',
            });
          }
        }

        // Detect cannibalization (multiple URLs ranking for same keyword)
        const isCannibalized = serpMatches.length > 1;

        // Detect SERP features
        const serpItemTypes = result.item_types || [];
        const hasLocalPack = serpItemTypes.includes('local_pack') ||
          serpItemTypes.includes('maps');
        const hasAiOverview = serpItemTypes.includes('ai_overview') ||
          serpItemTypes.includes('featured_snippet');

        // Top competitors (non-domain results in top 5)
        const topCompetitors: Array<{ domain: string; position: number; title: string }> = [];
        for (const si of serpItems) {
          if (!si.url) continue;
          const itemDomain = extractDomain(si.url);
          if (
            itemDomain !== domainLower &&
            itemDomain !== 'www.' + domainLower &&
            (si.rank_group || 999) <= 5
          ) {
            topCompetitors.push({
              domain: itemDomain,
              position: si.rank_group || si.rank_absolute || 999,
              title: si.title || '',
            });
          }
          if (topCompetitors.length >= 3) break;
        }

        // Primary match (best position)
        const primaryMatch = serpMatches.length > 0
          ? serpMatches.reduce((a, b) => (a.position < b.position ? a : b))
          : null;

        const position = primaryMatch?.position || 0;
        const matchUrl = primaryMatch?.url || '';
        const matchPath = primaryMatch?.path || '';
        const etv = position > 0 ? Math.max(0, Math.round(100 / position)) : 0;

        // Position distribution
        if (position === 1) pos1++;
        else if (position <= 3) pos2_3++;
        else if (position <= 10) pos4_10++;
        else if (position <= 20) pos11_20++;

        totalEtv += etv;

        // Build MarketKeywordItem
        const item: MarketKeywordItem = {
          keyword_data: {
            keyword,
            keyword_info: result.keyword_info || undefined,
          },
          ranked_serp_element: {
            serp_item: {
              rank_group: position,
              rank_absolute: position,
              url: matchUrl,
              relative_url: matchPath,
              etv,
              estimated_paid_traffic_cost: 0,
              type: 'organic',
            },
          },
          serp_item_types: serpItemTypes,
          _serpMatches: serpMatches,
          _isCannibalized: isCannibalized,
          _localSerp: {
            hasLocalPack,
            hasAiOverview,
            topCompetitors,
            notRanking: serpMatches.length === 0,
          },
        };

        items.push(item);
      }

      markets[location] = {
        items,
        totalCount: items.length,
        metrics: {
          organic: {
            count: items.length,
            etv: totalEtv,
            estimated_paid_traffic_cost: totalPaidCost,
            pos_1: pos1,
            pos_2_3: pos2_3,
            pos_4_10: pos4_10,
            pos_11_20: pos11_20,
            is_new: 0,
            is_lost: 0,
          },
        },
      };

      const ranking = items.filter(
        (it) => it.ranked_serp_element.serp_item.rank_group > 0
      ).length;
      log(
        '  ' + marketLabel + ': ' + ranking + '/' + items.length + ' keywords ranking',
        ranking > 0 ? 'success' : 'warning'
      );
    } catch (e: any) {
      log('  SERP check failed for ' + marketLabel + ': ' + e.message, 'error');
      markets[location] = { items: [], totalCount: 0 };
    }

    onTaskComplete?.('Checking local SERPs');
  }

  return { markets, mapsData };
}

// ─── Maps Rankings ────────────────────────────────────────────────

/**
 * Fetch Google Maps rankings for a batch of keywords in a specific location.
 *
 * @param keywords - Keywords to check
 * @param coords - Business coordinates { lat, lng }
 * @param domain - Target domain to find in results
 * @param marketName - Market label for logging
 * @param log - Logger function
 * @returns Map of keyword → MapsRankingData
 */
export async function fetchMapsRankings(
  keywords: string[],
  coords: { lat: number; lng: number },
  domain: string,
  marketName: string,
  log: Logger
): Promise<Record<string, MapsRankingData>> {
  const results: Record<string, MapsRankingData> = {};
  const domainLower = domain.toLowerCase().replace(/^www\./, '');

  if (keywords.length === 0 || !coords) return results;

  // Build maps SERP tasks
  const mapsTasks = keywords.map((kw) => ({
    keyword: kw,
    location_coordinate: coords.lat + ',' + coords.lng + ',12',
    language_code: 'en',
    device: 'desktop',
    os: 'windows',
    depth: 20,
  }));

  try {
    const data = await dfsCall<any>('serp/google/maps/live/advanced', mapsTasks);

    const tasks = data.tasks || [];
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const keyword = keywords[i] || '';

      if (!task || task.status_code !== 20000) {
        results[keyword] = { rank: 'NF', url: '', title: '' };
        continue;
      }

      const mapsItems = task.result?.[0]?.items || [];
      let found = false;

      for (const mi of mapsItems) {
        if (!mi.url && !mi.domain) continue;

        const itemDomain = mi.domain
          ? mi.domain.toLowerCase().replace(/^www\./, '')
          : extractDomain(mi.url || '');

        if (itemDomain === domainLower || itemDomain === 'www.' + domainLower) {
          results[keyword] = {
            rank: mi.rank_group || mi.rank_absolute || 1,
            url: mi.url || '',
            title: mi.title || '',
            rating: mi.rating?.value ?? mi.rating_value ?? undefined,
            reviews: mi.rating?.votes_count ?? mi.reviews_count ?? undefined,
          };
          found = true;
          break;
        }
      }

      if (!found) {
        results[keyword] = { rank: 'NF', url: '', title: '' };
      }
    }

    const rankingCount = Object.values(results).filter((r) => r.rank !== 'NF').length;
    log(
      '  Maps ' + marketName + ': ' + rankingCount + '/' + keywords.length + ' found',
      rankingCount > 0 ? 'success' : 'warning'
    );
  } catch (e: any) {
    log('  Maps check failed for ' + marketName + ': ' + e.message, 'error');
    // Fill all as NF on failure
    for (const kw of keywords) {
      results[kw] = { rank: 'NF', url: '', title: '' };
    }
  }

  return results;
}

// ─── Maps for All Markets ─────────────────────────────────────────

/**
 * Check Google Maps rankings for all markets that have organic ranking data.
 * For each market, takes the top 20 keywords by organic position and checks Maps.
 * Annotates market items with _mapsData, _mapsRank, and _surfaceComparison.
 *
 * @param marketResults - Organic market results from checkLocalSerps
 * @param locations - DataForSEO location strings
 * @param coords - Business coordinates { lat, lng }
 * @param domain - Target domain
 * @param log - Logger function
 * @returns Nested map of market → keyword → MapsRankingData
 */
export async function checkMapsForMarkets(
  marketResults: Record<string, MarketData>,
  locations: string[],
  coords: { lat: number; lng: number } | null,
  domain: string,
  log: Logger
): Promise<Record<string, Record<string, MapsRankingData>>> {
  const allMapsData: Record<string, Record<string, MapsRankingData>> = {};

  if (!coords) {
    log('No coordinates available — skipping Maps checks', 'warning');
    return allMapsData;
  }

  for (const location of locations) {
    const market = marketResults[location];
    if (!market || market.items.length === 0) continue;

    const parts = location.split(',');
    const marketName = (parts[0] || '').trim() || location;

    // Take top 20 keywords by organic position (best-ranking first)
    const rankedItems = market.items
      .filter((it) => it.ranked_serp_element.serp_item.rank_group > 0)
      .sort((a, b) =>
        a.ranked_serp_element.serp_item.rank_group -
        b.ranked_serp_element.serp_item.rank_group
      )
      .slice(0, 20);

    if (rankedItems.length === 0) {
      log('  No organic rankings for ' + marketName + ' — skipping Maps', 'warning');
      continue;
    }

    const keywordsToCheck = rankedItems.map((it) => it.keyword_data.keyword);
    log('Checking Maps for ' + marketName + ' (' + keywordsToCheck.length + ' keywords)...');

    const mapsResults = await fetchMapsRankings(
      keywordsToCheck,
      coords,
      domain,
      marketName,
      log
    );

    allMapsData[location] = mapsResults;

    // Annotate market items with maps data
    let mapsRanking = 0;
    let mapsNotFound = 0;

    for (const item of market.items) {
      const kw = item.keyword_data.keyword;
      const mapsResult = mapsResults[kw];

      if (mapsResult) {
        item._mapsData = mapsResult;
        item._mapsRank = mapsResult.rank;
        item._mapsUrl = mapsResult.url;

        // Compute surface comparison
        const hasOrganic = item.ranked_serp_element.serp_item.rank_group > 0;
        const hasMaps = mapsResult.rank !== 'NF';

        if (hasOrganic && hasMaps) {
          item._surfaceComparison = 'both-ranking';
          mapsRanking++;
        } else if (hasOrganic && !hasMaps) {
          item._surfaceComparison = 'organic-only';
          mapsNotFound++;
        } else if (!hasOrganic && hasMaps) {
          item._surfaceComparison = 'maps-only';
          mapsRanking++;
        } else {
          item._surfaceComparison = 'neither';
          mapsNotFound++;
        }
      } else {
        item._mapsData = null;
        item._mapsRank = null;
        item._surfaceComparison = null;
      }
    }

    // Update market metrics with maps data
    if (market.metrics) {
      market.metrics.maps = {
        checked: keywordsToCheck.length,
        ranking: mapsRanking,
        notFound: mapsNotFound,
      };
    }
  }

  return allMapsData;
}
