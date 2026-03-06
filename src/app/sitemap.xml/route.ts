// Dynamic XML sitemap for published website-builder pages
// Served at /sitemap.xml on both the main app domain and custom business domains.
// On a custom domain, filters to that business's pages only.

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const APP_HOSTNAME = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost')
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '');

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildXml(
  entries: { loc: string; lastmod?: string }[],
): string {
  const items = entries
    .map(
      ({ loc, lastmod }) =>
        `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod.split('T')[0]}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const hostname = (request.headers.get('host') ?? '').replace(/^www\./, '').split(':')[0];
    const isMainDomain =
      hostname === APP_HOSTNAME || hostname === 'localhost' || hostname.endsWith('.vercel.app');

    let businessId: string | null = null;
    let baseUrl: string;

    if (!isMainDomain) {
      // Custom domain — filter to this business's pages
      const { data: domainRow } = await (supabase as any)
        .from('business_domains')
        .select('business_id')
        .eq('domain', hostname)
        .eq('dns_verified', true)
        .single();

      if (domainRow?.business_id) {
        businessId = domainRow.business_id;
        baseUrl = `https://${hostname}`;
      } else {
        return new NextResponse(buildXml([]), {
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      }
    } else {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${hostname}`;
    }

    // Fetch published pages
    let query = (supabase as any)
      .from('site_pages')
      .select('business_id, slug, updated_at, published_at, businesses!inner(domain, id)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50000);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data: pages, error } = await query;

    if (error || !pages) {
      console.error('[sitemap] query error:', error);
      return new NextResponse(buildXml([]), {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    const entries = (pages as any[]).map((p) => {
      let loc: string;
      if (!isMainDomain || businessId) {
        // Custom domain: strip /sites/{slug} prefix
        loc = `${baseUrl}/${p.slug}`;
      } else {
        // Main domain: full /sites/{businessSlug}/{slug} path
        const biz = p.businesses;
        const bizSlug = biz?.domain
          ? biz.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0]
          : biz?.id ?? 'unknown';
        loc = `${baseUrl}/sites/${bizSlug}/${p.slug}`;
      }
      return { loc, lastmod: p.updated_at ?? p.published_at };
    });

    const xml = buildXml(entries);

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[sitemap] error:', err);
    return new NextResponse(buildXml([]), {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
