import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  businessId: z.string().uuid(),
});

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

  // Load token for revocation — RLS enforces ownership
  const { data: conn } = await (supabase as any)
    .from('platform_connections')
    .select('access_token')
    .eq('business_id', body.businessId)
    .eq('platform', 'search_console')
    .single();

  // Best-effort revoke with Google (non-fatal if it fails)
  if (conn?.access_token) {
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(conn.access_token)}`,
        { method: 'POST' },
      );
    } catch {
      // Non-fatal — delete from DB regardless
    }
  }

  // Remove connection record
  const { error: deleteError } = await (supabase as any)
    .from('platform_connections')
    .delete()
    .eq('business_id', body.businessId)
    .eq('platform', 'search_console');

  if (deleteError) {
    console.error('[GSC disconnect] DB delete error:', deleteError.message);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
