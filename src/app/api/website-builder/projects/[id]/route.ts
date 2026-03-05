// Individual project CRUD
// PATCH  /api/website-builder/projects/[id]
// DELETE /api/website-builder/projects/[id]

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  job_type: z.enum(['installation', 'repair', 'maintenance', 'inspection', 'other']).optional(),
  title: z.string().max(200).nullable().optional(),
  problem: z.string().max(1000).nullable().optional(),
  work_performed: z.string().min(1).max(2000).optional(),
  outcome: z.string().max(500).nullable().optional(),
  equipment_used: z.string().max(500).nullable().optional(),
  home_type: z.string().max(100).nullable().optional(),
  completed_date: z.string().optional(),
  city: z.string().max(100).nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: z.infer<typeof PatchSchema>;
  try {
    const raw = await request.json();
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify ownership via business join
  const { data: existing } = await (supabase as any)
    .from('business_projects')
    .select('id, businesses!inner(user_id)')
    .eq('id', id)
    .single();

  if (!existing || existing.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: project, error } = await (supabase as any)
    .from('business_projects')
    .update(body)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await (supabase as any)
    .from('business_projects')
    .select('id, businesses!inner(user_id)')
    .eq('id', id)
    .single();

  if (!existing || existing.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { error } = await (supabase as any)
    .from('business_projects')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
