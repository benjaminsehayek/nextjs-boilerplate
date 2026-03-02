// Unified 12-week content calendar builder
// Reuses data from existing site_audits + off_page_audits — zero new DataForSEO calls

import { calculateKeywordROI } from './roi';
import { classifyFunnel } from './funnel';
import type { CalendarItemV2, SimpleStrategyConfig } from '@/types';

// ─── Input Types ─────────────────────────────────────────────────────

interface MarketKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info?: { search_volume: number; cpc: number };
  };
  ranked_serp_element?: {
    serp_item?: { rank_group: number; url: string };
  };
}

interface SiteAuditData {
  crawl_data?: {
    keywords?: {
      markets: Record<string, { items: MarketKeywordItem[] }>;
      locations?: string[];
    } | null;
    pages?: { items: Array<{ url: string; meta?: { title?: string; description?: string } }> };
    business?: { name?: string; city?: string } | null;
  };
  issues_data?: {
    quickWins?: Array<{
      id: string;
      title: string;
      description?: string;
      fix: string;
      impactScore: number;
      affectedPages: number;
      category?: string;
    }>;
    detailed?: Array<{ severity: string; urls?: Array<{ url: string }> }>;
  };
  pages_data?: { items: Array<{ url: string; meta?: { title?: string } }> };
  domain?: string | null;
}

interface OffPageAuditData {
  citations?: Array<{ source: string; found: boolean; url?: string; domain?: string }>;
  link_gaps?: Array<{ domain: string; backlinks: number; domainRank: number }>;
  location_data?: Array<{
    name?: string;
    city?: string;
    gbp?: { items?: Array<{ label: string; status: string; points: number }> };
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function makeId(prefix: string, index: number) {
  return `${prefix}-${index}`;
}

/** Collect all MarketKeywordItems from crawl_data.keywords.markets */
function collectAuditKeywords(audit: SiteAuditData): MarketKeywordItem[] {
  const markets = audit.crawl_data?.keywords?.markets;
  if (!markets) return [];
  const all: MarketKeywordItem[] = [];
  for (const market of Object.values(markets)) {
    for (const item of market.items || []) {
      all.push(item);
    }
  }
  return all;
}

/** Dedupe by keyword, keep highest volume */
function dedupeKeywords(items: MarketKeywordItem[]): MarketKeywordItem[] {
  const map = new Map<string, MarketKeywordItem>();
  for (const item of items) {
    const kw = item.keyword_data.keyword.toLowerCase();
    const existing = map.get(kw);
    const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
    const existingVol = existing?.keyword_data.keyword_info?.search_volume ?? 0;
    if (!existing || vol > existingVol) map.set(kw, item);
  }
  return Array.from(map.values());
}

/** Set of page URLs from the crawled site (lowercased) */
function buildPageUrlSet(audit: SiteAuditData): Set<string> {
  const items = audit.pages_data?.items ?? audit.crawl_data?.pages?.items ?? [];
  return new Set(items.map(p => p.url.toLowerCase()));
}

// ─── GBP Posts ────────────────────────────────────────────────────────

function buildGBPItems(
  keywords: MarketKeywordItem[],
  cfg: SimpleStrategyConfig,
  count = 12,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  // Prefer bottom-funnel (near me, location + service) keywords
  const scored = keywords
    .map(item => {
      const kw = item.keyword_data.keyword;
      const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
      const funnel = classifyFunnel(kw);
      const roi = calculateKeywordROI(vol, funnel, cfg.conversionRate, cfg.profitPerJob, cfg.closeRate);
      return { item, kw, vol, funnel, roi: roi.roi };
    })
    .filter(k => k.funnel === 'bottom' || k.funnel === 'middle')
    .sort((a, b) => b.roi - a.roi)
    .slice(0, count);

  return scored.map((k, i) => ({
    id: makeId('gbp', i),
    type: 'gbp_post' as const,
    title: `GBP Post: ${k.kw}`,
    primaryKeyword: k.kw,
    keywords: [k.kw],
    action: `Publish a Google Business Profile post targeting "${k.kw}". Include a specific offer or callout and a direct CTA (call, book, or visit).`,
    rationale: `Est. ${k.vol.toLocaleString()} searches/mo · $${k.roi}/mo ROI potential at position 3`,
    priority: i < 4 ? 'high' : i < 8 ? 'medium' : 'low',
    roiValue: k.roi,
  }));
}

// ─── Website Additions (keyword gaps) ────────────────────────────────

function buildWebsiteAdditions(
  keywords: MarketKeywordItem[],
  pageUrls: Set<string>,
  cfg: SimpleStrategyConfig,
  count = 8,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  // Keywords where no site page is ranking in top 10
  const gaps = keywords
    .filter(item => {
      const rank = item.ranked_serp_element?.serp_item?.rank_group;
      return rank === undefined || rank === null || rank > 10;
    })
    .map(item => {
      const kw = item.keyword_data.keyword;
      const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
      const funnel = classifyFunnel(kw);
      const roi = calculateKeywordROI(vol, funnel, cfg.conversionRate, cfg.profitPerJob, cfg.closeRate);
      return { item, kw, vol, funnel, roi: roi.roi };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, count);

  return gaps.map((k, i) => {
    // Suggest a URL based on keyword
    const slug = k.kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suggestedUrl = `/services/${slug}`;
    return {
      id: makeId('add', i),
      type: 'website_addition' as const,
      title: `New Page: ${k.kw}`,
      primaryKeyword: k.kw,
      keywords: [k.kw],
      action: `Create a new service page targeting "${k.kw}" at ${suggestedUrl}. Include H1, meta title, meta description, FAQs, and a CTA.`,
      rationale: `No page currently ranks for this keyword · Est. $${k.roi}/mo ROI at top-3 position`,
      priority: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
      roiValue: k.roi,
      targetUrl: suggestedUrl,
    };
  });
}

// ─── Website Changes (site audit issues) ─────────────────────────────

function buildWebsiteChanges(
  audit: SiteAuditData,
  count = 6,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const quickWins = (audit.issues_data?.quickWins ?? [])
    .slice()
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, count);

  return quickWins.map((qw, i) => {
    // Get the first affected URL if available
    const detailed = (audit.issues_data?.detailed ?? []).find(d =>
      d.urls?.length && qw.title.toLowerCase().includes((d as any).title?.toLowerCase?.()?.slice(0, 10))
    );
    const targetUrl = (detailed as any)?.urls?.[0]?.url;

    return {
      id: makeId('fix', i),
      type: 'website_change' as const,
      title: `Fix: ${qw.title}`,
      primaryKeyword: '',
      keywords: [],
      action: qw.fix,
      rationale: `Site audit issue · Impact score ${qw.impactScore}/10 · Affects ${qw.affectedPages} page(s)`,
      priority: qw.impactScore >= 7 ? 'high' : qw.impactScore >= 4 ? 'medium' : 'low',
      roiValue: 0,
      targetUrl,
    };
  });
}

// ─── Off-Page Posts (citations + link gaps) ───────────────────────────

function buildOffPageItems(
  offPage: OffPageAuditData | null,
  count = 10,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const items: Omit<CalendarItemV2, 'week' | 'status'>[] = [];

  // Missing citations first (easiest wins)
  const missingCitations = (offPage?.citations ?? []).filter(c => !c.found);
  for (const citation of missingCitations.slice(0, Math.ceil(count * 0.6))) {
    items.push({
      id: makeId('cit', items.length),
      type: 'offpage_post' as const,
      title: `Submit to ${citation.source}`,
      primaryKeyword: '',
      keywords: [],
      action: `Submit a business listing to ${citation.source}. Ensure NAP (Name, Address, Phone) matches your primary listing exactly.`,
      rationale: `Missing citation on ${citation.source} — citations improve local ranking trust signals`,
      priority: items.length < 3 ? 'high' : 'medium',
      roiValue: 0,
      targetPlatform: citation.source,
    });
  }

  // Link gap opportunities
  const linkGaps = (offPage?.link_gaps ?? [])
    .sort((a, b) => b.domainRank - a.domainRank)
    .slice(0, Math.floor(count * 0.4));

  for (const gap of linkGaps) {
    items.push({
      id: makeId('link', items.length),
      type: 'offpage_post' as const,
      title: `Get link from ${gap.domain}`,
      primaryKeyword: '',
      keywords: [],
      action: `Reach out to ${gap.domain} (DR ${gap.domainRank}) for a backlink. Your competitors are already linked from this domain. Consider a guest post, resource mention, or partnership.`,
      rationale: `Competitor link gap · Domain Rank ${gap.domainRank} · ${gap.backlinks} backlinks to competitors`,
      priority: gap.domainRank >= 50 ? 'high' : 'medium',
      roiValue: 0,
      targetPlatform: gap.domain,
    });
  }

  return items.slice(0, count);
}

// ─── Week Distribution ────────────────────────────────────────────────

/**
 * Distribute items into 12 weeks.
 * Each week: 1 GBP + 1–2 website items + 0–1 off-page items
 * Weeks 1–4 get high-priority items first; 5–8 medium; 9–12 low/ongoing
 */
function distributeToWeeks(
  gbp: Omit<CalendarItemV2, 'week' | 'status'>[],
  webAdds: Omit<CalendarItemV2, 'week' | 'status'>[],
  webFixes: Omit<CalendarItemV2, 'week' | 'status'>[],
  offPage: Omit<CalendarItemV2, 'week' | 'status'>[],
  numWeeks = 12,
): CalendarItemV2[] {
  const result: CalendarItemV2[] = [];

  // One GBP post per week (fill up to numWeeks, cycle if needed)
  for (let w = 1; w <= numWeeks; w++) {
    const item = gbp[w - 1];
    if (item) {
      result.push({ ...item, week: w, status: 'scheduled' });
    }
  }

  // Interleave website additions + fixes across all weeks
  const webItems = [...webFixes, ...webAdds]; // fixes first (they're quick wins)
  let webIdx = 0;
  for (let w = 1; w <= numWeeks && webIdx < webItems.length; w++) {
    result.push({ ...webItems[webIdx], week: w, status: 'scheduled' });
    webIdx++;
    // Add a second website item in early weeks if we have plenty
    if (w <= 4 && webIdx < webItems.length && webItems.length > numWeeks) {
      result.push({ ...webItems[webIdx], week: w, status: 'scheduled' });
      webIdx++;
    }
  }

  // Off-page items spread across weeks, starting at week 2
  let opIdx = 0;
  for (let w = 2; w <= numWeeks && opIdx < offPage.length; w += 1) {
    result.push({ ...offPage[opIdx], week: w, status: 'scheduled' });
    opIdx++;
  }

  return result.sort((a, b) => a.week - b.week || a.type.localeCompare(b.type));
}

// ─── Main Export ──────────────────────────────────────────────────────

export function buildUnifiedCalendar(
  siteAudit: SiteAuditData,
  offPageAudit: OffPageAuditData | null,
  cfg: SimpleStrategyConfig,
): CalendarItemV2[] {
  // 1. Collect + dedupe keywords from all markets
  const rawKeywords = collectAuditKeywords(siteAudit);
  const keywords = dedupeKeywords(rawKeywords);

  // 2. Page URL set for gap detection
  const pageUrls = buildPageUrlSet(siteAudit);

  // 3. Build each item pool
  const gbpItems = buildGBPItems(keywords, cfg, 12);
  const addItems = buildWebsiteAdditions(keywords, pageUrls, cfg, 8);
  const fixItems = buildWebsiteChanges(siteAudit, 6);
  const opItems = buildOffPageItems(offPageAudit, 10);

  // 4. Distribute to weeks
  return distributeToWeeks(gbpItems, addItems, fixItems, opItems, 12);
}
