import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

// B16-11: DB-backed idempotency (replaces B14-11 in-memory-only guard)
// In-memory cache for fast-path; DB table for restart durability.
const processedEventsCache = new Map<string, number>();
const EVENT_TTL_MS = 2 * 60 * 60 * 1000;

function isInMemoryProcessed(eventId: string): boolean {
  const ts = processedEventsCache.get(eventId);
  if (ts && Date.now() - ts < EVENT_TTL_MS) return true;
  // Opportunistic cleanup of expired entries
  for (const [id, stamp] of processedEventsCache) {
    if (Date.now() - stamp >= EVENT_TTL_MS) processedEventsCache.delete(id);
  }
  return false;
}

const TIER_MAP: Record<string, { tier: string; tokens: number; scans: number }> = {
  price_analysis_monthly: { tier: 'analysis', tokens: 0, scans: 5 },
  price_analysis_annual: { tier: 'analysis', tokens: 0, scans: 5 },
  price_marketing_monthly: { tier: 'marketing', tokens: 6, scans: 15 },
  price_marketing_annual: { tier: 'marketing', tokens: 6, scans: 15 },
  price_growth_monthly: { tier: 'growth', tokens: 30, scans: 50 },
  price_growth_annual: { tier: 'growth', tokens: 30, scans: 50 },
};

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse('Webhook signature failed', { status: 400 });
  }

  // B16-11: Idempotency — fast-path in-memory, then DB for restart durability
  if (isInMemoryProcessed(event.id)) {
    return new NextResponse('OK');
  }

  // DB-backed: INSERT with unique constraint — duplicate = already processed
  const { error: idempotencyError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id });

  if (idempotencyError?.code === '23505') {
    // Unique violation — event was processed before (e.g. after restart)
    processedEventsCache.set(event.id, Date.now());
    return new NextResponse('OK');
  }
  if (idempotencyError) {
    // Non-fatal — log and continue; worst case is a rare duplicate (operations are idempotent)
    console.error('[Stripe webhook] idempotency insert error:', idempotencyError.message);
  }

  processedEventsCache.set(event.id, Date.now());

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // session.subscription is null for one-time payment mode — skip gracefully
      if (!session.subscription) break;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = (subscription as any).items.data[0].price.id;
      const tierInfo = TIER_MAP[priceId] || { tier: 'analysis', tokens: 0, scans: 5 };

      const { error } = await supabase.from('profiles').update({
        subscription_tier: tierInfo.tier,
        subscription_status: 'active',
        subscription_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        content_tokens_limit: tierInfo.tokens,
        scan_credits_limit: tierInfo.scans,
        content_tokens_used: 0,
        scan_credits_used: 0,
        billing_period_start: new Date().toISOString(),
      }).eq('stripe_customer_id', session.customer);
      if (error) {
        console.error('[Stripe webhook] checkout.session.completed: profile update failed', error.message);
        return new NextResponse('DB update failed', { status: 500 });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as any;
      const priceId = sub.items.data[0].price.id;
      const tierInfo = TIER_MAP[priceId] || { tier: 'analysis', tokens: 0, scans: 5 };

      // Map Stripe subscription statuses explicitly
      const statusMap: Record<string, string> = {
        active: 'active',
        trialing: 'trialing',
        canceled: 'canceled',
        unpaid: 'past_due',
        past_due: 'past_due',
        incomplete: 'past_due',
        incomplete_expired: 'canceled',
      };
      const { error } = await supabase.from('profiles').update({
        subscription_tier: tierInfo.tier,
        subscription_status: statusMap[sub.status] ?? 'past_due',
        subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        content_tokens_limit: tierInfo.tokens,
        scan_credits_limit: tierInfo.scans,
      }).eq('stripe_customer_id', sub.customer);
      if (error) {
        console.error('[Stripe webhook] customer.subscription.updated: profile update failed', error.message);
        return new NextResponse('DB update failed', { status: 500 });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const { error } = await supabase.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'canceled',
      }).eq('stripe_customer_id', sub.customer);
      if (error) {
        console.error('[Stripe webhook] customer.subscription.deleted: profile update failed', error.message);
        return new NextResponse('DB update failed', { status: 500 });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const { error } = await supabase.from('profiles').update({
        subscription_status: 'past_due',
      }).eq('stripe_customer_id', invoice.customer);
      if (error) {
        console.error('[Stripe webhook] invoice.payment_failed: profile update failed', error.message);
        return new NextResponse('DB update failed', { status: 500 });
      }
      break;
    }
  }

  return new NextResponse('OK');
}
