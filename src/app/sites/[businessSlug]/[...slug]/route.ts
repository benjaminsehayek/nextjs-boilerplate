// Catch-all page serving route
// Serves published site pages at /sites/[businessSlug]/[...slug]
// In production, custom domains proxy here.

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ businessSlug: string; slug: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { businessSlug, slug } = await params;
  const pageSlug = slug.join('/');

  const supabase = await createClient();

  // Look up business by domain slug (we store a domain-derived slug)
  // businessSlug matches the business domain with dots replaced by dashes, or business.id
  const { data: biz } = await (supabase as any)
    .from('businesses')
    .select('id, name, domain, phone')
    .or(`domain.eq.${businessSlug},id.eq.${businessSlug}`)
    .single();

  if (!biz) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Fetch published page
  const { data: page } = await (supabase as any)
    .from('site_pages')
    .select('html, css, js, meta_title, meta_description, schema_json, title, type')
    .eq('business_id', biz.id)
    .eq('slug', pageSlug)
    .eq('status', 'published')
    .single();

  if (!page) {
    return new NextResponse('Page not found', { status: 404 });
  }

  const canonicalUrl = `${request.nextUrl.origin}/sites/${businessSlug}/${pageSlug}`;
  const metaTitle = page.meta_title ?? page.title ?? biz.name;
  const metaDescription = page.meta_description ?? `${biz.name} — ${biz.domain}`;

  const schemaTag = page.schema_json
    ? `<script type="application/ld+json">${page.schema_json}</script>`
    : '';

  const cssTag = page.css
    ? `<style>${page.css}</style>`
    : '';

  // Base CSS reset for all pages
  const baseStyles = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; }
      img { max-width: 100%; height: auto; }
      a { color: inherit; }
      h1,h2,h3,h4 { line-height: 1.2; margin-bottom: 0.75rem; }
      p { margin-bottom: 1rem; }
      ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
    </style>
  `.trim();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  ${baseStyles}
  ${cssTag}
  ${schemaTag}
</head>
<body>
  ${page.html}
  ${page.js ? `<script>${page.js}</script>` : ''}
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Cache for 10 minutes on CDN, revalidate on next request
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
