export type SubscriptionTier = 'free' | 'analysis' | 'marketing' | 'growth';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled';

export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  subscription_period_end: string | null;
  content_tokens_used: number;
  content_tokens_limit: number;
  scan_credits_used: number;
  scan_credits_limit: number;
  onboarding_completed: boolean;
  onboarding_steps_completed: string[];
  notification_prefs: {
    weekly_digest: boolean;
    scan_complete: boolean;
    campaign_sent: boolean;
    billing_reminder: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  domain: string;
  name: string;
  place_id: string | null;
  cid: string | null;
  feature_id: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  industry: string | null;
  categories: string[];
  created_at: string;
  updated_at: string;
}

export interface BusinessLocation {
  id: string;
  business_id: string;
  location_name: string;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  place_id: string | null;
  cid: string | null;
  gbp_listing: Record<string, unknown> | null;
  is_primary: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  profit_per_job: number;
  close_rate: number;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
}

export interface Market {
  id: string;
  business_id: string;
  name: string;
  cities: string[];
  area_codes: string[];
  is_primary: boolean;
  place_id: string | null;
  cid: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  phone: string | null;
  state: string | null;
  created_at: string;
}

export interface SiteAudit {
  id: string;
  business_id: string;
  domain: string | null;
  status: 'pending' | 'crawling' | 'analyzing' | 'complete' | 'failed';
  overall_score: number | null;
  category_scores: Record<string, number> | null;
  page_count: number | null;
  issues_critical: number;
  issues_warning: number;
  issues_notice: number;
  lighthouse_scores: Record<string, number> | null;
  crawl_data: unknown;
  pages_data: unknown;
  issues_data: unknown;
  completed_tasks: string[];
  api_cost: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ContentStrategy {
  id: string;
  business_id: string;
  status: string;
  domain: string;
  industry: string;
  economics: Record<string, any> | null;
  completed_tasks: string[] | null;
  current_task: string | null;
  site_conversion_rate: number;
  keywords: unknown;
  clusters: unknown;
  content_map: unknown;
  calendar: unknown;
  cannibalization: unknown;
  total_opportunity: number | null;
  api_cost: number;
  // v2 fields
  calendar_v2: CalendarItemV2[] | null;
  source_audit_id: string | null;
  source_offpage_id: string | null;
  last_generated_at: string | null;
  item_statuses: Record<string, 'done' | 'skipped'> | null;
  created_at: string;
  updated_at: string;
}

export type CalendarItemType = 'gbp_post' | 'blog_post' | 'offpage_post' | 'website_change' | 'website_addition';

export interface CalendarItemV2 {
  id: string;
  week: number;
  type: CalendarItemType;
  title: string;
  primaryKeyword: string;
  keywords: string[];
  action: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  roiValue: number;
  status: 'scheduled' | 'done' | 'skipped';
  generatedContent?: string;
  targetUrl?: string;
  targetPlatform?: string;
  /** GBP posts only — which physical location's GBP this post belongs to (e.g. "Vancouver, WA").
   *  Website and off-page items are domain-level and leave this undefined. */
  locationName?: string;
  /** Ratio of peak-month volume to annual average (from EnrichedKeyword.seasonalMultiplier).
   *  Values > 1.2 indicate a seasonal keyword. Undefined for items without keyword research. */
  seasonalMultiplier?: number;
  /** Month number (1–12) of peak search volume. Used to suggest scheduling 60 days before. */
  peakMonth?: number;
}

export interface SimpleStrategyConfig {
  profitPerJob: number;
  closeRate: number;
  conversionRate: number;
}

export interface GridScan {
  id: string;
  business_id: string;
  location_id: string | null;
  grid_size: number;
  radius_miles: number;
  center_lat: number;
  center_lng: number;
  keywords: string[];
  status: string;
  results: unknown;
  visibility_scores: unknown;
  avg_rank: number | null;
  overall_visibility: number | null;
  api_cost: number;
  scanned_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  source: 'ppc' | 'lsa' | 'meta' | 'website' | 'referral' | 'crm' | 'manual';
  campaign_name: string | null;
  keyword: string | null;
  keyword_intent: string | null;
  service_requested: string | null;
  service_urgency: string | null;
  lead_type: 'phone_call' | 'booking' | 'form_fill' | 'chat' | 'message';
  job_value: number | null;
  elv_score: number | null;
  elv_breakdown: unknown;
  market_id: string | null;
  market_attribution_confidence: string | null;
  data_completeness: number | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'inactive';
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#2ECC71';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#FF8419';
  return '#E74C3C';
}

export function scoreTailwind(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-ember-500';
  if (score >= 40) return 'text-heat-500';
  return 'text-danger';
}

export function grade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// Billing & Stripe Types
export interface CheckoutRequest {
  tier: string;
  interval: 'monthly' | 'annual';
}

export interface CheckoutResponse {
  url: string;
  sessionId: string;
}

export interface BillingError {
  message: string;
  code?: string;
}

// ── Website Builder: Location Enrichment ────────────────────────────────────

export interface LocationEnrichment {
  landmarks: string[];
  neighborhoods: string[];
  climate: {
    heatingSeasonMonths: string;
    avgWinterLow: number;
    avgSummerHigh: number;
    humidity: 'humid' | 'arid' | 'moderate';
  };
  housing: {
    medianBuildYear: number;
    pctSingleFamily: number;
    pctOlderThan40Years: number;
  };
}

// ── Website Builder: SERP Content Context ───────────────────────────────────

export interface SerpContentContext {
  keyword: string;
  topPages: Array<{
    url: string;
    title: string;
    h2s: string[];
    wordCount: number;
    hasFAQ: boolean;
    hasVideo: boolean;
    schemaTypes: string[];
  }>;
  peopleAlsoAsk: string[];
  avgWordCount: number;
  topicsToInclude: string[];
  topicsThatDifferentiate: string[];
}

// ── Website Builder: Similarity Check ───────────────────────────────────────

export interface SimilarityIssue {
  slugA: string;
  slugB: string;
  similarity: number;
  level: 'warn' | 'block';
}

// ── Website Builder: Publish Checklist ──────────────────────────────────────

export interface ChecklistItem {
  label: string;
  passed: boolean;
  blocking: boolean;
  detail?: string;
}

export interface ChecklistResult {
  passed: boolean;
  blocking: ChecklistItem[];
  warnings: ChecklistItem[];
}

// ── Website Builder: SitePage (partial for checklist input) ─────────────────

export interface SitePage {
  id: string;
  business_id: string;
  location_id: string | null;
  market_id: string | null;
  service_id: string | null;
  slug: string;
  title: string;
  type: 'location_service' | 'city_landing' | 'blog_post' | 'foundation' | 'website_addition';
  html: string;
  css: string | null;
  js: string | null;
  meta_title: string | null;
  meta_description: string | null;
  schema_json: string | null;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Website Builder: Business Project (Project Library) ─────────────────────

export interface BusinessProject {
  id: string;
  business_id: string;
  service_id: string | null;
  location_id: string | null;
  market_id: string | null;
  job_type: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'other';
  title: string | null;
  problem: string | null;
  work_performed: string;
  outcome: string | null;
  equipment_used: string | null;
  home_type: string | null;
  photo_urls: string[];
  completed_date: string; // ISO date
  city: string | null;
  used_in_posts: string[];
  created_at: string;
}

export interface BusinessDomain {
  id: string;
  business_id: string;
  domain: string;
  verification_token: string;
  dns_verified: boolean;
  dns_verified_at: string | null;
  ssl_status: 'pending' | 'provisioning' | 'active' | 'failed';
  ssl_active_at: string | null;
  provider: 'vercel' | 'cloudflare' | 'caddy' | null;
  provider_domain_id: string | null;
  last_checked_at: string | null;
  check_attempts: number;
  created_at: string;
}
