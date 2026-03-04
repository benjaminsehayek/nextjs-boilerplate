// Server-side geocoding proxy — forwards to Nominatim with server User-Agent
// Nominatim ToS: requests must come from a server, not a browser, and max 1 req/sec
// Docs: https://nominatim.org/release-docs/develop/api/Search/

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'ScorchLocal/1.0 (local-seo-platform)';

/** Validate latitude is in [-90, 90] and longitude in [-180, 180] */
function validateLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * GET /api/geocode?q=<address>
 *   Forward geocode: address string → { lat, lng, display_name }
 *
 * GET /api/geocode?lat=<lat>&lon=<lon>
 *   Reverse geocode: coordinates → { county, state, display_name }
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return apiError('Unauthorized', 401);
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q');
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (q) {
    // Forward geocoding
    const trimmed = q.trim().slice(0, 500);
    if (!trimmed) return apiError('q parameter is required', 400);

    const params = new URLSearchParams({ format: 'json', q: trimmed, limit: '1' });
    try {
      const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) return apiError('Geocoding service error', 502);
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return apiError('Geocoding request failed', 502);
    }
  }

  if (latStr && lonStr) {
    // Reverse geocoding
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon) || !validateLatLng(lat, lon)) {
      return apiError('lat and lon must be valid coordinates', 400);
    }

    const params = new URLSearchParams({ format: 'json', lat: String(lat), lon: String(lon) });
    try {
      const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) return apiError('Reverse geocoding service error', 502);
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return apiError('Reverse geocoding request failed', 502);
    }
  }

  return apiError('Provide either q (address) or lat+lon parameters', 400);
}
