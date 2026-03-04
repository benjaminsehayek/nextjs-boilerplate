-- Performance indexes for high-traffic queries
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_opted_email ON contacts(business_id, opted_email) WHERE opted_email = true;

CREATE INDEX IF NOT EXISTS idx_site_audits_business_location ON site_audits(business_id, location_id);
CREATE INDEX IF NOT EXISTS idx_site_audits_status ON site_audits(status);

CREATE INDEX IF NOT EXISTS idx_off_page_audits_business_location ON off_page_audits(business_id, location_id);

CREATE INDEX IF NOT EXISTS idx_grid_scans_business_location ON grid_scans(business_id, location_id);
CREATE INDEX IF NOT EXISTS idx_grid_scans_created_at ON grid_scans(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_strategies_business ON content_strategies(business_id);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact ON campaign_recipients(contact_id);
