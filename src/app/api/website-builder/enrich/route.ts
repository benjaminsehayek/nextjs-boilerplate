import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  fetchLocationEnrichment,
  getCachedEnrichment,
  setCachedEnrichment,
} from '@/lib/websiteBuilder/locationEnrichment';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  businessId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`enrich:${user.id}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify business ownership
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id')
    .eq('id', body.businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Load location
  const { data: location } = await (supabase as any)
    .from('business_locations')
    .select('*')
    .eq('id', body.locationId)
    .eq('business_id', body.businessId)
    .single();

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  if (!location.latitude || !location.longitude) {
    return NextResponse.json(
      { error: 'Location is missing coordinates (latitude/longitude)' },
      { status: 400 }
    );
  }

  // Check cache first
  const cached = await getCachedEnrichment(supabase, location.latitude, location.longitude);
  if (cached) {
    return NextResponse.json({ enrichment: cached, cached: true });
  }

  // Fetch fresh enrichment
  const enrichment = await fetchLocationEnrichment(
    location.latitude,
    location.longitude,
    location.city,
    location.state
  );

  // Cache the result
  await setCachedEnrichment(supabase, location.latitude, location.longitude, enrichment);

  return NextResponse.json({ enrichment, cached: false });
}
