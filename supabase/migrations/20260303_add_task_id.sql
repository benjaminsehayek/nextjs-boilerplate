ALTER TABLE site_audits ADD COLUMN IF NOT EXISTS task_id TEXT;
CREATE INDEX IF NOT EXISTS idx_site_audits_task_id ON site_audits(task_id);
