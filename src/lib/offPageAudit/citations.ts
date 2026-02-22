import { CITATION_DIRECTORIES, type CitationDirectory } from './constants';

export interface CitationResult {
  domain: string;
  name: string;
  tier: 'critical' | 'high' | 'medium' | 'low';
  found: boolean;
}

/** Detect citations by matching referring domains against the 45-directory list */
export function detectCitations(referringDomainNames: string[]): CitationResult[] {
  const domainSet = new Set(referringDomainNames.map(d => d.toLowerCase()));

  return CITATION_DIRECTORIES.map((dir: CitationDirectory) => {
    const found = domainSet.has(dir.domain) ||
      [...domainSet].some(d => d.endsWith('.' + dir.domain));

    return {
      domain: dir.domain,
      name: dir.name,
      tier: dir.tier,
      found,
    };
  });
}

/** Count found citations by tier */
export function citationStats(citations: CitationResult[]) {
  const total = citations.length;
  const found = citations.filter(c => c.found).length;
  const byTier = {
    critical: { found: 0, total: 0 },
    high: { found: 0, total: 0 },
    medium: { found: 0, total: 0 },
    low: { found: 0, total: 0 },
  };

  for (const c of citations) {
    byTier[c.tier].total++;
    if (c.found) byTier[c.tier].found++;
  }

  return { total, found, byTier };
}