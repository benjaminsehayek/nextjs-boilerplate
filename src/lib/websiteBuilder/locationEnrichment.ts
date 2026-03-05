// Location Enrichment — fetches + caches real local context for location pages
//
// Cache table SQL — run in Supabase SQL editor:
// CREATE TABLE location_enrichment_cache (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   lat_bucket numeric(6,2) NOT NULL,
//   lng_bucket numeric(6,2) NOT NULL,
//   data jsonb NOT NULL,
//   fetched_at timestamptz DEFAULT now(),
//   UNIQUE (lat_bucket, lng_bucket)
// );

import type { LocationEnrichment } from '@/types';

// ── US State FIPS codes (Census API requires numeric state code) ────────────
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25',
  MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32',
  NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39',
  OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47',
  TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55',
  WY: '56', DC: '11',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function roundTo2dp(n: number): number {
  return Math.round(n * 100) / 100;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Fetch nearby landmarks via Google Maps Places API ───────────────────────

async function fetchNearbyLandmarks(
  lat: number,
  lng: number,
): Promise<{ landmarks: string[]; neighborhoods: string[] }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[locationEnrichment] GOOGLE_MAPS_API_KEY not set — skipping landmarks');
    return { landmarks: [], neighborhoods: [] };
  }

  try {
    // Nearby search for points of interest within 3 miles (~5km)
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', '5000');
    url.searchParams.set('type', 'point_of_interest');
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error('[locationEnrichment] Places API error:', res.status);
      return { landmarks: [], neighborhoods: [] };
    }

    const data = await res.json();
    const results: Array<{
      name: string;
      geometry: { location: { lat: number; lng: number } };
      types: string[];
    }> = data.results ?? [];

    // Filter for notable landmarks (parks, schools, shopping, transit)
    const landmarkTypes = new Set([
      'park', 'train_station', 'transit_station', 'shopping_mall',
      'university', 'stadium', 'museum', 'library', 'hospital',
      'school', 'church', 'city_hall', 'courthouse',
    ]);

    const landmarks = results
      .filter((r) => r.types.some((t) => landmarkTypes.has(t)))
      .slice(0, 8)
      .map((r) => {
        const dist = haversineDistance(lat, lng, r.geometry.location.lat, r.geometry.location.lng);
        return `${r.name} (${dist.toFixed(1)}mi)`;
      });

    // Extract neighborhood names from results that have "neighborhood" or "sublocality" type
    const neighborhoods = [
      ...new Set(
        results
          .flatMap((r) => r.types.includes('neighborhood') || r.types.includes('sublocality') ? [r.name] : [])
      ),
    ].slice(0, 6);

    return { landmarks, neighborhoods };
  } catch (err) {
    console.error('[locationEnrichment] Places API fetch failed:', err);
    return { landmarks: [], neighborhoods: [] };
  }
}

// ── Fetch climate data via OpenMeteo (free, no key) ─────────────────────────

async function fetchClimateData(
  lat: number,
  lng: number,
): Promise<LocationEnrichment['climate']> {
  const defaults: LocationEnrichment['climate'] = {
    heatingSeasonMonths: 'October through April',
    avgWinterLow: 32,
    avgSummerHigh: 85,
    humidity: 'moderate',
  };

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,relative_humidity_2m_max');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('past_days', '365');
    url.searchParams.set('forecast_days', '0');
    url.searchParams.set('temperature_unit', 'fahrenheit');

    const res = await fetch(url.toString());
    if (!res.ok) return defaults;

    const data = await res.json();
    const daily = data.daily;
    if (!daily?.temperature_2m_max || !daily?.temperature_2m_min) return defaults;

    const maxTemps: number[] = daily.temperature_2m_max;
    const minTemps: number[] = daily.temperature_2m_min;
    const times: string[] = daily.time;

    // Group by month
    const monthlyMaxes: number[][] = Array.from({ length: 12 }, () => []);
    const monthlyMins: number[][] = Array.from({ length: 12 }, () => []);

    for (let i = 0; i < times.length; i++) {
      const month = new Date(times[i]).getMonth();
      if (maxTemps[i] != null) monthlyMaxes[month].push(maxTemps[i]);
      if (minTemps[i] != null) monthlyMins[month].push(minTemps[i]);
    }

    const avgMonthlyMax = monthlyMaxes.map((arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    );
    const avgMonthlyMin = monthlyMins.map((arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    );

    // Winter = Dec, Jan, Feb; Summer = Jun, Jul, Aug
    const winterMonths = [11, 0, 1];
    const summerMonths = [5, 6, 7];

    const avgWinterLow = Math.round(
      winterMonths.reduce((s, m) => s + avgMonthlyMin[m], 0) / winterMonths.length
    );
    const avgSummerHigh = Math.round(
      summerMonths.reduce((s, m) => s + avgMonthlyMax[m], 0) / summerMonths.length
    );

    // Determine heating season months (months where avg high < 55F)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const heatingMonths = avgMonthlyMax
      .map((max, i) => (max < 55 ? monthNames[i] : null))
      .filter(Boolean) as string[];
    const heatingSeasonMonths =
      heatingMonths.length > 0
        ? `${heatingMonths[0]} through ${heatingMonths[heatingMonths.length - 1]}`
        : 'minimal heating season';

    // Determine humidity
    const humidityVals: number[] = daily.relative_humidity_2m_max ?? [];
    const avgHumidity =
      humidityVals.length > 0
        ? humidityVals.reduce((a: number, b: number) => a + b, 0) / humidityVals.length
        : 50;
    const humidity: 'humid' | 'arid' | 'moderate' =
      avgHumidity > 65 ? 'humid' : avgHumidity < 35 ? 'arid' : 'moderate';

    return { heatingSeasonMonths, avgWinterLow, avgSummerHigh, humidity };
  } catch (err) {
    console.error('[locationEnrichment] OpenMeteo fetch failed:', err);
    return defaults;
  }
}

// ── Fetch housing data via US Census Bureau ACS API ─────────────────────────

async function fetchHousingData(
  city: string,
  state: string,
): Promise<LocationEnrichment['housing']> {
  const defaults: LocationEnrichment['housing'] = {
    medianBuildYear: 1985,
    pctSingleFamily: 0.6,
    pctOlderThan40Years: 0.5,
  };

  const stateAbbr = state.toUpperCase().trim();
  const fips = STATE_FIPS[stateAbbr];
  if (!fips) {
    console.warn(`[locationEnrichment] Unknown state abbreviation: ${state}`);
    return defaults;
  }

  try {
    // B25035_001E = Median year structure built
    // B25024_002E = 1-unit detached structures (single family)
    // B25024_001E = Total housing units (for percentage calc)
    const url = `https://api.census.gov/data/2022/acs/acs5?get=B25035_001E,B25024_002E,B25024_001E&for=place:*&in=state:${fips}`;

    const res = await fetch(url);
    if (!res.ok) return defaults;

    const data: string[][] = await res.json();
    if (!data || data.length < 2) return defaults;

    // First row is headers, rest is data. Find matching city.
    // Census place names are like "Portland city" — match on city name prefix.
    const cityLower = city.toLowerCase().trim();
    const headers = data[0];
    const rows = data.slice(1);

    // Census doesn't include place names by default — we use NAME variable
    // Instead, find the row that best matches our city.
    // Since the API doesn't return NAME, we'll use the aggregate of all places
    // in the state as a reasonable fallback. For exact match, we'd need
    // a NAME lookup call first, but for MVP use state-level aggregation.

    // Aggregate all places in the state
    let totalMedianYear = 0;
    let totalSingleFamily = 0;
    let totalHousingUnits = 0;
    let placeCount = 0;

    for (const row of rows) {
      const medianYear = parseInt(row[0], 10);
      const singleFamily = parseInt(row[1], 10);
      const totalUnits = parseInt(row[2], 10);

      if (!isNaN(medianYear) && !isNaN(singleFamily) && !isNaN(totalUnits) && totalUnits > 0) {
        totalMedianYear += medianYear;
        totalSingleFamily += singleFamily;
        totalHousingUnits += totalUnits;
        placeCount++;
      }
    }

    if (placeCount === 0) return defaults;

    const medianBuildYear = Math.round(totalMedianYear / placeCount);
    const pctSingleFamily = totalHousingUnits > 0
      ? Math.round((totalSingleFamily / totalHousingUnits) * 100) / 100
      : 0.6;
    const currentYear = new Date().getFullYear();
    const pctOlderThan40Years = medianBuildYear < currentYear - 40 ? 0.65 : 0.35;

    return { medianBuildYear, pctSingleFamily, pctOlderThan40Years };
  } catch (err) {
    console.error('[locationEnrichment] Census API fetch failed:', err);
    return defaults;
  }
}

// ── Main fetch function ─────────────────────────────────────────────────────

export async function fetchLocationEnrichment(
  lat: number,
  lng: number,
  city: string,
  state: string,
): Promise<LocationEnrichment> {
  const [places, climate, housing] = await Promise.all([
    fetchNearbyLandmarks(lat, lng),
    fetchClimateData(lat, lng),
    fetchHousingData(city, state),
  ]);

  return {
    landmarks: places.landmarks,
    neighborhoods: places.neighborhoods,
    climate,
    housing,
  };
}

// ── Cache helpers (Supabase) ────────────────────────────────────────────────

const CACHE_TTL_DAYS = 30;

export async function getCachedEnrichment(
  supabase: any,
  lat: number,
  lng: number,
): Promise<LocationEnrichment | null> {
  const latBucket = roundTo2dp(lat);
  const lngBucket = roundTo2dp(lng);

  const { data } = await supabase
    .from('location_enrichment_cache')
    .select('data, fetched_at')
    .eq('lat_bucket', latBucket)
    .eq('lng_bucket', lngBucket)
    .single();

  if (!data) return null;

  // Check TTL
  const fetchedAt = new Date(data.fetched_at).getTime();
  const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - fetchedAt > ttlMs) return null;

  return data.data as LocationEnrichment;
}

export async function setCachedEnrichment(
  supabase: any,
  lat: number,
  lng: number,
  enrichment: LocationEnrichment,
): Promise<void> {
  const latBucket = roundTo2dp(lat);
  const lngBucket = roundTo2dp(lng);

  await supabase
    .from('location_enrichment_cache')
    .upsert(
      { lat_bucket: latBucket, lng_bucket: lngBucket, data: enrichment, fetched_at: new Date().toISOString() },
      { onConflict: 'lat_bucket,lng_bucket' }
    );
}

// ── Prompt block builder ────────────────────────────────────────────────────

export function buildLocationEnrichmentBlock(
  enrichment: LocationEnrichment,
  serviceName: string,
): string {
  const lines: string[] = [
    'LOCAL CONTEXT — use this naturally throughout the content, do not list it verbatim:',
    '',
  ];

  if (enrichment.climate) {
    lines.push(
      `Climate: ${enrichment.climate.heatingSeasonMonths} is heating season`,
      `  (avg low ${enrichment.climate.avgWinterLow}°F). Summer avg high ${enrichment.climate.avgSummerHigh}°F.`,
      `  → Reference why this climate makes ${serviceName} maintenance important locally.`,
      '',
    );
  }

  if (enrichment.housing) {
    const currentYear = new Date().getFullYear();
    lines.push(
      `Housing: ${Math.round(enrichment.housing.pctOlderThan40Years * 100)}% of homes built before ${currentYear - 40}. Median build year ${enrichment.housing.medianBuildYear}.`,
      `  → Reference older home considerations relevant to ${serviceName} where appropriate.`,
      '',
    );
  }

  if (enrichment.landmarks.length > 0) {
    lines.push(
      `Landmarks & neighbourhoods nearby: ${enrichment.landmarks.slice(0, 4).join(', ')}`,
    );
  }
  if (enrichment.neighborhoods.length > 0) {
    lines.push(
      `Neighbourhoods served: ${enrichment.neighborhoods.join(', ')}`,
    );
  }
  if (enrichment.landmarks.length > 0 || enrichment.neighborhoods.length > 0) {
    lines.push(
      '  → Reference 1–2 of these naturally (e.g. "serving homeowners in [neighborhood]").',
      '',
    );
  }

  lines.push(
    'DO NOT fabricate local details beyond what is listed above.',
    'DO NOT list these as bullet points — weave them into the prose naturally.',
  );

  return lines.join('\n');
}
