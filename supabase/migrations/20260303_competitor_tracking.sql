-- B9-10: Competitor tracking for off-page audits
ALTER TABLE off_page_audits ADD COLUMN IF NOT EXISTS competitor_domains TEXT[] DEFAULT '{}';
