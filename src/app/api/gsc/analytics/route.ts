import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';

const BodySchema = z.object({
  businessId: z.string().uuid(),
});

// ── In-memory response cache ─────────────────────────────────────────────────

interface CacheEntry {
  rows: unknown[];
  deviceRows: unknown[];
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Periodic cleanup: remove expired entries every hour
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now > entry.expiresAt) {
      responseCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Allow Node.js to exit without waiting for this interval
if (cleanupInterval.unref) cleanupInterval.unref();

// ─────────────────────────────────────────────────────────────────────────────

async function refreshAccessToken(
  refreshToken: string,
  businessId: string,
  supabase: any,
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const newAccessToken: string = data.access_token;
    const expiresIn: number = data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await supabase
      .from('platform_connections')
      .update({ access_token: newAccessToken, expires_at: expiresAt })
      .eq('business_id', businessId)
      .eq('platform', 'search_console');

    return newAccessToken;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting: 10 requests per minute per user
  const { allowed } = checkRateLimit(`gsc:${user.id}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { businessId: string };
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Check cache before hitting the GSC API
  const cacheKey = body.businessId;
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(
      { rows: cached.rows, deviceRows: cached.deviceRows },
      { headers: { 'X-Cache': 'HIT' } },
    );
  }

  // Load connection — RLS ensures only owner can read
  const { data: conn } = await (supabase as any)
    .from('platform_connections')
    .select('access_token, refresh_token, expires_at, account_id')
    .eq('business_id', body.businessId)
    .eq('platform', 'search_console')
    .eq('connected', true)
    .single();

  if (!conn) {
    return NextResponse.json({ error: 'GSC not connected' }, { status: 404 });
  }

  // Auto-refresh token if expiring within 5 minutes
  let accessToken: string = conn.access_token;
  const expiresAt = new Date(conn.expires_at).getTime();
  if (Date.now() + 5 * 60 * 1000 >= expiresAt) {
    const refreshed = await refreshAccessToken(conn.refresh_token, body.businessId, supabase);
    if (!refreshed) {
      return NextResponse.json({ error: 'Token refresh failed — please reconnect GSC' }, { status: 401 });
    }
    accessToken = refreshed;
  }

  if (!conn.account_id) {
    return NextResponse.json({ error: 'No GSC property configured' }, { status: 400 });
  }

  // Query Search Analytics: dimensions query × page, last 90 days
  const endDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 day GSC delay
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const siteUrl = encodeURIComponent(conn.account_id);
  const analyticsUrl = `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`;

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // Run both queries in parallel
    const [res, deviceRes] = await Promise.all([
      fetch(analyticsUrl, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['query', 'page'],
          rowLimit: 25000,
          dataState: 'final',
        }),
      }),
      fetch(analyticsUrl, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['device'],
          rowLimit: 1000,
          dataState: 'final',
        }),
      }),
    ]);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[GSC analytics] API error:', res.status, errText);
      return NextResponse.json({ error: `GSC API error ${res.status}` }, { status: res.status });
    }

    if (!deviceRes.ok) {
      const errText = await deviceRes.text();
      console.error('[GSC analytics] Device API error:', deviceRes.status, errText);
      return NextResponse.json({ error: `GSC API error ${deviceRes.status}` }, { status: deviceRes.status });
    }

    const [data, deviceData] = await Promise.all([res.json(), deviceRes.json()]);

    const rows: unknown[] = data.rows || [];
    const deviceRows: unknown[] = deviceData.rows || [];

    // Store in cache
    responseCache.set(cacheKey, { rows, deviceRows, expiresAt: Date.now() + CACHE_TTL_MS });

    // Update last_sync
    await (supabase as any)
      .from('platform_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('business_id', body.businessId)
      .eq('platform', 'search_console');

    return NextResponse.json({ rows, deviceRows });
  } catch (e: any) {
    console.error('[GSC analytics] Fetch error:', e);
    return NextResponse.json({ error: 'Failed to reach GSC API' }, { status: 502 });
  }
}
