// Custom domain management
// GET  /api/website-builder/domains?businessId=xxx
// POST /api/website-builder/domains { businessId, domain }

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateVerificationToken } from '@/lib/websiteBuilder/domainVerification';

export const dynamic = 'force-dynamic';

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 });
  }

  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { data: domains, error } = await (supabase as any)
    .from('business_domains')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ domains: domains ?? [] });
}

// ── POST ─────────────────────────────────────────────────────────────────────

const AddDomainSchema = z.object({
  businessId: z.string().uuid(),
  domain: z.string()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i, 'Invalid domain format'),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof AddDomainSchema>;
  try {
    const raw = await request.json();
    const parsed = AddDomainSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid domain', details: parsed.error.flatten() }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id')
    .eq('id', body.businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const normalizedDomain = body.domain.toLowerCase().replace(/^www\./, '');
  const token = generateVerificationToken();

  const { data: domain, error } = await (supabase as any)
    .from('business_domains')
    .insert({
      business_id: body.businessId,
      domain: normalizedDomain,
      verification_token: token,
      dns_verified: false,
      ssl_status: 'pending',
      check_attempts: 0,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Domain already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    domain,
    instructions: {
      txt_record: {
        name: `_scorchlocal-verify.${normalizedDomain}`,
        type: 'TXT',
        value: token,
        ttl: 3600,
      },
      cname_record: {
        name: normalizedDomain,
        type: 'CNAME',
        value: process.env.NEXT_PUBLIC_SERVING_CNAME ?? 'sites.scorchlocal.com',
        ttl: 3600,
      },
    },
  }, { status: 201 });
}
