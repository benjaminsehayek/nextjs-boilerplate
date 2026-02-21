'use server';

import { createClient } from '@/lib/supabase/server';

// ─── Create Business ──────────────────────────────────────────────────────────

export async function createBusiness(data: {
  name: string;
  domain: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  industry?: string;
}): Promise<{ businessId: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (!session?.user || authError) return { businessId: null, error: 'Not authenticated' };
  const user = session.user;

  const { error: insertError } = await (supabase as any)
    .from('businesses')
    .insert({
      user_id: user.id,
      name: data.name,
      domain: data.domain,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      industry: data.industry || null,
    });

  if (insertError) {
    const isDuplicate =
      insertError.message?.includes('duplicate') ||
      insertError.message?.includes('unique');
    if (!isDuplicate) return { businessId: null, error: insertError.message };
  }

  // Fetch the record whether newly inserted or already existed
  const { data: business, error: fetchError } = await (supabase as any)
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (fetchError || !business) {
    return { businessId: null, error: fetchError?.message ?? 'Business not found' };
  }

  return { businessId: business.id, error: null };
}

// ─── Create Location ──────────────────────────────────────────────────────────

export async function createLocation(data: {
  business_id: string;
  location_name: string;
  address?: string;
  city: string;
  state: string;
  zip?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  cid?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (!session?.user || authError) return { error: 'Not authenticated' };

  const { error } = await (supabase as any)
    .from('business_locations')
    .insert({
      business_id: data.business_id,
      location_name: data.location_name,
      address: data.address || null,
      city: data.city,
      state: data.state,
      zip: data.zip || null,
      phone: data.phone || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      place_id: data.place_id || null,
      cid: data.cid || null,
      is_primary: true,
    });

  return { error: error?.message ?? null };
}

// ─── Update Location Coordinates ─────────────────────────────────────────────

export async function updateLocationCoords(data: {
  location_id: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  cid?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (!session?.user || authError) return { error: 'Not authenticated' };

  const { error } = await (supabase as any)
    .from('business_locations')
    .update({
      latitude: data.latitude,
      longitude: data.longitude,
      place_id: data.place_id || null,
      cid: data.cid || null,
    })
    .eq('id', data.location_id);

  return { error: error?.message ?? null };
}

// ─── Create Services ──────────────────────────────────────────────────────────

export async function createServices(
  businessId: string,
  services: Array<{
    name: string;
    profit_per_job: number;
    close_rate: number;
    sort_order: number;
  }>
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (!session?.user || authError) return { error: 'Not authenticated' };

  const { error } = await (supabase as any)
    .from('services')
    .insert(services.map((s) => ({ ...s, business_id: businessId })));

  return { error: error?.message ?? null };
}

// ─── Create Markets ───────────────────────────────────────────────────────────

export async function createMarkets(
  businessId: string,
  markets: Array<{
    name: string;
    cities: string[];
    area_codes: string[];
    is_primary: boolean;
  }>
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (!session?.user || authError) return { error: 'Not authenticated' };

  const { error } = await (supabase as any)
    .from('markets')
    .insert(markets.map((m) => ({ ...m, business_id: businessId })));

  return { error: error?.message ?? null };
}
