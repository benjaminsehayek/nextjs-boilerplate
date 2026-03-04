# reset-credits Edge Function

Resets `scan_credits_used` and `content_tokens_used` to 0 for all active paid subscribers.

## Scheduling (Supabase Dashboard)

1. Go to **Edge Functions** in your Supabase project dashboard.
2. Deploy this function: `supabase functions deploy reset-credits`
3. Navigate to **Database → Extensions** and enable `pg_cron` if not already enabled.
4. Go to **Edge Functions → Cron** (or use the SQL editor):

```sql
select cron.schedule(
  'reset-credits-monthly',
  '0 0 1 * *',  -- 1st of every month at midnight UTC
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/reset-credits',
    headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb
  )
  $$
);
```

5. Set `CRON_SECRET` in **Settings → Edge Functions → Secrets**.
