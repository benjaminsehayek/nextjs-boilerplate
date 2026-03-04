import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/user/export
// Returns all user data as a downloadable JSON file (GDPR compliance).
// Excludes large JSONB crawl blobs — only metadata is included.
export async function GET() {
  const supabase = await createClient();

  // Auth check — uses server-side getUser() as required for API routes
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all data in parallel
  const [profileRes, businessRes] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url, subscription_tier, scan_credits_used, scan_credits_limit, content_tokens_used, content_tokens_limit, subscription_status, created_at').eq('id', user.id).single(),
    (supabase as any).from('businesses').select('id, name, domain, industry, phone, address, city, state, zip, created_at').eq('user_id', user.id).order('created_at', { ascending: true }),
  ]);

  const profile = profileRes.data ?? null;
  const businesses: any[] = businessRes.data ?? [];

  // For each business, fetch locations, services, markets, audit metadata, contact count, campaign count
  const enrichedBusinesses = await Promise.all(
    businesses.map(async (biz: any) => {
      const [
        locationsRes,
        servicesRes,
        marketsRes,
        auditsRes,
        contactCountRes,
        campaignCountRes,
      ] = await Promise.all([
        (supabase as any)
          .from('business_locations')
          .select('location_name, address, city, state, zip, phone, is_primary, created_at')
          .eq('business_id', biz.id),
        (supabase as any)
          .from('services')
          .select('name, profit_per_job, close_rate, created_at')
          .eq('business_id', biz.id),
        (supabase as any)
          .from('markets')
          .select('name, state, cities, created_at')
          .eq('business_id', biz.id),
        // Audit metadata only — no crawl_data, issues_data, pages_data blobs
        (supabase as any)
          .from('site_audits')
          .select('id, domain, status, created_at, score')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false }),
        // Contact count only
        (supabase as any)
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', biz.id),
        // Campaign count only
        (supabase as any)
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', biz.id),
      ]);

      return {
        name: biz.name,
        domain: biz.domain,
        industry: biz.industry,
        phone: biz.phone,
        address: biz.address,
        city: biz.city,
        state: biz.state,
        zip: biz.zip,
        created_at: biz.created_at,
        locations: locationsRes.data ?? [],
        services: servicesRes.data ?? [],
        markets: marketsRes.data ?? [],
        site_audits: auditsRes.data ?? [],
        contact_count: contactCountRes.count ?? 0,
        campaign_count: campaignCountRes.count ?? 0,
      };
    })
  );

  const exportData = {
    exported_at: new Date().toISOString(),
    user: {
      email: user.email,
      created_at: user.created_at,
    },
    profile,
    businesses: enrichedBusinesses,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="scorchlocal-export-${date}.json"`,
    },
  });
}
