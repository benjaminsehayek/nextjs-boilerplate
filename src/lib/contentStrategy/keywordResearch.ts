// External keyword research types and seed generation

import { INDUSTRY_PROFILES } from './constants';

export interface EnrichedKeyword {
  keyword: string;
  /** City-specific monthly search volume, seasonally adjusted to current month */
  volume: number;
  /** Raw annual-average volume before seasonal adjustment (for display) */
  avgVolume: number;
  /**
   * Ratio of current month's volume to annual average.
   * 1.4 = 40% above average (peak season), 0.6 = 40% below (off season).
   * Applied to volume already — stored here for rationale display.
   */
  seasonalMultiplier: number;
  difficulty: number | null;       // KD 0-100
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null;
  cpc: number | null;
  isExternal: boolean;             // false = from site audit, true = from DataForSEO
  currentRank: number | null;      // null = not currently ranking
  hasLocalPack: boolean;
  funnel: 'bottom' | 'middle' | 'top';
  intent: 'transactional' | 'commercial' | 'informational' | 'branded';
  localType: 'near_me' | 'city_name' | 'none';
  /** Which physical location/market this keyword was researched for.
   *  Short label, e.g. "Vancouver, WA". Routes GBP posts to the right location's GBP.
   *  Undefined for national keywords or when location is unknown. */
  locationName?: string;
}

export interface SiteAuditKeyword {
  keyword: string;
  volume: number;
  currentRank: number | null;
  cpc: number | null;
}

/**
 * Build seed keywords for external keyword discovery.
 * Returns one seed per top-3 industry service, suffixed with location.
 * These are passed to DataForSEO related_keywords to discover what the site
 * SHOULD be targeting but isn't.
 */
export function buildSeedKeywords(industry: string, locations: string[], limit = 3): string[] {
  const profile = INDUSTRY_PROFILES.find(
    p => p.key === industry || p.name.toLowerCase() === industry.toLowerCase()
  );

  const services = (profile?.services ?? []).slice(0, 3).map(s => s.name.toLowerCase());
  if (services.length === 0) services.push(industry.toLowerCase());

  const primaryLocation = locations[0]?.trim() ?? '';
  const seeds: string[] = [];

  for (const svc of services) {
    // City-specific seed generates the most relevant local results
    seeds.push(primaryLocation ? `${svc} ${primaryLocation}` : `${svc} near me`);
  }

  return [...new Set(seeds)].slice(0, limit);
}

/**
 * Compute seasonal multiplier from monthly search history.
 * Returns the ratio of the most recent matching month to the annual average.
 * Clamped to [0.25, 3.0] to prevent extreme outliers from distorting ROI.
 */
export function computeSeasonalMultiplier(
  monthly: Array<{ year: number; month: number; search_volume: number }>
): number {
  if (!monthly || monthly.length < 3) return 1.0;

  const currentMonth = new Date().getMonth() + 1; // 1–12
  const currentYear = new Date().getFullYear();

  // Sort descending so we find the most recent data point for the current month
  const sorted = [...monthly].sort((a, b) =>
    b.year !== a.year ? b.year - a.year : b.month - a.month
  );

  // Find the current month from this year, or last year's same month
  const current =
    sorted.find(m => m.month === currentMonth && m.year === currentYear) ??
    sorted.find(m => m.month === currentMonth) ??
    sorted[0]; // fallback: most recent data point

  const avgVolume = monthly.reduce((s, m) => s + m.search_volume, 0) / monthly.length;
  if (avgVolume === 0) return 1.0;

  return Math.min(3.0, Math.max(0.25, current.search_volume / avgVolume));
}

/** US state abbreviation → full name (DataForSEO requires full names in location_name) */
const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

/**
 * Format city + state into DataForSEO location_name string.
 * DataForSEO requires the full state name (e.g. "Washington" not "WA").
 * Returns null when city is empty (callers fall back to location_code 2840).
 * Example output: "Vancouver,Washington,United States"
 */
export function formatLocationName(city: string, state?: string): string | null {
  const c = city.trim();
  if (!c) return null;
  const stateRaw = state?.trim() ?? '';
  // Expand 2-letter abbreviation to full name; pass longer strings through unchanged
  const stateFull = stateRaw.length === 2
    ? (US_STATE_NAMES[stateRaw.toUpperCase()] ?? stateRaw)
    : stateRaw;
  const parts = [c, stateFull, 'United States'].filter(Boolean);
  return parts.join(',');
}

/** Convert DataForSEO competition score (0–1) to categorical tier */
export function competitionTier(score: number | null | undefined): EnrichedKeyword['competition'] {
  if (score == null) return 'MEDIUM';
  if (score < 0.25) return 'LOW';
  if (score < 0.50) return 'MEDIUM';
  if (score < 0.75) return 'HIGH';
  return 'VERY_HIGH';
}
