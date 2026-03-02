// Unified 12-week content calendar builder
// Reuses data from existing site_audits + off_page_audits — zero new DataForSEO calls

import { calculateKeywordROI, calculateKeywordROIV2, matchService } from './roi';
import { classifyFunnel } from './funnel';
import { INDUSTRY_PROFILES } from './constants';
import {
  detectCannibalizationConflicts,
  detectWrongPageRankings,
} from '@/lib/siteAudit/cannibalizationDetection';
import type { CalendarItemV2, SimpleStrategyConfig } from '@/types';
import type { EnrichedKeyword } from './keywordResearch';

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
    detailed?: Array<{ severity: string; title?: string; fix?: string; urls?: Array<{ url: string }> }>;
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

/** Content-based ID — stable across audits when the same item reappears */
function makeId(type: string, content: string): string {
  const slug = content.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
  return `${type}-${slug}`;
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
  enrichedMap?: Map<string, EnrichedKeyword>,
  services?: Array<{ name: string; profit: number; close: number }>,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const scored = keywords.map(item => {
    const kw = item.keyword_data.keyword;
    const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
    const enriched = enrichedMap?.get(kw.toLowerCase());
    const funnel = enriched?.funnel ?? classifyFunnel(kw);
    // Per-service economics — override cfg when a service match is found
    const svc = services ? matchService(kw, services) : null;
    const kwCfg = svc ? { ...cfg, profitPerJob: svc.profit, closeRate: svc.close } : cfg;
    const roi = enriched
      ? calculateKeywordROIV2(vol, kwCfg, {
          funnel: enriched.funnel,
          intent: enriched.intent,
          localType: enriched.localType,
          difficulty: enriched.difficulty,
          competition: enriched.competition,
          hasLocalPack: enriched.hasLocalPack,
          currentRank: enriched.currentRank,
        }).roi
      : calculateKeywordROI(vol, funnel, kwCfg.conversionRate, kwCfg.profitPerJob, kwCfg.closeRate).roi;
    return { kw, vol, funnel, roi, enriched: enriched ?? null };
  });

  // Prefer bottom-funnel; fall back to all keywords when pool is thin
  let pool = scored.filter(k => k.funnel === 'bottom' || k.funnel === 'middle');
  if (pool.length < Math.ceil(count / 2)) pool = scored;
  pool = pool.slice().sort((a, b) => b.roi - a.roi).slice(0, count);

  return pool.map((k, i) => {
    const signals = k.enriched
      ? [
          `${k.enriched.intent.charAt(0).toUpperCase() + k.enriched.intent.slice(1)} intent`,
          k.enriched.competition ? `Competition: ${k.enriched.competition}` : null,
          k.enriched.difficulty != null ? `KD: ${k.enriched.difficulty}` : null,
        ].filter(Boolean).join(' · ')
      : null;

    return {
      id: makeId('gbp', k.kw),
      type: 'gbp_post' as const,
      title: `GBP Post: ${k.kw}`,
      primaryKeyword: k.kw,
      keywords: [k.kw],
      action: `Publish a Google Business Profile post targeting "${k.kw}". Include a specific offer or callout and a direct CTA (call, book, or visit).`,
      rationale: signals
        ? `Est. ${k.vol.toLocaleString()} searches/mo · $${k.roi}/mo ROI · ${signals}`
        : `Est. ${k.vol.toLocaleString()} searches/mo · $${k.roi}/mo ROI potential at position 3`,
      priority: (i < 4 ? 'high' : i < 8 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      roiValue: k.roi,
    };
  });
}

// ─── Blog Posts (informational keywords → authority + top-funnel traffic) ───

/**
 * Blog posts target top-funnel informational keywords to build topical authority.
 * Published every 3 weeks (weeks 3, 6, 9, 12). They feed internal links to
 * service pages, strengthening the bottom-funnel conversion path.
 */
function buildBlogItems(
  keywords: MarketKeywordItem[],
  cfg: SimpleStrategyConfig,
  count = 4,
  enrichedMap?: Map<string, EnrichedKeyword>,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const scored = keywords.map(item => {
    const kw = item.keyword_data.keyword;
    const vol = item.keyword_data.keyword_info?.search_volume ?? 0;
    const enriched = enrichedMap?.get(kw.toLowerCase());
    const funnel = enriched?.funnel ?? classifyFunnel(kw);
    return { kw, vol, funnel, enriched: enriched ?? null };
  });

  // Blog posts target informational/top-funnel keywords for topical authority
  // When enriched, also prefer 'informational' intent
  const topPool = scored
    .filter(k => k.funnel === 'top' || k.enriched?.intent === 'informational')
    .sort((a, b) => b.vol - a.vol);
  const midPool = scored
    .filter(k => k.funnel === 'middle' && k.enriched?.intent !== 'transactional')
    .sort((a, b) => b.vol - a.vol);
  const pool = [...topPool, ...midPool].slice(0, count);

  return pool.map((k, i) => {
    const slug = k.kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const signals = k.enriched?.difficulty != null ? ` · KD: ${k.enriched.difficulty}` : '';
    return {
      id: makeId('blog', k.kw),
      type: 'blog_post' as const,
      title: `Blog: ${k.kw}`,
      primaryKeyword: k.kw,
      keywords: [k.kw],
      action: `Write an 800–1,200 word blog post targeting "${k.kw}". Include an H1, 3–4 H2 sections, a FAQ block (3–5 questions), and at least one internal link to a relevant service page. Target URL: /blog/${slug}.`,
      rationale: `${k.vol.toLocaleString()} searches/mo · Informational intent — builds topical authority${signals}`,
      priority: (i < 2 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
      roiValue: Math.round(k.vol * 0.005 * cfg.conversionRate * cfg.profitPerJob * (cfg.closeRate / 100)),
      targetUrl: `/blog/${slug}`,
    };
  });
}

// ─── Website Additions (keyword gaps) ────────────────────────────────

function buildWebsiteAdditions(
  keywords: MarketKeywordItem[],
  pageUrls: Set<string>,
  cfg: SimpleStrategyConfig,
  count = 8,
  enrichedMap?: Map<string, EnrichedKeyword>,
  services?: Array<{ name: string; profit: number; close: number }>,
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
      const enriched = enrichedMap?.get(kw.toLowerCase());
      const funnel = enriched?.funnel ?? classifyFunnel(kw);
      // Per-service economics — override cfg when a service match is found
      const svc = services ? matchService(kw, services) : null;
      const kwCfg = svc ? { ...cfg, profitPerJob: svc.profit, closeRate: svc.close } : cfg;
      const roi = enriched
        ? calculateKeywordROIV2(vol, kwCfg, {
            funnel: enriched.funnel,
            intent: enriched.intent,
            localType: enriched.localType,
            difficulty: enriched.difficulty,
            competition: enriched.competition,
            hasLocalPack: enriched.hasLocalPack,
            currentRank: enriched.currentRank,
          }).roi
        : calculateKeywordROI(vol, funnel, kwCfg.conversionRate, kwCfg.profitPerJob, kwCfg.closeRate).roi;
      return { kw, vol, funnel, roi, enriched: enriched ?? null };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, count);

  return gaps.map((k, i) => {
    const slug = k.kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suggestedUrl = `/services/${slug}`;
    const signals = k.enriched
      ? [
          k.enriched.competition ? `Competition: ${k.enriched.competition}` : null,
          k.enriched.difficulty != null ? `KD: ${k.enriched.difficulty}` : null,
        ].filter(Boolean).join(' · ')
      : null;

    return {
      id: makeId('add', suggestedUrl),
      type: 'website_addition' as const,
      title: `New Page: ${k.kw}`,
      primaryKeyword: k.kw,
      keywords: [k.kw],
      action: `Create a new service page targeting "${k.kw}" at ${suggestedUrl}. Include H1, meta title, meta description, FAQs, and a CTA.`,
      rationale: signals
        ? `No page ranks for this keyword · Est. $${k.roi}/mo ROI · ${signals}`
        : `No page currently ranks for this keyword · Est. $${k.roi}/mo ROI at top-3 position`,
      priority: (i < 3 ? 'high' : i < 6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      roiValue: k.roi,
      targetUrl: suggestedUrl,
    };
  });
}

// ─── Page Fix Tasks (technical SEO issues + cannibalization, per page) ───

type IssueEntry = { title: string; fix: string; impactScore: number };

/**
 * Build one fix task per page that bundles ALL problems for that page:
 * technical SEO issues (from quickWins) + keyword cannibalization conflicts.
 */
function buildPageFixTasks(
  audit: SiteAuditData,
  count = 8,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const urlToIssues = new Map<string, IssueEntry[]>();

  function addIssue(urlOrKey: string, entry: IssueEntry) {
    const existing = urlToIssues.get(urlOrKey) ?? [];
    existing.push(entry);
    urlToIssues.set(urlOrKey, existing);
  }

  // ── 1. Technical SEO issues from quickWins ─────────────────────────
  const quickWins = (audit.issues_data?.quickWins ?? [])
    .slice()
    .sort((a, b) => b.impactScore - a.impactScore);
  const detailed = audit.issues_data?.detailed ?? [];

  for (const qw of quickWins) {
    // Match quickWin to detailed entry (which has affected URL list) by title
    const matched = detailed.find(d =>
      d.urls?.length && d.title && (
        qw.title.toLowerCase().startsWith(d.title.toLowerCase().slice(0, 14)) ||
        d.title.toLowerCase().startsWith(qw.title.toLowerCase().slice(0, 14))
      )
    );

    const urls = matched?.urls?.slice(0, 4).map(u => u.url) ?? [];

    if (urls.length === 0) {
      // No specific URL — group as site-wide task
      addIssue(`__site__${qw.id || qw.title}`, {
        title: qw.title,
        fix: qw.fix,
        impactScore: qw.impactScore,
      });
    } else {
      for (const url of urls) {
        addIssue(url, { title: qw.title, fix: qw.fix, impactScore: qw.impactScore });
      }
    }
  }

  // ── 2. Cannibalization: SERP-verified conflicts (Tier 1) ───────────
  const markets = audit.crawl_data?.keywords?.markets;
  const domain = audit.domain ?? '';
  const locations = audit.crawl_data?.keywords?.locations ?? [];

  if (markets && domain) {
    const serpConflicts = detectCannibalizationConflicts(
      markets as any,
      domain,
      locations,
    );

    for (const conflict of serpConflicts) {
      const competitorPaths = conflict.competitors.map(c => c.path).join(', ');
      const impactScore = conflict.severity === 'critical' ? 9 : conflict.severity === 'high' ? 7 : 5;
      addIssue(conflict.primary.url, {
        title: `Keyword cannibalization: "${conflict.keyword}"`,
        fix: `This page and ${competitorPaths} are both ranking for "${conflict.keyword}" (${conflict.volume.toLocaleString()} searches/mo). ${conflict.conflictFix}`,
        impactScore,
      });
    }

    // ── 3. Wrong page winning (Tier 2) ────────────────────────────────
    const serpKeywords = new Set(serpConflicts.map(c => c.keyword));
    const wrongPageRankings = detectWrongPageRankings(
      markets as any,
      domain,
      locations,
      serpKeywords,
    );

    for (const wpr of wrongPageRankings) {
      addIssue(wpr.url, {
        title: `Wrong page ranking: "${wpr.keyword}"`,
        fix: `A ${wpr.pageType} page is winning for "${wpr.keyword}" (${wpr.intent}, position ${wpr.position}, ${wpr.volume.toLocaleString()} searches/mo). ${wpr.reason}`,
        impactScore: wpr.severity === 'high' ? 8 : 6,
      });
    }
  }

  // ── 4. Sort pages by total issue weight and create tasks ──────────
  const pages = Array.from(urlToIssues.entries())
    .map(([key, issues]) => ({
      url: key.startsWith('__site__') ? undefined : key,
      issues,
      topImpact: Math.max(...issues.map(iss => iss.impactScore)),
      totalImpact: issues.reduce((s, iss) => s + iss.impactScore, 0),
    }))
    .sort((a, b) => b.totalImpact - a.totalImpact || b.topImpact - a.topImpact)
    .slice(0, count);

  return pages.map(({ url, issues, topImpact }) => {
    const pathLabel = url
      ? url.replace(/^https?:\/\/[^/]+/, '') || '/'
      : 'site-wide';
    const n = issues.length;
    const fixList = issues.map(iss => `• ${iss.fix}`).join('\n');

    return {
      id: makeId('fix', url ?? issues[0]?.title ?? 'site-wide'),
      type: 'website_change' as const,
      title: `Fix ${n > 1 ? `${n} issues on` : 'issue on'} ${pathLabel}`,
      primaryKeyword: '',
      keywords: [],
      action: url
        ? `Fix the following ${n} issue${n > 1 ? 's' : ''} on ${url}:\n${fixList}`
        : `Fix the following ${n} site-wide issue${n > 1 ? 's' : ''}:\n${fixList}`,
      rationale: `${n} issue${n > 1 ? 's' : ''} found · Highest impact: ${issues[0].title} (${topImpact}/10)`,
      priority: topImpact >= 7 ? 'high' : topImpact >= 4 ? 'medium' : 'low',
      roiValue: 0,
      targetUrl: url,
    };
  });
}

// ─── Off-Page Posts (citations + link gaps) ───────────────────────────

// Universal citations every local business should be on
const UNIVERSAL_CITATIONS = [
  'Google Business Profile', 'Yelp', 'Facebook Business', 'Angi',
  'Better Business Bureau', 'Yellow Pages', 'Manta', 'Thumbtack',
  'Nextdoor', 'Foursquare', 'Apple Maps', 'Bing Places',
];

function buildOffPageItems(
  offPage: OffPageAuditData | null,
  count = 10,
): Omit<CalendarItemV2, 'week' | 'status'>[] {
  const items: Omit<CalendarItemV2, 'week' | 'status'>[] = [];

  // Missing citations from off-page audit
  const missingCitations = (offPage?.citations ?? []).filter(c => !c.found);

  // If no off-page audit data, suggest universal citation list as fallback
  const citationSources: string[] = missingCitations.length > 0
    ? missingCitations.map(c => c.source)
    : UNIVERSAL_CITATIONS;

  for (const source of citationSources.slice(0, Math.ceil(count * 0.65))) {
    items.push({
      id: makeId('cit', source),
      type: 'offpage_post' as const,
      title: `Submit to ${source}`,
      primaryKeyword: '',
      keywords: [],
      action: `Create or claim your business listing on ${source}. Ensure NAP (Name, Address, Phone) matches your Google Business Profile exactly. Add photos, business hours, and a keyword-rich description.`,
      rationale: missingCitations.length > 0
        ? `Missing citation on ${source} — citations improve local ranking trust signals`
        : `${source} is a high-authority citation source — consistent NAP improves local pack rankings`,
      priority: items.length < 3 ? 'high' : 'medium',
      roiValue: 0,
      targetPlatform: source,
    });
  }

  // Link gap opportunities
  const linkGaps = (offPage?.link_gaps ?? [])
    .sort((a, b) => b.domainRank - a.domainRank)
    .slice(0, Math.floor(count * 0.35));

  for (const gap of linkGaps) {
    items.push({
      id: makeId('link', gap.domain),
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
 * Optimal 12-week local SEO content schedule:
 *
 *  GBP Posts    — 1/week (every week, consistent presence in Maps/Search)
 *  Blog Posts   — every 3 weeks (wks 3, 6, 9, 12) — builds topical authority
 *  Page Fixes   — front-loaded (wks 1–6) — quick wins that compound early
 *  New Pages    — spread wks 1–8 — keyword gap pages take time to rank
 *  Off-Page     — 1/week starting wk 2 — citation + link-building cadence
 *
 * Target density: 3–4 tasks/week average, 2–5 range.
 */
function distributeToWeeks(
  gbp: Omit<CalendarItemV2, 'week' | 'status'>[],
  blogs: Omit<CalendarItemV2, 'week' | 'status'>[],
  webAdds: Omit<CalendarItemV2, 'week' | 'status'>[],
  webFixes: Omit<CalendarItemV2, 'week' | 'status'>[],
  offPage: Omit<CalendarItemV2, 'week' | 'status'>[],
  numWeeks = 12,
): CalendarItemV2[] {
  const result: CalendarItemV2[] = [];

  // GBP: 1 per week, every week
  for (let w = 1; w <= numWeeks; w++) {
    const item = gbp[w - 1];
    if (item) result.push({ ...item, week: w, status: 'scheduled' });
  }

  // Blogs: every 3 weeks starting at week 3 (3, 6, 9, 12)
  let blogIdx = 0;
  for (let w = 3; w <= numWeeks && blogIdx < blogs.length; w += 3) {
    result.push({ ...blogs[blogIdx], week: w, status: 'scheduled' });
    blogIdx++;
  }

  // Page fixes: front-loaded (weeks 1–6), up to 2/week in first 4 weeks
  let fixIdx = 0;
  for (let w = 1; w <= Math.min(6, numWeeks) && fixIdx < webFixes.length; w++) {
    result.push({ ...webFixes[fixIdx], week: w, status: 'scheduled' });
    fixIdx++;
    // Double up in weeks 1–4 if fixes are plentiful
    if (w <= 4 && fixIdx < webFixes.length) {
      result.push({ ...webFixes[fixIdx], week: w, status: 'scheduled' });
      fixIdx++;
    }
  }
  // Remaining fixes spread through weeks 7–10
  for (let w = 7; w <= Math.min(10, numWeeks) && fixIdx < webFixes.length; w++) {
    result.push({ ...webFixes[fixIdx], week: w, status: 'scheduled' });
    fixIdx++;
  }

  // New pages: weeks 1–8 (they need months to rank — start early)
  let addIdx = 0;
  for (let w = 1; w <= Math.min(8, numWeeks) && addIdx < webAdds.length; w++) {
    result.push({ ...webAdds[addIdx], week: w, status: 'scheduled' });
    addIdx++;
  }

  // Off-page: 1/week starting week 2, spread across all 12 weeks
  let opIdx = 0;
  for (let w = 2; w <= numWeeks && opIdx < offPage.length; w++) {
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
  enrichedKeywords?: EnrichedKeyword[],
  industryKey?: string,
): CalendarItemV2[] {
  // 0. Resolve per-service economics for this industry
  const industryProfile = industryKey
    ? INDUSTRY_PROFILES.find(p => p.key === industryKey || p.name.toLowerCase() === industryKey.toLowerCase())
    : null;
  const services = industryProfile?.services ?? undefined;

  // 1. Build keyword pool
  //    When enrichedKeywords provided: merge into MarketKeywordItem format + build lookup map
  //    When not provided: fall back to audit-only keywords (existing behaviour)
  let keywords: MarketKeywordItem[];
  let enrichedMap: Map<string, EnrichedKeyword> | undefined;

  if (enrichedKeywords && enrichedKeywords.length > 0) {
    // Convert enriched keywords to MarketKeywordItem shape so builders work unchanged
    keywords = enrichedKeywords.map(ek => ({
      keyword_data: {
        keyword: ek.keyword,
        keyword_info: { search_volume: ek.volume, cpc: ek.cpc ?? 0 },
      },
      ranked_serp_element: ek.currentRank != null
        ? { serp_item: { rank_group: ek.currentRank, url: '' } }
        : undefined,
    }));
    // Lookup map for enriched-ROI calculations inside builders
    enrichedMap = new Map(enrichedKeywords.map(ek => [ek.keyword.toLowerCase(), ek]));
  } else {
    const rawKeywords = collectAuditKeywords(siteAudit);
    keywords = dedupeKeywords(rawKeywords);
  }

  // 2. Page URL set for gap detection
  const pageUrls = buildPageUrlSet(siteAudit);

  // 3. Build each item pool
  const gbpItems = buildGBPItems(keywords, cfg, 12, enrichedMap, services);
  const blogItems = buildBlogItems(keywords, cfg, 4, enrichedMap);
  const addItems = buildWebsiteAdditions(keywords, pageUrls, cfg, 8, enrichedMap, services);
  const fixItems = buildPageFixTasks(siteAudit, 8);
  const opItems = buildOffPageItems(offPageAudit, 10);

  // 4. Distribute to weeks
  return distributeToWeeks(gbpItems, blogItems, addItems, fixItems, opItems, 12);
}
