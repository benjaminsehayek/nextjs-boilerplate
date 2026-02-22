// Content gap detection and page-to-keyword mapping

import { PAGE_TYPE_PATTERNS } from './constants';
import type { KeywordClusterResult } from './keywords';

export interface CrawledPage {
  url: string;
  path: string;
  title: string;
  h1: string;
  desc: string;
  wordCount: number;
  internalLinks: number;
  type: 'homepage' | 'blog' | 'service' | 'location' | 'other';
}

export interface ContentMapItem {
  type: 'service' | 'location' | 'blog';
  status: 'existing' | 'gap' | 'cannibalized';
  url: string;
  path: string;
  title: string;
  keywords: string[];
  primaryKeyword: string;
  totalVolume: number;
  totalRoi: number;
  wordCount: number;
  clusterId: number;
}

/** Classify a page based on URL and title patterns */
export function classifyPage(url: string, title: string): CrawledPage['type'] {
  const path = url.toLowerCase();

  // Homepage
  if (path === '/' || /^\/?index\.html?$/i.test(path) || path.split('/').filter(Boolean).length === 0) {
    return 'homepage';
  }

  // Check patterns
  for (const pat of PAGE_TYPE_PATTERNS.blog) {
    if (pat.test(path) || pat.test(title)) return 'blog';
  }
  for (const pat of PAGE_TYPE_PATTERNS.service) {
    if (pat.test(path)) return 'service';
  }
  for (const pat of PAGE_TYPE_PATTERNS.location) {
    if (pat.test(path)) return 'location';
  }

  return 'other';
}

/** Check if a page matches a keyword cluster (>50% word overlap) */
function pageMatchesCluster(page: CrawledPage, cluster: KeywordClusterResult): boolean {
  const pageText = `${page.title} ${page.h1} ${page.path}`.toLowerCase();
  const leaderWords = cluster.leader.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (leaderWords.length === 0) return false;

  let matchCount = 0;
  for (const word of leaderWords) {
    if (pageText.includes(word)) matchCount++;
  }

  return matchCount / leaderWords.length >= 0.5;
}

/** Build content map: map existing pages to clusters, detect gaps */
export function buildContentMap(
  clusters: KeywordClusterResult[],
  crawledPages: CrawledPage[],
  domain: string,
): ContentMapItem[] {
  const items: ContentMapItem[] = [];

  for (const cluster of clusters) {
    // Try to find a matching existing page
    const matchingPage = crawledPages.find(p => pageMatchesCluster(p, cluster));

    if (matchingPage) {
      // Existing content
      items.push({
        type: cluster.pageType,
        status: 'existing',
        url: matchingPage.url,
        path: matchingPage.path,
        title: matchingPage.title || cluster.leader,
        keywords: cluster.keywords,
        primaryKeyword: cluster.leader,
        totalVolume: cluster.totalVolume,
        totalRoi: cluster.totalRoi,
        wordCount: matchingPage.wordCount,
        clusterId: cluster.id,
      });
    } else if (cluster.totalVolume > 10 && cluster.totalRoi > 50) {
      // Content gap — generate proposed URL
      const slug = cluster.leader
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let basePath: string;
      switch (cluster.pageType) {
        case 'service':
          basePath = '/services/';
          break;
        case 'location':
          basePath = '/areas-served/';
          break;
        case 'blog':
          basePath = '/blog/';
          break;
      }

      const proposedPath = `${basePath}${slug}/`;

      items.push({
        type: cluster.pageType,
        status: 'gap',
        url: `https://${domain}${proposedPath}`,
        path: proposedPath,
        title: toTitleCase(cluster.leader),
        keywords: cluster.keywords,
        primaryKeyword: cluster.leader,
        totalVolume: cluster.totalVolume,
        totalRoi: cluster.totalRoi,
        wordCount: 0,
        clusterId: cluster.id,
      });
    }
  }

  // Sort by ROI desc
  return items.sort((a, b) => b.totalRoi - a.totalRoi);
}

/** Convert a string to title case */
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}
