-- ============================================================================
-- FULL MIGRATION: Create all missing tables + fix column mismatches
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ============================================================================
-- 1. FIX site_audits: Add missing 'domain' column
-- ============================================================================
ALTER TABLE public.site_audits ADD COLUMN IF NOT EXISTS domain TEXT;

-- ============================================================================
-- 2. FIX contacts table: Drop and recreate with correct columns
--    The old schema had different column names (opted_email vs email_opt_in, etc.)
--    The code expects the column names below.
-- ============================================================================

-- Drop old table if it exists (no data loss — lead database uses localStorage demo)
DROP TABLE IF EXISTS public.contacts CASCADE;

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,

  -- Basic Info
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Lead Details
  source TEXT NOT NULL DEFAULT 'direct',
  lead_type TEXT,
  urgency TEXT,
  market_id TEXT,
  market_name TEXT,

  -- ELV
  elv INTEGER DEFAULT 0,
  elv_factors JSONB,

  -- Engagement
  email_opt_in BOOLEAN DEFAULT false,
  sms_opt_in BOOLEAN DEFAULT false,
  unsubscribed_email BOOLEAN DEFAULT false,
  unsubscribed_sms BOOLEAN DEFAULT false,
  last_contacted TIMESTAMP WITH TIME ZONE,

  -- Organization
  tags TEXT[] DEFAULT '{}',
  lists TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Attribution
  campaign_name TEXT,
  ad_group TEXT,
  keyword TEXT,
  geo_target TEXT,

  -- Custom Fields
  custom_fields JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contacts_business_id ON public.contacts(business_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_source ON public.contacts(source);
CREATE INDEX idx_contacts_market_name ON public.contacts(market_name);
CREATE INDEX idx_contacts_elv ON public.contacts(elv);
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contacts"
  ON public.contacts FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- 3. CREATE services table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profit_per_job DECIMAL(10, 2),
  close_rate DECIMAL(5, 2) DEFAULT 30,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own services"
  ON public.services FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- 4. CREATE markets table
-- ============================================================================
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

CREATE POLICY "Users can manage own markets"
  ON public.markets FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- 5. CREATE message_templates table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  subject TEXT,
  html_body TEXT,
  text_body TEXT NOT NULL,
  merge_tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_business_id ON public.message_templates(business_id);
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON public.message_templates FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- 6. CREATE campaigns table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  subject TEXT,
  html_body TEXT,
  text_body TEXT NOT NULL DEFAULT '',
  sender_name TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  -- Audience
  audience_type TEXT NOT NULL DEFAULT 'all'
    CHECK (audience_type IN ('all', 'segment', 'list', 'tag', 'manual')),
  audience_value TEXT,
  recipient_count INTEGER DEFAULT 0,
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  -- A/B testing
  ab_parent_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ab_variant TEXT,
  ab_test_field TEXT,
  ab_split_pct INTEGER DEFAULT 50,
  -- Denormalized counters
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON public.campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own campaigns"
  ON public.campaigns FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- 7. CREATE campaign_recipients table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  UNIQUE(campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact ON public.campaign_recipients(contact_id);

-- No RLS — written by service role from API routes
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign recipients"
  ON public.campaign_recipients FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.campaigns WHERE business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  ));

-- Service role handles INSERT/UPDATE via API routes (no user-facing policy needed)
-- But add a permissive policy for the authenticated user's campaigns
CREATE POLICY "Users can manage own campaign recipients"
  ON public.campaign_recipients FOR ALL
  USING (campaign_id IN (
    SELECT id FROM public.campaigns WHERE business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  ));

-- ============================================================================
-- 8. CREATE campaign_link_clicks table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.campaign_recipients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_link_clicks_campaign ON public.campaign_link_clicks(campaign_id);

ALTER TABLE public.campaign_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own link clicks"
  ON public.campaign_link_clicks FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.campaigns WHERE business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  ));

-- ============================================================================
-- 9. CREATE unsubscribe_log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.unsubscribe_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  reason TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- No RLS — written by public unsubscribe endpoint using service role

-- ============================================================================
-- 10. CREATE increment_campaign_counter RPC function
--     Used by SendGrid webhook to atomically increment counters
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_campaign_counter(
  p_campaign_id UUID,
  p_field TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.campaigns SET %I = %I + 1 WHERE id = $1',
    p_field, p_field
  ) USING p_campaign_id;
END;
$$;

-- ============================================================================
-- DONE! All tables created. You can now use:
--   - Site Audit (domain column added)
--   - Lead Database (contacts table fixed)
--   - Marketing (all 5 new tables + RPC function)
--   - Services & Markets (settings/onboarding)
-- ============================================================================
