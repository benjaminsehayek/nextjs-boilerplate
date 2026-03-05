// Publish / unpublish a page
// POST /api/website-builder/pages/[pageId]/publish  { action: 'publish' | 'unpublish' }

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPublishChecklist } from '@/lib/websiteBuilder/publishChecklist';
import type { SitePage } from '@/types';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  action: z.enum(['publish', 'unpublish']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pageId } = await params;

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'action required: publish | unpublish' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Fetch page and verify ownership via business join
  const { data: pageRow, error: fetchError } = await (supabase as any)
    .from('site_pages')
    .select('*, businesses!inner(user_id)')
    .eq('id', pageId)
    .single();

  if (fetchError || !pageRow) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  if (pageRow.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (body.action === 'publish') {
    // Map DB type to SitePage type for checklist
    const page: SitePage = {
      ...pageRow,
      type: pageRow.type === 'blog' ? 'blog_post' : pageRow.type,
    };

    // Run publish checklist
    const checklist = runPublishChecklist(page);
    if (!checklist.passed) {
      return NextResponse.json({
        error: 'Publish blocked — resolve all blocking issues first',
        checklist,
      }, { status: 422 });
    }

    const { data: updated, error: updateError } = await (supabase as any)
      .from('site_pages')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', pageId)
      .select('id, slug, status, published_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Fire IndexNow ping (non-blocking)
    const domain = pageRow.businesses?.domain;
    if (domain) {
      pingIndexNow(domain, pageRow.slug).catch((e) =>
        console.warn('IndexNow ping failed:', e?.message)
      );
    }

    return NextResponse.json({ page: updated, checklist });
  } else {
    // Unpublish
    const { data: updated, error: updateError } = await (supabase as any)
      .from('site_pages')
      .update({ status: 'draft' })
      .eq('id', pageId)
      .select('id, slug, status')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ page: updated });
  }
}

// ── IndexNow helper ──────────────────────────────────────────────────────────

async function pingIndexNow(domain: string, slug: string): Promise<void> {
  const host = domain.replace(/^https?:\/\//, '').split('/')[0];
  const url = `https://${host}/${slug}`;
  const key = process.env.INDEXNOW_API_KEY;
  if (!key) return;

  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: [url],
    }),
  });
}
