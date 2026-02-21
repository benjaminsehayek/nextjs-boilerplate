// Site Audit Issue Detection — 40+ issue types
// Ported from SETUP-README.md generateDetailedIssues() (lines 2435-3100)

import type {
  CrawlData,
  DetailedIssue,
  IssueUrl,
  CrawledPage,
  CrawledResource,
  CrawledLink,
} from '@/components/tools/SiteAudit/types';
import { shortUrl } from './utils';

/**
 * Generate detailed issues from crawl data.
 * Each issue has severity, category, impact, effort, why, fix, and affected URLs.
 */
export function generateDetailedIssues(crawlData: CrawlData): DetailedIssue[] {
  const pages = crawlData.pages?.items || [];
  const links = crawlData.links?.items || [];
  const resources = crawlData.resources?.items || [];
  const dupes = crawlData.duplicateTags?.items || [];
  const dupeContent = crawlData.duplicateContent?.items || [];
  const nonIdx = crawlData.nonIndexable?.items || [];
  const redirects = crawlData.redirectChains?.items || [];
  const totalPages = pages.length || 1;

  // Pre-compute filtered sets
  const brokenLinks = links.filter((l) => l.status_code >= 400 || l.status_code === 0);
  const serverErrors = pages.filter((p) => p.status_code >= 500);
  const clientErrors = pages.filter((p) => p.status_code >= 400 && p.status_code < 500);
  const httpPages = pages.filter((p) => p.checks?.is_http);
  const noTitle = pages.filter((p) => !p.meta?.title);
  const noDesc = pages.filter((p) => !p.meta?.description);
  const noH1 = pages.filter((p) => !p.meta?.htags?.h1?.length);
  const multiH1 = pages.filter((p) => (p.meta?.htags?.h1?.length || 0) > 1);
  const shortTitle = pages.filter((p) => p.meta?.title && p.meta.title.length < 30);
  const longTitle = pages.filter((p) => p.meta?.title && p.meta.title.length > 60);
  const shortDesc = pages.filter((p) => p.meta?.description && p.meta.description.length < 70);
  const longDesc = pages.filter((p) => p.meta?.description && p.meta.description.length > 160);
  const thinPages = pages.filter((p) => (p.meta?.content?.plain_text_word_count || 0) < 300 && p.status_code === 200);
  const veryThinPages = pages.filter((p) => (p.meta?.content?.plain_text_word_count || 0) < 100 && p.status_code === 200);
  const noAlt = pages.filter((p) => p.checks?.no_image_alt);
  const heavyImages = resources.filter((r) => r.resource_type === 'image' && (r.size || 0) > 200000);
  const veryHeavyImages = resources.filter((r) => r.resource_type === 'image' && (r.size || 0) > 500000);
  const heavyScripts = resources.filter((r) => (r.resource_type === 'script' || r.resource_type === 'stylesheet') && (r.size || 0) > 100000);
  const brokenResources = resources.filter((r) => r.status_code >= 400);
  const dupeTitles = dupes.filter((d) => d.type === 'title');
  const dupeDescs = dupes.filter((d) => d.type === 'description');
  const noCanonical = pages.filter((p) => p.checks?.no_canonical);
  const longRedirects = redirects.filter((r) => (r.chain?.length || 0) > 2);

  // Additional checks
  const mixedContent = pages.filter((p) => p.checks?.https_to_http_links);
  const metaRefresh = pages.filter((p) => p.checks?.has_meta_refresh_redirect);
  const renderBlocking = pages.filter((p) => (p.meta?.render_blocking_scripts_count || 0) + (p.meta?.render_blocking_stylesheets_count || 0) > 5);
  const noDoctype = pages.filter((p) => p.checks?.no_doctype);
  const orphanPages = pages.filter((p) => p.checks?.is_orphan_page);
  const slowPages = pages.filter((p) => p.checks?.high_loading_time);
  const highTTFB = pages.filter((p) => p.checks?.high_waiting_time);
  const oversizedPages = pages.filter((p) => p.checks?.size_greater_than_3mb);
  const canonicalChain = pages.filter((p) => p.checks?.canonical_chain);
  const canonicalToRedirect = pages.filter((p) => p.checks?.canonical_to_redirect);
  const canonicalToBroken = pages.filter((p) => p.checks?.canonical_to_broken);
  const recursiveCanonical = pages.filter((p) => p.checks?.recursive_canonical);
  const notSeoFriendly = pages.filter((p) => p.checks?.seo_friendly_url === false);
  const irrelevantTitle = pages.filter((p) => p.checks?.irrelevant_title);
  const irrelevantDesc = pages.filter((p) => p.checks?.irrelevant_description);
  const deepPages = pages.filter((p) => (p.click_depth || 0) > 4 && p.status_code === 200);
  const poorInternalLinks = pages.filter((p) => (p.meta?.internal_links_count || 0) < 2 && p.status_code === 200);
  const tooManyLinks = pages.filter((p) => (p.meta?.internal_links_count || 0) + (p.meta?.external_links_count || 0) > 150);

  // Social / Open Graph
  const noOG = pages.filter((p) => {
    const smt = p.meta?.social_media_tags;
    if (!smt || typeof smt !== 'object') return true;
    return !smt['og:title'] && !smt['og:description'];
  });

  // Heading hierarchy
  const skippedHeadings = pages.filter((p) => {
    const ht = p.meta?.htags;
    if (!ht) return false;
    const levels: number[] = [];
    for (let i = 1; i <= 6; i++) { if (ht['h' + i]?.length) levels.push(i); }
    for (let i = 1; i < levels.length; i++) { if (levels[i] - levels[i - 1] > 1) return true; }
    return false;
  });

  const issues: DetailedIssue[] = [];
  const urlList = (arr: any[], prop = 'url'): IssueUrl[] =>
    arr.slice(0, 50).map((p) => ({ url: p[prop] || p.url || p.page || '—', status: p.status_code }));
  const linkUrlList = (arr: any[]): IssueUrl[] =>
    arr.slice(0, 50).map((l) => ({ url: l.url || l.link_to || '—', from: l.link_from || l.page_from || '', status: l.status_code }));

  // ── CRITICAL ──

  if (serverErrors.length) issues.push({
    severity: 'critical', category: 'Technical', title: 'Server Errors (5xx)',
    impact: 5, effort: 'hard', count: serverErrors.length, timeMin: 30,
    why: 'Pages returning 5xx server errors are completely inaccessible to users and search engines. Google will de-index pages that consistently return server errors.',
    fix: 'Check your server logs for root cause — common culprits: exhausted PHP memory, broken database connections, misconfigured .htaccess, or crashed processes.',
    urls: urlList(serverErrors),
  });

  if (httpPages.length) issues.push({
    severity: 'critical', category: 'Security', title: 'Insecure Pages (HTTP)',
    impact: 5, effort: 'medium', count: httpPages.length, timeMin: 20,
    why: 'Pages served over HTTP are flagged "Not Secure" by all major browsers. Google has confirmed HTTPS as a ranking signal.',
    fix: 'Install an SSL certificate (most hosts offer free Let\'s Encrypt). Implement 301 redirects from HTTP to HTTPS. Update internal links, canonical tags, and sitemap URLs.',
    urls: urlList(httpPages),
  });

  if (mixedContent.length) issues.push({
    severity: 'critical', category: 'Security', title: 'Mixed Content (HTTPS→HTTP Links)',
    impact: 4, effort: 'medium', count: mixedContent.length, timeMin: 15,
    why: 'These HTTPS pages contain links or resources loaded over insecure HTTP. Browsers block mixed content, breaking page functionality.',
    fix: 'Update all resource references to use HTTPS. Search your code and database for "http://" URLs and replace with "https://".',
    urls: urlList(mixedContent),
  });

  if (nonIdx.length) {
    const importantNonIdx = nonIdx.filter((p) => !p.url?.includes('/tag/') && !p.url?.includes('/author/') && !p.url?.includes('?'));
    if (importantNonIdx.length) issues.push({
      severity: 'critical', category: 'Technical', title: 'Important Pages Blocked from Indexing',
      impact: 5, effort: 'easy', count: importantNonIdx.length, timeMin: 5,
      why: 'These pages are excluded from search results due to noindex directives, robots.txt blocks, or canonical issues.',
      fix: 'Review each blocked page. Remove noindex tags if you want them indexed. Update robots.txt to allow crawling. Fix canonical tag issues.',
      urls: urlList(importantNonIdx),
    });
  }

  if (clientErrors.length) issues.push({
    severity: 'critical', category: 'Technical', title: 'Broken Pages (4xx Errors)',
    impact: 4, effort: 'medium', count: clientErrors.length, timeMin: 10,
    why: '404 and other 4xx errors create dead ends for users and crawlers. Link equity pointing to them is completely wasted.',
    fix: 'For each broken page: If moved, add 301 redirect. If intentionally removed, return 410 Gone. Update any internal links.',
    urls: urlList(clientErrors),
  });

  if (canonicalToBroken.length) issues.push({
    severity: 'critical', category: 'Technical', title: 'Canonical Tags Pointing to Broken Pages',
    impact: 5, effort: 'easy', count: canonicalToBroken.length, timeMin: 5,
    why: 'These pages have canonical tags pointing to URLs that return errors, effectively removing both pages from search results.',
    fix: 'Update the canonical tag on each page to point to a valid, accessible URL — typically the page itself.',
    urls: urlList(canonicalToBroken),
  });

  if (metaRefresh.length) issues.push({
    severity: 'critical', category: 'Technical', title: 'Meta Refresh Redirects Detected',
    impact: 4, effort: 'easy', count: metaRefresh.length, timeMin: 5,
    why: 'Meta refresh redirects are outdated. They pass little to no link equity and can be flagged as deceptive by Google.',
    fix: 'Replace all meta refresh redirects with proper 301 server-side redirects.',
    urls: urlList(metaRefresh),
  });

  // ── WARNING ──

  if (brokenLinks.length) issues.push({
    severity: 'warning', category: 'Links', title: 'Broken Links Detected',
    impact: 4, effort: 'easy', count: brokenLinks.length, timeMin: 2,
    why: 'Broken links hurt user experience and signal poor site maintenance to search engines.',
    fix: 'Update or remove each broken link. For internal links, redirect or fix the target URL. For external links, update or remove.',
    urls: linkUrlList(brokenLinks),
  });

  if (noTitle.length) issues.push({
    severity: 'warning', category: 'Meta', title: 'Missing Page Titles',
    impact: 4, effort: 'easy', count: noTitle.length, timeMin: 3,
    why: 'The title tag is the #1 on-page SEO element. It\'s the clickable headline in search results. Pages without titles are severely handicapped.',
    fix: 'Write a unique, descriptive title for each page. Keep 30–60 characters. Include primary keyword near the beginning.',
    urls: urlList(noTitle),
  });

  if (dupeTitles.length) issues.push({
    severity: 'warning', category: 'Meta', title: 'Duplicate Page Titles',
    impact: 3, effort: 'easy', count: dupeTitles.length, timeMin: 3,
    why: 'Identical titles cause keyword cannibalization — your own pages compete against each other.',
    fix: 'Make every title unique with differentiating details like product names, locations, or specific features.',
    urls: dupeTitles.slice(0, 25).map((d) => ({ url: d.title || d.tag || d.value || '—', status: d.total_count || d.count || 0 })),
  });

  if (longRedirects.length) issues.push({
    severity: 'warning', category: 'Technical', title: 'Long Redirect Chains (3+ hops)',
    impact: 4, effort: 'medium', count: longRedirects.length, timeMin: 10,
    why: 'Chains with 3+ hops significantly slow page loads. Google may stop following after 5 hops.',
    fix: 'Flatten each chain into a single redirect. A → B → C → D should become A → D directly.',
    urls: longRedirects.slice(0, 25).map((r) => ({ url: (r.chain || []).map((c) => shortUrl(c.url)).join(' → '), status: (r.chain?.length || 0) + ' hops' })),
  });

  if (redirects.length && redirects.length > longRedirects.length) issues.push({
    severity: 'warning', category: 'Technical', title: 'Redirect Chains Detected',
    impact: 3, effort: 'medium', count: redirects.length, timeMin: 10,
    why: 'Even 2-hop chains add ~100ms latency per hop and risk losing ~10-15% link equity per redirect.',
    fix: 'Simplify to single hops. Update internal links to point directly to final destination URLs.',
    urls: redirects.slice(0, 25).map((r) => ({ url: (r.chain || []).map((c) => shortUrl(c.url)).join(' → '), status: (r.chain?.length || 0) + ' hops' })),
  });

  if (veryThinPages.length) issues.push({
    severity: 'warning', category: 'Content', title: 'Very Thin Content (Under 100 Words)',
    impact: 3, effort: 'hard', count: veryThinPages.length, timeMin: 30,
    why: 'Pages under 100 words provide almost no value. Google\'s Helpful Content Update targets thin pages.',
    fix: 'Expand with valuable content (aim 500+ words), consolidate into a related page and redirect, or remove with 410.',
    urls: urlList(veryThinPages),
  });

  if (brokenResources.length) issues.push({
    severity: 'warning', category: 'Resources', title: 'Broken Resources (CSS/JS/Images)',
    impact: 3, effort: 'medium', count: brokenResources.length, timeMin: 10,
    why: 'Broken CSS breaks visual layout. Broken JS disables functionality. Broken images leave empty boxes.',
    fix: 'Fix or replace each resource. Re-upload missing files. Update moved references.',
    urls: brokenResources.slice(0, 25).map((r) => ({ url: r.url || '—', status: r.status_code })),
  });

  if (noCanonical.length) issues.push({
    severity: 'warning', category: 'Technical', title: 'Pages Missing Canonical Tags',
    impact: 3, effort: 'easy', count: noCanonical.length, timeMin: 2,
    why: 'Without canonicals, search engines must guess which URL version is "official." This splits ranking signals.',
    fix: 'Add a self-referencing canonical tag to every page. Ensure it matches preferred protocol.',
    urls: urlList(noCanonical),
  });

  if (canonicalChain.length) issues.push({
    severity: 'warning', category: 'Technical', title: 'Canonical Tag Chains',
    impact: 3, effort: 'easy', count: canonicalChain.length, timeMin: 5,
    why: 'Canonical tags pointing to another URL whose canonical points elsewhere. Google may ignore the entire signal.',
    fix: 'Ensure each canonical tag points directly to the final preferred URL — no intermediate steps.',
    urls: urlList(canonicalChain),
  });

  if (canonicalToRedirect.length) issues.push({
    severity: 'warning', category: 'Technical', title: 'Canonical Tags Pointing to Redirects',
    impact: 3, effort: 'easy', count: canonicalToRedirect.length, timeMin: 5,
    why: 'Canonical tags point to URLs that redirect. Google recommends canonicals point to the final destination.',
    fix: 'Update canonical tags to point to the final destination URL after the redirect.',
    urls: urlList(canonicalToRedirect),
  });

  if (recursiveCanonical.length) issues.push({
    severity: 'warning', category: 'Technical', title: 'Recursive Canonical Tags',
    impact: 4, effort: 'easy', count: recursiveCanonical.length, timeMin: 3,
    why: 'Circular canonical references. Google will ignore both canonical signals.',
    fix: 'Break the loop by choosing one definitive canonical URL for each set of pages.',
    urls: urlList(recursiveCanonical),
  });

  if (orphanPages.length) issues.push({
    severity: 'warning', category: 'Links', title: 'Orphan Pages (No Internal Links)',
    impact: 4, effort: 'medium', count: orphanPages.length, timeMin: 5,
    why: 'Orphan pages have zero internal links pointing to them, making them invisible to crawlers.',
    fix: 'Add internal links to each orphan page from relevant parent or sibling pages.',
    urls: urlList(orphanPages),
  });

  if (slowPages.length) issues.push({
    severity: 'warning', category: 'Performance', title: 'Slow Loading Pages',
    impact: 4, effort: 'hard', count: slowPages.length, timeMin: 30,
    why: 'Page speed is a confirmed Google ranking factor. Slow pages see 2-3x higher bounce rates.',
    fix: 'Compress images, minify CSS/JS, enable browser caching, reduce server response time, defer non-critical scripts.',
    urls: urlList(slowPages),
  });

  if (highTTFB.length) issues.push({
    severity: 'warning', category: 'Performance', title: 'High Server Response Time (TTFB)',
    impact: 4, effort: 'hard', count: highTTFB.length, timeMin: 60,
    why: 'TTFB above 600ms indicates server-side performance problems. Delays everything.',
    fix: 'Enable server-side caching (Redis, Varnish), optimize database queries, upgrade hosting, use CDN.',
    urls: urlList(highTTFB),
  });

  if (oversizedPages.length) issues.push({
    severity: 'warning', category: 'Performance', title: 'Oversized Pages (>3MB)',
    impact: 3, effort: 'medium', count: oversizedPages.length, timeMin: 15,
    why: 'Pages larger than 3MB take excessively long to load, especially on mobile.',
    fix: 'Compress images to WebP, minify HTML/CSS/JS, remove unused code, lazy-load non-critical resources.',
    urls: urlList(oversizedPages),
  });

  if (noDoctype.length) issues.push({
    severity: 'warning', category: 'Technical', title: 'Missing DOCTYPE Declaration',
    impact: 2, effort: 'easy', count: noDoctype.length, timeMin: 2,
    why: 'Without a DOCTYPE, browsers render in "quirks mode" causing inconsistent layout.',
    fix: 'Add <!DOCTYPE html> as the very first line of each page\'s HTML.',
    urls: urlList(noDoctype),
  });

  if (renderBlocking.length) issues.push({
    severity: 'warning', category: 'Performance', title: 'Excessive Render-Blocking Resources',
    impact: 3, effort: 'medium', count: renderBlocking.length, timeMin: 20,
    why: 'These pages have 5+ render-blocking scripts/stylesheets that delay visible content.',
    fix: 'Defer non-critical JavaScript with async/defer. Inline critical CSS. Move scripts to page bottom.',
    urls: urlList(renderBlocking),
  });

  // ── NOTICE ──

  if (noDesc.length) issues.push({
    severity: 'notice', category: 'Meta', title: 'Missing Meta Descriptions',
    impact: 2, effort: 'easy', count: noDesc.length, timeMin: 3,
    why: 'Meta descriptions control search result snippets. Without them, Google auto-generates often less compelling text.',
    fix: 'Write unique descriptions for each page. Keep 70–160 characters. Include primary keyword and call-to-action.',
    urls: urlList(noDesc),
  });

  if (noH1.length) issues.push({
    severity: 'notice', category: 'Content', title: 'Missing H1 Headings',
    impact: 2, effort: 'easy', count: noH1.length, timeMin: 2,
    why: 'The H1 signals to search engines what the page is about. Missing H1 is also an accessibility concern.',
    fix: 'Add a single, descriptive H1 to each page that includes the primary keyword.',
    urls: urlList(noH1),
  });

  if (multiH1.length) issues.push({
    severity: 'notice', category: 'Content', title: 'Multiple H1 Headings on Page',
    impact: 1, effort: 'easy', count: multiH1.length, timeMin: 2,
    why: 'Multiple H1 tags dilute heading hierarchy and confuse search engines about the primary topic.',
    fix: 'Keep one H1 per page. Demote others to H2 or lower.',
    urls: urlList(multiH1),
  });

  if (skippedHeadings.length) issues.push({
    severity: 'notice', category: 'Content', title: 'Broken Heading Hierarchy (Skipped Levels)',
    impact: 2, effort: 'easy', count: skippedHeadings.length, timeMin: 5,
    why: 'Pages skip heading levels (e.g. H1 → H3). Breaks semantic document outline.',
    fix: 'Fix the heading hierarchy so levels descend sequentially: H1 → H2 → H3.',
    urls: urlList(skippedHeadings),
  });

  if (dupeDescs.length) issues.push({
    severity: 'notice', category: 'Meta', title: 'Duplicate Meta Descriptions',
    impact: 2, effort: 'easy', count: dupeDescs.length, timeMin: 3,
    why: 'Identical descriptions miss opportunities to customize search snippets for each page.',
    fix: 'Write unique descriptions focusing on what makes each page different.',
    urls: dupeDescs.slice(0, 25).map((d) => ({ url: d.title || d.tag || d.value || '—', status: d.total_count || d.count || 0 })),
  });

  if (dupeContent.length) issues.push({
    severity: 'notice', category: 'Content', title: 'Duplicate Content Detected',
    impact: 3, effort: 'hard', count: dupeContent.length, timeMin: 30,
    why: 'Substantially similar pages cause keyword cannibalization and can trigger quality filters.',
    fix: 'Choose one primary version per set: Use canonical tags, consolidate with redirects, or add 60%+ unique content.',
    urls: dupeContent.slice(0, 25).map((d) => ({ url: d.url || d.page || d.page1 || '—', status: Math.round((d.similarity || 0) * 100) + '% similar' })),
  });

  const thinNotVery = thinPages.filter((p) => (p.meta?.content?.plain_text_word_count || 0) >= 100);
  if (thinNotVery.length) issues.push({
    severity: 'notice', category: 'Content', title: 'Thin Content Pages (100–300 Words)',
    impact: 2, effort: 'hard', count: thinNotVery.length, timeMin: 30,
    why: 'Pages with 100–300 words may lack depth to rank competitively.',
    fix: 'Expand content where it makes sense. Research top-ranking competitors and match their coverage.',
    urls: urlList(thinNotVery),
  });

  if (noOG.length && noOG.length < totalPages) issues.push({
    severity: 'notice', category: 'Social', title: 'Missing Open Graph / Social Meta Tags',
    impact: 2, effort: 'easy', count: noOG.length, timeMin: 3,
    why: 'Pages lack Open Graph tags. When shared on social media, they display generic previews.',
    fix: 'Add Open Graph meta tags to every page: og:title, og:description, og:image (minimum 1200×630px), og:url.',
    urls: urlList(noOG),
  });

  if (notSeoFriendly.length) issues.push({
    severity: 'notice', category: 'Technical', title: 'Non-SEO-Friendly URLs',
    impact: 2, effort: 'medium', count: notSeoFriendly.length, timeMin: 10,
    why: 'URLs contain parameters, session IDs, or non-descriptive characters.',
    fix: 'Restructure URLs to be short, descriptive, and keyword-rich. Use hyphens. Implement 301 redirects.',
    urls: urlList(notSeoFriendly),
  });

  if (irrelevantTitle.length) issues.push({
    severity: 'notice', category: 'Meta', title: 'Title Tags Don\'t Match Page Content',
    impact: 3, effort: 'easy', count: irrelevantTitle.length, timeMin: 5,
    why: 'Mismatched titles reduce rankings and may cause Google to rewrite your title in search results.',
    fix: 'Rewrite titles to accurately reflect each page\'s actual content.',
    urls: urlList(irrelevantTitle),
  });

  if (irrelevantDesc.length) issues.push({
    severity: 'notice', category: 'Meta', title: 'Meta Descriptions Don\'t Match Content',
    impact: 2, effort: 'easy', count: irrelevantDesc.length, timeMin: 5,
    why: 'Google will ignore irrelevant descriptions and auto-generate its own.',
    fix: 'Rewrite descriptions to accurately summarize each page\'s content.',
    urls: urlList(irrelevantDesc),
  });

  if (orphanPages.length === 0 && deepPages.length) issues.push({
    severity: 'notice', category: 'Links', title: 'Pages Buried Too Deep (4+ Clicks)',
    impact: 3, effort: 'medium', count: deepPages.length, timeMin: 15,
    why: 'Pages requiring 4+ clicks from the homepage receive less crawl attention and less link equity.',
    fix: 'Flatten site architecture. Add links to deep pages from higher-level category pages. Use breadcrumbs.',
    urls: urlList(deepPages),
  });

  if (poorInternalLinks.length) issues.push({
    severity: 'notice', category: 'Links', title: 'Pages with Very Few Internal Links',
    impact: 2, effort: 'easy', count: poorInternalLinks.length, timeMin: 5,
    why: 'Fewer than 2 internal links — not distributing link equity to other pages.',
    fix: 'Add relevant internal links to other pages. Aim for 3-5 contextual internal links per page.',
    urls: urlList(poorInternalLinks),
  });

  if (noAlt.length) issues.push({
    severity: 'notice', category: 'Accessibility', title: 'Images Missing Alt Text',
    impact: 2, effort: 'easy', count: noAlt.length, timeMin: 5,
    why: 'Images without alt text are invisible to screen readers and search engines.',
    fix: 'Add descriptive alt text to every image. Describe the image content, not just keywords.',
    urls: urlList(noAlt),
  });

  if (veryHeavyImages.length) issues.push({
    severity: 'notice', category: 'Resources', title: 'Very Large Images (>500KB)',
    impact: 3, effort: 'easy', count: veryHeavyImages.length, timeMin: 5,
    why: 'Images over 500KB significantly slow page loads, especially on mobile.',
    fix: 'Compress images using WebP format. Use responsive image srcsets. Consider lazy loading.',
    urls: veryHeavyImages.slice(0, 25).map((r) => ({ url: r.url || '—', status: r.size })),
  });

  if (heavyImages.length > veryHeavyImages.length) {
    const moderateImages = heavyImages.filter((i) => (i.size || 0) <= 500000);
    if (moderateImages.length) issues.push({
      severity: 'notice', category: 'Resources', title: 'Oversized Images (200-500KB)',
      impact: 2, effort: 'easy', count: moderateImages.length, timeMin: 5,
      why: 'Images over 200KB can be compressed further for faster load times.',
      fix: 'Compress these images. Most can be reduced 50-80% without visible quality loss.',
      urls: moderateImages.slice(0, 25).map((r) => ({ url: r.url || '—', status: r.size })),
    });
  }

  if (heavyScripts.length) issues.push({
    severity: 'notice', category: 'Resources', title: 'Large Scripts/Stylesheets (>100KB)',
    impact: 2, effort: 'medium', count: heavyScripts.length, timeMin: 10,
    why: 'Large unminified scripts and stylesheets block rendering and increase load times.',
    fix: 'Minify and compress all JS/CSS files. Use code splitting and tree shaking. Defer non-critical scripts.',
    urls: heavyScripts.slice(0, 25).map((r) => ({ url: r.url || '—', status: r.size })),
  });

  if (shortTitle.length) issues.push({
    severity: 'notice', category: 'Meta', title: 'Short Page Titles (<30 characters)',
    impact: 1, effort: 'easy', count: shortTitle.length, timeMin: 3,
    why: 'Titles under 30 characters waste valuable SERP real estate and may not fully describe page content.',
    fix: 'Expand titles to 30-60 characters with relevant keywords and compelling descriptions.',
    urls: urlList(shortTitle),
  });

  if (longTitle.length) issues.push({
    severity: 'notice', category: 'Meta', title: 'Long Page Titles (>60 characters)',
    impact: 1, effort: 'easy', count: longTitle.length, timeMin: 3,
    why: 'Titles over 60 characters get truncated in search results, hiding important information.',
    fix: 'Trim titles to under 60 characters. Put the most important keywords first.',
    urls: urlList(longTitle),
  });

  return issues;
}

/**
 * Generate quick wins from issues — easy/medium effort with high impact.
 * Returns issues sorted by estimated score improvement.
 */
export function generateQuickWins(issues: DetailedIssue[]): DetailedIssue[] {
  return issues
    .filter((i) => i.effort !== 'hard' && i.impact >= 3)
    .sort((a, b) => {
      // Sort by impact desc, then effort asc
      if (b.impact !== a.impact) return b.impact - a.impact;
      const effortOrder = { easy: 0, medium: 1, hard: 2 };
      return effortOrder[a.effort] - effortOrder[b.effort];
    });
}
