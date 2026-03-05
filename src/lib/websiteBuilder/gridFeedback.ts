import { createClient } from '@/lib/supabase/client';
import type { MarketData, MarketKeywordItem } from '@/components/tools/SiteAudit/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeywordContext {
  volumeRange: string;
  intent: string;
  hasLocalPack: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function volumeToRange(vol: number): string {
  if (vol === 0) return '0';
  if (vol < 10) return '1–10';
  if (vol < 100) return '10–100';
  if (vol < 1000) return '100–1K';
  if (vol < 10000) return '1K–10K';
  return '10K+';
}

function inferIntent(item: MarketKeywordItem): string {
  const localSerp = item._localSerp;
  const serpTypes = item.serp_item_types ?? [];
  const keyword = item.keyword_data.keyword.toLowerCase();

  // Local-commercial: has local pack + transactional signals
  if (localSerp?.hasLocalPack) {
    const commercialSignals = ['repair', 'install', 'service', 'cost', 'price', 'near me', 'hire', 'company', 'contractor'];
    if (commercialSignals.some(s => keyword.includes(s))) return 'Transactional';
  }

  // Commercial
  if (serpTypes.includes('paid') || serpTypes.includes('shopping')) return 'Commercial';

  // Informational
  const infoSignals = ['how', 'what', 'why', 'when', 'guide', 'tips', 'vs', 'best'];
  if (infoSignals.some(s => keyword.startsWith(s) || keyword.includes(` ${s} `))) return 'Informational';

  // Default: transactional for service keywords with local pack
  if (localSerp?.hasLocalPack) return 'Transactional';

  return 'Commercial';
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Get keyword volume/intent context from the most recent completed Site Audit.
 * Returns a Map of keyword text -> context data. If no audit exists, returns
 * an empty map (graceful degradation).
 */
export async function getKeywordSiteAuditContext(
  businessId: string,
  keywords: string[]
): Promise<Map<string, KeywordContext>> {
  const result = new Map<string, KeywordContext>();
  if (!businessId || keywords.length === 0) return result;

  try {
    const supabase = createClient();

    // Fetch the most recent completed site audit's crawl_data keywords
    const { data, error } = await (supabase as any)
      .from('site_audits')
      .select('crawl_data')
      .eq('business_id', businessId)
      .eq('status', 'complete')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.crawl_data?.keywords?.markets) return result;

    const markets: Record<string, MarketData> = data.crawl_data.keywords.markets;
    const lowerKeywords = new Set(keywords.map(k => k.toLowerCase()));

    // Scan all market keyword items for matches
    for (const marketData of Object.values(markets)) {
      for (const item of marketData.items) {
        const kw = item.keyword_data.keyword.toLowerCase();
        if (!lowerKeywords.has(kw)) continue;

        const volume = item.keyword_data.keyword_info?.search_volume ?? 0;
        result.set(kw, {
          volumeRange: volumeToRange(volume),
          intent: inferIntent(item),
          hasLocalPack: item._localSerp?.hasLocalPack ?? false,
        });
      }
    }
  } catch {
    // Graceful degradation — return empty map
  }

  return result;
}
