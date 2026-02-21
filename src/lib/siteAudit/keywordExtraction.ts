// Site Audit Keyword Extraction — 6-tier keyword generation from crawl data
// Pure logic — no React, no browser APIs, no Supabase

import type {
  CrawledPage,
  ExtractedKeyword,
  KeywordType,
} from '@/components/tools/SiteAudit/types';

// ─── State Name → Abbreviation Map (for stripping from terms) ─────

const US_STATE_NAME_TO_ABBREV: Record<string, string> = {
  'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar',
  'california': 'ca', 'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de',
  'florida': 'fl', 'georgia': 'ga', 'hawaii': 'hi', 'idaho': 'id',
  'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks',
  'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
  'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms',
  'missouri': 'mo', 'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv',
  'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny',
  'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok',
  'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
  'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut',
  'vermont': 'vt', 'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv',
  'wisconsin': 'wi', 'wyoming': 'wy',
};

const STATE_ABBREVS = new Set(Object.values(US_STATE_NAME_TO_ABBREV));

// ─── Generic Terms to Skip ────────────────────────────────────────

const GENERIC_TERMS = new Set([
  'home', 'homepage', 'blog', 'news', 'about', 'about us', 'contact',
  'contact us', 'gallery', 'portfolio', 'testimonials', 'reviews',
  'privacy policy', 'privacy', 'terms', 'terms of service', 'sitemap',
  'faq', 'login', 'signup', 'register', 'account', 'cart', 'checkout',
  'thank you', 'thanks', 'confirmation', 'page not found', '404',
  'careers', 'jobs', 'team', 'our team', 'our story', 'search',
  'untitled', 'welcome', 'loading', 'error', 'subscribe', 'unsubscribe',
]);

// ─── Modifier Lists ───────────────────────────────────────────────

const COMMON_MODIFIERS = ['best', 'affordable', 'cheap', 'emergency', 'cost', 'price', 'reviews'];

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Clean and normalize a raw text term, stripping location words and brand.
 */
function cleanTerm(
  raw: string,
  locationWords: Set<string>,
  brandName: string
): string {
  let term = raw
    .toLowerCase()
    .replace(/[|–—·•:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip brand name
  if (brandName) {
    term = term.replace(new RegExp('\\b' + escapeRegex(brandName) + '\\b', 'gi'), '').trim();
  }

  // Strip location words (city names, state names, state abbreviations)
  const words = term.split(/\s+/);
  const cleaned = words.filter((w) => {
    const lower = w.toLowerCase();
    if (locationWords.has(lower)) return false;
    if (STATE_ABBREVS.has(lower)) return false;
    return true;
  });

  term = cleaned.join(' ').replace(/\s+/g, ' ').trim();

  // Strip leading/trailing common separators
  term = term.replace(/^[-–—|:]+|[-–—|:]+$/g, '').trim();

  return term;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract text from a URL path segment.
 * "/services/roof-repair" → "roof repair"
 */
function urlSegmentToText(url: string): string[] {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    return segments.map((s) =>
      s.replace(/[-_]/g, ' ').replace(/\.\w+$/, '').trim()
    ).filter((s) => s.length > 2);
  } catch {
    return [];
  }
}

// ─── Main Extraction Function ─────────────────────────────────────

/**
 * Extract keywords from crawled page data using a 6-tier approach.
 *
 * Tier 1: Bare service terms (top 15 by score)
 * Tier 2: "Near me" variants (top 15 by score)
 * Tier 3: Primary city combos (top 15 by score)
 * Tier 4: Common modifiers (top 8 services x 7 modifiers)
 * Tier 5: Secondary city combos (top 10 services x other cities)
 * Tier 6: "In city" variants + city+state for secondary cities + brand combos
 *
 * @param pages - Crawled pages from on_page/pages
 * @param locations - DataForSEO-compatible location strings ("City,State,Country")
 * @param domain - The target domain
 * @returns Sorted, deduplicated array of up to 100 keywords
 */
export function extractKeywordsFromCrawl(
  pages: CrawledPage[],
  locations: string[],
  domain: string
): ExtractedKeyword[] {
  // ── Step 1: Detect brand name ──
  // The brand is the most-repeated title segment appearing in >35% of pages
  const titleSegments = new Map<string, number>();
  let totalTitledPages = 0;

  for (const page of pages) {
    const title = page.meta?.title;
    if (!title) continue;
    totalTitledPages++;

    // Split title on common delimiters: | - — : ·
    const parts = title.split(/\s*[|–—·:]\s*/).map((p) => p.trim()).filter((p) => p.length > 1);
    for (const part of parts) {
      const lower = part.toLowerCase();
      titleSegments.set(lower, (titleSegments.get(lower) || 0) + 1);
    }
  }

  let brandName = '';
  let brandCount = 0;
  const threshold = totalTitledPages * 0.35;

  for (const [seg, count] of titleSegments.entries()) {
    if (count > threshold && count > brandCount) {
      brandName = seg;
      brandCount = count;
    }
  }

  // ── Step 2: Build location word sets ──
  const locationWords = new Set<string>();
  const parsedLocations: Array<{ city: string; state: string; country: string }> = [];

  for (const loc of locations) {
    const parts = loc.split(',').map((p) => p.trim());
    const city = parts[0] || '';
    const state = parts[1] || '';
    const country = parts[2] || 'United States';

    if (city) {
      parsedLocations.push({ city, state, country });
      // Add city words to strip
      for (const w of city.toLowerCase().split(/\s+/)) {
        if (w.length > 2) locationWords.add(w);
      }
    }
    if (state) {
      for (const w of state.toLowerCase().split(/\s+/)) {
        if (w.length > 2) locationWords.add(w);
      }
      // Also add abbreviation
      const stateAbbr = US_STATE_NAME_TO_ABBREV[state.toLowerCase()];
      if (stateAbbr) locationWords.add(stateAbbr);
    }
  }

  // ── Step 3: Extract raw service terms with weighted scores ──
  const termScores = new Map<string, number>();

  function addTerm(raw: string, weight: number): void {
    const term = cleanTerm(raw, locationWords, brandName);
    if (!term || term.length < 3) return;
    if (GENERIC_TERMS.has(term)) return;
    // Skip terms that are purely numbers
    if (/^\d+$/.test(term)) return;
    // Skip very long terms (likely sentences)
    if (term.split(/\s+/).length > 5) return;

    termScores.set(term, (termScores.get(term) || 0) + weight);
  }

  for (const page of pages) {
    // Titles (weight 3)
    if (page.meta?.title) {
      const parts = page.meta.title.split(/\s*[|–—·:]\s*/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        addTerm(part, 3);
      }
    }

    // H1s (weight 2.5)
    const h1s = page.meta?.htags?.h1 || [];
    for (const h1 of h1s) {
      addTerm(h1, 2.5);
    }

    // H2s (weight 1.5)
    const h2s = page.meta?.htags?.h2 || [];
    for (const h2 of h2s) {
      addTerm(h2, 1.5);
    }

    // URL segments (weight 1)
    const urlTerms = urlSegmentToText(page.url);
    for (const term of urlTerms) {
      addTerm(term, 1);
    }

    // Descriptions (weight 0.5)
    if (page.meta?.description) {
      // Extract key phrases from description (split on punctuation)
      const phrases = page.meta.description.split(/[.,;!?]/).map((p) => p.trim()).filter((p) => p.length > 3);
      for (const phrase of phrases) {
        // Only take reasonably short phrases
        if (phrase.split(/\s+/).length <= 4) {
          addTerm(phrase, 0.5);
        }
      }
    }
  }

  // Sort terms by score descending
  const sortedTerms = Array.from(termScores.entries())
    .sort((a, b) => b[1] - a[1]);

  // ── Step 4: Generate keyword combinations in 6 tiers ──
  const keywords: Array<{ keyword: string; score: number; type: KeywordType }> = [];

  const primaryCity = parsedLocations[0] || null;
  const secondaryCities = parsedLocations.slice(1);

  // Tier 1: Bare service terms (top 15, score × 1.0)
  const tier1 = sortedTerms.slice(0, 15);
  for (const [term, score] of tier1) {
    keywords.push({ keyword: term, score: score * 1.0, type: 'service' });
  }

  // Tier 2: "Near me" variants (top 15, score × 1.5)
  const tier2 = sortedTerms.slice(0, 15);
  for (const [term, score] of tier2) {
    keywords.push({ keyword: term + ' near me', score: score * 1.5, type: 'near_me' });
  }

  // Tier 3: Primary city combos (top 15, score × 1.3)
  if (primaryCity) {
    const tier3 = sortedTerms.slice(0, 15);
    for (const [term, score] of tier3) {
      keywords.push({
        keyword: term + ' ' + primaryCity.city.toLowerCase(),
        score: score * 1.3,
        type: 'local',
      });
    }
  }

  // Tier 4: Common modifiers (top 8 services × modifiers)
  const tier4 = sortedTerms.slice(0, 8);
  for (const [term, score] of tier4) {
    for (const modifier of COMMON_MODIFIERS) {
      keywords.push({
        keyword: modifier + ' ' + term,
        score: score * 0.8,
        type: 'modifier',
      });
    }
  }

  // Tier 5: Secondary city combos (top 10 services × other cities)
  if (secondaryCities.length > 0) {
    const tier5 = sortedTerms.slice(0, 10);
    for (const [term, score] of tier5) {
      for (const loc of secondaryCities) {
        keywords.push({
          keyword: term + ' ' + loc.city.toLowerCase(),
          score: score * 0.9,
          type: 'local',
        });
      }
    }
  }

  // Tier 6: "In city" variants + city+state for secondary cities
  if (primaryCity) {
    const tier6 = sortedTerms.slice(0, 10);
    for (const [term, score] of tier6) {
      keywords.push({
        keyword: term + ' in ' + primaryCity.city.toLowerCase(),
        score: score * 0.7,
        type: 'local',
      });
    }
  }

  // Secondary city + state variants
  for (const loc of secondaryCities) {
    const tier6sec = sortedTerms.slice(0, 5);
    for (const [term, score] of tier6sec) {
      const stateAbbr = US_STATE_NAME_TO_ABBREV[loc.state.toLowerCase()] || '';
      if (stateAbbr) {
        keywords.push({
          keyword: term + ' ' + loc.city.toLowerCase() + ' ' + stateAbbr,
          score: score * 0.6,
          type: 'local',
        });
      }
      keywords.push({
        keyword: term + ' in ' + loc.city.toLowerCase(),
        score: score * 0.5,
        type: 'local',
      });
    }
  }

  // Brand combos (if brand was detected)
  if (brandName) {
    keywords.push({ keyword: brandName, score: 5, type: 'branded' });
    keywords.push({ keyword: brandName + ' reviews', score: 4, type: 'branded' });
    keywords.push({ keyword: brandName + ' near me', score: 3.5, type: 'branded' });
    if (primaryCity) {
      keywords.push({
        keyword: brandName + ' ' + primaryCity.city.toLowerCase(),
        score: 3,
        type: 'branded',
      });
    }
  }

  // ── Step 5: Sort, deduplicate, and return top 100 ──
  keywords.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const result: ExtractedKeyword[] = [];

  for (const kw of keywords) {
    const normalized = kw.keyword.toLowerCase().trim();
    if (seen.has(normalized)) continue;
    if (!normalized || normalized.length < 3) continue;
    seen.add(normalized);

    result.push({
      keyword: normalized,
      score: kw.score,
      type: kw.type,
    });

    if (result.length >= 100) break;
  }

  return result;
}
