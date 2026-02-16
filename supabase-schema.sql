-- ScorchLocal Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lwratkmmlcuwhjrofocf/sql

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Stores user profile data and subscription information
-- Automatically created when a user signs up via trigger

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'analysis', 'marketing', 'growth')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  subscription_period_end TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Scan credits (Site Audit, Off-Page Audit, etc.)
  scan_credits_used INTEGER NOT NULL DEFAULT 0,
  scan_credits_limit INTEGER NOT NULL DEFAULT 0,

  -- Content generation tokens
  content_tokens_used INTEGER NOT NULL DEFAULT 0,
  content_tokens_limit INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================
-- Stores business information for each user

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One business per user
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only manage their own business
CREATE POLICY "Users can view own business"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business"
  ON public.businesses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- BUSINESS_LOCATIONS TABLE
-- ============================================================================
-- Stores multiple locations for multi-location businesses

CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  location_name TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,

  -- Google Business Profile data
  place_id TEXT UNIQUE,
  cid TEXT,
  gbp_listing JSONB,

  -- Primary location flag
  is_primary BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_locations_business_id ON public.business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_place_id ON public.business_locations(place_id);

-- Enable Row Level Security
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only manage locations for their own business
CREATE POLICY "Users can view own business locations"
  ON public.business_locations FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business locations"
  ON public.business_locations FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business locations"
  ON public.business_locations FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own business locations"
  ON public.business_locations FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SITE_AUDITS TABLE
-- ============================================================================
-- Stores site audit scan results

CREATE TABLE IF NOT EXISTS public.site_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,

  -- Scan status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'analyzing', 'complete', 'failed')),

  -- Scores
  overall_score INTEGER,
  category_scores JSONB, -- { meta: 85, content: 92, links: 78, ... }

  -- Summary metrics
  page_count INTEGER,
  issues_critical INTEGER DEFAULT 0,
  issues_warning INTEGER DEFAULT 0,
  issues_notice INTEGER DEFAULT 0,

  -- Lighthouse scores
  lighthouse_scores JSONB, -- { performance: 85, accessibility: 92, ... }

  -- Raw and processed data
  crawl_data JSONB, -- Raw DataForSEO responses
  pages_data JSONB, -- { pages: [...] }
  issues_data JSONB, -- { issues: [...], quickWins: [...] }

  -- Progress tracking
  completed_tasks TEXT[] DEFAULT '{}',

  -- Billing
  api_cost DECIMAL(10, 4) DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_site_audits_business_id ON public.site_audits(business_id);
CREATE INDEX IF NOT EXISTS idx_site_audits_status ON public.site_audits(status);
CREATE INDEX IF NOT EXISTS idx_site_audits_created_at ON public.site_audits(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.site_audits ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access audits for their own business
CREATE POLICY "Users can view own business audits"
  ON public.site_audits FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business audits"
  ON public.site_audits FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business audits"
  ON public.site_audits FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- GRID_SCANS TABLE
-- ============================================================================
-- Stores Local Grid scan results

CREATE TABLE IF NOT EXISTS public.grid_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,

  -- Scan status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'complete', 'failed')),

  -- Business information
  business_info JSONB NOT NULL, -- { name, address, city, state, zipCode, latitude, longitude, phone, website }

  -- Grid configuration
  config JSONB NOT NULL, -- { size, radius, keywords: [...] }

  -- Grid points and results
  points JSONB NOT NULL DEFAULT '[]', -- [{ id, lat, lng, position, rank, url, distance }]
  rank_data JSONB DEFAULT '[]', -- [{ keyword, point, rank, url, topResults: [...] }]
  heatmap_data JSONB DEFAULT '{}', -- { "keyword": { keyword, points: [...], averageRank, pointsRanking, notRanking } }

  -- Progress tracking
  progress JSONB DEFAULT '{"current": 0, "total": 0}', -- { current, total, currentKeyword?, currentPoint? }

  -- Billing
  total_cost DECIMAL(10, 4) DEFAULT 0,

  -- Timestamps
  scan_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_grid_scans_business_id ON public.grid_scans(business_id);
CREATE INDEX IF NOT EXISTS idx_grid_scans_status ON public.grid_scans(status);
CREATE INDEX IF NOT EXISTS idx_grid_scans_created_at ON public.grid_scans(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.grid_scans ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access scans for their own business
CREATE POLICY "Users can view own business grid scans"
  ON public.grid_scans FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business grid scans"
  ON public.grid_scans FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business grid scans"
  ON public.grid_scans FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- LEADS TABLE (Future use)
-- ============================================================================
-- Stores lead information for CRM

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Contact info
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,

  -- Lead details
  source TEXT, -- 'website', 'referral', 'google', etc.
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  score INTEGER DEFAULT 0, -- Lead scoring 0-100

  -- Custom fields
  metadata JSONB DEFAULT '{}',
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own business leads"
  ON public.leads FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business leads"
  ON public.leads FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business leads"
  ON public.leads FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own business leads"
  ON public.leads FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, subscription_tier, scan_credits_limit, content_tokens_limit)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'free',
    0, -- Free tier gets 0 scans
    0  -- Free tier gets 0 content tokens
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment scan credits
CREATE OR REPLACE FUNCTION public.increment_scan_credits(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    scan_credits_used = scan_credits_used + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement scan credits (for scan usage)
CREATE OR REPLACE FUNCTION public.decrement_scan_credits(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    scan_credits_used = scan_credits_used + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly credits (call this via cron or manually)
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    scan_credits_used = 0,
    content_tokens_used = 0,
    updated_at = NOW()
  WHERE subscription_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update subscription tier and set credit limits
CREATE OR REPLACE FUNCTION public.update_subscription_tier(
  p_user_id UUID,
  p_tier TEXT,
  p_status TEXT DEFAULT 'active',
  p_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_scan_limit INTEGER;
  v_token_limit INTEGER;
BEGIN
  -- Set credit limits based on tier
  CASE p_tier
    WHEN 'analysis' THEN
      v_scan_limit := 5;
      v_token_limit := 0;
    WHEN 'marketing' THEN
      v_scan_limit := 15;
      v_token_limit := 6000; -- 6 articles * 1000 tokens each
    WHEN 'growth' THEN
      v_scan_limit := 50;
      v_token_limit := 30000; -- 30 articles * 1000 tokens each
    ELSE
      v_scan_limit := 0;
      v_token_limit := 0;
  END CASE;

  UPDATE public.profiles
  SET
    subscription_tier = p_tier,
    subscription_status = p_status,
    subscription_period_end = p_period_end,
    scan_credits_limit = v_scan_limit,
    content_tokens_limit = v_token_limit,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CONTENT_STRATEGIES TABLE
-- ============================================================================
-- Stores content strategy analysis results

CREATE TABLE IF NOT EXISTS public.content_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,

  -- Analysis status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'complete', 'failed')),

  -- Configuration
  domain TEXT NOT NULL,
  industry TEXT,
  economics JSONB DEFAULT '{}', -- { conversionRate, averageOrderValue, leadValue, monthlyBudget }

  -- Results data
  clusters_data JSONB DEFAULT '[]', -- [{ id, name, intent, keywords: [...], totalVolume, avgDifficulty, opportunityScore }]
  opportunities_data JSONB DEFAULT '[]', -- [{ cluster, priority, estimatedTraffic, estimatedValue, competitorGaps, recommendedType }]
  calendar_data JSONB DEFAULT '[]', -- [{ id, title, cluster, targetKeywords, contentType, priority, estimatedTraffic, estimatedValue, publishDate, status }]
  cannibalization_data JSONB DEFAULT '[]', -- [{ id, keyword, searchVolume, competingPages, severity, recommendation }]

  -- Summary metrics
  total_keywords INTEGER DEFAULT 0,
  total_search_volume INTEGER DEFAULT 0,
  estimated_monthly_traffic INTEGER DEFAULT 0,
  estimated_monthly_value DECIMAL(10, 2) DEFAULT 0,

  -- Progress tracking
  completed_tasks TEXT[] DEFAULT '{}',
  current_task TEXT,

  -- Billing
  api_cost DECIMAL(10, 4) DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_strategies_business_id ON public.content_strategies(business_id);
CREATE INDEX IF NOT EXISTS idx_content_strategies_status ON public.content_strategies(status);
CREATE INDEX IF NOT EXISTS idx_content_strategies_created_at ON public.content_strategies(created_at DESC);

ALTER TABLE public.content_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business content strategies"
  ON public.content_strategies FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business content strategies"
  ON public.content_strategies FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business content strategies"
  ON public.content_strategies FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- OFF_PAGE_AUDITS TABLE
-- ============================================================================
-- Stores off-page SEO audit results (backlinks, referring domains, anchor text)

CREATE TABLE IF NOT EXISTS public.off_page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,

  -- Scan status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'complete', 'failed')),

  -- Target and competitors
  target_domain TEXT NOT NULL,
  competitor_domains TEXT[] DEFAULT '{}',

  -- Aggregated metrics (for quick display)
  metrics JSONB, -- { totalBacklinks, referringDomains, domainRating, toxicScore, followLinks, nofollowLinks, newBacklinks, lostBacklinks, qualityScore }

  -- Detailed data
  backlink_data JSONB DEFAULT '[]', -- [{ url, anchorText, type, firstSeen, lastSeen, domainRank, pageRank, isSpam }]
  referring_domains JSONB DEFAULT '[]', -- [{ domain, backlinks, domainRank, pageRank, firstSeen, lastSeen, toxicityScore, toxicityLevel, follow, nofollow }]
  anchor_data JSONB DEFAULT '[]', -- [{ text, count, percentage, type, follow, nofollow }]
  competitor_data JSONB DEFAULT '[]', -- [{ domain, backlinks, referringDomains, domainRating, toxicScore }]

  -- Progress tracking
  completed_tasks TEXT[] DEFAULT '{}',

  -- Billing
  api_cost DECIMAL(10, 4) DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_off_page_audits_business_id ON public.off_page_audits(business_id);
CREATE INDEX IF NOT EXISTS idx_off_page_audits_status ON public.off_page_audits(status);
CREATE INDEX IF NOT EXISTS idx_off_page_audits_created_at ON public.off_page_audits(created_at DESC);

ALTER TABLE public.off_page_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business off-page audits"
  ON public.off_page_audits FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business off-page audits"
  ON public.off_page_audits FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business off-page audits"
  ON public.off_page_audits FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PLATFORM_CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'google_lsa', 'meta', 'search_console', 'gbp')),
  connected BOOLEAN DEFAULT false,
  last_sync TIMESTAMP WITH TIME ZONE,

  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,

  account_id TEXT,
  account_name TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_connections_business_id ON public.platform_connections(business_id);

ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own platform connections"
  ON public.platform_connections FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- CONTACTS TABLE (for Lead Database)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,

  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,

  source TEXT NOT NULL CHECK (source IN ('ppc', 'lsa', 'meta', 'website', 'referral', 'crm', 'manual')),
  campaign TEXT,
  lead_type TEXT CHECK (lead_type IN ('phone_call', 'booking', 'form_fill', 'chat', 'unknown')),

  service TEXT,
  keyword_intent TEXT CHECK (keyword_intent IN ('emergency', 'buy_now', 'high', 'medium', 'low', 'unknown')),

  market_id TEXT,
  market_confidence TEXT,
  geo_target TEXT,

  value DECIMAL(10, 2),
  elv_score INTEGER,

  opted_email BOOLEAN DEFAULT false,
  opted_sms BOOLEAN DEFAULT false,
  unsub_email BOOLEAN DEFAULT false,
  unsub_sms BOOLEAN DEFAULT false,

  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  last_contacted TIMESTAMP WITH TIME ZONE,
  jobs JSONB DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON public.contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON public.contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_market_id ON public.contacts(market_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contacts"
  ON public.contacts FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================
-- You can manually create a test business and upgrade your account here

-- Example: Upgrade your account to 'analysis' tier for testing
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- SELECT public.update_subscription_tier(
--   'YOUR_USER_ID'::UUID,
--   'analysis',
--   'active',
--   NOW() + INTERVAL '1 month'
-- );

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Your database is now set up with:
-- ✓ profiles table with RLS
-- ✓ businesses table with RLS
-- ✓ site_audits table with RLS
-- ✓ leads table with RLS
-- ✓ Auto-profile creation trigger
-- ✓ Credit management functions
-- ✓ Subscription tier management
