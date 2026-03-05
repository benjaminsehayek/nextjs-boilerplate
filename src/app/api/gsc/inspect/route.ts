import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';

const BodySchema = z.object({
  businessId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(10),
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

export interface URLInspectionResult {
  url: string;
  verdict: string | null;       // 'PASS' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED'
  lastCrawlTime: string | null;
  robotsTxtState: string | null; // 'ALLOWED' | 'DISALLOWED'
  indexingState: string | null;  // 'INDEXING_ALLOWED' | 'BLOCKED_BY_META_TAG' | etc.
  pageFetchState: string | null; // 'SUCCESSFUL' | 'SOFT_404' | 'BLOCKED_ROBOTS_TXT' | etc.
  googleCanonical: string | null;
  userCanonical: string | null;
  mobileUsabilityVerdict: string | null; // 'PASS' | 'FAIL' | 'PARTIAL'
  mobileUsabilityIssues: string[];
  richResultsVerdict: string | null;
  error: string | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting: 5 requests per minute per user (inspection is expensive)
  const { allowed } = checkRateLimit(`gsc-inspect:${user.id}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { businessId: string; urls: string[] };
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 },
      );
    }
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

  const siteUrl: string = conn.account_id;
  const inspectEndpoint = 'https://searchconsole.googleapis.com/v1/urlInspectionResult:inspect';

  // Inspect URLs sequentially to avoid rate-limit issues with the GSC API
  const results: URLInspectionResult[] = [];

  for (const url of body.urls) {
    try {
      const res = await fetch(inspectEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[GSC inspect] API error for ${url}:`, res.status, errText);
        results.push({
          url,
          verdict: null,
          lastCrawlTime: null,
          robotsTxtState: null,
          indexingState: null,
          pageFetchState: null,
          googleCanonical: null,
          userCanonical: null,
          mobileUsabilityVerdict: null,
          mobileUsabilityIssues: [],
          richResultsVerdict: null,
          error: `API error ${res.status}`,
        });
        continue;
      }

      const data = await res.json();
      const result = data.inspectionResult || {};

      const indexStatus = result.indexStatusResult || {};
      const mobileUsability = result.mobileUsabilityResult || {};
      const richResults = result.richResultsResult || {};

      results.push({
        url,
        verdict: indexStatus.verdict || null,
        lastCrawlTime: indexStatus.lastCrawlTime || null,
        robotsTxtState: indexStatus.robotsTxtState || null,
        indexingState: indexStatus.indexingState || null,
        pageFetchState: indexStatus.pageFetchState || null,
        googleCanonical: indexStatus.googleCanonical || null,
        userCanonical: indexStatus.userCanonical || null,
        mobileUsabilityVerdict: mobileUsability.verdict || null,
        mobileUsabilityIssues: (mobileUsability.issues || []).map((i: any) => i.issueType || String(i)),
        richResultsVerdict: richResults.verdict || null,
        error: null,
      });
    } catch (e: any) {
      console.error(`[GSC inspect] Fetch error for ${url}:`, e);
      results.push({
        url,
        verdict: null,
        lastCrawlTime: null,
        robotsTxtState: null,
        indexingState: null,
        pageFetchState: null,
        googleCanonical: null,
        userCanonical: null,
        mobileUsabilityVerdict: null,
        mobileUsabilityIssues: [],
        richResultsVerdict: null,
        error: 'Network error',
      });
    }
  }

  return NextResponse.json({ results, siteUrl });
}
