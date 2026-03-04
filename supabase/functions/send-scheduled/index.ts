// Supabase Edge Function: send-scheduled
// Fires campaigns whose scheduled_at time has arrived.
//
// HOW TO SET UP THE CRON:
//   Supabase Dashboard → Edge Functions → send-scheduled → Schedules tab
//   Add schedule: "*/5 * * * *" (runs every 5 minutes)
//   This will pick up any campaigns with scheduled_at <= NOW() and trigger sending.
//
// ENVIRONMENT VARIABLES REQUIRED (set in Edge Function secrets):
//   SUPABASE_URL            — your project URL
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypass RLS)
//   APP_URL                 — full URL of your Next.js app (e.g. https://app.scorchlocal.com)
//   CRON_SECRET             — shared secret to authorize cron calls

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Verify cron authorization header to prevent unauthorized triggering
  const authHeader = req.headers.get('Authorization');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appUrl = Deno.env.get('APP_URL') || '';

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Find all campaigns that are scheduled and whose scheduled_at has passed
  const { data: dueCampaigns, error: queryError } = await supabase
    .from('campaigns')
    .select('id, name, ab_test_enabled, subject_a, subject_b')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50);

  if (queryError) {
    console.error('[send-scheduled] Query error:', queryError.message);
    return new Response(
      JSON.stringify({ error: queryError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!dueCampaigns || dueCampaigns.length === 0) {
    return new Response(
      JSON.stringify({ triggered: 0, message: 'No due campaigns' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const results: { id: string; name: string; status: string; error?: string }[] = [];

  // Trigger each due campaign by calling the send API
  for (const campaign of dueCampaigns) {
    try {
      // Mark as 'sending' immediately to prevent double-triggering if the cron
      // fires again before the send API completes
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id)
        .eq('status', 'scheduled'); // guard: only update if still 'scheduled'

      if (updateError) {
        // Another invocation may have already claimed it — skip
        results.push({ id: campaign.id, name: campaign.name, status: 'skipped', error: 'Already claimed' });
        continue;
      }

      // Call the send API endpoint
      const sendRes = await fetch(`${appUrl}/api/marketing/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Service-role key forwarded so the route can trust the caller
          'X-Internal-Service-Key': serviceKey,
        },
        body: JSON.stringify({
          campaign_id: campaign.id,
          ab_test_enabled: campaign.ab_test_enabled ?? false,
          subject_a: campaign.subject_a ?? undefined,
          subject_b: campaign.subject_b ?? undefined,
        }),
      });

      if (!sendRes.ok) {
        const errBody = await sendRes.text();
        console.error(`[send-scheduled] Send failed for ${campaign.id}: ${errBody}`);
        // Revert to 'scheduled' so it will be retried on the next cron tick
        await supabase
          .from('campaigns')
          .update({ status: 'scheduled' })
          .eq('id', campaign.id);
        results.push({ id: campaign.id, name: campaign.name, status: 'error', error: errBody });
      } else {
        results.push({ id: campaign.id, name: campaign.name, status: 'triggered' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[send-scheduled] Exception for ${campaign.id}:`, errMsg);
      results.push({ id: campaign.id, name: campaign.name, status: 'error', error: errMsg });
    }
  }

  return new Response(
    JSON.stringify({ triggered: results.filter((r) => r.status === 'triggered').length, results }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
