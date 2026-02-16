-- ============================================================================
-- COMPLETE PLATFORM MIGRATION
-- ============================================================================
-- Run this in Supabase SQL Editor to add ALL missing tables
-- This is a comprehensive migration for onboarding + multi-location + all tools

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

CREATE INDEX IF NOT EXISTS idx_business_locations_business_id ON public.business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_place_id ON public.business_locations(place_id);

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own business locations" ON public.business_locations;
DROP POLICY IF EXISTS "Users can insert own business locations" ON public.business_locations;
DROP POLICY IF EXISTS "Users can update own business locations" ON public.business_locations;
DROP POLICY IF EXISTS "Users can delete own business locations" ON public.business_locations;

CREATE POLICY "Users can view own business locations"
  ON public.business_locations FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own business locations"
  ON public.business_locations FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own business locations"
  ON public.business_locations FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own business locations"
  ON public.business_locations FOR DELETE
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================
-- Stores business services with pricing and close rates

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  profit_per_job DECIMAL(10, 2) NOT NULL DEFAULT 0,
  close_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.30, -- 30% default
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own services" ON public.services;
CREATE POLICY "Users can manage own services"
  ON public.services FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- MARKETS TABLE
-- ============================================================================
-- Stores service area markets

CREATE TABLE IF NOT EXISTS public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  cities TEXT[] DEFAULT '{}',
  area_codes TEXT[] DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_business_id ON public.markets(business_id);

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own markets" ON public.markets;
CREATE POLICY "Users can manage own markets"
  ON public.markets FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

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
  economics JSONB DEFAULT '{}',

  -- Results data
  clusters_data JSONB DEFAULT '[]',
  opportunities_data JSONB DEFAULT '[]',
  calendar_data JSONB DEFAULT '[]',
  cannibalization_data JSONB DEFAULT '[]',

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

DROP POLICY IF EXISTS "Users can view own business content strategies" ON public.content_strategies;
DROP POLICY IF EXISTS "Users can insert own business content strategies" ON public.content_strategies;
DROP POLICY IF EXISTS "Users can update own business content strategies" ON public.content_strategies;

CREATE POLICY "Users can view own business content strategies"
  ON public.content_strategies FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own business content strategies"
  ON public.content_strategies FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own business content strategies"
  ON public.content_strategies FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- OFF_PAGE_AUDITS TABLE
-- ============================================================================
-- Stores off-page SEO audit results

CREATE TABLE IF NOT EXISTS public.off_page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,

  -- Scan status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'complete', 'failed')),

  -- Target and competitors
  target_domain TEXT NOT NULL,
  competitor_domains TEXT[] DEFAULT '{}',

  -- Aggregated metrics
  metrics JSONB,

  -- Detailed data
  backlink_data JSONB DEFAULT '[]',
  referring_domains JSONB DEFAULT '[]',
  anchor_data JSONB DEFAULT '[]',
  competitor_data JSONB DEFAULT '[]',

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

DROP POLICY IF EXISTS "Users can view own business off-page audits" ON public.off_page_audits;
DROP POLICY IF EXISTS "Users can insert own business off-page audits" ON public.off_page_audits;
DROP POLICY IF EXISTS "Users can update own business off-page audits" ON public.off_page_audits;

CREATE POLICY "Users can view own business off-page audits"
  ON public.off_page_audits FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own business off-page audits"
  ON public.off_page_audits FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own business off-page audits"
  ON public.off_page_audits FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- PLATFORM_CONNECTIONS TABLE
-- ============================================================================
-- Stores OAuth connections for Lead Intelligence

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

DROP POLICY IF EXISTS "Users can manage own platform connections" ON public.platform_connections;
CREATE POLICY "Users can manage own platform connections"
  ON public.platform_connections FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- CONTACTS TABLE
-- ============================================================================
-- Stores contacts for Lead Database (replaces/supplements leads table)

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
CREATE INDEX IF NOT EXISTS idx_contacts_location_id ON public.contacts(location_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
CREATE POLICY "Users can manage own contacts"
  ON public.contacts FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- ADD LOCATION_ID TO EXISTING TABLES
-- ============================================================================

-- Add location_id to site_audits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'site_audits'
    AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.site_audits
    ADD COLUMN location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to grid_scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'grid_scans'
    AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.grid_scans
    ADD COLUMN location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Your database now has:
-- ✓ business_locations - Multi-location support
-- ✓ services - Business services configuration
-- ✓ markets - Service area markets
-- ✓ content_strategies - Content Strategy tool
-- ✓ off_page_audits - Off-Page Audit tool
-- ✓ platform_connections - Lead Intelligence OAuth
-- ✓ contacts - Lead Database
-- ✓ location_id added to site_audits and grid_scans

-- Next steps:
-- 1. Test by adding a location:
--    SELECT id FROM businesses WHERE user_id = auth.uid();
--    INSERT INTO business_locations (business_id, location_name, city, state, is_primary)
--    VALUES ('your-business-id', 'Main Office', 'Portland', 'OR', true);
--
-- 2. Add services during onboarding:
--    INSERT INTO services (business_id, name, profit_per_job, close_rate)
--    VALUES ('your-business-id', 'Plumbing Repair', 450.00, 0.35);
--
-- 3. Add markets during onboarding:
--    INSERT INTO markets (business_id, name, cities, area_codes, is_primary)
--    VALUES ('your-business-id', 'Portland Metro',
--            ARRAY['Portland', 'Beaverton', 'Hillsboro'],
--            ARRAY['503', '971'], true);
