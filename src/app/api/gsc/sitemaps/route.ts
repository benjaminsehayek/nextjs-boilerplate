import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';

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

  // Rate limiting: 10 requests per minute per user
  const { allowed } = checkRateLimit(`gsc-sitemaps:${user.id}`, 10, 60_000);
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

  const siteUrl = encodeURIComponent(conn.account_id);
  const sitemapsUrl = `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps`;

  try {
    const res = await fetch(sitemapsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[GSC sitemaps] API error:', res.status, errText);
      return NextResponse.json({ error: `GSC API error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();

    // Normalize sitemap entries into a consistent shape
    interface SitemapEntry {
      path: string;
      type: string;
      lastSubmitted: string | null;
      lastDownloaded: string | null;
      isPending: boolean;
      isSitemapsIndex: boolean;
      warnings: number;
      errors: number;
      contents: Array<{
        type: string;
        submitted: number;
        indexed: number;
      }>;
    }

    const sitemaps: SitemapEntry[] = (data.sitemap || []).map((s: any) => ({
      path: s.path || '',
      type: s.type || 'sitemap',
      lastSubmitted: s.lastSubmitted || null,
      lastDownloaded: s.lastDownloaded || null,
      isPending: s.isPending ?? false,
      isSitemapsIndex: s.isSitemapsIndex ?? false,
      warnings: s.warnings ? Number(s.warnings) : 0,
      errors: s.errors ? Number(s.errors) : 0,
      contents: (s.contents || []).map((c: any) => ({
        type: c.type || 'web',
        submitted: c.submitted ? Number(c.submitted) : 0,
        indexed: c.indexed ? Number(c.indexed) : 0,
      })),
    }));

    return NextResponse.json({ sitemaps, siteUrl: conn.account_id });
  } catch (e: any) {
    console.error('[GSC sitemaps] Fetch error:', e);
    return NextResponse.json({ error: 'Failed to reach GSC API' }, { status: 502 });
  }
}
