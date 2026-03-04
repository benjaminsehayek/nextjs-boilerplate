import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Reset credits for all profiles where:
  // - subscription_status = 'active'
  // - tier != 'free' (free users don't have credits)
  const { data, error } = await supabase
    .from('profiles')
    .update({ scan_credits_used: 0, content_tokens_used: 0 })
    .eq('subscription_status', 'active')
    .neq('tier', 'free')
    .select('user_id')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ reset: data?.length ?? 0 }), { status: 200 })
})
