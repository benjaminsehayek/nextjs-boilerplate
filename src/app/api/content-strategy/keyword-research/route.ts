import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildSeedKeywords,
  competitionTier,
  computeSeasonalMultiplier,
  formatLocationName,
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

/** Build the location param object for a DataForSEO task body */
function dfsLocation(locationName: string | null): { location_name: string } | { location_code: number } {
  return locationName
    ? { location_name: locationName }
    : { location_code: 2840 }; // fallback: United States national
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
    state?: string;
    locations?: string[];
    siteAuditKeywords?: SiteAuditKeyword[];
    businessName?: string;
  };

  const industry = body.industry ?? '';
  const city = body.city ?? '';
  const state = body.state ?? '';
  const locations = body.locations?.length ? body.locations : city ? [city] : [];
  const siteAuditKeywords: SiteAuditKeyword[] = body.siteAuditKeywords ?? [];

  // City-specific location for DataForSEO — far more accurate than national averages
  const locationName = formatLocationName(city, state);
  const loc = dfsLocation(locationName);

  const hasDfsCredentials = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  // ── Step 1: Seed keywords ──────────────────────────────────────────
  const seeds = buildSeedKeywords(industry, locations);

  // ── Step 2: External keyword discovery (city-specific) ────────────
  // monthly_searches is included in the related_keywords response — parsed below
  const externalKeywords: Array<{
    keyword: string;
    volume: number;
    cpc: number | null;
    competition: number | null;
    monthlySearches: Array<{ year: number; month: number; search_volume: number }>;
  }> = [];

  if (hasDfsCredentials && seeds.length > 0) {
    try {
      const seedBodies = seeds.map(seed => ({
        keyword: seed,
        language_code: 'en',
        ...loc,
        depth: 1,
        limit: 35,
        filters: [['keyword_data.keyword_info.search_volume', '>', 10]],
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
              monthlySearches: kd.keyword_info?.monthly_searches ?? [],
            });
          }
        }
      }
    } catch (e) {
      console.warn('[keyword-research] related_keywords failed — using internal keywords only:', e);
    }
  }

  // ── Step 3: Merge external + internal, deduplicate ─────────────────
  // Internal keywords (from site audit) take priority — they have rank data.
  const allKeywords = new Map<string, {
    keyword: string;
    volume: number;
    cpc: number | null;
    competition: number | null;
    isExternal: boolean;
    currentRank: number | null;
    monthlySearches: Array<{ year: number; month: number; search_volume: number }>;
  }>();

  for (const ik of siteAuditKeywords) {
    if (!ik.keyword || ik.volume <= 0) continue;
    allKeywords.set(ik.keyword.toLowerCase(), {
      keyword: ik.keyword,
      volume: ik.volume,
      cpc: ik.cpc,
      competition: null,
      isExternal: false,
      currentRank: ik.currentRank,
      monthlySearches: [], // filled in step 4
    });
  }

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
        monthlySearches: ek.monthlySearches,
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

  // ── Step 4: Parallel — city KD + city volume/seasonality ──────────
  // Both calls use city location so results are local, not national.
  const kwDiffMap = new Map<string, number>();
  // volume map: city-specific monthly average + monthly history
  const kwVolumeMap = new Map<string, {
    volume: number;
    monthlySearches: Array<{ year: number; month: number; search_volume: number }>;
  }>();

  if (hasDfsCredentials) {
    const kwNames = sortedKeywords.map(k => k.keyword);

    await Promise.allSettled([
      // 4a: Keyword difficulty (city-specific — local KD is lower than national)
      dfsPost('dataforseo_labs/google/bulk_keyword_difficulty/live', [{
        keywords: kwNames,
        language_code: 'en',
        ...loc,
      }]).then((kdRes: any) => {
        for (const task of kdRes?.tasks ?? []) {
          for (const item of task?.result ?? []) {
            if (item?.keyword && item.keyword_difficulty != null) {
              kwDiffMap.set(item.keyword.toLowerCase(), item.keyword_difficulty);
            }
          }
        }
      }).catch((e: unknown) => {
        console.warn('[keyword-research] bulk_keyword_difficulty failed:', e);
      }),

      // 4b: City-specific monthly volume + seasonality history
      // Replaces national averages from site audit with city-level data.
      dfsPost('keywords_data/google/search_volume/live', [{
        keywords: kwNames,
        language_code: 'en',
        ...loc,
      }]).then((volRes: any) => {
        for (const task of volRes?.tasks ?? []) {
          for (const item of task?.result ?? []) {
            if (!item?.keyword) continue;
            kwVolumeMap.set(item.keyword.toLowerCase(), {
              volume: item.search_volume ?? 0,
              monthlySearches: item.monthly_searches ?? [],
            });
          }
        }
      }).catch((e: unknown) => {
        console.warn('[keyword-research] search_volume/live failed — using audit volumes:', e);
      }),
    ]);
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

    // Prefer city-specific volume from step 4b; fall back to merged volume from step 3
    const cityVolumeData = kwVolumeMap.get(key);
    const avgVolume = cityVolumeData?.volume ?? k.volume;

    // Seasonality: use monthly history from city volume call, or from related_keywords
    const monthlySearches = cityVolumeData?.monthlySearches?.length
      ? cityVolumeData.monthlySearches
      : k.monthlySearches;
    const seasonalMultiplier = computeSeasonalMultiplier(monthlySearches);

    // Current-month volume = annual average × seasonal adjustment
    const volume = Math.max(1, Math.round(avgVolume * seasonalMultiplier));

    const localType: EnrichedKeyword['localType'] = cls?.localType ?? (
      key.includes('near me') || key.includes('nearby') ? 'near_me'
      : (cityLower && key.includes(cityLower)) ? 'city_name'
      : 'none'
    );

    const funnel: EnrichedKeyword['funnel'] = cls?.funnel ?? (
      key.includes('near me') || key.includes('emergency') || key.includes('repair') ? 'bottom'
      : key.split(/\s+/).length <= 3 ? 'middle'
      : 'top'
    );

    const intent: EnrichedKeyword['intent'] = cls?.intent ?? 'commercial';

    // Local pack appears for "near me" queries (nearly always) and for
    // bottom-funnel / transactional city-name queries (service + city).
    // It does NOT reliably appear for comparative ("best X in Y"), cost,
    // informational, or how-to queries — those get standard blue-link SERPs.
    const hasLocalPack =
      localType === 'near_me' ||
      (localType === 'city_name' &&
        (funnel === 'bottom' || intent === 'transactional') &&
        !key.includes('best ') &&
        !key.includes('cost') &&
        !key.includes('price') &&
        !key.includes('how ') &&
        !key.includes('what ') &&
        !key.includes('vs '));

    return {
      keyword: k.keyword,
      volume,
      avgVolume,
      seasonalMultiplier,
      difficulty,
      competition: (cityVolumeData ? null : k.competition) != null
        ? competitionTier(k.competition)
        : null,
      cpc: k.cpc,
      isExternal: k.isExternal,
      currentRank: k.currentRank,
      hasLocalPack,
      funnel,
      intent,
      localType,
    };
  });

  // Re-sort by seasonally-adjusted city volume
  result.sort((a, b) => b.volume - a.volume);

  return NextResponse.json({ keywords: result });
}
