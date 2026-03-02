import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildSeedKeywords,
  competitionTier,
  type EnrichedKeyword,
  type SiteAuditKeyword,
} from '@/lib/contentStrategy/keywordResearch';

export const maxDuration = 60;

const DFS_BASE = 'https://api.dataforseo.com';
const DFS_AUTH = () =>
  Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString('base64');

async function dfsPost<T = any>(endpoint: string, body: unknown[]): Promise<T> {
  const res = await fetch(`${DFS_BASE}/v3/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${DFS_AUTH()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DataForSEO ${endpoint} error ${res.status}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    industry?: string;
    city?: string;
    locations?: string[];
    siteAuditKeywords?: SiteAuditKeyword[];
    businessName?: string;
  };

  const industry = body.industry ?? '';
  const city = body.city ?? '';
  const locations = body.locations?.length ? body.locations : city ? [city] : [];
  const siteAuditKeywords: SiteAuditKeyword[] = body.siteAuditKeywords ?? [];

  const hasDfsCredentials = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  // ── Step 1: Seed keywords ──────────────────────────────────────────
  const seeds = buildSeedKeywords(industry, locations);

  // ── Step 2: External keyword discovery ────────────────────────────
  const externalKeywords: Array<{
    keyword: string;
    volume: number;
    cpc: number | null;
    competition: number | null;
  }> = [];

  if (hasDfsCredentials && seeds.length > 0) {
    try {
      const seedBodies = seeds.map(seed => ({
        keyword: seed,
        language_code: 'en',
        location_code: 2840, // United States
        depth: 1,
        limit: 35,
        filters: [['keyword_data.keyword_info.search_volume', '>', 50]],
      }));

      const dfsRes = await dfsPost('dataforseo_labs/google/related_keywords/live', seedBodies);

      for (const task of dfsRes?.tasks ?? []) {
        for (const result of task?.result ?? []) {
          for (const item of result?.items ?? []) {
            const kd = item?.keyword_data;
            if (!kd?.keyword) continue;
            externalKeywords.push({
              keyword: kd.keyword,
              volume: kd.keyword_info?.search_volume ?? 0,
              cpc: kd.keyword_info?.cpc ?? null,
              competition: kd.keyword_info?.competition ?? null,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[keyword-research] related_keywords failed — using internal keywords only:', e);
    }
  }

  // ── Step 3: Merge external + internal, deduplicate ─────────────────
  const allKeywords = new Map<string, {
    keyword: string;
    volume: number;
    cpc: number | null;
    competition: number | null;
    isExternal: boolean;
    currentRank: number | null;
  }>();

  // Internal keywords first (they have rank data — that's more valuable)
  for (const ik of siteAuditKeywords) {
    if (!ik.keyword || ik.volume <= 0) continue;
    allKeywords.set(ik.keyword.toLowerCase(), {
      keyword: ik.keyword,
      volume: ik.volume,
      cpc: ik.cpc,
      competition: null,
      isExternal: false,
      currentRank: ik.currentRank,
    });
  }

  // External keywords (skip duplicates — internal data wins)
  for (const ek of externalKeywords) {
    const key = ek.keyword.toLowerCase();
    if (!allKeywords.has(key) && ek.volume > 0) {
      allKeywords.set(key, {
        keyword: ek.keyword,
        volume: ek.volume,
        cpc: ek.cpc,
        competition: ek.competition,
        isExternal: true,
        currentRank: null,
      });
    }
  }

  // Sort by volume, cap at 100 keywords
  const sortedKeywords = Array.from(allKeywords.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 100);

  if (sortedKeywords.length === 0) {
    return NextResponse.json({ keywords: [] });
  }

  // ── Step 4: Bulk keyword difficulty ───────────────────────────────
  const kwDiffMap = new Map<string, number>();

  if (hasDfsCredentials) {
    try {
      const kdRes = await dfsPost('dataforseo_labs/google/bulk_keyword_difficulty/live', [{
        keywords: sortedKeywords.map(k => k.keyword),
        language_code: 'en',
        location_code: 2840,
      }]);

      for (const task of kdRes?.tasks ?? []) {
        for (const item of task?.result ?? []) {
          if (item?.keyword && item.keyword_difficulty != null) {
            kwDiffMap.set(item.keyword.toLowerCase(), item.keyword_difficulty);
          }
        }
      }
    } catch (e) {
      console.warn('[keyword-research] bulk_keyword_difficulty failed:', e);
    }
  }

  // ── Step 5: Claude batch intent + funnel classification ───────────
  const classificationMap = new Map<string, {
    funnel: EnrichedKeyword['funnel'];
    intent: EnrichedKeyword['intent'];
    localType: EnrichedKeyword['localType'];
  }>();

  if (hasAnthropicKey) {
    try {
      const cityLabel = city || locations[0] || 'your area';
      const kwList = sortedKeywords.map(k => k.keyword).join('\n');

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: `You are an SEO analyst classifying search keywords for a ${industry || 'local service'} business in ${cityLabel}. Return ONLY a valid JSON array — no markdown fences, no explanation, no extra text.`,
          messages: [{
            role: 'user',
            content: `Classify each keyword below. Return a JSON array where every element has exactly these fields:
- "keyword": the exact keyword string (copy verbatim)
- "funnel": "bottom" (emergency/near-me/ready-to-hire) | "middle" (comparing/evaluating options) | "top" (researching/how-to/cost guides)
- "intent": "transactional" (ready to purchase now) | "commercial" (comparing before buying) | "informational" (learning/researching) | "branded" (business/brand name searches)
- "localType": "near_me" (contains "near me" or "nearby") | "city_name" (contains a city, neighborhood, or location) | "none" (generic, no local signal)

Keywords:
${kwList}`,
          }],
        }),
      });

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json();
        const text: string = claudeData.content?.[0]?.text ?? '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const classified = JSON.parse(jsonMatch[0]) as Array<{
            keyword: string;
            funnel: string;
            intent: string;
            localType: string;
          }>;
          for (const c of classified) {
            if (!c.keyword) continue;
            classificationMap.set(c.keyword.toLowerCase(), {
              funnel: (['bottom', 'middle', 'top'].includes(c.funnel) ? c.funnel : 'middle') as EnrichedKeyword['funnel'],
              intent: (['transactional', 'commercial', 'informational', 'branded'].includes(c.intent) ? c.intent : 'commercial') as EnrichedKeyword['intent'],
              localType: (['near_me', 'city_name', 'none'].includes(c.localType) ? c.localType : 'none') as EnrichedKeyword['localType'],
            });
          }
        }
      }
    } catch (e) {
      console.warn('[keyword-research] Claude classification failed — using heuristic fallback:', e);
    }
  }

  // ── Step 6: Assemble EnrichedKeyword[] ────────────────────────────
  const cityLower = city.toLowerCase();

  const result: EnrichedKeyword[] = sortedKeywords.map(k => {
    const key = k.keyword.toLowerCase();
    const cls = classificationMap.get(key);
    const difficulty = kwDiffMap.get(key) ?? null;

    // Local type: Claude result or heuristic fallback
    const localType: EnrichedKeyword['localType'] = cls?.localType ?? (
      key.includes('near me') || key.includes('nearby') ? 'near_me'
      : (cityLower && key.includes(cityLower)) ? 'city_name'
      : 'none'
    );

    // Funnel: Claude or simple heuristic
    const funnel: EnrichedKeyword['funnel'] = cls?.funnel ?? (
      key.includes('near me') || key.includes('emergency') || key.includes('repair') ? 'bottom'
      : key.split(/\s+/).length <= 3 ? 'middle'
      : 'top'
    );

    // Intent: Claude or default
    const intent: EnrichedKeyword['intent'] = cls?.intent ?? 'commercial';

    return {
      keyword: k.keyword,
      volume: k.volume,
      difficulty,
      competition: k.competition != null ? competitionTier(k.competition) : null,
      cpc: k.cpc,
      isExternal: k.isExternal,
      currentRank: k.currentRank,
      hasLocalPack: localType === 'near_me' || localType === 'city_name',
      funnel,
      intent,
      localType,
    };
  });

  return NextResponse.json({ keywords: result });
}
