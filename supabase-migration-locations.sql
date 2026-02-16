-- ============================================================================
-- MULTI-LOCATION MIGRATION
-- ============================================================================
-- Run this in Supabase SQL Editor to add multi-location support
-- This adds business_locations table and location_id to all tool tables

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

-- Drop policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view own business locations" ON public.business_locations;
DROP POLICY IF EXISTS "Users can insert own business locations" ON public.business_locations;
DROP POLICY IF EXISTS "Users can update own business locations" ON public.business_locations;
DROP POLICY IF EXISTS "Users can delete own business locations" ON public.business_locations;

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

-- Add location_id to content_strategies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'content_strategies'
    AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.content_strategies
    ADD COLUMN location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to off_page_audits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'off_page_audits'
    AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.off_page_audits
    ADD COLUMN location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.contacts
    ADD COLUMN location_id UUID REFERENCES public.business_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Multi-location support has been added:
-- ✓ business_locations table created with RLS
-- ✓ location_id added to site_audits
-- ✓ location_id added to grid_scans
-- ✓ location_id added to content_strategies
-- ✓ location_id added to off_page_audits
-- ✓ location_id added to contacts

-- Next steps:
-- 1. Add test locations:
--    INSERT INTO business_locations (business_id, location_name, city, state, is_primary)
--    VALUES ('your-business-id', 'Main Office', 'Portland', 'OR', true);
--
-- 2. LocationSelector will automatically appear in all tools
-- 3. All new scans/contacts will save the selected location_id
