// POST /api/local-grid/deduct-credits
// Server-side credit deduction for local grid scans (B11-12).
// Called after a successful scan completes instead of using the Supabase client RPC directly.

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  businessId: z.string().uuid(),
  scanId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Verify the scan belongs to this user's business (cross-tenant safety)
  const { data: scan } = await (supabase as any)
    .from('grid_scans')
    .select('id')
    .eq('id', body.scanId)
    .eq('business_id', body.businessId)
    .single();

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  // Verify business ownership
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id')
    .eq('id', body.businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 403 });
  }

  // Deduct credit server-side
  const { error: rpcError } = await (supabase as any).rpc('decrement_scan_credits', {
    p_user_id: user.id,
    p_amount: 1,
  });

  if (rpcError) {
    console.error('[deduct-credits] RPC error:', rpcError);
    return NextResponse.json({ error: 'Failed to deduct credit' }, { status: 500 });
  }

  return NextResponse.json({ deducted: true });
}
