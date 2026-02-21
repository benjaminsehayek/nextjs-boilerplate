// Site Audit Scoring Engine — 10-category weighted scoring
// Ported from SETUP-README.md computeScores() (lines 2092-2240)

import type {
  CrawlData,
  CategoryScores,
  CategoryScore,
  ScoreCategoryId,
  SCORE_WEIGHTS,
  LighthouseData,
  CrawledPage,
} from '@/components/tools/SiteAudit/types';

const WEIGHTS: Record<ScoreCategoryId, number> = {
  meta: 1.0,
  content: 1.2,
  links: 1.3,
  resources: 0.8,
  performance: 1.1,
  accessibility: 0.8,
  technical: 1.2,
  seo: 1.1,
  social: 0.6,
  security: 1.3,
};

/**
 * Compute all 10 category scores + weighted overall from crawl data.
 */
export function computeScores(crawlData: CrawlData): CategoryScores {
  const summary = crawlData.summary || {};
  const pages = crawlData.pages?.items || [];
  const resources = crawlData.resources?.items || [];
  const links = crawlData.links?.items || [];
  const dupes = crawlData.duplicateTags?.items || [];
  const dupeContent = crawlData.duplicateContent?.items || [];
  const nonIdx = crawlData.nonIndexable?.items || [];
  const redirects = crawlData.redirectChains?.items || [];
  const lh = crawlData.lighthouse;
  const totalPages = pages.length || 1;

  const scores: Record<string, CategoryScore> = {};

  // ── Meta Tags ──
  let noTitle = 0, noDesc = 0, shortTitle = 0, longTitle = 0, shortDesc = 0, longDesc = 0, noCanonical = 0;
  pages.forEach((p) => {
    const m = p.meta || {};
    if (!m.title) noTitle++;
    else {
      const tl = (m.title || '').length;
      if (tl < 30) shortTitle++;
      if (tl > 60) longTitle++;
    }
    if (!m.description) noDesc++;
    else {
      const dl = (m.description || '').length;
      if (dl < 70) shortDesc++;
      if (dl > 160) longDesc++;
    }
    if (p.checks?.no_canonical) noCanonical++;
  });
  const dupeTitles = dupes.filter((d) => d.type === 'title').length;
  const dupeDescs = dupes.filter((d) => d.type === 'description').length;
  let metaScore = 100;
  metaScore -= Math.min(30, (noTitle / totalPages) * 100);
  metaScore -= Math.min(25, (noDesc / totalPages) * 100);
  metaScore -= Math.min(10, ((shortTitle + longTitle) / totalPages) * 50);
  metaScore -= Math.min(10, ((shortDesc + longDesc) / totalPages) * 50);
  metaScore -= Math.min(10, (dupeTitles / Math.max(1, totalPages)) * 50);
  metaScore -= Math.min(10, (dupeDescs / Math.max(1, totalPages)) * 50);
  scores.meta = { score: Math.max(0, Math.round(metaScore)), label: 'Meta Tags', issues: noTitle + noDesc + dupeTitles + dupeDescs };

  // ── Content ──
  let thinPages = 0, noH1 = 0, multiH1 = 0, lowReadability = 0;
  pages.forEach((p) => {
    const wc = p.meta?.content?.plain_text_word_count || 0;
    if (wc < 300) thinPages++;
    const h1s = p.meta?.htags?.h1 || [];
    if (h1s.length === 0) noH1++;
    if (h1s.length > 1) multiH1++;
    const ari = p.meta?.content?.automated_readability_index || 0;
    if (ari > 14) lowReadability++;
  });
  let contentScore = 100;
  contentScore -= Math.min(35, (thinPages / totalPages) * 100);
  contentScore -= Math.min(20, (noH1 / totalPages) * 80);
  contentScore -= Math.min(10, (multiH1 / totalPages) * 60);
  contentScore -= Math.min(10, (dupeContent.length / Math.max(1, totalPages)) * 60);
  contentScore -= Math.min(10, (lowReadability / totalPages) * 50);
  scores.content = { score: Math.max(0, Math.round(contentScore)), label: 'Content', issues: thinPages + noH1 + dupeContent.length };

  // ── Links ──
  const brokenLinks = links.filter((l) => l.status_code >= 400 || l.status_code === 0);
  const redirectLinks = links.filter((l) => l.status_code >= 300 && l.status_code < 400);
  let linkScore = 100;
  linkScore -= Math.min(40, brokenLinks.length * 3);
  linkScore -= Math.min(20, redirectLinks.length * 0.5);
  linkScore -= Math.min(15, redirects.length * 2);
  scores.links = { score: Math.max(0, Math.round(linkScore)), label: 'Links', issues: brokenLinks.length };

  // ── Resources ──
  const images = resources.filter((r) => r.resource_type === 'image');
  const scripts = resources.filter((r) => r.resource_type === 'script');
  const styles = resources.filter((r) => r.resource_type === 'stylesheet');
  const heavyImages = images.filter((i) => (i.size || 0) > 200000);
  const heavyScripts = scripts.filter((s) => (s.size || 0) > 100000);
  let resScore = 100;
  resScore -= Math.min(30, heavyImages.length * 2);
  resScore -= Math.min(25, heavyScripts.length * 3);
  resScore -= Math.min(15, Math.max(0, scripts.length - 30));
  resScore -= Math.min(10, Math.max(0, styles.length - 10) * 2);
  scores.resources = { score: Math.max(0, Math.round(resScore)), label: 'Resources', issues: heavyImages.length + heavyScripts.length };

  // ── Performance (Lighthouse or heuristic) ──
  if (lh?.categories?.performance?.score != null) {
    scores.performance = { score: Math.round(lh.categories.performance.score * 100), label: 'Performance', issues: 0 };
  } else {
    let perfScore = 70;
    perfScore -= Math.min(20, heavyImages.length * 3);
    perfScore -= Math.min(15, heavyScripts.length * 4);
    perfScore -= Math.min(10, Math.max(0, scripts.length - 20));
    const noEncoding = pages.filter((p) => p.checks?.no_content_encoding).length;
    perfScore -= Math.min(10, noEncoding > 0 ? 10 : 0);
    const totalResSize = resources.reduce((a, r) => a + (r.size || 0), 0);
    perfScore -= Math.min(10, Math.max(0, (totalResSize / 1024 / 1024) - 3) * 5);
    const perfIssues = heavyImages.length + heavyScripts.length + (noEncoding > 0 ? 1 : 0);
    scores.performance = { score: Math.min(100, Math.max(0, Math.round(perfScore))), label: 'Performance', issues: perfIssues };
  }

  // ── Accessibility (Lighthouse or heuristic) ──
  if (lh?.categories?.accessibility?.score != null) {
    scores.accessibility = { score: Math.round(lh.categories.accessibility.score * 100), label: 'Accessibility', issues: 0 };
  } else {
    const noAlt = pages.filter((p) => p.checks?.no_image_alt).length;
    scores.accessibility = { score: Math.max(0, Math.round(100 - (noAlt / totalPages) * 60)), label: 'Accessibility', issues: noAlt };
  }

  // ── Technical ──
  const httpPages = pages.filter((p) => p.checks?.is_http);
  let techScore = 100;
  techScore -= Math.min(30, nonIdx.length * 1.5);
  techScore -= Math.min(20, redirects.length * 2);
  techScore -= Math.min(30, httpPages.length > 0 ? 30 : 0);
  const brokenPages = pages.filter((p) => p.status_code >= 400);
  techScore -= Math.min(20, brokenPages.length * 3);
  scores.technical = { score: Math.max(0, Math.round(techScore)), label: 'Technical', issues: nonIdx.length + redirects.length + brokenPages.length };

  // ── SEO (Lighthouse or heuristic) ──
  if (lh?.categories?.seo?.score != null) {
    scores.seo = { score: Math.round(lh.categories.seo.score * 100), label: 'SEO', issues: 0 };
  } else {
    let seoScore = 100;
    seoScore -= (noTitle / totalPages) * 30;
    seoScore -= (noDesc / totalPages) * 20;
    seoScore -= (noCanonical / totalPages) * 15;
    seoScore -= (noH1 / totalPages) * 15;
    scores.seo = { score: Math.max(0, Math.round(seoScore)), label: 'SEO', issues: 0 };
  }

  // ── Social (Open Graph) ──
  const noOGPages = pages.filter((p) => {
    const smt = p.meta?.social_media_tags;
    if (!smt || typeof smt !== 'object') return true;
    return !smt['og:title'] && !smt['og:description'];
  });
  let socialScore = 100;
  socialScore -= Math.min(60, (noOGPages.length / totalPages) * 80);
  scores.social = { score: Math.max(0, Math.round(socialScore)), label: 'Social', issues: noOGPages.length };

  // ── Security ──
  const mixedContentPages = pages.filter((p) => p.checks?.https_to_http_links);
  let secScore = 100;
  secScore -= Math.min(40, httpPages.length > 0 ? 40 : 0);
  secScore -= Math.min(30, mixedContentPages.length * 3);
  const sslValid = (summary as any).domain_info?.ssl_info?.valid_certificate;
  if (sslValid === false) secScore -= 30;
  scores.security = { score: Math.max(0, Math.round(secScore)), label: 'Security', issues: httpPages.length + mixedContentPages.length };

  // ── Overall (weighted average) ──
  let wSum = 0, wTotal = 0;
  Object.entries(scores).forEach(([k, v]) => {
    const w = WEIGHTS[k as ScoreCategoryId] || 1;
    wSum += v.score * w;
    wTotal += w;
  });
  const overall = Math.round(wSum / wTotal);

  return { ...scores, _overall: overall } as CategoryScores;
}

/**
 * Compute per-page health score (0-100).
 */
export function computePageHealth(page: CrawledPage): number {
  let score = 100;
  const c = page.checks || {};
  const m = page.meta || {};

  // Status code
  if (page.status_code >= 400) score -= 40;
  else if (page.status_code >= 300) score -= 10;

  // Meta
  if (!m.title) score -= 15;
  if (!m.description) score -= 10;
  if (c.no_canonical) score -= 5;
  if (c.duplicate_title) score -= 10;

  // Content
  const wc = m.content?.plain_text_word_count || 0;
  if (wc < 100) score -= 20;
  else if (wc < 300) score -= 10;

  // Headings
  const h1s = m.htags?.h1 || [];
  if (h1s.length === 0) score -= 10;
  if (h1s.length > 1) score -= 5;

  // Performance
  if (page.page_timing?.duration_time && page.page_timing.duration_time > 3) score -= 10;
  if (c.no_content_encoding) score -= 5;

  // Images
  if (c.no_image_alt) score -= 5;

  // Security
  if (c.is_http) score -= 15;
  if (c.https_to_http_links) score -= 10;

  // Social
  const smt = m.social_media_tags;
  if (!smt || (!smt['og:title'] && !smt['og:description'])) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Estimate how much fixing a set of issues would raise the overall score.
 */
export function estimateScoreImpact(
  currentScores: CategoryScores,
  issuesToFix: Array<{ category: string; scoreImpact: number }>
): number {
  const newScores = { ...currentScores };

  for (const issue of issuesToFix) {
    const cat = issue.category.toLowerCase() as ScoreCategoryId;
    if (newScores[cat]) {
      newScores[cat] = {
        ...newScores[cat],
        score: Math.min(100, newScores[cat].score + issue.scoreImpact),
      };
    }
  }

  // Recompute overall
  let wSum = 0, wTotal = 0;
  Object.entries(WEIGHTS).forEach(([k, w]) => {
    const catScore = (newScores as any)[k];
    if (catScore) {
      wSum += catScore.score * w;
      wTotal += w;
    }
  });

  return Math.round(wSum / wTotal);
}
