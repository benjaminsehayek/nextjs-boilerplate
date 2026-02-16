export type SubscriptionTier = 'free' | 'analysis' | 'marketing' | 'growth';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled';

export interface Profile {
  id: string;
  email: string;
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
  billing_period_start: string | null;
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
  created_at: string;
}

export interface SiteAudit {
  id: string;
  business_id: string;
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
  site_conversion_rate: number;
  keywords: unknown;
  clusters: unknown;
  content_map: unknown;
  calendar: unknown;
  cannibalization: unknown;
  total_opportunity: number | null;
  api_cost: number;
  created_at: string;
  updated_at: string;
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
