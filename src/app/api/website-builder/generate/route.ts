// Single-page generation API route
// POST /api/website-builder/generate

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildPagePrompt, buildSchemaPrompt, PAGE_SYSTEM_PROMPT } from '@/lib/websiteBuilder/prompts';
import { buildLocationServiceSlug, buildBlogSlug, buildFoundationSlug, buildCitySlug } from '@/lib/websiteBuilder/slugs';
import { runPublishChecklist } from '@/lib/websiteBuilder/publishChecklist';
import type { SitePage } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const GenerateSchema = z.object({
  businessId: z.string().uuid(),
  pageType: z.enum(['location_service', 'city_landing', 'blog_post', 'foundation', 'website_addition']),
  service: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  targetKeyword: z.string().optional().nullable(),
  customInstructions: z.string().max(2000).optional().nullable(),
  /** For website_addition: re-generate an existing page */
  existingPageId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof GenerateSchema>;
  try {
    const raw = await request.json();
    const parsed = GenerateSchema.safeParse(raw);
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
    .select('id, name, phone, domain')
    .eq('id', body.businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Optionally fetch existing page HTML for website_addition
  let existingHtml: string | undefined;
  if (body.existingPageId) {
    const { data: existingPage } = await (supabase as any)
      .from('site_pages')
      .select('html')
      .eq('id', body.existingPageId)
      .eq('business_id', body.businessId)
      .single();
    existingHtml = existingPage?.html;
  }

  // Build prompt
  const userPrompt = buildPagePrompt({
    businessName: biz.name,
    phone: biz.phone,
    domain: biz.domain,
    pageType: body.pageType,
    service: body.service,
    city: body.city,
    state: body.state,
    targetKeyword: body.targetKeyword,
    customInstructions: body.customInstructions,
    existingHtml,
  });

  // Call Claude
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.7,
      system: PAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    console.error('Claude API error:', claudeRes.status, errText);
    return NextResponse.json({ error: `Generation failed: ${claudeRes.status}` }, { status: 502 });
  }

  const claudeData = await claudeRes.json();
  const fullText: string = claudeData.content?.[0]?.text ?? '';

  // Parse META_ lines from response
  let meta_title: string | null = null;
  let meta_description: string | null = null;
  let html = fullText;

  const lines = fullText.split('\n');
  let htmlStartIndex = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith('META_TITLE:')) {
      meta_title = line.replace('META_TITLE:', '').trim().slice(0, 60);
      htmlStartIndex = i + 1;
    } else if (line.startsWith('META_DESC:')) {
      meta_description = line.replace('META_DESC:', '').trim().slice(0, 160);
      htmlStartIndex = i + 1;
    } else if (line === '' && htmlStartIndex > 0) {
      htmlStartIndex = i + 1;
    } else if (htmlStartIndex > 0) {
      break;
    }
  }
  if (htmlStartIndex > 0) {
    html = lines.slice(htmlStartIndex).join('\n').trim();
  }

  // Build slug
  let slug: string;
  switch (body.pageType) {
    case 'location_service':
      slug = buildLocationServiceSlug(body.city ?? 'location', body.state ?? '', body.service ?? 'service');
      break;
    case 'city_landing':
      slug = buildCitySlug(body.city ?? 'location', body.state ?? '');
      break;
    case 'blog_post':
      slug = buildBlogSlug(meta_title ?? body.service ?? 'post');
      break;
    case 'foundation':
    case 'website_addition':
      slug = buildFoundationSlug(body.service ?? 'page');
      break;
    default:
      slug = buildFoundationSlug(body.service ?? 'page');
  }

  const title = meta_title ?? `${body.service ?? ''} ${body.city ? `in ${body.city}, ${body.state}` : ''}`.trim();

  // Map blog_post → blog for DB CHECK constraint
  const dbType = body.pageType === 'blog_post' ? 'blog' : body.pageType;

  // Auto-generate Schema.org JSON-LD (best-effort, uses fast Haiku model)
  let schema_json: string | null = null;
  try {
    const schemaPrompt = buildSchemaPrompt(
      title,
      body.pageType,
      biz.name,
      body.city ?? null,
      body.state ?? null,
      biz.phone,
      biz.domain ?? '',
    );
    const schemaRes = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{ role: 'user', content: schemaPrompt }],
      }),
    });
    if (schemaRes.ok) {
      const schemaData = await schemaRes.json();
      const rawSchema: string = schemaData.content?.[0]?.text ?? '';
      JSON.parse(rawSchema); // validate — throws if invalid JSON
      schema_json = rawSchema;
    }
  } catch {
    // Schema gen is best-effort; user can regenerate manually from the sidebar
  }

  // Save as draft
  const { data: page, error: insertError } = await (supabase as any)
    .from('site_pages')
    .insert({
      business_id: body.businessId,
      slug,
      title,
      type: dbType,
      html,
      meta_title,
      meta_description,
      schema_json,
      status: 'draft',
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('site_pages insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Map DB type back for response
  const responsePage: SitePage = {
    ...page,
    type: body.pageType,
  };

  // Run checklist on the new draft
  const checklist = runPublishChecklist(responsePage);

  return NextResponse.json({ page: responsePage, checklist });
}
