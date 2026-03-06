// Sync GSC ranking data to site_pages
// POST /api/website-builder/pages/sync-gsc { businessId }
//
// Fetches page-level clicks/impressions/position from GSC and writes them
// back to site_pages.gsc_position / gsc_clicks / gsc_impressions.

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BodySchema = z.object({
  businessId: z.string().uuid(),
});

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
    const newToken: string = data.access_token;
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
    await supabase
      .from('platform_connections')
      .update({ access_token: newToken, expires_at: expiresAt })
      .eq('business_id', businessId)
      .eq('platform', 'search_console');
    return newToken;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify ownership
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id, domain')
    .eq('id', body.businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Load GSC connection
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

  // Auto-refresh token if near expiry
  let accessToken: string = conn.access_token;
  if (Date.now() + 5 * 60 * 1000 >= new Date(conn.expires_at).getTime()) {
    const refreshed = await refreshAccessToken(conn.refresh_token, body.businessId, supabase);
    if (!refreshed) {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }
    accessToken = refreshed;
  }

  // Fetch page-level analytics from GSC (last 90 days, page dimension only)
  const endDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const siteUrl = encodeURIComponent(conn.account_id);
  const analyticsUrl = `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`;

  const gscRes = await fetch(analyticsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['page'],
      rowLimit: 25000,
      dataState: 'final',
    }),
  });

  if (!gscRes.ok) {
    const errText = await gscRes.text();
    console.error('[sync-gsc] GSC API error:', gscRes.status, errText);
    return NextResponse.json({ error: `GSC API error ${gscRes.status}` }, { status: gscRes.status });
  }

  const gscData = await gscRes.json();
  const gscRows: Array<{ keys: string[]; clicks: number; impressions: number; position: number }> =
    gscData.rows ?? [];

  // Build a map: normalised-slug → GSC metrics
  // GSC page URLs can look like:
  //   https://app.scorchlocal.com/sites/{businessSlug}/portland-or/ac-repair
  //   https://customdomain.com/portland-or/ac-repair
  // We extract everything after the last occurrence of /sites/{something}/ or just the path.
  const gscMap = new Map<
    string,
    { clicks: number; impressions: number; position: number }
  >();

  for (const row of gscRows) {
    const rawUrl = row.keys[0];
    try {
      const url = new URL(rawUrl);
      const path = url.pathname; // e.g. /sites/mybiz/portland-or/ac-repair or /portland-or/ac-repair

      // Strip /sites/{segment}/ prefix if present
      const sitesPrefixMatch = path.match(/^\/sites\/[^/]+\/(.+)$/);
      const slug = sitesPrefixMatch ? sitesPrefixMatch[1] : path.replace(/^\//, '');

      if (slug) {
        // Keep the best position (lowest = best) when same slug appears from multiple domains
        const existing = gscMap.get(slug);
        if (!existing || row.position < existing.position) {
          gscMap.set(slug, {
            clicks: row.clicks,
            impressions: row.impressions,
            position: row.position,
          });
        }
      }
    } catch {
      // Malformed URL — skip
    }
  }

  if (gscMap.size === 0) {
    return NextResponse.json({ synced: 0, message: 'No page data found in GSC' });
  }

  // Load all published pages for this business
  const { data: pages } = await (supabase as any)
    .from('site_pages')
    .select('id, slug')
    .eq('business_id', body.businessId)
    .eq('status', 'published');

  if (!pages || pages.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No published pages to sync' });
  }

  // Match and update
  const now = new Date().toISOString();
  let synced = 0;

  await Promise.all(
    (pages as { id: string; slug: string }[]).map(async (p) => {
      const metrics = gscMap.get(p.slug);
      if (!metrics) return;

      await (supabase as any)
        .from('site_pages')
        .update({
          gsc_position: Math.round(metrics.position * 10) / 10,
          gsc_clicks: metrics.clicks,
          gsc_impressions: metrics.impressions,
          gsc_synced_at: now,
        })
        .eq('id', p.id);

      synced++;
    }),
  );

  return NextResponse.json({
    synced,
    total_pages: pages.length,
    gsc_pages_found: gscMap.size,
  });
}
