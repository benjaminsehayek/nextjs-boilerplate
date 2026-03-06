// Domain verification check
// POST /api/website-builder/domains/verify { domainId }

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyDomainTxt } from '@/lib/websiteBuilder/domainVerification';
import { addDomainToVercel } from '@/lib/websiteBuilder/vercelDomains';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BodySchema = z.object({
  domainId: z.string().uuid(),
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
      return NextResponse.json({ error: 'domainId required' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Fetch domain and verify ownership
  const { data: domainRow } = await (supabase as any)
    .from('business_domains')
    .select('*, businesses!inner(user_id)')
    .eq('id', body.domainId)
    .single();

  if (!domainRow) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  }

  if (domainRow.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Increment check attempts
  await (supabase as any)
    .from('business_domains')
    .update({ last_checked_at: new Date().toISOString(), check_attempts: domainRow.check_attempts + 1 })
    .eq('id', body.domainId);

  // Run DNS verification
  const verified = await verifyDomainTxt(domainRow.domain, domainRow.verification_token);

  if (verified) {
    // Register domain with Vercel so it routes traffic to this deployment
    const vercelResult = await addDomainToVercel(domainRow.domain);

    await (supabase as any)
      .from('business_domains')
      .update({
        dns_verified: true,
        dns_verified_at: new Date().toISOString(),
        // ssl_status reflects whether Vercel accepted the domain
        ssl_status: vercelResult.ok ? 'provisioning' : 'failed',
      })
      .eq('id', body.domainId);

    if (!vercelResult.ok) {
      return NextResponse.json({
        verified: true,
        warning: `DNS verified but Vercel domain registration failed: ${vercelResult.error}. Contact support.`,
      });
    }

    return NextResponse.json({
      verified: true,
      message: 'Domain verified and registered. SSL provisioning will begin shortly.',
    });
  }

  return NextResponse.json({
    verified: false,
    message: 'TXT record not found yet. DNS changes can take up to 24 hours to propagate.',
  });
}
