// Site Audit Market Discovery — location detection from crawl data
// Pure logic — no React, no browser APIs, no Supabase

import type {
  CrawledPage,
  DetectedBusiness,
  DiscoveredMarket,
} from '@/components/tools/SiteAudit/types';
import { classifyUrlType } from './classifiers';

// ─── State Abbreviation Maps ──────────────────────────────────────

const US_STATE_ABBREV_TO_NAME: Record<string, string> = {
  al: 'Alabama', ak: 'Alaska', az: 'Arizona', ar: 'Arkansas', ca: 'California',
  co: 'Colorado', ct: 'Connecticut', de: 'Delaware', fl: 'Florida', ga: 'Georgia',
  hi: 'Hawaii', id: 'Idaho', il: 'Illinois', in: 'Indiana', ia: 'Iowa',
  ks: 'Kansas', ky: 'Kentucky', la: 'Louisiana', me: 'Maine', md: 'Maryland',
  ma: 'Massachusetts', mi: 'Michigan', mn: 'Minnesota', ms: 'Mississippi',
  mo: 'Missouri', mt: 'Montana', ne: 'Nebraska', nv: 'Nevada', nh: 'New Hampshire',
  nj: 'New Jersey', nm: 'New Mexico', ny: 'New York', nc: 'North Carolina',
  nd: 'North Dakota', oh: 'Ohio', ok: 'Oklahoma', or: 'Oregon', pa: 'Pennsylvania',
  ri: 'Rhode Island', sc: 'South Carolina', sd: 'South Dakota', tn: 'Tennessee',
  tx: 'Texas', ut: 'Utah', vt: 'Vermont', va: 'Virginia', wa: 'Washington',
  wv: 'West Virginia', wi: 'Wisconsin', wy: 'Wyoming', dc: 'District of Columbia',
};

const US_STATE_NAMES = new Set(
  Object.values(US_STATE_ABBREV_TO_NAME).map((n) => n.toLowerCase())
);

const CA_PROVINCE_ABBREV_TO_NAME: Record<string, string> = {
  ab: 'Alberta', bc: 'British Columbia', mb: 'Manitoba', nb: 'New Brunswick',
  nl: 'Newfoundland and Labrador', ns: 'Nova Scotia', nt: 'Northwest Territories',
  nu: 'Nunavut', on: 'Ontario', pe: 'Prince Edward Island', qc: 'Quebec',
  sk: 'Saskatchewan', yt: 'Yukon',
};

const CA_PROVINCE_NAMES = new Set(
  Object.values(CA_PROVINCE_ABBREV_TO_NAME).map((n) => n.toLowerCase())
);

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Convert a hyphenated URL segment into Title Case city name.
 * "new-york" → "New York"
 */
function segmentToCity(segment: string): string {
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Try to extract city and state from a URL path segment.
 * Returns { city, state, country } or null.
 */
function extractLocationFromSegment(
  segment: string,
  businessInfo: DetectedBusiness | null
): { city: string; state: string; country: string } | null {
  if (!segment || segment.length < 2) return null;

  const parts = segment.split('-');

  // Check if the last part is a 2-letter state abbreviation
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1].toLowerCase();

    // US state abbreviation
    if (US_STATE_ABBREV_TO_NAME[tail]) {
      const cityParts = parts.slice(0, -1);
      const city = segmentToCity(cityParts.join('-'));
      return { city, state: US_STATE_ABBREV_TO_NAME[tail], country: 'United States' };
    }

    // Canadian province abbreviation
    if (CA_PROVINCE_ABBREV_TO_NAME[tail]) {
      const cityParts = parts.slice(0, -1);
      const city = segmentToCity(cityParts.join('-'));
      return { city, state: CA_PROVINCE_ABBREV_TO_NAME[tail], country: 'Canada' };
    }
  }

  // Check if the last 2+ parts form a full state name
  // e.g., "dallas-north-carolina" → state = "North Carolina"
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(i).join(' ').toLowerCase();
    if (US_STATE_NAMES.has(candidate)) {
      const cityParts = parts.slice(0, i);
      if (cityParts.length === 0) continue;
      const city = segmentToCity(cityParts.join('-'));
      const state = segmentToCity(parts.slice(i).join('-'));
      return { city, state, country: 'United States' };
    }
    if (CA_PROVINCE_NAMES.has(candidate)) {
      const cityParts = parts.slice(0, i);
      if (cityParts.length === 0) continue;
      const city = segmentToCity(cityParts.join('-'));
      const state = segmentToCity(parts.slice(i).join('-'));
      return { city, state, country: 'Canada' };
    }
  }

  // Fallback: use business region if available
  if (businessInfo?.region) {
    const city = segmentToCity(segment);
    // Don't treat very generic or short segments as cities
    if (city.length < 3) return null;
    const country = businessInfo.country === 'CA' || businessInfo.country === 'Canada'
      ? 'Canada'
      : 'United States';
    return { city, state: businessInfo.region, country };
  }

  return null;
}

// ─── Shared Location Utilities ────────────────────────────────────

/**
 * Build a DataForSEO-compatible location string from city + state (abbreviation or full name).
 * Format: "City,StateName,Country" — must match DataForSEO's location database exactly.
 * State abbreviations (WA, BC, ON …) are automatically expanded to full names.
 */
export function buildMarketString(
  city: string,
  state: string,
  country: 'United States' | 'Canada' = 'United States'
): string {
  const stateKey = state.trim().toLowerCase();
  const fullState =
    US_STATE_ABBREV_TO_NAME[stateKey] ||
    CA_PROVINCE_ABBREV_TO_NAME[stateKey] ||
    // Already a full name — title-case it for consistency
    state.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return [city.trim(), fullState, country].join(',');
}

// ─── Main Discovery Functions ─────────────────────────────────────

/**
 * Discover markets/locations from crawled page URLs.
 * Scans for location-classified pages and extracts city/state from URL patterns.
 * Returns deduplicated array of DataForSEO-compatible location strings.
 */
export function discoverMarketsFromCrawl(
  pages: CrawledPage[],
  businessInfo: DetectedBusiness | null
): DiscoveredMarket[] {
  const seen = new Map<string, DiscoveredMarket>();

  for (const page of pages) {
    if (!page.url) continue;

    const urlType = classifyUrlType(page.url);
    if (urlType !== 'location') continue;

    // Extract path segments for location parsing
    let path: string;
    try {
      const u = new URL(page.url);
      path = u.pathname.toLowerCase().replace(/\/+$/, '');
    } catch {
      continue;
    }

    const segments = path.split('/').filter(Boolean);

    // Try extracting location from each segment (typically the last meaningful one)
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      // Skip generic route segments
      if (/^(locations?|areas?|cities|service-areas?|serving|coverage)$/.test(seg)) {
        continue;
      }

      const loc = extractLocationFromSegment(seg, businessInfo);
      if (loc) {
        const key = (loc.city + ',' + loc.state).toLowerCase();
        if (!seen.has(key)) {
          const location = loc.city + ',' + loc.state + ',' + loc.country;
          seen.set(key, {
            city: loc.city,
            location,
            source: 'url',
            page: page.url,
          });
        }
        break; // Found location for this page, move to next
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Content-based fallback for detecting the primary city when no location pages are found.
 * Scans page titles, H1s, and descriptions for city name mentions.
 * Uses frequency-based approach — most mentioned city wins.
 * Only returns a result if confidence threshold is met (>3 mentions).
 */
export function detectCityFromContent(
  pages: CrawledPage[]
): { location: string; city: string; confidence: number; sources: string[] } | null {
  // Build a frequency map of potential city names
  const cityMentions = new Map<string, { count: number; state: string; sources: Set<string> }>();

  // Known city patterns to look for — common formatting in titles/descriptions
  // We look for "City, ST" or "City, State" patterns in text
  const cityStateRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s+([A-Z]{2})\b/g;
  const cityFullStateRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s+(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming|Alberta|British\s+Columbia|Manitoba|New\s+Brunswick|Newfoundland|Nova\s+Scotia|Ontario|Prince\s+Edward\s+Island|Quebec|Saskatchewan)\b/gi;

  for (const page of pages) {
    const texts: string[] = [];

    if (page.meta?.title) texts.push(page.meta.title);
    if (page.meta?.description) texts.push(page.meta.description);

    const h1s = page.meta?.htags?.h1 || [];
    texts.push(...h1s);

    const combined = texts.join(' ');
    if (!combined) continue;

    // Match "City, ST" patterns (2-letter abbreviation)
    let match: RegExpExecArray | null;
    const abbrRegex = new RegExp(cityStateRegex.source, cityStateRegex.flags);
    while ((match = abbrRegex.exec(combined)) !== null) {
      const city = match[1].trim();
      const stAbbr = match[2].toLowerCase();

      // Validate it's a real state abbreviation
      const stateName = US_STATE_ABBREV_TO_NAME[stAbbr] || CA_PROVINCE_ABBREV_TO_NAME[stAbbr];
      if (!stateName) continue;
      // Skip very short or generic words
      if (city.length < 3) continue;

      const key = city.toLowerCase();
      const existing = cityMentions.get(key);
      if (existing) {
        existing.count++;
        existing.sources.add(page.url);
      } else {
        cityMentions.set(key, { count: 1, state: stateName, sources: new Set([page.url]) });
      }
    }

    // Match "City, Full State Name" patterns
    const fullRegex = new RegExp(cityFullStateRegex.source, cityFullStateRegex.flags);
    while ((match = fullRegex.exec(combined)) !== null) {
      const city = match[1].trim();
      const state = match[2].trim();

      if (city.length < 3) continue;

      // Normalize state name to title case
      const normalizedState = state
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const key = city.toLowerCase();
      const existing = cityMentions.get(key);
      if (existing) {
        existing.count++;
        existing.sources.add(page.url);
      } else {
        cityMentions.set(key, { count: 1, state: normalizedState, sources: new Set([page.url]) });
      }
    }
  }

  // Find the most-mentioned city
  let bestCity: string | null = null;
  let bestData: { count: number; state: string; sources: Set<string> } | null = null;

  for (const [city, data] of cityMentions.entries()) {
    if (!bestData || data.count > bestData.count) {
      bestCity = city;
      bestData = data;
    }
  }

  // Only return if confidence threshold is met
  if (!bestCity || !bestData || bestData.count <= 3) {
    return null;
  }

  // Title-case the city name
  const cityName = bestCity
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const country = CA_PROVINCE_NAMES.has(bestData.state.toLowerCase())
    ? 'Canada'
    : 'United States';

  return {
    location: cityName + ',' + bestData.state + ',' + country,
    city: cityName,
    confidence: bestData.count,
    sources: Array.from(bestData.sources),
  };
}
