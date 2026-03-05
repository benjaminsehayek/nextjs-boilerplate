// Project Library API — list and create completed job projects
// GET  /api/website-builder/projects?businessId=xxx
// POST /api/website-builder/projects

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

  const { data: projects, error } = await (supabase as any)
    .from('business_projects')
    .select('*')
    .eq('business_id', businessId)
    .order('completed_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: projects ?? [] });
}

// ── POST ─────────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  businessId: z.string().uuid(),
  job_type: z.enum(['installation', 'repair', 'maintenance', 'inspection', 'other']),
  title: z.string().max(200).optional().nullable(),
  problem: z.string().max(1000).optional().nullable(),
  work_performed: z.string().min(1).max(2000),
  outcome: z.string().max(500).optional().nullable(),
  equipment_used: z.string().max(500).optional().nullable(),
  home_type: z.string().max(100).optional().nullable(),
  completed_date: z.string(),
  city: z.string().max(100).optional().nullable(),
  service_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  market_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof CreateSchema>;
  try {
    const raw = await request.json();
    const parsed = CreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify ownership
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id')
    .eq('id', body.businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { data: project, error } = await (supabase as any)
    .from('business_projects')
    .insert({
      business_id: body.businessId,
      job_type: body.job_type,
      title: body.title ?? null,
      problem: body.problem ?? null,
      work_performed: body.work_performed,
      outcome: body.outcome ?? null,
      equipment_used: body.equipment_used ?? null,
      home_type: body.home_type ?? null,
      completed_date: body.completed_date,
      city: body.city ?? null,
      service_id: body.service_id ?? null,
      location_id: body.location_id ?? null,
      market_id: body.market_id ?? null,
      photo_urls: [],
      used_in_posts: [],
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
