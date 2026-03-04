// POST /api/stripe/cancel
// Body: { immediately?: boolean } — if false/undefined: cancel at period end
// Auth required. Schedules subscription cancellation.

import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/apiError';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return apiError('Unauthorized', 401, undefined, { 'X-Request-ID': requestId });
  }

  // 2. Load profile to get stripe IDs
  const { data: profile, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return apiError('Profile not found', 404, undefined, { 'X-Request-ID': requestId });
  }

  // 3. Check for active subscription
  let subscriptionId: string | null = profile.stripe_subscription_id || null;

  // If no stored subscription ID, look it up via the customer ID
  if (!subscriptionId && profile.stripe_customer_id) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 1,
      });
      subscriptionId = subs.data[0]?.id || null;
    } catch (err: any) {
      console.error(`[stripe/cancel][${requestId}] Failed to list subscriptions:`, err.message);
    }
  }

  if (!subscriptionId) {
    return apiError('No active subscription', 400, undefined, { 'X-Request-ID': requestId });
  }

  try {
    // 4. Schedule cancellation at period end (not immediately)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    }) as any;

    // 5. Update profile subscription_status to 'cancelling'
    await (supabase as any)
      .from('profiles')
      .update({ subscription_status: 'cancelling' })
      .eq('id', user.id);

    // 6. Return success with cancellation date
    // current_period_end is present on the Stripe API response even if not in v20 TS types
    return NextResponse.json(
      { success: true, cancelsAt: subscription.current_period_end ?? subscription.cancel_at ?? null },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (err: any) {
    console.error(`[stripe/cancel][${requestId}]`, err);
    if (err instanceof Stripe.errors.StripeError) {
      return apiError(err.message, 500, undefined, { 'X-Request-ID': requestId });
    }
    return apiError('Failed to cancel subscription', 500, undefined, { 'X-Request-ID': requestId });
  }
}
