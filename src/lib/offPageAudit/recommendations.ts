export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
}

interface DomainData {
  categoryScores: { authority: number; citations: number; quality: number; localLinks: number; anchors: number; overall: number };
  citationsFound: number;
  citationsTotal: number;
  toxicLinkCount: number;
  socialFound: number;
  socialTotal: number;
  spamScore: number;
  dofollowRatio: number;
  brandedRatio: number;
  linkTrend: 'growing' | 'stable' | 'declining';
  referringDomains: number;
}

/** Generate domain-level recommendations based on scores and data */
export function generateDomainRecommendations(data: DomainData): Recommendation[] {
  const recs: Recommendation[] = [];

  // Authority
  if (data.categoryScores.authority < 50) {
    recs.push({ priority: 'high', category: 'Authority', title: 'Build Domain Authority', description: 'Your domain authority is low. Focus on acquiring high-quality backlinks from reputable websites in your industry.' });
  }

  // Citations
  if (data.citationsFound < data.citationsTotal * 0.5) {
    recs.push({ priority: 'high', category: 'Citations', title: 'Submit to Missing Directories', description: `You're listed on ${data.citationsFound} of ${data.citationsTotal} tracked directories. Submitting to missing directories will improve local visibility.` });
  } else if (data.citationsFound < data.citationsTotal * 0.75) {
    recs.push({ priority: 'medium', category: 'Citations', title: 'Expand Directory Presence', description: `Good citation coverage at ${data.citationsFound}/${data.citationsTotal}. Submit to remaining directories for maximum visibility.` });
  }

  // Quality
  if (data.spamScore >= 20) {
    recs.push({ priority: 'high', category: 'Quality', title: 'Address High Spam Score', description: `Your spam score of ${data.spamScore} is concerning. Review and disavow toxic backlinks via Google Search Console.` });
  }
  if (data.dofollowRatio < 0.40) {
    recs.push({ priority: 'medium', category: 'Quality', title: 'Improve Dofollow Ratio', description: `Only ${Math.round(data.dofollowRatio * 100)}% of your backlinks are dofollow. Focus on earning editorial links from quality sites.` });
  }

  // Toxic links
  if (data.toxicLinkCount > 0) {
    recs.push({ priority: 'high', category: 'Quality', title: 'Disavow Toxic Backlinks', description: `${data.toxicLinkCount} toxic backlink(s) detected. Create a disavow file in Google Search Console.` });
  }

  // Local Links
  if (data.categoryScores.localLinks < 40) {
    recs.push({ priority: 'medium', category: 'Local SEO', title: 'Build Local Backlinks', description: 'Your local link profile is thin. Seek partnerships with local businesses, join the Chamber of Commerce, and sponsor local events.' });
  }

  // Anchors
  if (data.brandedRatio < 0.20) {
    recs.push({ priority: 'medium', category: 'Anchors', title: 'Increase Branded Mentions', description: `Only ${Math.round(data.brandedRatio * 100)}% of anchors are branded. Natural link profiles typically have 30-60% branded anchors.` });
  } else if (data.brandedRatio > 0.70) {
    recs.push({ priority: 'low', category: 'Anchors', title: 'Diversify Anchor Text', description: 'Anchor profile is heavily branded. Consider incorporating more relevant keyword variations for better ranking signals.' });
  }

  // Social
  if (data.socialFound < 4) {
    recs.push({ priority: 'medium', category: 'Social', title: 'Expand Social Presence', description: `Found on ${data.socialFound} of ${data.socialTotal} major platforms. Claim and maintain profiles on missing platforms.` });
  }

  // Link Growth
  if (data.linkTrend === 'declining') {
    recs.push({ priority: 'high', category: 'Link Growth', title: 'Reverse Declining Link Trend', description: 'You are losing more backlinks than gaining. Investigate lost links and ramp up link building efforts.' });
  }

  // Low referring domains
  if (data.referringDomains < 30) {
    recs.push({ priority: 'high', category: 'Authority', title: 'Increase Referring Domains', description: `Only ${data.referringDomains} unique domains link to you. Focus on guest posting, PR, and outreach to grow this number.` });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

interface LocationData {
  reviewsScore: number;
  napScore: number;
  gbpScore: number;
  rating: number;
  reviewCount: number;
  velocity30d: number;
  responseRate: number;
  napMismatches: number;
  gbpMissingItems: string[];
  brandMentionCount: number;
}

/** Generate location-level recommendations */
export function generateLocationRecommendations(data: LocationData): Recommendation[] {
  const recs: Recommendation[] = [];

  // Reviews
  if (data.reviewCount < 10) {
    recs.push({ priority: 'high', category: 'Reviews', title: 'Get More Reviews', description: 'You have fewer than 10 reviews. Implement a systematic review request process for every customer.' });
  }
  if (data.rating < 4.0) {
    recs.push({ priority: 'high', category: 'Reviews', title: 'Improve Rating', description: `Your ${data.rating.toFixed(1)} rating needs attention. Address negative feedback and focus on service quality.` });
  }
  if (data.velocity30d < 2) {
    recs.push({ priority: 'medium', category: 'Reviews', title: 'Increase Review Velocity', description: 'Low recent review activity. Send follow-up emails/texts to recent customers requesting reviews.' });
  }
  if (data.responseRate < 0.50) {
    recs.push({ priority: 'medium', category: 'Reviews', title: 'Respond to More Reviews', description: `Only ${Math.round(data.responseRate * 100)}% response rate. Responding to all reviews improves trust and rankings.` });
  }

  // NAP
  if (data.napMismatches > 0) {
    recs.push({ priority: 'high', category: 'NAP', title: 'Fix NAP Inconsistencies', description: `${data.napMismatches} NAP mismatch(es) detected. Consistent name, address, and phone across all listings is critical for local SEO.` });
  }

  // GBP
  if (data.gbpMissingItems.length > 0) {
    recs.push({ priority: 'medium', category: 'GBP', title: 'Complete GBP Profile', description: `Missing: ${data.gbpMissingItems.slice(0, 3).join(', ')}${data.gbpMissingItems.length > 3 ? ` and ${data.gbpMissingItems.length - 3} more` : ''}. A complete profile ranks better.` });
  }

  // Brand mentions
  if (data.brandMentionCount > 0) {
    recs.push({ priority: 'low', category: 'Links', title: 'Convert Brand Mentions to Links', description: `Found ${data.brandMentionCount} unlinked mention(s) of your business. Reach out to these sites to request a backlink.` });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}