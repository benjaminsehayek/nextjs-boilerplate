import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

  let body: { businessId: string };
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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
  const analyticsUrl = `https://www.googleapis.com/webmaster-tools/v3/sites/${siteUrl}/searchAnalytics/query`;

  try {
    const res = await fetch(analyticsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ['query', 'page'],
        rowLimit: 25000,
        dataState: 'final',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[GSC analytics] API error:', res.status, errText);
      return NextResponse.json({ error: `GSC API error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();

    // Update last_sync
    await (supabase as any)
      .from('platform_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('business_id', body.businessId)
      .eq('platform', 'search_console');

    return NextResponse.json({ rows: data.rows || [] });
  } catch (e: any) {
    console.error('[GSC analytics] Fetch error:', e);
    return NextResponse.json({ error: 'Failed to reach GSC API' }, { status: 502 });
  }
}
