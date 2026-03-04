ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(business_id, deleted_at) WHERE deleted_at IS NULL;
