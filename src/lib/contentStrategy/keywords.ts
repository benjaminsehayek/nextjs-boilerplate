// Keyword generation, similarity, and clustering

import type { FunnelStage } from './funnel';
import { KW_MODIFIERS, KW_QUESTIONS } from './constants';

export interface GeneratedKeyword {
  keyword: string;
  serviceName: string;
  type: 'service' | 'location' | 'question';
}

export interface EnrichedKeyword {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  difficulty: number;
  trend: number[];
  funnel: FunnelStage;
  pageType: 'service' | 'location' | 'blog';
  serviceName: string;
  sources: string[];
}

export interface KeywordClusterResult {
  id: number;
  name: string;
  leader: string;
  keywords: string[];
  totalVolume: number;
  totalRoi: number;
  funnel: FunnelStage;
  pageType: 'service' | 'location' | 'blog';
}

/** Generate candidate keywords from services x locations x modifiers */
export function generateKeywords(
  services: { name: string }[],
  locations: string[],
  brand: string,
): GeneratedKeyword[] {
  const keywords: GeneratedKeyword[] = [];
  const seen = new Set<string>();

  function add(kw: string, serviceName: string, type: GeneratedKeyword['type']) {
    const normalized = kw.toLowerCase().trim();
    if (normalized.length < 3 || normalized.length > 80 || seen.has(normalized)) return;
    seen.add(normalized);
    keywords.push({ keyword: normalized, serviceName, type });
  }

  for (const svc of services) {
    const svcName = svc.name.toLowerCase();

    // Base service keyword
    add(svcName, svc.name, 'service');

    // Service + modifiers
    for (const mod of KW_MODIFIERS) {
      add(`${mod} ${svcName}`, svc.name, 'service');
      add(`${svcName} ${mod}`, svc.name, 'service');
    }

    // Service + questions
    for (const q of KW_QUESTIONS) {
      add(`${q} ${svcName}`, svc.name, 'question');
    }

    // Service + locations
    for (const loc of locations) {
      const locLower = loc.toLowerCase();
      add(`${svcName} ${locLower}`, svc.name, 'location');
      add(`${svcName} in ${locLower}`, svc.name, 'location');
      add(`${locLower} ${svcName}`, svc.name, 'location');
      add(`best ${svcName} ${locLower}`, svc.name, 'location');
      add(`${svcName} near ${locLower}`, svc.name, 'location');
    }

    // Service + brand
    if (brand) {
      add(`${brand.toLowerCase()} ${svcName}`, svc.name, 'service');
    }
  }

  return keywords;
}

/** Calculate Jaccard-like similarity between two keywords */
export function keywordSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }

  const total = new Set([...wordsA, ...wordsB]).size;
  if (total === 0) return 0;

  return (2 * common) / (wordsA.size + wordsB.size);
}

/** Cluster keywords by similarity (>= threshold) */
export function clusterKeywords(
  keywords: Array<{ keyword: string; searchVolume: number; roi: number; funnel: FunnelStage; pageType: 'service' | 'location' | 'blog' }>,
  threshold = 0.55,
): KeywordClusterResult[] {
  const assigned = new Set<number>();
  const clusters: KeywordClusterResult[] = [];

  // Sort by volume desc so highest-volume becomes leader
  const sorted = keywords.map((k, i) => ({ ...k, idx: i })).sort((a, b) => b.searchVolume - a.searchVolume);

  for (const kw of sorted) {
    if (assigned.has(kw.idx)) continue;

    const cluster: number[] = [kw.idx];
    assigned.add(kw.idx);

    for (const other of sorted) {
      if (assigned.has(other.idx)) continue;
      if (keywordSimilarity(kw.keyword, other.keyword) >= threshold) {
        cluster.push(other.idx);
        assigned.add(other.idx);
      }
    }

    const clusterKeywords = cluster.map(i => keywords[i]);
    const totalVolume = clusterKeywords.reduce((s, k) => s + k.searchVolume, 0);
    const totalRoi = clusterKeywords.reduce((s, k) => s + k.roi, 0);

    // Funnel = most common among cluster members
    const funnelCounts: Record<string, number> = {};
    const pageCounts: Record<string, number> = {};
    for (const ck of clusterKeywords) {
      funnelCounts[ck.funnel] = (funnelCounts[ck.funnel] || 0) + 1;
      pageCounts[ck.pageType] = (pageCounts[ck.pageType] || 0) + 1;
    }

    const funnel = Object.entries(funnelCounts).sort((a, b) => b[1] - a[1])[0][0] as FunnelStage;
    const pageType = Object.entries(pageCounts).sort((a, b) => b[1] - a[1])[0][0] as 'service' | 'location' | 'blog';

    clusters.push({
      id: clusters.length,
      name: kw.keyword,
      leader: kw.keyword,
      keywords: clusterKeywords.map(k => k.keyword),
      totalVolume,
      totalRoi,
      funnel,
      pageType,
    });
  }

  return clusters;
}

/** Determine page type for a keyword based on its characteristics */
export function determinePageType(keyword: string, type: GeneratedKeyword['type']): 'service' | 'location' | 'blog' {
  if (type === 'question') return 'blog';
  if (type === 'location') return 'location';

  const kw = keyword.toLowerCase();
  // Questions → blog
  if (/^(how|what|why|when|where|can|do|does|is|are|should)\b/i.test(kw)) return 'blog';
  if (/\b(cost|price|guide|tips|ideas|diy|tutorial|vs)\b/i.test(kw)) return 'blog';

  return 'service';
}
