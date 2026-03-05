// Individual page CRUD
// GET    /api/website-builder/pages/[pageId]
// PATCH  /api/website-builder/pages/[pageId]
// DELETE /api/website-builder/pages/[pageId]

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPublishChecklist } from '@/lib/websiteBuilder/publishChecklist';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ pageId: string }> };

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pageId } = await params;

  const { data: pageRow, error } = await (supabase as any)
    .from('site_pages')
    .select('*, businesses!inner(user_id)')
    .eq('id', pageId)
    .single();

  if (error || !pageRow) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  if (pageRow.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const page = { ...pageRow, type: pageRow.type === 'blog' ? 'blog_post' : pageRow.type };
  const checklist = runPublishChecklist(page);

  return NextResponse.json({ page, checklist });
}

// ── PATCH (partial update) ───────────────────────────────────────────────────

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  html: z.string().optional(),
  css: z.string().nullable().optional(),
  js: z.string().nullable().optional(),
  meta_title: z.string().max(60).nullable().optional(),
  meta_description: z.string().max(160).nullable().optional(),
  schema_json: z.string().nullable().optional(),
  slug: z.string().min(1).max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pageId } = await params;

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

  // Verify ownership
  const { data: existing } = await (supabase as any)
    .from('site_pages')
    .select('id, businesses!inner(user_id)')
    .eq('id', pageId)
    .single();

  if (!existing || existing.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const { data: page, error: updateError } = await (supabase as any)
    .from('site_pages')
    .update(body)
    .eq('id', pageId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const mapped = { ...page, type: page.type === 'blog' ? 'blog_post' : page.type };
  return NextResponse.json({ page: mapped, checklist: runPublishChecklist(mapped) });
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pageId } = await params;

  const { data: existing } = await (supabase as any)
    .from('site_pages')
    .select('id, status, businesses!inner(user_id)')
    .eq('id', pageId)
    .single();

  if (!existing || existing.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  if (existing.status === 'published') {
    return NextResponse.json({ error: 'Unpublish the page before deleting' }, { status: 409 });
  }

  const { error: deleteError } = await (supabase as any)
    .from('site_pages')
    .delete()
    .eq('id', pageId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
