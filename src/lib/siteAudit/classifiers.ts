// Site Audit Classifiers — URL type, keyword intent, conflict type
// Pure logic — no React, no browser APIs, no Supabase

import type { UrlType, KeywordIntent } from '@/components/tools/SiteAudit/types';

// ─── URL Type Classification ──────────────────────────────────────

const STATE_ABBREVS = new Set([
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
  'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
  'va','wa','wv','wi','wy','dc',
  // Canadian provinces
  'ab','bc','mb','nb','nl','ns','nt','nu','on','pe','qc','sk','yt',
]);

/**
 * Classify a URL into a page type based on path patterns.
 */
export function classifyUrlType(url: string): UrlType {
  let path: string;
  try {
    const u = new URL(url);
    path = u.pathname.toLowerCase().replace(/\/+$/, '');
  } catch {
    path = url.toLowerCase().replace(/\/+$/, '');
  }

  // Homepage: empty path or index.html/php
  if (!path || path === '/' || /^\/(index\.(html?|php))$/.test(path)) {
    return 'homepage';
  }

  const segments = path.split('/').filter(Boolean);
  const firstSeg = segments[0] || '';
  const fullPath = '/' + segments.join('/');

  // Contact page
  if (/^\/(contact|get-in-touch|request|schedule|book)/.test(fullPath)) {
    return 'contact';
  }

  // About page
  if (/^\/(about|who-we-are|our-team|our-story)/.test(fullPath)) {
    return 'about';
  }

  // Gallery / Portfolio
  if (/^\/(gallery|portfolio|projects|our-work|our-projects)/.test(fullPath)) {
    return 'gallery';
  }

  // Testimonials / Reviews
  if (/^\/(testimonials|reviews|customer-reviews|client-reviews)/.test(fullPath)) {
    return 'testimonials';
  }

  // FAQ
  if (/^\/(faq|frequently-asked|help|knowledge-base)/.test(fullPath)) {
    return 'faq';
  }

  // Blog / Article detection
  if (/^\/(blog|posts|articles|news|category|tag|author)/.test(fullPath)) {
    return 'blog';
  }
  // Date patterns in URL (e.g. /2024/02/)
  if (/\/\d{4}\/\d{2}\//.test(fullPath)) {
    return 'blog';
  }
  // Slug patterns common to blog posts
  const lastSeg = segments[segments.length - 1] || '';
  if (/^(how-to|why-|guide-to|what-is|what-are|tips-for|top-\d+|best-)/.test(lastSeg)) {
    return 'blog';
  }

  // Location / City page detection
  if (/^\/(locations|areas|cities|service-area|service-areas|serving|coverage)/.test(fullPath)) {
    return 'location';
  }
  // Slug contains location signals: -(in|near|for|serving)-
  if (/-(in|near|for|serving)-/.test(lastSeg)) {
    return 'location';
  }
  // Slug ends with a state abbreviation (e.g., plumber-dallas-tx)
  const lastSegParts = lastSeg.split('-');
  if (lastSegParts.length >= 2) {
    const tail = lastSegParts[lastSegParts.length - 1];
    if (STATE_ABBREVS.has(tail)) {
      return 'location';
    }
  }

  // Service page detection
  if (/^\/(services|solutions|what-we-do|our-services)/.test(fullPath)) {
    return 'service';
  }
  // Single-segment paths that aren't utility pages → likely service pages
  if (segments.length === 1) {
    const utilityPages = new Set([
      'privacy', 'privacy-policy', 'terms', 'terms-of-service', 'terms-and-conditions',
      'sitemap', 'sitemap.xml', 'robots.txt', 'careers', 'jobs', 'login', 'signup',
      'register', 'account', 'cart', 'checkout', 'search', 'wp-admin', 'wp-login',
      'feed', 'rss', 'amp', '404', 'thank-you', 'thanks', 'confirmation',
    ]);
    if (!utilityPages.has(firstSeg)) {
      return 'service';
    }
  }

  return 'other';
}

// ─── Keyword Intent Classification ────────────────────────────────

const INFORMATIONAL_STARTS = [
  'how to', 'what is', 'what are', 'why do', 'why does', 'why is', 'why are',
  'when to', 'when should', 'where to', 'where can', 'who is', 'who are',
  'can you', 'can i', 'should i', 'should you', 'is it', 'are there',
  'do i need', 'does', 'which',
];

const INFORMATIONAL_CONTAINS = [
  'tips', 'guide', 'tutorial', 'how-to', 'checklist', 'ideas',
  'examples', 'steps', 'ways to', 'pros and cons', 'vs ', 'versus',
  'benefits of', 'advantages', 'disadvantages', 'difference between',
  'meaning', 'definition',
];

const COMMERCIAL_INVESTIGATION = [
  'cost', 'price', 'pricing', 'how much', 'best', 'top', 'compare',
  'comparison', 'reviews', 'review', 'rated', 'rating', 'ratings',
  'worth it', 'alternatives', 'vs',
];

const TRANSACTIONAL = [
  'buy', 'hire', 'book', 'schedule', 'order', 'purchase', 'get a quote',
  'request a quote', 'free estimate', 'free quote', 'call', 'contact',
  'repair', 'install', 'installation', 'replace', 'replacement',
  'removal', 'remove', 'fix', 'service', 'services', 'company',
  'companies', 'contractor', 'contractors', 'professional', 'professionals',
  'specialist', 'specialists', 'expert', 'experts', 'provider', 'providers',
];

/**
 * Classify keyword intent based on keyword text, domain, and tracked locations.
 */
export function classifyKeywordIntent(
  keyword: string,
  domain: string,
  trackedLocations: string[] = []
): KeywordIntent {
  const kw = keyword.toLowerCase().trim();

  // Brand check: if keyword contains the domain name (without TLD)
  const brandName = domain.replace(/\.(com|net|org|co|io|biz|info|us|ca|uk).*$/i, '');
  if (brandName.length > 2 && kw.includes(brandName.toLowerCase())) {
    return 'branded';
  }

  // Informational: starts with question words or contains informational signals
  for (const start of INFORMATIONAL_STARTS) {
    if (kw.startsWith(start)) return 'informational';
  }
  for (const term of INFORMATIONAL_CONTAINS) {
    if (kw.includes(term)) return 'informational';
  }

  // Commercial investigation signals
  for (const term of COMMERCIAL_INVESTIGATION) {
    if (kw.includes(term)) return 'commercial';
  }

  // Location signals → local-commercial
  if (kw.includes('near me') || kw.includes('nearby') || kw.includes('in my area')) {
    return 'local-commercial';
  }

  // Check if keyword contains a tracked city name
  const trackedCities = trackedLocations.map((loc) => {
    const parts = loc.split(',');
    return (parts[0] || '').trim().toLowerCase();
  });
  for (const city of trackedCities) {
    if (city.length > 2 && kw.includes(city)) {
      // Has transactional modifier too? → local-commercial
      for (const term of TRANSACTIONAL) {
        if (kw.includes(term)) return 'local-commercial';
      }
      return 'local-commercial';
    }
  }

  // Transactional signals without location
  for (const term of TRANSACTIONAL) {
    if (kw.includes(term)) return 'commercial';
  }

  // Default: short keywords → commercial, longer → informational
  const wordCount = kw.split(/\s+/).length;
  return wordCount <= 3 ? 'commercial' : 'informational';
}

// ─── Conflict Type Classification ─────────────────────────────────

interface ConflictResult {
  type: string;
  icon: string;
  description: string;
  fix: string;
}

/**
 * Classify a cannibalization conflict based on the page types involved.
 */
export function classifyConflictType(
  primaryType: UrlType,
  competitorType: UrlType,
  intent: KeywordIntent
): ConflictResult {
  const key = primaryType + '+' + competitorType;

  switch (key) {
    case 'homepage+service':
    case 'service+homepage':
      return {
        type: 'Homepage Authority Hogging',
        icon: '🏠',
        description: 'Your homepage is ranking instead of a dedicated service page. The homepage\'s higher authority is pulling rank, but it can\'t convert as well as a focused service page.',
        fix: 'Strengthen internal links from the homepage to the service page. Add the keyword to the service page\'s H1, title, and first paragraph. Consider adding a section on the homepage that explicitly links to service pages with descriptive anchor text.',
      };

    case 'blog+service':
    case 'service+blog':
      return {
        type: 'Blog Stealing Service Traffic',
        icon: '📝',
        description: 'A blog post is competing with a service page for a commercial keyword. Blog posts typically convert worse than service pages for transactional queries.',
        fix: 'Add a prominent CTA and internal link from the blog post to the service page. Update the blog post to be more informational and the service page to be more transactional. Use canonical or noindex on the blog post if it\'s purely duplicative.',
      };

    case 'location+service':
    case 'service+location':
      return {
        type: 'Service vs. City Page Overlap',
        icon: '📍',
        description: 'A generic service page and a city-specific page are competing. This usually means the city page isn\'t differentiated enough.',
        fix: 'Add unique, location-specific content to the city page (local testimonials, service area details, local pricing). Ensure the service page targets the service broadly and the city page targets "service + city" specifically.',
      };

    case 'location+location':
      return {
        type: 'City Pages Cannibalizing Each Other',
        icon: '🗺️',
        description: 'Two location/city pages are competing for the same keyword. This typically happens when city pages are too similar (template content with just the city name swapped).',
        fix: 'Add unique content to each city page: local case studies, city-specific service details, local staff bios, neighborhood-specific information. Each page needs 60%+ unique content.',
      };

    case 'homepage+location':
    case 'location+homepage':
      return {
        type: 'Homepage vs. Location Page',
        icon: '🏠📍',
        description: 'The homepage is competing with a location page for a local keyword. The homepage\'s authority advantage may override the location page\'s relevance.',
        fix: 'Ensure the homepage focuses on brand + primary service area. Link prominently from the homepage to location pages. Make the location page hyper-specific to that city with unique local content.',
      };

    case 'blog+blog':
      return {
        type: 'Blog Posts Competing',
        icon: '📝📝',
        description: 'Two blog posts cover the same topic closely enough that Google can\'t decide which to rank. This splits your ranking potential between them.',
        fix: 'Consolidate the weaker post into the stronger one (301 redirect). Or differentiate them clearly: one as a comprehensive guide, the other as a specific use case or FAQ.',
      };

    case 'blog+homepage':
    case 'homepage+blog':
      return {
        type: 'Blog Competing with Homepage',
        icon: '📝🏠',
        description: 'A blog post is competing with the homepage. This usually means the homepage is too content-heavy or the blog post covers a core service topic.',
        fix: 'If the keyword is branded/navigational, ensure the homepage is optimized for it. If informational, let the blog rank and add a strong CTA linking to homepage. Remove duplicate content from whichever page shouldn\'t rank for this term.',
      };

    default:
      return {
        type: 'Page Conflict',
        icon: '⚠️',
        description: `A ${primaryType} page and a ${competitorType} page are competing for the same keyword. Google is splitting ranking signals between them.`,
        fix: 'Differentiate the pages clearly. Choose which page should rank for this keyword and strengthen it with better content, internal links, and on-page optimization. Consider using canonical tags or noindex on the secondary page.',
      };
  }
}
