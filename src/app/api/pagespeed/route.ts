// Google PageSpeed Insights API proxy
// Docs: https://developers.google.com/speed/docs/insights/v5/get-started
// Free tier: 25,000 queries/day with API key, limited without key
// Strategy: 'mobile' | 'desktop'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PagespeedInsights, PSIMetric } from '@/components/tools/SiteAudit/types';
import { apiError } from '@/lib/apiError';

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const TIMEOUT_MS = 30_000; // 30-second per-call timeout
const RETRY_DELAY_MS = 1_000; // 1 second between attempts

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with a 30-second AbortController timeout.
 * Throws AbortError on timeout, TypeError on network failure.
 * Valid HTTP responses (even non-2xx) are returned as-is.
 */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Attempt the fetch up to 2 times.
 * Retries only on AbortError (timeout) or TypeError (network failure) from the first attempt.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchWithTimeout(url, init);
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      const isNetwork = err instanceof TypeError;
      const isRetryable = isAbort || isNetwork;

      if (!isRetryable || attempt === 1) {
        throw err;
      }

      // First attempt failed with a transport error — wait 1s then retry once
      await sleep(RETRY_DELAY_MS);
    }
  }
  // Unreachable, but satisfies TypeScript
  throw new Error('Unexpected retry loop exit');
}

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
  const requestId = crypto.randomUUID();

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await (supabase as any).auth.getUser();
  if (!user) {
    return apiError('Unauthorized', 401, undefined, { 'X-Request-ID': requestId });
  }

  const { url, strategy = 'mobile' } = await req.json();
  if (!url) {
    return apiError('url required', 400, undefined, { 'X-Request-ID': requestId });
  }

  // Validate url to prevent SSRF — must be a public https URL
  if (!['mobile', 'desktop'].includes(strategy)) {
    return apiError('strategy must be mobile or desktop', 400, undefined, { 'X-Request-ID': requestId });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return apiError('url must be a valid URL', 400, undefined, { 'X-Request-ID': requestId });
  }
  if (parsedUrl.protocol !== 'https:') {
    return apiError('url must use https', 400, undefined, { 'X-Request-ID': requestId });
  }
  // Reject private/internal hostnames
  const hostname = parsedUrl.hostname;
  // B14-17: Added IPv4-mapped IPv6 loopback (::ffff:127.x.x.x) and metadata endpoints
  const privatePatterns = [/^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^::1$/, /^::ffff:127\./, /^0\.0\.0\.0$/, /^169\.254\./];
  if (privatePatterns.some((p) => p.test(hostname))) {
    return apiError('url hostname is not allowed', 400, undefined, { 'X-Request-ID': requestId });
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
    const res = await fetchWithRetry(`${PSI_BASE}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[pagespeed][${requestId}]`, `PSI API error ${res.status}`, errBody);
      return NextResponse.json(
        { error: `PSI API error ${res.status}`, detail: errBody },
        { status: res.status, headers: { 'X-Request-ID': requestId } }
      );
    }

    const json = await res.json();
    const parsed = parsePSIResponse(json, url, strategy as 'mobile' | 'desktop');
    return NextResponse.json(parsed, { headers: { 'X-Request-ID': requestId } });
  } catch (e: any) {
    console.error(`[pagespeed][${requestId}]`, e);
    if (e?.name === 'AbortError') {
      return apiError('PageSpeed request timed out', 504, undefined, { 'X-Request-ID': requestId });
    }
    return apiError(e.message || 'PSI fetch failed', 500, undefined, { 'X-Request-ID': requestId });
  }
}
