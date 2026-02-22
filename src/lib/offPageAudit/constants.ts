// Citation Directory type
export interface CitationDirectory {
  domain: string;
  name: string;
  tier: 'critical' | 'high' | 'medium' | 'low';
}

// 45 citation directories across 4 tiers
export const CITATION_DIRECTORIES: CitationDirectory[] = [
  // Critical (5)
  { domain: 'google.com', name: 'Google Business', tier: 'critical' },
  { domain: 'yelp.com', name: 'Yelp', tier: 'critical' },
  { domain: 'facebook.com', name: 'Facebook', tier: 'critical' },
  { domain: 'apple.com', name: 'Apple Maps', tier: 'critical' },
  { domain: 'bing.com', name: 'Bing Places', tier: 'critical' },
  // High (7)
  { domain: 'bbb.org', name: 'BBB', tier: 'high' },
  { domain: 'yellowpages.com', name: 'Yellow Pages', tier: 'high' },
  { domain: 'nextdoor.com', name: 'Nextdoor', tier: 'high' },
  { domain: 'foursquare.com', name: 'Foursquare', tier: 'high' },
  { domain: 'mapquest.com', name: 'MapQuest', tier: 'high' },
  { domain: 'linkedin.com', name: 'LinkedIn', tier: 'high' },
  { domain: 'instagram.com', name: 'Instagram', tier: 'high' },
  // Medium (15)
  { domain: 'manta.com', name: 'Manta', tier: 'medium' },
  { domain: 'superpages.com', name: 'Superpages', tier: 'medium' },
  { domain: 'dexknows.com', name: 'DexKnows', tier: 'medium' },
  { domain: 'whitepages.com', name: 'White Pages', tier: 'medium' },
  { domain: 'chamberofcommerce.com', name: 'Chamber of Commerce', tier: 'medium' },
  { domain: 'citysearch.com', name: 'CitySearch', tier: 'medium' },
  { domain: 'angieslist.com', name: "Angi", tier: 'medium' },
  { domain: 'thumbtack.com', name: 'Thumbtack', tier: 'medium' },
  { domain: 'homeadvisor.com', name: 'HomeAdvisor', tier: 'medium' },
  { domain: 'buildzoom.com', name: 'BuildZoom', tier: 'medium' },
  { domain: 'hotfrog.com', name: 'Hotfrog', tier: 'medium' },
  { domain: 'brownbook.net', name: 'Brownbook', tier: 'medium' },
  { domain: 'spoke.com', name: 'Spoke', tier: 'medium' },
  { domain: 'merchantcircle.com', name: 'Merchant Circle', tier: 'medium' },
  { domain: 'local.com', name: 'Local.com', tier: 'medium' },
  // Low (18)
  { domain: 'ezlocal.com', name: 'EZLocal', tier: 'low' },
  { domain: 'showmelocal.com', name: 'ShowMeLocal', tier: 'low' },
  { domain: 'judysbook.com', name: "Judy's Book", tier: 'low' },
  { domain: 'cylex.us.com', name: 'Cylex', tier: 'low' },
  { domain: 'tupalo.com', name: 'Tupalo', tier: 'low' },
  { domain: 'n49.com', name: 'n49', tier: 'low' },
  { domain: 'botw.org', name: 'BOTW', tier: 'low' },
  { domain: 'yellowbot.com', name: 'YellowBot', tier: 'low' },
  { domain: 'chamberorganizer.com', name: 'Chamber Organizer', tier: 'low' },
  { domain: 'expressbusinessdirectory.com', name: 'Express Business', tier: 'low' },
  { domain: 'finduslocal.com', name: 'Find Us Local', tier: 'low' },
  { domain: 'salespider.com', name: 'SaleSpider', tier: 'low' },
  { domain: 'bizdays.com', name: 'BizDays', tier: 'low' },
  { domain: 'fyple.com', name: 'Fyple', tier: 'low' },
  { domain: 'golocal247.com', name: 'GoLocal247', tier: 'low' },
  { domain: 'opendi.us', name: 'Opendi', tier: 'low' },
  { domain: 'where2go.com', name: 'Where2Go', tier: 'low' },
  { domain: 'yasabe.com', name: 'Yasabe', tier: 'low' },
];

// Social media platforms
export interface SocialPlatform {
  domain: string;
  altDomains?: string[];
  name: string;
  icon: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { domain: 'facebook.com', name: 'Facebook', icon: '📘' },
  { domain: 'instagram.com', name: 'Instagram', icon: '📷' },
  { domain: 'youtube.com', name: 'YouTube', icon: '📺' },
  { domain: 'linkedin.com', name: 'LinkedIn', icon: '💼' },
  { domain: 'nextdoor.com', name: 'Nextdoor', icon: '🏘️' },
  { domain: 'x.com', altDomains: ['twitter.com'], name: 'X / Twitter', icon: '🐦' },
  { domain: 'pinterest.com', name: 'Pinterest', icon: '📌' },
  { domain: 'tiktok.com', name: 'TikTok', icon: '🎵' },
];

// Spam TLDs for toxic link detection
export const SPAM_TLDS = [
  '.xyz', '.top', '.click', '.buzz', '.loan', '.stream',
  '.gq', '.cf', '.tk', '.ml', '.ga', '.work',
  '.date', '.racing', '.review', '.trade', '.webcam', '.bid',
  '.win',
];

// Domains to exclude from SERP-based competitor discovery
export const NON_COMPETITOR_DOMAINS = [
  'google.com', 'yelp.com', 'facebook.com', 'wikipedia.org',
  'yellowpages.com', 'bbb.org', 'instagram.com', 'twitter.com',
  'x.com', 'linkedin.com', 'youtube.com', 'pinterest.com',
  'tiktok.com', 'reddit.com', 'nextdoor.com', 'foursquare.com',
  'mapquest.com', 'apple.com', 'bing.com', 'yahoo.com',
  'thumbtack.com', 'homeadvisor.com', 'angieslist.com', 'angi.com',
  'houzz.com', 'buildzoom.com', 'manta.com', 'superpages.com',
  'dexknows.com', 'whitepages.com', 'chamberofcommerce.com', 'citysearch.com',
  'hotfrog.com', 'brownbook.net', 'spoke.com', 'merchantcircle.com',
  'local.com', 'tripadvisor.com', 'trustpilot.com', 'glassdoor.com',
  'indeed.com', 'craigslist.org', 'patch.com',
];

// GBP completeness checklist items with max points
export interface GBPChecklistItem {
  key: string;
  label: string;
  maxPoints: number;
  partialPoints?: number;
}

export const GBP_CHECKLIST: GBPChecklistItem[] = [
  { key: 'claimed', label: 'Profile Claimed', maxPoints: 15 },
  { key: 'name', label: 'Business Name', maxPoints: 8 },
  { key: 'description', label: 'Description (50+ chars)', maxPoints: 10, partialPoints: 5 },
  { key: 'primaryCategory', label: 'Primary Category', maxPoints: 8 },
  { key: 'additionalCategories', label: 'Additional Categories', maxPoints: 5 },
  { key: 'phone', label: 'Phone Number', maxPoints: 8 },
  { key: 'website', label: 'Website URL', maxPoints: 8 },
  { key: 'address', label: 'Street Address', maxPoints: 8 },
  { key: 'logo', label: 'Logo', maxPoints: 5 },
  { key: 'coverPhoto', label: 'Cover Photo', maxPoints: 5 },
  { key: 'photos', label: 'Photos (10+)', maxPoints: 8, partialPoints: 4 },
  { key: 'hours', label: 'Business Hours', maxPoints: 8 },
  { key: 'reviews', label: 'Has Reviews', maxPoints: 5 },
  { key: 'bookingUrl', label: 'Booking URL', maxPoints: 2 },
];