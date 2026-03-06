// Individual domain management
// DELETE /api/website-builder/domains/[id]

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { removeDomainFromVercel } from '@/lib/websiteBuilder/vercelDomains';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await (supabase as any)
    .from('business_domains')
    .select('id, domain, dns_verified, businesses!inner(user_id)')
    .eq('id', id)
    .single();

  if (!existing || existing.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  }

  // Remove from Vercel first (non-fatal — DB delete proceeds regardless)
  if (existing.dns_verified) {
    await removeDomainFromVercel(existing.domain);
  }

  const { error } = await (supabase as any)
    .from('business_domains')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
