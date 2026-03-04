import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

function verifyState(state: string): { businessId: string; userId: string } | null {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;

  const parts = state.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, sig] = parts;
  const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }

  const segments = payload.split(':');
  if (segments.length !== 2) return null;
  return { businessId: segments[0], userId: segments[1] };
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const settingsUrl = `${appUrl}/dashboard/settings?tab=integrations`;

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(`${settingsUrl}&gsc=error`);
  }

  const stateData = verifyState(state);
  if (!stateData) {
    return NextResponse.redirect(`${settingsUrl}&gsc=error`);
  }

  const { businessId } = stateData;

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}&gsc=error`);
  }

  let accessToken: string;
  let refreshToken: string;
  let expiresIn: number;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/gsc/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[GSC callback] Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${settingsUrl}&gsc=error`);
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
    expiresIn = tokenData.expires_in || 3600;
  } catch (e) {
    console.error('[GSC callback] Token exchange error:', e);
    return NextResponse.redirect(`${settingsUrl}&gsc=error`);
  }

  // Fetch GSC properties
  let accountId = '';
  let accountName = '';

  try {
    const sitesRes = await fetch('https://www.googleapis.com/webmaster-tools/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (sitesRes.ok) {
      const sitesData = await sitesRes.json();
      const siteEntries: Array<{ siteUrl: string; permissionLevel: string }> = sitesData.siteEntry || [];

      // Fetch business domain to auto-select matching property
      const supabase = await createClient();
      const { data: biz } = await (supabase as any)
        .from('businesses')
        .select('domain')
        .eq('id', businessId)
        .single();

      const domain = biz?.domain?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '';

      // Prefer sc-domain: property matching business domain
      const domainProp = siteEntries.find((s) =>
        s.siteUrl === `sc-domain:${domain}` || s.siteUrl === `sc-domain:www.${domain}`
      );
      // Fall back to URL-prefix property matching domain
      const urlProp = siteEntries.find((s) =>
        s.siteUrl.includes(domain)
      );
      const chosen = domainProp || urlProp || siteEntries[0];

      if (chosen) {
        accountId = chosen.siteUrl;
        accountName = chosen.siteUrl
          .replace('sc-domain:', '')
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '');
      }
    }
  } catch (e) {
    console.error('[GSC callback] Sites fetch error:', e);
    // Non-fatal — store tokens even without property auto-select
  }

  // Upsert platform_connections
  try {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await (supabase as any)
      .from('platform_connections')
      .upsert({
        business_id: businessId,
        platform: 'search_console',
        connected: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        account_id: accountId,
        account_name: accountName,
        last_sync: new Date().toISOString(),
      }, { onConflict: 'business_id,platform' });

    if (upsertError) {
      console.error('[GSC callback] DB upsert error:', upsertError.message);
      return NextResponse.redirect(`${settingsUrl}&gsc=error`);
    }
  } catch (e) {
    console.error('[GSC callback] DB error:', e);
    return NextResponse.redirect(`${settingsUrl}&gsc=error`);
  }

  return NextResponse.redirect(`${settingsUrl}&gsc=connected`);
}
