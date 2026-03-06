-- Add timestamp columns referenced by the domain verification route
-- These are additive-only; safe to apply after website_builder_tables migration.

ALTER TABLE business_domains
  ADD COLUMN IF NOT EXISTS last_checked_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dns_verified_at  TIMESTAMPTZ;
