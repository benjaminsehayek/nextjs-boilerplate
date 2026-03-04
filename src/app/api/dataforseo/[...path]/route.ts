import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/apiError';
import { createHash } from 'crypto';

// Validate that the POST body is a JSON object (tasks array is optional)
const DataForSeoBodySchema = z.looseObject({
  tasks: z.array(z.looseObject({})).optional(),
});

const DFS_BASE = 'https://api.dataforseo.com';

/**
 * Allowlist of DataForSEO endpoint prefixes that clients may access.
 * This prevents access to write/billing/account-management endpoints.
 */
const ALLOWED_PATH_PREFIXES = [
  'v3/on_page/',
  'v3/serp/',
  'v3/backlinks/',
  'v3/domain_analytics/',
  'v3/keywords_data/',
  'v3/dataforseo_labs/',
  'v3/business_data/',
  'v3/merchant/',
  'v3/appendix/user_data', // read-only balance check
];
const DFS_AUTH = Buffer.from(
  `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
).toString('base64');

// ── In-memory response cache ─────────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCached(key: string): unknown | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown): void {
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Cacheable paths: backlinks, domain_rank, citations */
function isCacheablePath(path: string): boolean {
  return path.includes('backlinks') || path.includes('domain_rank') || path.includes('citations');
}

/** Cache key: scoped by path + SHA-256 hash of full body (B14-10: prevents collision on truncated prefix) */
function makeCacheKey(path: string, bodyStr: string): string {
  const hash = createHash('sha256').update(bodyStr).digest('hex').substring(0, 16);
  return `${path}:${hash}`;
}

// Periodic cleanup: remove expired entries every hour
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now > entry.expiresAt) {
      responseCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Allow Node.js to exit without waiting for this interval
if (cleanupInterval.unref) cleanupInterval.unref();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_tier, subscription_status, scan_credits_used, scan_credits_limit')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
  }

  // Server-side credit enforcement: prevent unlimited DataForSEO usage
  if (
    typeof profile.scan_credits_used === 'number' &&
    typeof profile.scan_credits_limit === 'number' &&
    profile.scan_credits_used >= profile.scan_credits_limit
  ) {
    return NextResponse.json({ error: 'Scan credit limit reached. Upgrade your plan for more scans.' }, { status: 429 });
  }

  const path = pathArray.join('/');

  // Enforce allowlist: block billing/account/write endpoints
  const isAllowed = ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isAllowed) {
    return apiError('Endpoint not permitted', 403, 'FORBIDDEN');
  }

  const dfsUrl = `${DFS_BASE}/${path}`;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  const parsed = DataForSeoBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  const body = parsed.data;
  const bodyStr = JSON.stringify(body);

  // Check cache for eligible paths
  if (isCacheablePath(path)) {
    const cacheKey = makeCacheKey(path, bodyStr);
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
    }

    try {
      const dfsResponse = await fetch(dfsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${DFS_AUTH}`,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });

      const data = await dfsResponse.json();
      setCached(cacheKey, data);
      return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
    } catch (error) {
      console.error('DataForSEO proxy error:', error);
      return NextResponse.json({ error: 'Failed to reach DataForSEO' }, { status: 502 });
    }
  }

  try {
    const dfsResponse = await fetch(dfsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DFS_AUTH}`,
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    });

    const data = await dfsResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('DataForSEO proxy error:', error);
    return NextResponse.json({ error: 'Failed to reach DataForSEO' }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = pathArray.join('/');

  // Enforce allowlist on GET requests too
  const isAllowedGet = ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isAllowedGet) {
    return apiError('Endpoint not permitted', 403, 'FORBIDDEN');
  }

  const dfsUrl = `${DFS_BASE}/${path}`;

  try {
    const dfsResponse = await fetch(dfsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${DFS_AUTH}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await dfsResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('DataForSEO proxy error:', error);
    return NextResponse.json({ error: 'Failed to reach DataForSEO' }, { status: 502 });
  }
}
