-- B9-17: Contact notes history
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes_history JSONB DEFAULT '[]'::jsonb;
