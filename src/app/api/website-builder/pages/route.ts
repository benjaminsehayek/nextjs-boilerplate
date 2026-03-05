// Pages CRUD — GET list, POST create (manual/blank)
// GET  /api/website-builder/pages?businessId=xxx
// POST /api/website-builder/pages

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ── GET: list pages for a business ──────────────────────────────────────────

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

  // Verify ownership
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { data: pages, error } = await (supabase as any)
    .from('site_pages')
    .select('id, slug, title, type, status, meta_title, meta_description, schema_json, published_at, created_at, updated_at')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map DB 'blog' type back to 'blog_post' for UI consistency
  const mapped = (pages ?? []).map((p: any) => ({
    ...p,
    type: p.type === 'blog' ? 'blog_post' : p.type,
  }));

  return NextResponse.json({ pages: mapped });
}

// ── POST: save page (create or full replace) ─────────────────────────────────

const SaveSchema = z.object({
  businessId: z.string().uuid(),
  id: z.string().uuid().optional(),  // if present = update existing
  slug: z.string().min(1).max(500),
  title: z.string().min(1).max(200),
  type: z.enum(['location_service', 'city_landing', 'blog_post', 'foundation', 'website_addition']),
  html: z.string(),
  css: z.string().optional().nullable(),
  js: z.string().optional().nullable(),
  meta_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
  schema_json: z.string().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  market_id: z.string().uuid().optional().nullable(),
  service_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof SaveSchema>;
  try {
    const raw = await request.json();
    const parsed = SaveSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
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

  const dbType = body.type === 'blog_post' ? 'blog' : body.type;

  const payload = {
    business_id: body.businessId,
    slug: body.slug,
    title: body.title,
    type: dbType,
    html: body.html,
    css: body.css ?? null,
    js: body.js ?? null,
    meta_title: body.meta_title ?? null,
    meta_description: body.meta_description ?? null,
    schema_json: body.schema_json ?? null,
    location_id: body.location_id ?? null,
    market_id: body.market_id ?? null,
    service_id: body.service_id ?? null,
  };

  let page: any;
  let error: any;

  if (body.id) {
    // Update existing — verify ownership via business_id
    ({ data: page, error } = await (supabase as any)
      .from('site_pages')
      .update(payload)
      .eq('id', body.id)
      .eq('business_id', body.businessId)
      .select('*')
      .single());
  } else {
    ({ data: page, error } = await (supabase as any)
      .from('site_pages')
      .insert({ ...payload, status: 'draft' })
      .select('*')
      .single());
  }

  if (error) {
    console.error('site_pages save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    page: { ...page, type: page.type === 'blog' ? 'blog_post' : page.type },
  });
}
