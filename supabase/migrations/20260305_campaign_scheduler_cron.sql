-- B12-05: Campaign scheduler via pg_cron + pg_net
--
-- This migration enables pg_cron and pg_net, then schedules a job that
-- invokes the `send-scheduled` Edge Function every 5 minutes.
--
-- PREREQUISITES (set once per project, not in migration):
--   ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://<project>.supabase.co';
--   ALTER DATABASE postgres SET "app.settings.service_role_key" = '<service_role_key>';
--   ALTER DATABASE postgres SET "app.settings.cron_secret" = '<cron_secret>';
--
-- These settings are loaded via current_setting() below so no credentials
-- are committed to source control.

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant pg_cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove any existing schedule with this name to ensure idempotency
SELECT cron.unschedule('campaign-scheduler')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'campaign-scheduler'
  );

-- Schedule: run every 5 minutes
SELECT cron.schedule(
  'campaign-scheduler',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-scheduled',
    headers := jsonb_build_object(
      'Authorization',  'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type',   'application/json',
      'X-Cron-Secret',  current_setting('app.settings.cron_secret', true)
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
