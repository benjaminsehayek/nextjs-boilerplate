import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';
import pLimit from 'p-limit';
import {
  fetchLocationEnrichment,
  getCachedEnrichment,
  setCachedEnrichment,
  buildLocationEnrichmentBlock,
} from '@/lib/websiteBuilder/locationEnrichment';
import {
  fetchSerpContentContext,
  getCachedSerpContext,
  setCachedSerpContext,
  buildSerpContextBlock,
} from '@/lib/websiteBuilder/serpContext';
import { checkBulkSimilarity } from '@/lib/websiteBuilder/similarityCheck';
import { buildSchemaPrompt } from '@/lib/websiteBuilder/prompts';
import type {
  BusinessLocation,
  Service,
  Market,
  LocationEnrichment,
  SerpContentContext,
  SimilarityIssue,
} from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for bulk generation

const BodySchema = z.object({
  businessId: z.string().uuid(),
  marketId: z.string().uuid().optional(),
});

// ── Slug helper ─────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Claude generation for a single page ─────────────────────────────────────

async function generateLocationPageHtml(
  service: Service,
  location: BusinessLocation,
  market: Market | undefined,
  business: { name: string; phone: string | null; domain: string },
  enrichmentBlock: string,
  serpBlock: string,
  keywordAssignment: string | null,
): Promise<{ html: string; meta_title: string; meta_description: string }> {
  const city = location.city;
  const state = location.state;
  const serviceName = service.name;

  const systemPrompt = `You are an expert local SEO content writer. You create location service pages for local businesses that rank in Google and convert visitors into customers. Every page must be unique — not a city-name-swapped template.`;

  const userPrompt = `Write a location service page for:
Business: ${business.name}
Service: ${serviceName}
Location: ${city}, ${state}
Phone: ${location.phone || business.phone || 'N/A'}
Address: ${location.address || 'N/A'}
${market ? `Market area: ${market.name} (cities: ${market.cities.join(', ')})` : ''}
${keywordAssignment ? `\nPRIMARY KEYWORD: ${keywordAssignment}\nTarget this keyword in H1, meta title, first paragraph, and throughout content.` : ''}

${enrichmentBlock}

${serpBlock}

UNIQUENESS REQUIREMENTS — this page must be meaningfully different from other location pages:
- Reference at least one local landmark, neighbourhood, or geographic feature specific to ${city}
- Include service-area-specific detail (e.g., local climate, typical home types in ${city})
- The FAQ section must contain at least 2 questions specific to ${city} (not generic)
- Every section must contain ${city}-specific context, not just a city-name substitution

OUTPUT REQUIREMENTS:
- Output valid semantic HTML5 only (no doctype, no head, no body tags — just the page content)
- Include an H1 tag with "${serviceName} in ${city}, ${state}" (or natural variation)
- Include H2 sections for: services overview, local context, process/what to expect, FAQ, CTA
- Include a FAQ section with 4-6 questions using proper HTML structure
- Include a strong CTA section with the phone number
- Target 800-1500 words of content
- Do NOT include any CSS or JavaScript

Also output on the FIRST line of your response (before HTML):
META_TITLE: [60 chars max meta title targeting the primary keyword]
META_DESC: [160 chars max meta description with CTA]

Then output the HTML starting from the second line.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const fullText: string = data.content?.[0]?.text ?? '';

  // Parse meta title and description from first lines
  let meta_title = `${serviceName} in ${city}, ${state} | ${business.name}`;
  let meta_description = `Professional ${serviceName.toLowerCase()} services in ${city}, ${state}. Call ${business.phone || 'us'} today.`;
  let html = fullText;

  const lines = fullText.split('\n');
  const metaLines: string[] = [];
  let htmlStartIndex = 0;

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith('META_TITLE:')) {
      meta_title = line.replace('META_TITLE:', '').trim().slice(0, 60);
      metaLines.push(line);
      htmlStartIndex = i + 1;
    } else if (line.startsWith('META_DESC:')) {
      meta_description = line.replace('META_DESC:', '').trim().slice(0, 160);
      metaLines.push(line);
      htmlStartIndex = i + 1;
    } else if (line === '' && metaLines.length > 0) {
      htmlStartIndex = i + 1;
    } else {
      break;
    }
  }

  if (metaLines.length > 0) {
    html = lines.slice(htmlStartIndex).join('\n').trim();
  }

  return { html, meta_title, meta_description };
}

// ── Main route handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`generate-batch:${user.id}`, 3, 300_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — try again in a few minutes' }, { status: 429 });
  }

  // Subscription gate — bulk generation requires marketing tier or higher
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier ?? 'free';
  const ALLOWED_TIERS = new Set(['marketing', 'growth']);
  if (!ALLOWED_TIERS.has(tier)) {
    return NextResponse.json(
      { error: 'Bulk generation requires a Marketing or Growth plan. Upgrade in Billing.' },
      { status: 403 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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

  // Load all locations, services, markets
  const [locRes, svcRes, mktRes] = await Promise.all([
    (supabase as any)
      .from('business_locations')
      .select('*')
      .eq('business_id', body.businessId),
    (supabase as any)
      .from('services')
      .select('*')
      .eq('business_id', body.businessId)
      .eq('is_enabled', true),
    (supabase as any)
      .from('markets')
      .select('*')
      .eq('business_id', body.businessId),
  ]);

  const locations: BusinessLocation[] = locRes.data ?? [];
  const services: Service[] = svcRes.data ?? [];
  const markets: Market[] = mktRes.data ?? [];

  if (locations.length === 0) {
    return NextResponse.json({ error: 'No locations found for this business' }, { status: 400 });
  }
  if (services.length === 0) {
    return NextResponse.json({ error: 'No enabled services found for this business' }, { status: 400 });
  }

  // Filter by market if provided
  let filteredLocations = locations;
  if (body.marketId) {
    const market = markets.find((m) => m.id === body.marketId);
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }
    filteredLocations = locations.filter((loc) =>
      market.cities.some((c) => c.toLowerCase() === loc.city.toLowerCase())
    );
    if (filteredLocations.length === 0) {
      return NextResponse.json(
        { error: 'No locations found in this market' },
        { status: 400 }
      );
    }
  }

  // Load keyword assignments (anti-cannibalization) from most recent content strategy
  const { data: strategyData } = await (supabase as any)
    .from('content_strategies')
    .select('keywords')
    .eq('business_id', body.businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const keywordMap = new Map<string, string>(); // "city-service" => keyword
  if (strategyData?.keywords) {
    try {
      const keywords = Array.isArray(strategyData.keywords)
        ? strategyData.keywords
        : [];
      for (const kw of keywords) {
        if (kw.keyword && kw.city && kw.service) {
          keywordMap.set(
            `${kw.city.toLowerCase()}-${kw.service.toLowerCase()}`,
            kw.keyword
          );
        }
      }
    } catch {
      // Keyword data may not be in expected format — continue without it
    }
  }

  // Build the matrix: locations x services
  const matrix = filteredLocations.flatMap((loc) =>
    services.map((svc) => ({ location: loc, service: svc }))
  );

  // Pre-compute all slugs and titles for internal linking
  const allPageMeta = matrix.map(({ location, service }) => ({
    slug: `${toSlug(location.city)}-${toSlug(location.state)}/${toSlug(service.name)}`,
    title: `${service.name} in ${location.city}, ${location.state}`,
    city: location.city,
    state: location.state,
    serviceName: service.name,
  }));

  function getRelatedPages(
    city: string,
    state: string,
    serviceName: string,
  ): { slug: string; title: string }[] {
    // Same city, other services (up to 3)
    const sameCity = allPageMeta
      .filter((p) => p.city === city && p.state === state && p.serviceName !== serviceName)
      .slice(0, 3);
    // Same service, other cities (up to 3)
    const sameService = allPageMeta
      .filter((p) => p.serviceName === serviceName && (p.city !== city || p.state !== state))
      .slice(0, 3);
    return [...sameCity, ...sameService];
  }

  function injectRelatedLinks(
    html: string,
    businessSlug: string,
    related: { slug: string; title: string }[],
  ): string {
    if (related.length === 0) return html;
    const items = related
      .map((r) => `<li><a href="/sites/${businessSlug}/${r.slug}">${r.title}</a></li>`)
      .join('\n');
    return (
      html +
      `\n<section>\n<h2>Related Services</h2>\n<ul>\n${items}\n</ul>\n</section>`
    );
  }

  // Derive a stable business slug from domain or id
  const businessSlug = biz.domain
    ? biz.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0]
    : biz.id;

  // Pre-fetch enrichment for unique locations (deduplicated by lat/lng bucket)
  const enrichmentCache = new Map<string, LocationEnrichment>();
  const uniqueLocations = new Map<string, BusinessLocation>();
  for (const loc of filteredLocations) {
    if (loc.latitude && loc.longitude) {
      const key = `${Math.round(loc.latitude * 100)},${Math.round(loc.longitude * 100)}`;
      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, loc);
      }
    }
  }

  // Fetch enrichment in parallel (limited concurrency)
  const enrichLimit = pLimit(3);
  await Promise.all(
    [...uniqueLocations.entries()].map(([key, loc]) =>
      enrichLimit(async () => {
        // Check DB cache first
        const cached = await getCachedEnrichment(supabase, loc.latitude!, loc.longitude!);
        if (cached) {
          enrichmentCache.set(key, cached);
          return;
        }
        const enrichment = await fetchLocationEnrichment(
          loc.latitude!,
          loc.longitude!,
          loc.city,
          loc.state
        );
        enrichmentCache.set(key, enrichment);
        await setCachedEnrichment(supabase, loc.latitude!, loc.longitude!, enrichment);
      })
    )
  );

  // Generate pages with concurrency limit
  const generateLimit = pLimit(3);
  const results: { id: string; slug: string; title: string }[] = [];
  const errors: { slug: string; error: string }[] = [];
  const generatedPages: { slug: string; html: string }[] = [];

  await Promise.all(
    matrix.map(({ location, service }) =>
      generateLimit(async () => {
        const slug = `${toSlug(location.city)}-${toSlug(location.state)}/${toSlug(service.name)}`;
        const title = `${service.name} in ${location.city}, ${location.state}`;

        try {
          // Get enrichment
          let enrichmentBlock = '';
          if (location.latitude && location.longitude) {
            const key = `${Math.round(location.latitude * 100)},${Math.round(location.longitude * 100)}`;
            const enrichment = enrichmentCache.get(key);
            if (enrichment) {
              enrichmentBlock = buildLocationEnrichmentBlock(enrichment, service.name);
            }
          }

          // Get SERP context (check cache, fetch if needed)
          const serpKeyword = `${service.name} ${location.city} ${location.state}`;
          let serpContext: SerpContentContext | null = await getCachedSerpContext(
            supabase,
            serpKeyword
          );
          if (!serpContext) {
            serpContext = await fetchSerpContentContext(serpKeyword);
            await setCachedSerpContext(supabase, serpKeyword, serpContext);
          }
          const serpBlock = buildSerpContextBlock(serpContext);

          // Get keyword assignment
          const kwKey = `${location.city.toLowerCase()}-${service.name.toLowerCase()}`;
          const keywordAssignment = keywordMap.get(kwKey) ?? null;

          // Find market for this location
          const market = markets.find((m) =>
            m.cities.some((c) => c.toLowerCase() === location.city.toLowerCase())
          );

          // Generate with Claude
          const { html: rawHtml, meta_title, meta_description } =
            await generateLocationPageHtml(
              service,
              location,
              market,
              biz,
              enrichmentBlock,
              serpBlock,
              keywordAssignment
            );

          // Inject internal links to related location/service pages
          const related = getRelatedPages(location.city, location.state, service.name);
          const html = injectRelatedLinks(rawHtml, businessSlug, related);

          // Auto-generate Schema.org JSON-LD (best-effort, uses Haiku)
          let schema_json: string | null = null;
          try {
            const schemaPrompt = buildSchemaPrompt(
              title,
              'location_service',
              biz.name,
              location.city,
              location.state,
              location.phone || biz.phone,
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
              JSON.parse(rawSchema);
              schema_json = rawSchema;
            }
          } catch {
            // Best-effort — continue without schema
          }

          // Save as draft
          const { data: page, error: insertError } = await (supabase as any)
            .from('site_pages')
            .insert({
              business_id: body.businessId,
              location_id: location.id,
              market_id: market?.id ?? null,
              service_id: service.id,
              slug,
              title,
              type: 'location_service',
              html,
              meta_title,
              meta_description,
              schema_json,
              status: 'draft',
            })
            .select('id, slug, title')
            .single();

          if (insertError) {
            errors.push({ slug, error: insertError.message });
          } else if (page) {
            results.push(page);
            generatedPages.push({ slug: page.slug, html });
          }
        } catch (err: any) {
          errors.push({ slug, error: err?.message ?? 'Unknown generation error' });
        }
      })
    )
  );

  // Run similarity check on all generated pages
  const similarityIssues: SimilarityIssue[] =
    generatedPages.length > 1 ? checkBulkSimilarity(generatedPages) : [];

  return NextResponse.json({
    generated: results.length,
    drafts: results,
    errors: errors.length > 0 ? errors : undefined,
    similarityIssues: similarityIssues.length > 0 ? similarityIssues : undefined,
  });
}
