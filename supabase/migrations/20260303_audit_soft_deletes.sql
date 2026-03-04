-- Add deleted_at to audit tables
ALTER TABLE site_audits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE off_page_audits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE grid_scans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_audits_active ON site_audits(business_id, location_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_off_page_audits_active ON off_page_audits(business_id, location_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grid_scans_active ON grid_scans(business_id, location_id) WHERE deleted_at IS NULL;
