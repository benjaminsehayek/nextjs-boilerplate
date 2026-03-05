// SERP Content Context — fetches top-ranking page structure via Jina Reader
//
// Cache table SQL — run in Supabase SQL editor:
// CREATE TABLE serp_context_cache (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   keyword text NOT NULL UNIQUE,
//   data jsonb NOT NULL,
//   fetched_at timestamptz DEFAULT now()
// );

import type { SerpContentContext } from '@/types';

// ── Extract structure from Jina markdown ────────────────────────────────────

interface PageStructure {
  url: string;
  title: string;
  h2s: string[];
  wordCount: number;
  hasFAQ: boolean;
  hasVideo: boolean;
  schemaTypes: string[];
}

function extractStructure(markdown: string, url: string): PageStructure {
  // Extract title from first # heading or first line
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? url;

  // Extract H2s
  const h2Regex = /^##\s+(.+)$/gm;
  const h2s: string[] = [];
  let match;
  while ((match = h2Regex.exec(markdown)) !== null) {
    h2s.push(match[1].trim());
  }

  // Word count (strip markdown formatting)
  const plainText = markdown
    .replace(/[#*_\[\]()>`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = plainText.split(' ').filter(Boolean).length;

  // Check for FAQ section
  const hasFAQ = /faq|frequently\s+asked|common\s+questions/i.test(markdown);

  // Check for video embeds
  const hasVideo = /youtube|vimeo|video|iframe/i.test(markdown);

  // Check for schema types (from JSON-LD blocks if present)
  const schemaTypes: string[] = [];
  const schemaRegex = /"@type"\s*:\s*"([^"]+)"/g;
  let schemaMatch;
  while ((schemaMatch = schemaRegex.exec(markdown)) !== null) {
    schemaTypes.push(schemaMatch[1]);
  }

  return { url, title, h2s, wordCount, hasFAQ, hasVideo, schemaTypes };
}

// ── Fetch a single page via Jina Reader ─────────────────────────────────────

async function fetchViaJina(url: string): Promise<PageStructure | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: { Accept: 'text/markdown' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const markdown = await res.text();
    return extractStructure(markdown, url);
  } catch {
    return null;
  }
}

// ── Main fetch function ─────────────────────────────────────────────────────

export async function fetchSerpContentContext(
  keyword: string,
  topUrls?: string[],
  peopleAlsoAsk?: string[],
): Promise<SerpContentContext> {
  // If no URLs provided, we can't fetch — return empty context
  const urls = (topUrls ?? []).slice(0, 3);
  const paa = peopleAlsoAsk ?? [];

  // Fetch top 3 pages in parallel via Jina
  const pageResults = await Promise.all(urls.map((url) => fetchViaJina(url)));
  const topPages = pageResults.filter((p): p is PageStructure => p !== null);

  // Calculate aggregate stats
  const avgWordCount =
    topPages.length > 0
      ? Math.round(topPages.reduce((s, p) => s + p.wordCount, 0) / topPages.length)
      : 1200;

  // Union of all H2 topics across top pages
  const allH2s = topPages.flatMap((p) => p.h2s);
  const topicsToInclude = [...new Set(allH2s)];

  // Topics that appear in the #1 page but not in others → differentiation opportunity
  const topicsThatDifferentiate: string[] = [];
  if (topPages.length >= 2) {
    const firstPageH2s = new Set(topPages[0].h2s.map((h) => h.toLowerCase()));
    const otherH2s = new Set(
      topPages.slice(1).flatMap((p) => p.h2s.map((h) => h.toLowerCase()))
    );
    for (const h2 of firstPageH2s) {
      if (!otherH2s.has(h2)) {
        // Find original casing
        const original = topPages[0].h2s.find((o) => o.toLowerCase() === h2);
        if (original) topicsThatDifferentiate.push(original);
      }
    }
  }

  return {
    keyword,
    topPages,
    peopleAlsoAsk: paa,
    avgWordCount,
    topicsToInclude,
    topicsThatDifferentiate,
  };
}

// ── Cache helpers (Supabase) ────────────────────────────────────────────────

const CACHE_TTL_DAYS = 7;

export async function getCachedSerpContext(
  supabase: any,
  keyword: string,
): Promise<SerpContentContext | null> {
  const { data } = await supabase
    .from('serp_context_cache')
    .select('data, fetched_at')
    .eq('keyword', keyword.toLowerCase().trim())
    .single();

  if (!data) return null;

  const fetchedAt = new Date(data.fetched_at).getTime();
  const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - fetchedAt > ttlMs) return null;

  return data.data as SerpContentContext;
}

export async function setCachedSerpContext(
  supabase: any,
  keyword: string,
  context: SerpContentContext,
): Promise<void> {
  await supabase
    .from('serp_context_cache')
    .upsert(
      {
        keyword: keyword.toLowerCase().trim(),
        data: context,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'keyword' }
    );
}

// ── Prompt block builder ────────────────────────────────────────────────────

export function buildSerpContextBlock(context: SerpContentContext): string {
  const lines: string[] = [
    `SERP ANALYSIS — what currently ranks for "${context.keyword}":`,
    '',
  ];

  if (context.topPages.length > 0) {
    lines.push(`Top ${context.topPages.length} ranking pages average ${context.avgWordCount} words.`);
    lines.push('');

    lines.push('Topics covered by ranking pages (you MUST cover these):');
    for (const topic of context.topicsToInclude.slice(0, 12)) {
      lines.push(`  - ${topic}`);
    }
    lines.push('');

    if (context.topicsThatDifferentiate.length > 0) {
      lines.push('Differentiation opportunities (topics only the #1 page covers — include these for an edge):');
      for (const topic of context.topicsThatDifferentiate.slice(0, 5)) {
        lines.push(`  - ${topic}`);
      }
      lines.push('');
    }
  }

  if (context.peopleAlsoAsk.length > 0) {
    lines.push('People Also Ask questions (include answers to at least 2 of these in your FAQ section):');
    for (const q of context.peopleAlsoAsk.slice(0, 6)) {
      lines.push(`  - ${q}`);
    }
    lines.push('');
  }

  lines.push(
    `Target word count: ${Math.max(context.avgWordCount, 800)}+ words (match or exceed what ranks).`,
  );

  return lines.join('\n');
}
