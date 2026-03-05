// Blog generation using Project Library data + Claude
// POST /api/website-builder/generate-blog

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildBlogSlug } from '@/lib/websiteBuilder/slugs';
import { runPublishChecklist } from '@/lib/websiteBuilder/publishChecklist';
import type { BusinessProject } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BodySchema = z.object({
  businessId: z.string().uuid(),
  projectIds: z.array(z.string().uuid()).min(1).max(5),
  targetKeyword: z.string().optional().nullable(),
  customInstructions: z.string().max(1000).optional().nullable(),
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
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify business ownership
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id, name, phone, domain, industry')
    .eq('id', body.businessId)
    .eq('user_id', user.id)
    .single();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Fetch projects
  const { data: projects } = await (supabase as any)
    .from('business_projects')
    .select('*')
    .eq('business_id', body.businessId)
    .in('id', body.projectIds);

  if (!projects?.length) {
    return NextResponse.json({ error: 'No projects found' }, { status: 404 });
  }

  // Build a project context block
  const projectContext = (projects as BusinessProject[])
    .map((p, i) => `
Project ${i + 1}: ${p.job_type.toUpperCase()} — ${p.title ?? 'Untitled'}
Date: ${p.completed_date}${p.city ? ` | City: ${p.city}` : ''}
Problem: ${p.problem ?? 'N/A'}
Work Performed: ${p.work_performed}
Outcome: ${p.outcome ?? 'N/A'}
Equipment: ${p.equipment_used ?? 'N/A'}
Home Type: ${p.home_type ?? 'N/A'}
`.trim())
    .join('\n\n---\n\n');

  const keyword = body.targetKeyword ?? projects[0]?.work_performed?.split(' ').slice(0, 4).join(' ');

  const systemPrompt = `You are an expert local SEO content writer. You create engaging blog posts for local service businesses that showcase real completed work. Your posts must be informative, helpful, and rank in Google for local service keywords.`;

  const userPrompt = `Write an SEO blog post based on these real completed projects for ${biz.name}:

${projectContext}

${keyword ? `TARGET KEYWORD: ${keyword}\nInclude this keyword in the H1, first paragraph, and naturally throughout the post.` : ''}
${body.customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${body.customInstructions}` : ''}

REQUIREMENTS:
- Valid semantic HTML5 (no doctype/head/body — just article content)
- H1 as a compelling, keyword-rich title referencing the real work
- Structured H2 sections covering: what the problem was, what was done, outcome/results, tips for homeowners
- Reference specific real details from the projects (equipment, home type, city if provided)
- Include 3-5 FAQ items at the end relevant to the service topic
- Soft CTA mentioning ${biz.name} and phone: ${biz.phone ?? '[PHONE]'}
- Target 800–1200 words
- Authoritative but relatable tone — written from the company's perspective

On the FIRST lines of your response (before HTML):
META_TITLE: [60 chars max meta title]
META_DESC: [160 chars max meta description]

Then output the HTML.`;

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
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!claudeRes.ok) {
    return NextResponse.json({ error: 'Blog generation failed' }, { status: 502 });
  }

  const claudeData = await claudeRes.json();
  const fullText: string = claudeData.content?.[0]?.text ?? '';

  // Parse META lines
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

  const slug = buildBlogSlug(meta_title ?? keyword ?? 'project-spotlight');
  const title = meta_title ?? `${biz.name} Project Spotlight`;

  // Save as draft
  const { data: page, error: insertError } = await (supabase as any)
    .from('site_pages')
    .insert({
      business_id: body.businessId,
      slug,
      title,
      type: 'blog',
      html,
      meta_title,
      meta_description,
      status: 'draft',
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Mark projects as used
  await Promise.all(
    body.projectIds.map((projectId) =>
      (supabase as any).rpc('append_used_in_post', { project_id: projectId, post_id: page.id })
    )
  );

  const mappedPage = { ...page, type: 'blog_post' };
  const checklist = runPublishChecklist(mappedPage);

  return NextResponse.json({ page: mappedPage, checklist });
}
