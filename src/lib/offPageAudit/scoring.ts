// ═══ Domain Category Scores ═══

/** Authority Score (0-100): based on DataForSEO rank and link profile size */
export function calcAuthorityScore(rank: number, referringDomains: number, backlinks: number): number {
  let score = 0;
  if (rank >= 200) score = 90;
  else if (rank >= 100) score = 70;
  else if (rank >= 50) score = 50;
  else if (rank >= 20) score = 35;
  else if (rank >= 5) score = 20;
  else if (backlinks > 0) score = 5;

  if (referringDomains > 100) score += 15;
  else if (referringDomains > 30) score += 8;

  return Math.min(100, score);
}

/** Citations Score (0-100): found / total */
export function calcCitationsScore(foundCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((foundCount / totalCount) * 100);
}

/** Quality Score (0-100): dofollow ratio, spam score, broken backlinks */
export function calcQualityScore(dofollowRatio: number, spamScore: number, brokenBacklinks: number): number {
  let score = 50;

  // Dofollow ratio
  if (dofollowRatio >= 0.60 && dofollowRatio <= 0.85) score += 20;
  else if (dofollowRatio >= 0.40) score += 10;
  else score -= 10;

  // Spam score
  if (spamScore < 10) score += 15;
  else if (spamScore < 20) score += 5;
  else score -= 15;

  // Broken backlinks
  if (brokenBacklinks < 5) score += 10;
  else if (brokenBacklinks >= 20) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/** Local Links Score (0-100): % of local links, plus chamber/gov bonuses */
export function calcLocalLinksScore(localRatio: number, hasChamberLinks: boolean, hasGovLinks: boolean): number {
  let score = 0;
  if (localRatio >= 0.30) score = 85;
  else if (localRatio >= 0.15) score = 60;
  else if (localRatio >= 0.05) score = 35;
  else score = 10;

  if (hasChamberLinks) score += 10;
  if (hasGovLinks) score += 10;

  return Math.min(100, score);
}

/** Anchors Score (0-100): diversity and branded ratio */
export function calcAnchorsScore(uniqueAnchorCount: number, brandedRatio: number): number {
  let score = 50;

  if (uniqueAnchorCount > 15) score += 15;
  else if (uniqueAnchorCount >= 5) score += 5;

  if (brandedRatio >= 0.30 && brandedRatio <= 0.70) score += 25;
  else if (brandedRatio >= 0.20) score += 10;

  return Math.min(100, score);
}

/** Domain Overall: average of 5 category scores */
export function calcDomainOverall(scores: { authority: number; citations: number; quality: number; localLinks: number; anchors: number }): number {
  const values = [scores.authority, scores.citations, scores.quality, scores.localLinks, scores.anchors];
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

// ═══ Location Scores ═══

/** Reviews Score (0-100): rating, count, velocity, sentiment, response rate */
export function calcReviewsScore(
  rating: number,
  count: number,
  velocity30d: number,
  velocity90d: number,
  sentimentPositiveRatio: number,
  responseRate: number,
): number {
  let score = 0;

  // Rating component
  if (rating >= 4.7) score += 30;
  else if (rating >= 4.5) score += 27;
  else if (rating >= 4.2) score += 23;
  else if (rating >= 4.0) score += 18;
  else if (rating >= 3.5) score += 12;
  else score += 6;

  // Count component
  if (count >= 200) score += 25;
  else if (count >= 100) score += 22;
  else if (count >= 50) score += 18;
  else if (count >= 25) score += 14;
  else if (count >= 10) score += 9;
  else score += 5;

  // Velocity component
  if (velocity30d >= 5) score += 20;
  else if (velocity30d >= 2) score += 16;
  else if (velocity90d >= 5) score += 12;
  else if (velocity90d >= 2) score += 8;
  else score += 4;

  // Sentiment component
  if (sentimentPositiveRatio >= 0.85) score += 15;
  else if (sentimentPositiveRatio >= 0.70) score += 11;
  else score += 6;

  // Response rate component
  if (responseRate >= 0.80) score += 10;
  else if (responseRate >= 0.50) score += 7;
  else score += 4;

  return Math.min(100, score);
}

/** NAP Consistency Score (0-100): starts at 100, deductions for missing/mismatched fields */
export function calcNAPScore(
  hasName: boolean,
  hasAddress: boolean,
  hasPhone: boolean,
  nameMatch: boolean,
  addressMatch: boolean,
  phoneMatch: boolean,
): number {
  let score = 100;
  if (!hasName) score -= 20;
  if (!hasAddress) score -= 20;
  if (!hasPhone) score -= 20;
  if (hasName && !nameMatch) score -= 15;
  if (hasAddress && !addressMatch) score -= 10;
  if (hasPhone && !phoneMatch) score -= 10;
  return Math.max(0, score);
}

/** GBP Completeness Score (0-100): sum of earned points / total possible */
export function calcGBPScore(items: { points: number; maxPoints: number }[]): number {
  const earned = items.reduce((sum, item) => sum + item.points, 0);
  const max = items.reduce((sum, item) => sum + item.maxPoints, 0);
  if (max === 0) return 0;
  return Math.round((earned / max) * 100);
}

/** Location Overall: weighted average of Reviews (40%), NAP (25%), GBP (35%) */
export function calcLocationOverall(reviewsScore: number, napScore: number, gbpScore: number): number {
  return Math.round(reviewsScore * 0.4 + napScore * 0.25 + gbpScore * 0.35);
}

// ═══ Toxic Link Detection ═══

import { SPAM_TLDS } from './constants';

export interface ToxicLinkResult {
  domain: string;
  reason: 'pbn' | 'spam_tld' | 'random_domain';
  backlinks: number;
  rank: number;
}

/** Detect toxic links from referring domain data */
export function detectToxicLinks(domains: { domain: string; rank: number; backlinks: number }[]): ToxicLinkResult[] {
  const toxic: ToxicLinkResult[] = [];

  for (const d of domains) {
    // PBN detection: zero rank but many backlinks
    if (d.rank === 0 && d.backlinks > 50) {
      toxic.push({ domain: d.domain, reason: 'pbn', backlinks: d.backlinks, rank: d.rank });
      continue;
    }

    // Spam TLD detection
    const hasSpamTld = SPAM_TLDS.some(tld => d.domain.endsWith(tld));
    if (hasSpamTld) {
      toxic.push({ domain: d.domain, reason: 'spam_tld', backlinks: d.backlinks, rank: d.rank });
      continue;
    }

    // Random domain detection: low rank, long domain, many digits
    const digitCount = (d.domain.match(/\d/g) || []).length;
    if (d.rank < 5 && d.domain.length > 25 && digitCount >= 3) {
      toxic.push({ domain: d.domain, reason: 'random_domain', backlinks: d.backlinks, rank: d.rank });
    }
  }

  return toxic;
}

// ═══ Social & Local Link Detection ═══

import { SOCIAL_PLATFORMS, type SocialPlatform } from './constants';

export interface SocialPresenceResult {
  platform: string;
  icon: string;
  found: boolean;
  domain: string;
}

/** Detect social presence from referring domains */
export function detectSocialPresence(referringDomainNames: string[]): SocialPresenceResult[] {
  const domainSet = new Set(referringDomainNames.map(d => d.toLowerCase()));

  return SOCIAL_PLATFORMS.map((p: SocialPlatform) => {
    const allDomains = [p.domain, ...(p.altDomains || [])];
    const found = allDomains.some(pd => 
      domainSet.has(pd) || [...domainSet].some(d => d.endsWith('.' + pd))
    );
    return { platform: p.name, icon: p.icon, found, domain: p.domain };
  });
}

/** Estimate local link ratio from referring domains (domains containing location-related terms) */
export function estimateLocalRatio(referringDomainNames: string[]): { ratio: number; hasChamber: boolean; hasGov: boolean } {
  const localPatterns = [
    /chamber/i, /\.gov$/i, /local/i, /city/i, /county/i,
    /state\./i, /municipal/i, /rotary/i, /kiwanis/i,
  ];

  let localCount = 0;
  let hasChamber = false;
  let hasGov = false;

  for (const domain of referringDomainNames) {
    if (localPatterns.some(p => p.test(domain))) {
      localCount++;
    }
    if (/chamber/i.test(domain)) hasChamber = true;
    if (/\.gov$/i.test(domain)) hasGov = true;
  }

  return {
    ratio: referringDomainNames.length > 0 ? localCount / referringDomainNames.length : 0,
    hasChamber,
    hasGov,
  };
}

/** Calculate branded anchor ratio */
export function calcBrandedRatio(anchors: { text: string; count: number }[], domain: string): number {
  const domainBase = domain.replace(/\.[^.]+$/, ''); // remove TLD
  let brandedCount = 0;
  let totalCount = 0;

  for (const a of anchors) {
    totalCount += a.count;
    const lower = a.text.toLowerCase();
    if (
      lower.includes(domainBase) ||
      lower.includes('click here') ||
      lower.includes('website') ||
      lower.includes('visit') ||
      lower.startsWith('http') ||
      lower === ''
    ) {
      brandedCount += a.count;
    }
  }

  return totalCount > 0 ? brandedCount / totalCount : 0;
}