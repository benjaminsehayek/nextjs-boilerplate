-- Add scheduled_at column to campaigns table if it doesn't already exist.
-- The status column already supports 'scheduled' as a value in the application layer.
-- This migration is idempotent.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
