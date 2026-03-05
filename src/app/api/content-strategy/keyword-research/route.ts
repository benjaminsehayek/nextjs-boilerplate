import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildSeedKeywords,
  computeSeasonalMultiplier,
  computePeakMonth,
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

/** Build the location param for a DataForSEO task body */
function dfsLocation(locationName: string | null): { location_name: string } | { location_code: number } {
  return locationName
    ? { location_name: locationName }
    : { location_code: 2840 }; // fallback: United States national
}

/**
 * Map DataForSEO search_intent_info.main_intent to our intent/funnel types.
 * DFS values: "informational" | "navigational" | "commercial" | "transactional"
 */
function mapDfsIntent(dfsIntent: string | null | undefined): {
  intent: EnrichedKeyword['intent'];
  funnel: EnrichedKeyword['funnel'];
} | null {
  switch (dfsIntent) {
    case 'transactional': return { intent: 'transactional', funnel: 'bottom' };
    case 'commercial':    return { intent: 'commercial',    funnel: 'middle' };
    case 'informational': return { intent: 'informational', funnel: 'top'    };
    case 'navigational':  return { intent: 'branded',       funnel: 'middle' };
    default: return null;
  }
}

/**
 * Map DFS competition_level string to our competition type.
 * DFS returns "LOW" | "MEDIUM" | "HIGH" (no VERY_HIGH from string API).
 */
function mapDfsCompetition(level: string | null | undefined): EnrichedKeyword['competition'] {
  switch (level?.toUpperCase()) {
    case 'LOW':    return 'LOW';
    case 'MEDIUM': return 'MEDIUM';
    case 'HIGH':   return 'HIGH';
    default:       return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Subscription check: keyword research requires an active subscription
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
  }

  const body = await request.json() as {
    industry?: string;
    city?: string;
    state?: string;
    locations?: string[];
    siteAuditKeywords?: SiteAuditKeyword[];
    businessName?: string;
  };

  // Input validation — truncate/limit fields to prevent oversized payloads
  if (body.industry) body.industry = body.industry.slice(0, 200);
  if (body.city) body.city = body.city.slice(0, 200);
  if (body.state) body.state = body.state.slice(0, 200);
  if (body.businessName) body.businessName = body.businessName.slice(0, 200);
  if (body.siteAuditKeywords) body.siteAuditKeywords = body.siteAuditKeywords.slice(0, 100);
  if (body.locations) body.locations = body.locations.slice(0, 20);

  const industry = body.industry ?? '';
  const city = body.city ?? '';
  const state = body.state ?? '';
  const locations = body.locations?.length ? body.locations : city ? [city] : [];
  const siteAuditKeywords: SiteAuditKeyword[] = body.siteAuditKeywords ?? [];

  // City-specific location — formatLocationName expands "WA" → "Washington"
  const locationName = formatLocationName(city, state);
  const loc = dfsLocation(locationName);

  const hasDfsCredentials = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  // ── Step 1: Seed keywords ──────────────────────────────────────────
  const seeds = buildSeedKeywords(industry, locations);

  // ── Step 2: External keyword discovery ────────────────────────────
  // depth: 2 returns up to 72 related keywords per seed (depth: 1 only returns 8).
  //
  // The related_keywords response already includes:
  //   keyword_data.keyword_properties.keyword_difficulty  → KD score
  //   keyword_data.keyword_info.competition_level         → "LOW"|"MEDIUM"|"HIGH"
  //   search_intent_info.main_intent                      → search intent
  // We extract all three here to avoid redundant API calls in step 4.

  interface ExternalKeyword {
    keyword: string;
    volume: number;
    cpc: number | null;
    competitionLevel: EnrichedKeyword['competition'];
    difficulty: number | null;     // KD from keyword_properties.keyword_difficulty
    dfsIntent: string | null;      // from search_intent_info.main_intent
    monthlySearches: Array<{ year: number; month: number; search_volume: number }>;
  }

  const externalKeywords: ExternalKeyword[] = [];

  // Pre-populate KD map from related_keywords response — avoids a separate
  // bulk_keyword_difficulty call for these keywords.
  const kwDiffMap = new Map<string, number>();

  if (hasDfsCredentials && seeds.length > 0) {
    try {
      const seedBodies = seeds.map(seed => ({
        keyword: seed,
        language_code: 'en',
        ...loc,
        depth: 2,      // depth 2 = up to 72 related keywords (depth 1 = only 8)
        limit: 40,     // per-seed cap — 3 seeds × 40 = up to 120 before dedup
        filters: [['keyword_data.keyword_info.search_volume', '>', 10]],
      }));

      const dfsRes = await dfsPost('dataforseo_labs/google/related_keywords/live', seedBodies);

      for (const task of dfsRes?.tasks ?? []) {
        for (const result of task?.result ?? []) {
          for (const item of result?.items ?? []) {
            const kd = item?.keyword_data;
            if (!kd?.keyword) continue;

            const kw = kd.keyword as string;
            const kwLower = kw.toLowerCase();

            // KD is already in this response — extract it to skip the bulk call later
            const kDiff = kd.keyword_properties?.keyword_difficulty ?? null;
            if (kDiff != null) kwDiffMap.set(kwLower, kDiff);

            externalKeywords.push({
              keyword: kw,
              volume: kd.keyword_info?.search_volume ?? 0,
              cpc: kd.keyword_info?.cpc ?? null,
              competitionLevel: mapDfsCompetition(kd.keyword_info?.competition_level),
              difficulty: kDiff,
              dfsIntent: item?.search_intent_info?.main_intent ?? null,
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
  // Internal site audit keywords take priority — they have actual rank data.
  interface MergedKeyword {
    keyword: string;
    volume: number;
    cpc: number | null;
    competitionLevel: EnrichedKeyword['competition'];
    isExternal: boolean;
    currentRank: number | null;
    dfsIntent: string | null;      // present for external keywords, null for site audit ones
    monthlySearches: Array<{ year: number; month: number; search_volume: number }>;
  }

  const allKeywords = new Map<string, MergedKeyword>();

  for (const ik of siteAuditKeywords) {
    if (!ik.keyword || ik.volume <= 0) continue;
    allKeywords.set(ik.keyword.toLowerCase(), {
      keyword: ik.keyword,
      volume: ik.volume,
      cpc: ik.cpc,
      competitionLevel: null,
      isExternal: false,
      currentRank: ik.currentRank,
      dfsIntent: null,  // no DFS intent for internal keywords — Claude classifies these
      monthlySearches: [],
    });
  }

  for (const ek of externalKeywords) {
    const key = ek.keyword.toLowerCase();
    if (!allKeywords.has(key) && ek.volume > 0) {
      allKeywords.set(key, {
        keyword: ek.keyword,
        volume: ek.volume,
        cpc: ek.cpc,
        competitionLevel: ek.competitionLevel,
        isExternal: true,
        currentRank: null,
        dfsIntent: ek.dfsIntent,
        monthlySearches: ek.monthlySearches,
      });
    }
  }

  const sortedKeywords = Array.from(allKeywords.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 100);

  if (sortedKeywords.length === 0) {
    return NextResponse.json({ keywords: [] });
  }

  // ── Step 4: Parallel — KD for site audit keywords + city volume/seasonality ──
  // KD for external keywords was already extracted from related_keywords (step 2).
  // We only call bulk_keyword_difficulty for internal keywords without KD.
  //
  // CORRECT endpoint for search volume: keywords_data/google_ads/search_volume/live
  // Response structure for this endpoint: tasks[].result[] is FLAT — no items sub-array.
  // Competition field is a STRING "HIGH"|"MEDIUM"|"LOW" (not float 0-1).

  const kwVolumeMap = new Map<string, {
    volume: number;
    competition: EnrichedKeyword['competition'];
    monthlySearches: Array<{ year: number; month: number; search_volume: number }>;
  }>();

  if (hasDfsCredentials) {
    const kwNames = sortedKeywords.map(k => k.keyword);
    const kwNeedsKd = kwNames.filter(kw => !kwDiffMap.has(kw.toLowerCase()));

    await Promise.allSettled([
      // 4a: KD only for site audit keywords not covered by related_keywords
      // bulk_keyword_difficulty response: tasks[].result[].items[] (3 nesting levels)
      ...(kwNeedsKd.length > 0 ? [
        dfsPost('dataforseo_labs/google/bulk_keyword_difficulty/live', [{
          keywords: kwNeedsKd,
          language_code: 'en',
          ...loc,
        }]).then((kdRes: any) => {
          for (const task of kdRes?.tasks ?? []) {
            for (const result of task?.result ?? []) {          // result level
              for (const item of result?.items ?? []) {         // items level
                if (item?.keyword && item.keyword_difficulty != null) {
                  kwDiffMap.set(item.keyword.toLowerCase(), item.keyword_difficulty);
                }
              }
            }
          }
        }).catch((e: unknown) => {
          console.warn('[keyword-research] bulk_keyword_difficulty failed:', e);
        }),
      ] : []),

      // 4b: City-specific monthly volume + seasonality + competition
      // IMPORTANT: result[] is FLAT for this endpoint — iterate task.result[] directly,
      // NOT task.result[0].items[] like the Labs endpoints.
      dfsPost('keywords_data/google_ads/search_volume/live', [{
        keywords: kwNames,
        language_code: 'en',
        ...loc,
      }]).then((volRes: any) => {
        for (const task of volRes?.tasks ?? []) {
          for (const item of task?.result ?? []) {  // flat — each item is a keyword result
            if (!item?.keyword) continue;
            kwVolumeMap.set(item.keyword.toLowerCase(), {
              volume: item.search_volume ?? 0,
              competition: mapDfsCompetition(item.competition), // STRING "HIGH"|"MEDIUM"|"LOW"
              monthlySearches: item.monthly_searches ?? [],
            });
          }
        }
      }).catch((e: unknown) => {
        console.warn('[keyword-research] google_ads/search_volume/live failed — using related_keywords volumes:', e);
      }),
    ]);
  }

  // ── Step 5: Classification ─────────────────────────────────────────
  // External keywords from related_keywords already have search_intent_info.main_intent.
  // Pre-populate classificationMap from DFS data — Claude only fills the gap for
  // internal site audit keywords (which have no DFS metadata).
  const classificationMap = new Map<string, {
    funnel: EnrichedKeyword['funnel'];
    intent: EnrichedKeyword['intent'];
    localType: EnrichedKeyword['localType'];
  }>();

  const cityLower = city.toLowerCase();

  for (const k of sortedKeywords) {
    if (!k.dfsIntent) continue;
    const mapped = mapDfsIntent(k.dfsIntent);
    if (!mapped) continue;
    const key = k.keyword.toLowerCase();
    const localType: EnrichedKeyword['localType'] =
      key.includes('near me') || key.includes('nearby') ? 'near_me'
      : (cityLower && key.includes(cityLower)) ? 'city_name'
      : 'none';
    classificationMap.set(key, { ...mapped, localType });
  }

  // Claude classifies only site audit keywords that didn't get DFS intent
  const needsClassification = sortedKeywords.filter(k => !classificationMap.has(k.keyword.toLowerCase()));

  if (hasAnthropicKey && needsClassification.length > 0) {
    try {
      const cityLabel = city || locations[0] || 'your area';
      const kwList = needsClassification.map(k => k.keyword).join('\n');

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: `You are an SEO analyst classifying search keywords for a ${industry || 'local service'} business in ${cityLabel}. Return ONLY a valid JSON array — no markdown fences, no explanation.`,
          messages: [{
            role: 'user',
            content: `Classify each keyword. Return a JSON array where every element has:
- "keyword": exact keyword string (copy verbatim)
- "funnel": "bottom" (emergency/near-me/ready-to-hire) | "middle" (comparing options) | "top" (how-to/cost/research)
- "intent": "transactional" | "commercial" | "informational" | "branded"
- "localType": "near_me" | "city_name" | "none"

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
            keyword: string; funnel: string; intent: string; localType: string;
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
  const enriched: EnrichedKeyword[] = sortedKeywords.map(k => {
    const key = k.keyword.toLowerCase();
    const cls = classificationMap.get(key);
    const difficulty = kwDiffMap.get(key) ?? null;

    // City-specific volume from google_ads/search_volume (step 4b) is most accurate.
    // Fall back to national volume from related_keywords (step 2) if city call failed.
    const cityVolumeData = kwVolumeMap.get(key);
    const avgVolume = (cityVolumeData && cityVolumeData.volume > 0) ? cityVolumeData.volume : k.volume;

    const monthlySearches = cityVolumeData?.monthlySearches?.length
      ? cityVolumeData.monthlySearches
      : k.monthlySearches;
    const seasonalMultiplier = computeSeasonalMultiplier(monthlySearches);
    const peakMonth = computePeakMonth(monthlySearches) ?? undefined;
    const volume = Math.max(1, Math.round(avgVolume * seasonalMultiplier));

    // Competition priority: city search_volume string → related_keywords string → null
    const competition: EnrichedKeyword['competition'] =
      cityVolumeData?.competition ?? k.competitionLevel ?? null;

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

    // Short location label so GBP posts know which GBP to target.
    // "Vancouver,Washington,United States" → "Vancouver, WA"
    const locationLabel = city
      ? [city.trim(), state.trim()].filter(Boolean).join(', ')
      : undefined;

    return {
      keyword: k.keyword,
      volume,
      avgVolume,
      seasonalMultiplier,
      peakMonth,
      difficulty,
      competition,
      cpc: k.cpc,
      isExternal: k.isExternal,
      currentRank: k.currentRank,
      hasLocalPack,
      funnel,
      intent,
      localType,
      locationName: locationLabel,
    };
  });

  enriched.sort((a, b) => b.volume - a.volume);

  return NextResponse.json({ keywords: enriched });
}
