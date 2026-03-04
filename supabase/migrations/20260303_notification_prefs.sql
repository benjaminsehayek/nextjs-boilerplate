ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"weekly_digest": true, "scan_complete": true, "campaign_sent": false, "billing_reminder": true}'::jsonb;
