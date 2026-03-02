// External keyword research types and seed generation

import { INDUSTRY_PROFILES } from './constants';

export interface EnrichedKeyword {
  keyword: string;
  volume: number;
  difficulty: number | null;       // KD 0-100
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null;
  cpc: number | null;
  isExternal: boolean;             // false = from site audit, true = from DataForSEO
  currentRank: number | null;      // null = not currently ranking
  hasLocalPack: boolean;
  funnel: 'bottom' | 'middle' | 'top';
  intent: 'transactional' | 'commercial' | 'informational' | 'branded';
  localType: 'near_me' | 'city_name' | 'none';
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

/** Convert DataForSEO competition score (0–1) to categorical tier */
export function competitionTier(score: number | null | undefined): EnrichedKeyword['competition'] {
  if (score == null) return 'MEDIUM';
  if (score < 0.25) return 'LOW';
  if (score < 0.50) return 'MEDIUM';
  if (score < 0.75) return 'HIGH';
  return 'VERY_HIGH';
}
