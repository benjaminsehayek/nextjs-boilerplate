import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check — server-side getUser()
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const requestedBusinessId = searchParams.get('businessId');
    const locationId = searchParams.get('locationId');
    const marketId = searchParams.get('marketId');

    // Get business — use requested businessId if provided, otherwise first business
    let businessId: string;
    if (requestedBusinessId) {
      // Validate ownership: ensure the requested business belongs to this user
      const { data: biz } = await (supabase as any)
        .from('businesses')
        .select('id')
        .eq('id', requestedBusinessId)
        .eq('user_id', user.id)
        .single();
      if (!biz) {
        return NextResponse.json({ pages: [] });
      }
      businessId = biz.id;
    } else {
      const { data: biz } = await (supabase as any)
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (!biz) {
        return NextResponse.json({ pages: [] });
      }
      businessId = biz.id;
    }

    // Build query
    let query = (supabase as any)
      .from('site_pages')
      .select('id, title, slug, type, published_at, location_id, market_id')
      .eq('business_id', businessId)
      .eq('status', 'published');

    if (locationId) {
      query = query.eq('location_id', locationId);
    }
    if (marketId) {
      query = query.eq('market_id', marketId);
    }

    query = query.order('published_at', { ascending: false });

    const { data: pages, error } = await query;

    if (error) {
      console.error('Error fetching published pages:', error);
      return NextResponse.json({ pages: [] });
    }

    return NextResponse.json({ pages: pages ?? [] });
  } catch (error) {
    console.error('Published pages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
