import type { BusinessInfo, GridPoint, GridSize, HeatmapData, RankData } from './types';

/**
 * Generate grid points around a center location
 */
export function generateGridPoints(
  center: { lat: number; lng: number },
  gridSize: GridSize,
  radiusKm: number
): GridPoint[] {
  const points: GridPoint[] = [];
  const earthRadiusKm = 6371;

  // Calculate the distance between grid points
  const totalDistanceKm = radiusKm * 2; // Total grid coverage
  const stepKm = totalDistanceKm / (gridSize - 1 || 1);

  // Calculate offset in degrees (approximate)
  const latOffsetPerKm = 1 / 111; // 1 degree latitude ≈ 111 km
  const lngOffsetPerKm = 1 / (111 * Math.cos((center.lat * Math.PI) / 180));

  let pointId = 1;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Calculate offset from center
      const latOffset = (row - (gridSize - 1) / 2) * stepKm * latOffsetPerKm;
      const lngOffset = (col - (gridSize - 1) / 2) * stepKm * lngOffsetPerKm;

      const lat = center.lat + latOffset;
      const lng = center.lng + lngOffset;

      // Calculate distance from center using Haversine formula
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

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
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

/**
 * Process rank data from API into heatmap format
 */
export function processRankData(rankData: RankData[], gridSize: number): HeatmapData {
  const keyword = rankData[0]?.keyword || '';
  const totalPoints = gridSize * gridSize;

  // Create map of point positions to rank data
  const pointRankMap = new Map<number, { rank: number | null; lat: number; lng: number }>();

  rankData.forEach((data) => {
    pointRankMap.set(data.point, {
      rank: data.rank,
      lat: 0, // Will be filled from grid points
      lng: 0, // Will be filled from grid points
    });
  });

  const points = Array.from(pointRankMap.entries()).map(([position, data]) => ({
    lat: data.lat,
    lng: data.lng,
    rank: data.rank,
    intensity: calculateIntensity(data.rank),
  }));

  // Calculate statistics
  const rankedPoints = rankData.filter((d) => d.rank !== null);
  const avgRank =
    rankedPoints.length > 0
      ? rankedPoints.reduce((sum, d) => sum + (d.rank || 0), 0) / rankedPoints.length
      : 0;

  return {
    keyword,
    points,
    averageRank: avgRank,
    pointsRanking: rankedPoints.length,
    notRanking: totalPoints - rankedPoints.length,
  };
}

/**
 * Calculate heatmap intensity (0-1) based on rank
 */
function calculateIntensity(rank: number | null): number {
  if (rank === null) return 0;
  if (rank <= 3) return 1.0;
  if (rank <= 10) return 0.7;
  if (rank <= 20) return 0.4;
  return 0.2;
}

/**
 * Find business rank in search results
 */
export function findBusinessRank(
  searchResults: any[],
  businessDomain: string,
  businessName: string
): { rank: number | null; url: string | null } {
  // Normalize business domain (remove www, protocol, etc.)
  const normalizedDomain = normalizeDomain(businessDomain);
  const normalizedName = businessName.toLowerCase().trim();

  for (let i = 0; i < searchResults.length; i++) {
    const result = searchResults[i];
    const resultDomain = normalizeDomain(result.url || '');
    const resultTitle = (result.title || '').toLowerCase();

    // Check if domain matches or business name is in title
    if (
      resultDomain.includes(normalizedDomain) ||
      normalizedDomain.includes(resultDomain) ||
      resultTitle.includes(normalizedName)
    ) {
      return {
        rank: i + 1, // Rank starts at 1
        url: result.url,
      };
    }
  }

  return { rank: null, url: null };
}

/**
 * Normalize domain for comparison
 */
function normalizeDomain(url: string): string {
  try {
    let domain = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase();
    return domain;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Format coordinates for display
 */
export function formatCoordinate(value: number, isLatitude: boolean): string {
  const direction = isLatitude ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(6)}° ${direction}`;
}

/**
 * Calculate estimated scan time in minutes
 */
export function estimateScanTime(totalChecks: number): { min: number; max: number } {
  // DataForSEO typically processes 5-10 requests per minute
  const min = Math.ceil(totalChecks / 10);
  const max = Math.ceil(totalChecks / 5);
  return { min, max };
}

/**
 * Calculate API cost estimate
 */
export function calculateCost(totalChecks: number): number {
  // DataForSEO Local Pack API costs approximately $0.003 per check
  return totalChecks * 0.003;
}
