// Google PageSpeed Insights API proxy
// Docs: https://developers.google.com/speed/docs/insights/v5/get-started
// Free tier: 25,000 queries/day with API key, limited without key
// Strategy: 'mobile' | 'desktop'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PagespeedInsights, PSIMetric } from '@/components/tools/SiteAudit/types';

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

function parsePSIMetric(raw: any): PSIMetric | undefined {
  if (!raw?.percentile) return undefined;
  return {
    percentile: raw.percentile,
    category: raw.category,
    distributions: raw.distributions,
  };
}

function parsePSIResponse(
  json: any,
  url: string,
  strategy: 'mobile' | 'desktop'
): PagespeedInsights {
  const lhr = json.lighthouseResult;
  const crux = json.loadingExperience;
  const originCrux = json.originLoadingExperience;

  // Lighthouse scores (0–100)
  const cats = lhr?.categories;
  const scores = cats ? {
    performance: Math.round((cats.performance?.score ?? 0) * 100),
    accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
    seo: Math.round((cats.seo?.score ?? 0) * 100),
  } : undefined;

  // Key audit display values
  const audits = lhr?.audits;
  const parsedAudits = audits ? {
    'first-contentful-paint': audits['first-contentful-paint']?.displayValue,
    'largest-contentful-paint': audits['largest-contentful-paint']?.displayValue,
    'total-blocking-time': audits['total-blocking-time']?.displayValue,
    'cumulative-layout-shift': audits['cumulative-layout-shift']?.displayValue,
    'speed-index': audits['speed-index']?.displayValue,
    'interactive': audits['interactive']?.displayValue,
    'server-response-time': audits['server-response-time']?.displayValue,
    'render-blocking-resources': audits['render-blocking-resources']?.displayValue,
    'uses-optimized-images': audits['uses-optimized-images']?.displayValue,
    'uses-webp-images': audits['uses-webp-images']?.displayValue,
    'uses-text-compression': audits['uses-text-compression']?.displayValue,
    'uses-long-cache-ttl': audits['uses-long-cache-ttl']?.displayValue,
    'efficient-animated-content': audits['efficient-animated-content']?.displayValue,
  } : undefined;

  // CrUX field data (real user metrics)
  const fieldData = crux?.metrics ? {
    overall_category: crux.overall_category,
    FIRST_CONTENTFUL_PAINT_MS: parsePSIMetric(crux.metrics.FIRST_CONTENTFUL_PAINT_MS),
    LARGEST_CONTENTFUL_PAINT_MS: parsePSIMetric(crux.metrics.LARGEST_CONTENTFUL_PAINT_MS),
    CUMULATIVE_LAYOUT_SHIFT_SCORE: parsePSIMetric(crux.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE),
    INTERACTION_TO_NEXT_PAINT: parsePSIMetric(crux.metrics.INTERACTION_TO_NEXT_PAINT),
    EXPERIMENTAL_TIME_TO_FIRST_BYTE: parsePSIMetric(crux.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
    FIRST_INPUT_DELAY_MS: parsePSIMetric(crux.metrics.FIRST_INPUT_DELAY_MS),
  } : undefined;

  // Origin-level CrUX (more reliable, covers entire domain)
  const originFieldData = originCrux?.metrics ? {
    overall_category: originCrux.overall_category,
    LARGEST_CONTENTFUL_PAINT_MS: parsePSIMetric(originCrux.metrics.LARGEST_CONTENTFUL_PAINT_MS),
    CUMULATIVE_LAYOUT_SHIFT_SCORE: parsePSIMetric(originCrux.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE),
    INTERACTION_TO_NEXT_PAINT: parsePSIMetric(originCrux.metrics.INTERACTION_TO_NEXT_PAINT),
    EXPERIMENTAL_TIME_TO_FIRST_BYTE: parsePSIMetric(originCrux.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
  } : undefined;

  return { url, strategy, fieldData, originFieldData, scores, audits: parsedAudits };
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await (supabase as any).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url, strategy = 'mobile' } = await req.json();
  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PSI_API_KEY;
  const params = new URLSearchParams({
    url,
    strategy,
    ...(apiKey ? { key: apiKey } : {}),
  });

  // Request key Lighthouse categories only (reduces response size)
  const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
  categories.forEach((c) => params.append('category', c));

  try {
    const res = await fetch(`${PSI_BASE}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
      // PSI can be slow — allow up to 60s
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: `PSI API error ${res.status}`, detail: errBody },
        { status: res.status }
      );
    }

    const json = await res.json();
    const parsed = parsePSIResponse(json, url, strategy as 'mobile' | 'desktop');
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'PSI fetch failed' }, { status: 500 });
  }
}
