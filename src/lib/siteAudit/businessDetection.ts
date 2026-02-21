// Site Audit Business Detection — GBP lookup via DataForSEO Business Data API
// Pure logic — no React, no browser APIs, no Supabase

import { dfsCall } from '@/lib/dataforseo';
import type { DetectedBusiness, LogEntry } from '@/components/tools/SiteAudit/types';

type Logger = (message: string, level?: LogEntry['level']) => void;

/**
 * Detect business information from Google Business Profile via domain lookup.
 * Uses DataForSEO Business Listings API to find the business associated with a domain.
 * Returns null on failure (non-blocking — audits can proceed without GBP data).
 */
export async function detectBusiness(
  domain: string,
  log: Logger
): Promise<DetectedBusiness | null> {
  log('Detecting business for ' + domain + '...');

  try {
    const data = await dfsCall<any>('business_data/business_listings/search/live', [
      {
        filters: ['domain', 'like', '%' + domain + '%'],
        limit: 1,
      },
    ]);

    const result = data.tasks?.[0]?.result?.[0]?.items?.[0];
    if (!result) {
      log('  No business listing found for ' + domain, 'warning');
      return null;
    }

    const categories = (result.category_ids || []) as string[];
    const categoryNames = (result.categories
      ? (Array.isArray(result.categories) ? result.categories : [result.categories])
      : categories
    ).join(', ');

    const business: DetectedBusiness = {
      name: result.title || result.name || '',
      coords: result.latitude && result.longitude
        ? { lat: result.latitude, lng: result.longitude }
        : null,
      address: result.address || result.address_info?.address || '',
      city: result.address_info?.city || result.city || '',
      region: result.address_info?.region || result.state || '',
      country: result.address_info?.country_code || result.country || 'US',
      categories,
      categoryNames,
      placeId: result.place_id || result.cid || null,
      phone: result.phone || '',
      rating: result.rating?.value ?? result.rating_value ?? null,
      reviewCount: result.rating?.votes_count ?? result.review_count ?? 0,
      url: result.url || result.domain || '',
    };

    log(
      '  Found: ' + business.name +
      (business.city ? ' (' + business.city + ', ' + business.region + ')' : ''),
      'success'
    );

    if (business.rating != null) {
      log('  Rating: ' + business.rating + '/5 (' + business.reviewCount + ' reviews)');
    }

    return business;
  } catch (e: any) {
    log('  Business detection failed: ' + e.message, 'warning');
    return null;
  }
}
