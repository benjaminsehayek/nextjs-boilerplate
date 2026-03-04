-- B6-02: Add subject_variant column for A/B testing
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS subject_variant TEXT CHECK (subject_variant IN ('A', 'B'));
