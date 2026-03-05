// Slug utilities for the Website Builder — URL-safe slug generation
// Follows the silo architecture: /[city-state]/[service]/

/** Convert any text to a URL-safe slug */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Build a location-service silo slug: city-state/service */
export function buildLocationServiceSlug(city: string, state: string, service: string): string {
  return `${toSlug(city)}-${toSlug(state)}/${toSlug(service)}`;
}

/** Build a city landing slug: city-state */
export function buildCitySlug(city: string, state: string): string {
  return `${toSlug(city)}-${toSlug(state)}`;
}

/** Build a blog post slug from a title */
export function buildBlogSlug(title: string): string {
  return `blog/${toSlug(title)}`;
}

/** Build a foundation page slug (e.g. /about, /services) */
export function buildFoundationSlug(pageTitle: string): string {
  return toSlug(pageTitle);
}

/** Derive the canonical URL for a page given a business domain */
export function buildCanonicalUrl(domain: string, slug: string): string {
  const base = domain.startsWith('http') ? domain : `https://${domain}`;
  return `${base}/${slug}`;
}
