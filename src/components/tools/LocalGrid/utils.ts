import type { BusinessInfo, GridPoint, GridSize, HeatmapData, IndustryPreset, MapsSerpItem, MatchMethod, RankData } from './types';

// ── Stopwords for significant-word matching ──────────────────────────

const STOPWORDS = new Set([
  'the', 'and', 'of', 'in', 'at', 'to', 'for', 'a', 'an', 'is', 'on', 'by',
  'llc', 'inc', 'corp', 'co', 'ltd', 'group', 'services', 'service',
  'solutions', 'consulting', 'management', 'associates', 'enterprise',
  'enterprises', 'company', 'professional', 'professionals', 'center',
  'centre', 'shop', 'store', 'studio', 'agency', 'firm',
]);

// ── Industry presets ─────────────────────────────────────────────────

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  { id: 'electrician', label: 'Electrician', icon: '⚡', keywords: ['electrician', 'electrical repair', 'emergency electrician', 'electrical contractor'] },
  { id: 'plumber', label: 'Plumber', icon: '🔧', keywords: ['plumber', 'plumbing repair', 'emergency plumber', 'drain cleaning'] },
  { id: 'hvac', label: 'HVAC', icon: '❄️', keywords: ['hvac', 'air conditioning repair', 'heating repair', 'ac installation'] },
  { id: 'roofing', label: 'Roofing', icon: '🏠', keywords: ['roofing contractor', 'roof repair', 'roof replacement', 'roofing company'] },
  { id: 'autobody', label: 'Auto Body', icon: '🚗', keywords: ['auto body shop', 'collision repair', 'auto painting', 'dent repair'] },
  { id: 'painter', label: 'Painter', icon: '🎨', keywords: ['painter', 'house painting', 'interior painting', 'painting contractor'] },
];

// ── Grid generation (miles) ──────────────────────────────────────────

export function generateGridPoints(
  center: { lat: number; lng: number },
  gridSize: GridSize,
  radiusMiles: number
): GridPoint[] {
  const points: GridPoint[] = [];

  const totalDistanceMiles = radiusMiles * 2;
  const stepMiles = totalDistanceMiles / (gridSize - 1 || 1);

  const latOffsetPerMile = 1 / 69;
  const lngOffsetPerMile = 1 / (69 * Math.cos((center.lat * Math.PI) / 180));

  let pointId = 1;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const latOffset = (row - (gridSize - 1) / 2) * stepMiles * latOffsetPerMile;
      const lngOffset = (col - (gridSize - 1) / 2) * stepMiles * lngOffsetPerMile;

      const lat = center.lat + latOffset;
      const lng = center.lng + lngOffset;
      const distance = calculateDistance(center.lat, center.lng, lat, lng);

      points.push({
        id: `point-${pointId}`,
        lat,
        lng,
        position: pointId,
        rank: null,
        url: null,
        distance,
      });

      pointId++;
    }
  }

  return points;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ── Auto-zoom based on radius ────────────────────────────────────────

export function autoZoomForRadius(radiusMiles: number): number {
  if (radiusMiles <= 0.5) return 15;
  if (radiusMiles <= 1) return 14;
  if (radiusMiles <= 2) return 13;
  if (radiusMiles <= 5) return 12;
  if (radiusMiles <= 10) return 11;
  if (radiusMiles <= 15) return 10;
  return 9;
}

// ── Name matching helpers ────────────────────────────────────────────

export function getSignificantWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function normalizeDomain(url: string): string {
  try {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// ── Extract map items from DataForSEO response ──────────────────────

export function extractMapItems(resultData: any): MapsSerpItem[] {
  if (!resultData) return [];

  const items: any[] = resultData.items || [];

  // Also check top-level result properties (original tool pattern)
  if (items.length === 0) {
    if (resultData.local_pack) return resultData.local_pack;
    if (resultData.maps_pack) return resultData.maps_pack;
    if (resultData.local_results) return resultData.local_results;
    if (Array.isArray(resultData.maps_search)) return resultData.maps_search;
  }

  // Primary: direct maps_search items at top level
  let mapItems = items.filter(
    (item: any) => item.type === 'maps_search'
  );

  // Critical: DataForSEO sometimes returns a maps_search wrapper (no title) containing nested items
  if (mapItems.length > 0 && mapItems[0].type === 'maps_search' && !mapItems[0].title && Array.isArray(mapItems[0].items)) {
    mapItems = mapItems[0].items;
  }

  // Fallback 1: local_pack / maps_pack / similar containers
  if (mapItems.length === 0) {
    for (const item of items) {
      if (
        item.type === 'local_pack' ||
        item.type === 'maps_pack' ||
        item.type === 'local_results' ||
        item.type === 'maps_local_pack'
      ) {
        const nested = item.items || item.results || [];
        mapItems = nested.filter((n: any) => n.type !== 'maps_paid_item');
        if (mapItems.length > 0) break;
      }
    }
  }

  // Fallback 2: items nested inside any container
  if (mapItems.length === 0) {
    for (const item of items) {
      if (Array.isArray(item.items) && item.items.length > 0) {
        const nested = item.items.filter((n: any) => n.type !== 'maps_paid_item' && !n.is_paid);
        if (nested.length > 0) { mapItems = nested; break; }
      }
    }
  }

  // Fallback 3: any item that has a title + rank_group (broadest possible catch)
  if (mapItems.length === 0 && items.length > 0) {
    mapItems = items.filter(
      (item: any) => item.title && item.rank_group !== undefined && !item.is_paid
    );
  }

  return mapItems.filter((item: any) => item.type !== 'maps_paid_item' && !item.is_paid);
}

// ── Business rank matching (6-level cascade) ─────────────────────────

/** Normalize a name for comparison: lowercase, strip punctuation/extra spaces */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findBusinessRank(
  mapItems: MapsSerpItem[],
  business: BusinessInfo
): { rank: number | null; url: string | null; matchMethod: MatchMethod } {
  if (!mapItems.length) return { rank: null, url: null, matchMethod: null };

  // Sort by rank_group so array order is correct after paid-item removal.
  // Then use array index + 1 as the organic rank — this corrects for PPC ads
  // and LSAs that inflate rank_group values (e.g. 2 PPC ads → organic #1 has
  // rank_group=3, but its true organic position is 1).
  const sorted = [...mapItems].sort((a, b) => a.rank_group - b.rank_group);
  const organicRank = (item: MapsSerpItem) => sorted.indexOf(item) + 1;

  const bizCid = business.cid || null;
  const bizPlaceId = business.placeId || null;
  const bizFeatureId = business.featureId || null;
  const bizName = normalizeName(business.name);
  const bizDomain = business.domain ? normalizeDomain(business.domain) : (business.website ? normalizeDomain(business.website) : null);
  const bizWords = getSignificantWords(business.name);

  for (const item of sorted) {
    // 1. CID match (strongest)
    if (bizCid && item.cid && item.cid === bizCid) {
      return { rank: organicRank(item), url: item.url, matchMethod: 'cid' };
    }

    // 2. Place ID match
    if (bizPlaceId && item.place_id && item.place_id === bizPlaceId) {
      return { rank: organicRank(item), url: item.url, matchMethod: 'placeId' };
    }

    // 3. Feature ID match
    if (bizFeatureId && item.feature_id && item.feature_id === bizFeatureId) {
      return { rank: organicRank(item), url: item.url, matchMethod: 'placeId' };
    }
  }

  // 4. Exact name match (normalized)
  for (const item of sorted) {
    const itemName = normalizeName(item.title || '');
    if (itemName && bizName && itemName === bizName) {
      return { rank: organicRank(item), url: item.url, matchMethod: 'exactName' };
    }
  }

  // 5a. All significant words match
  if (bizWords.length >= 2) {
    for (const item of sorted) {
      const itemTitle = normalizeName(item.title || '');
      const allMatch = bizWords.every((word) => itemTitle.includes(word));
      if (allMatch) {
        return { rank: organicRank(item), url: item.url, matchMethod: 'significantWords' };
      }
    }
  }

  // 5b. Majority significant words match (≥75%) — handles slight name variations
  if (bizWords.length >= 2) {
    const threshold = Math.ceil(bizWords.length * 0.75);
    let bestItem: MapsSerpItem | null = null;
    let bestCount = 0;

    for (const item of sorted) {
      const itemTitle = normalizeName(item.title || '');
      const matchCount = bizWords.filter((word) => itemTitle.includes(word)).length;
      if (matchCount >= threshold && matchCount > bestCount) {
        bestCount = matchCount;
        bestItem = item;
      }
    }

    if (bestItem) {
      return { rank: organicRank(bestItem), url: bestItem.url, matchMethod: 'significantWords' };
    }
  }

  // 6. Domain match (weakest)
  if (bizDomain) {
    for (const item of sorted) {
      const itemDomain = item.domain ? normalizeDomain(item.domain) : null;
      if (itemDomain && itemDomain === bizDomain) {
        return { rank: organicRank(item), url: item.url, matchMethod: 'domain' };
      }
    }
  }

  return { rank: null, url: null, matchMethod: null };
}

// ── Google Maps URL parser ───────────────────────────────────────────

export interface ParsedMapsUrl {
  placeId?: string;
  cid?: string;
  featureId?: string;
  lat?: number;
  lng?: number;
  name?: string;
}

export function parseGoogleMapsUrl(url: string): ParsedMapsUrl {
  const result: ParsedMapsUrl = {};

  try {
    // Extract Place ID: ChIJ... format
    const placeIdMatch = url.match(/place_id[=:]([A-Za-z0-9_-]+)/);
    if (placeIdMatch) result.placeId = placeIdMatch[1];

    // Extract Feature ID: 0x...:0x... format (also contains CID)
    const featureIdMatch = url.match(/(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (featureIdMatch) {
      result.featureId = featureIdMatch[1];
      // Extract CID from feature ID hex: the second 0x part
      const cidHex = featureIdMatch[1].split(':')[1];
      if (cidHex) {
        try {
          result.cid = BigInt(cidHex).toString();
        } catch { /* ignore invalid hex */ }
      }
    }

    // Extract CID from !1s pattern: !1s0x...:0xHEX
    const bangCidMatch = url.match(/!1s0x[0-9a-fA-F]+:0x([0-9a-fA-F]+)/);
    if (bangCidMatch && !result.cid) {
      try {
        result.cid = BigInt('0x' + bangCidMatch[1]).toString();
      } catch { /* ignore */ }
    }

    // Extract CID from ludocid= or ?cid= parameter
    const ludocidMatch = url.match(/[?&](?:ludocid|cid)=(\d+)/);
    if (ludocidMatch && !result.cid) {
      result.cid = ludocidMatch[1];
    }

    // Extract ftid= parameter
    const ftidMatch = url.match(/ftid=([^&]+)/);
    if (ftidMatch && !result.featureId) {
      result.featureId = decodeURIComponent(ftidMatch[1]);
    }

    // Extract coordinates: @lat,lng pattern
    const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) {
      result.lat = parseFloat(coordMatch[1]);
      result.lng = parseFloat(coordMatch[2]);
    }

    // Extract business name from /place/NAME/ path
    const placeNameMatch = url.match(/\/place\/([^/@]+)/);
    if (placeNameMatch) {
      result.name = decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '));
    }

    // Extract Place ID from data= parameter: !19s prefix
    const dataPlaceId = url.match(/!19s(ChIJ[A-Za-z0-9_-]+)/);
    if (dataPlaceId && !result.placeId) {
      result.placeId = dataPlaceId[1];
    }
  } catch {
    // Return whatever we parsed so far
  }

  return result;
}

// ── Input type detection ─────────────────────────────────────────────

export type InputType = 'mapsUrl' | 'website' | 'phone' | 'name';

export function detectInputType(input: string): InputType {
  const trimmed = input.trim();

  // Google Maps URL
  if (/google\.[a-z.]+\/maps/i.test(trimmed) || /maps\.google\./i.test(trimmed) || /goo\.gl\/maps/i.test(trimmed)) {
    return 'mapsUrl';
  }

  // Website URL (has http/https or looks like a domain)
  if (/^https?:\/\//i.test(trimmed) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) {
    return 'website';
  }

  // Phone number (digits, spaces, dashes, parens — at least 7 digits)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 7 && /^[+\d()\s.-]+$/.test(trimmed)) {
    return 'phone';
  }

  return 'name';
}

// ── localStorage scan cache (24hr TTL) ───────────────────────────────

const CACHE_PREFIX = 'lgrid_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(keyword: string, lat: number, lng: number): string {
  return `${CACHE_PREFIX}${keyword}_${lat.toFixed(5)}_${lng.toFixed(5)}`;
}

export function getCachedResult(keyword: string, lat: number, lng: number): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(keyword, lat, lng));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(keyword, lat, lng));
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

export function setCachedResult(keyword: string, lat: number, lng: number, data: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      cacheKey(keyword, lat, lng),
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    // localStorage full — silently fail
  }
}

export function clearScanCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ── Heatmap data processing ──────────────────────────────────────────

export function processRankData(rankData: RankData[], gridSize: number): HeatmapData {
  const keyword = rankData[0]?.keyword || '';
  const totalPoints = gridSize * gridSize;

  const pointRankMap = new Map<number, { rank: number | null; lat: number; lng: number }>();

  rankData.forEach((data) => {
    pointRankMap.set(data.point, {
      rank: data.rank,
      lat: 0,
      lng: 0,
    });
  });

  const points = Array.from(pointRankMap.entries()).map(([, data]) => ({
    lat: data.lat,
    lng: data.lng,
    rank: data.rank,
    intensity: calculateIntensity(data.rank),
  }));

  const rankedPoints = rankData.filter((d) => d.rank !== null);
  const avgRank =
    rankedPoints.length > 0
      ? rankedPoints.reduce((sum, d) => sum + (d.rank || 0), 0) / rankedPoints.length
      : 0;

  const top3Count = rankData.filter((d) => d.rank !== null && d.rank <= 3).length;

  return {
    keyword,
    points,
    averageRank: avgRank,
    pointsRanking: rankedPoints.length,
    notRanking: totalPoints - rankedPoints.length,
    top3Count,
    visibilityScore: totalPoints > 0 ? (top3Count / totalPoints) * 100 : 0,
  };
}

function calculateIntensity(rank: number | null): number {
  if (rank === null) return 0;
  if (rank <= 3) return 1.0;
  if (rank <= 10) return 0.7;
  if (rank <= 20) return 0.4;
  return 0.2;
}

// ── Display helpers ──────────────────────────────────────────────────

export function formatCoordinate(value: number, isLatitude: boolean): string {
  const direction = isLatitude ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(6)}° ${direction}`;
}

export function estimateScanTime(totalChecks: number): { min: number; max: number } {
  const min = Math.ceil(totalChecks / 10);
  const max = Math.ceil(totalChecks / 5);
  return { min, max };
}

export function calculateCost(totalChecks: number): number {
  return totalChecks * 0.002;
}
