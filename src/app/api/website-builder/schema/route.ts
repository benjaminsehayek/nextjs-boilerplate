// Schema.org JSON-LD generation
// POST /api/website-builder/schema

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildSchemaPrompt } from '@/lib/websiteBuilder/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BodySchema = z.object({
  pageId: z.string().uuid(),
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
      return NextResponse.json({ error: 'pageId required' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Fetch page with business data
  const { data: pageRow } = await (supabase as any)
    .from('site_pages')
    .select('*, businesses!inner(user_id, name, phone, domain)')
    .eq('id', body.pageId)
    .single();

  if (!pageRow) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  if (pageRow.businesses.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Extract location from slug or title
  const cityMatch = pageRow.title?.match(/in ([^,]+),\s*([A-Z]{2})/i);
  const city = cityMatch?.[1] ?? pageRow.businesses.city ?? null;
  const state = cityMatch?.[2] ?? pageRow.businesses.state ?? null;

  const prompt = buildSchemaPrompt(
    pageRow.title ?? pageRow.slug,
    pageRow.type,
    pageRow.businesses.name,
    city,
    state,
    pageRow.businesses.phone,
    pageRow.businesses.domain,
  );

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!claudeRes.ok) {
    return NextResponse.json({ error: 'Schema generation failed' }, { status: 502 });
  }

  const claudeData = await claudeRes.json();
  const rawJson: string = claudeData.content?.[0]?.text ?? '';

  // Validate JSON
  try {
    JSON.parse(rawJson);
  } catch {
    return NextResponse.json({ error: 'Generated schema is not valid JSON', raw: rawJson }, { status: 500 });
  }

  // Save to page
  const { error: updateError } = await (supabase as any)
    .from('site_pages')
    .update({ schema_json: rawJson })
    .eq('id', body.pageId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ schema_json: rawJson });
}
