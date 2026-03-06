-- Website Builder: core tables
-- Run with: supabase db push

-- ── site_pages ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_pages (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID         NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  location_id        UUID         REFERENCES business_locations(id) ON DELETE SET NULL,
  market_id          UUID         REFERENCES markets(id) ON DELETE SET NULL,
  service_id         UUID         REFERENCES services(id) ON DELETE SET NULL,
  slug               TEXT         NOT NULL,
  title              TEXT         NOT NULL,
  type               TEXT         NOT NULL CHECK (type IN (
                       'location_service', 'city_landing', 'blog',
                       'foundation', 'website_addition'
                     )),
  html               TEXT,
  css                TEXT,
  js                 TEXT,
  meta_title         TEXT,
  meta_description   TEXT,
  schema_json        TEXT,
  status             TEXT         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at       TIMESTAMPTZ,
  -- GSC ranking data (synced periodically)
  gsc_position       NUMERIC(6,1),
  gsc_clicks         INTEGER,
  gsc_impressions    INTEGER,
  gsc_synced_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, slug)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_site_pages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_pages_updated_at ON site_pages;
CREATE TRIGGER trg_site_pages_updated_at
  BEFORE UPDATE ON site_pages
  FOR EACH ROW EXECUTE FUNCTION update_site_pages_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_pages_business_id  ON site_pages (business_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_status       ON site_pages (business_id, status);
CREATE INDEX IF NOT EXISTS idx_site_pages_location_id  ON site_pages (location_id) WHERE location_id IS NOT NULL;

-- RLS
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_pages_owner ON site_pages;
CREATE POLICY site_pages_owner ON site_pages
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- ── location_enrichment_cache ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS location_enrichment_cache (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  lat_bucket  NUMERIC(6,2)  NOT NULL,
  lng_bucket  NUMERIC(6,2)  NOT NULL,
  data        JSONB         NOT NULL,
  fetched_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (lat_bucket, lng_bucket)
);

-- Service role only — no RLS for cache tables
ALTER TABLE location_enrichment_cache DISABLE ROW LEVEL SECURITY;

-- ── serp_context_cache ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS serp_context_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     TEXT        NOT NULL UNIQUE,
  data        JSONB       NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE serp_context_cache DISABLE ROW LEVEL SECURITY;

-- ── business_domains ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS business_domains (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  domain              TEXT        NOT NULL UNIQUE,
  verification_token  TEXT        NOT NULL,
  dns_verified        BOOLEAN     NOT NULL DEFAULT FALSE,
  ssl_status          TEXT        NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  check_attempts      INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_domains_business_id  ON business_domains (business_id);
CREATE INDEX IF NOT EXISTS idx_business_domains_domain       ON business_domains (domain) WHERE dns_verified = TRUE;

ALTER TABLE business_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_domains_owner ON business_domains;
CREATE POLICY business_domains_owner ON business_domains
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
