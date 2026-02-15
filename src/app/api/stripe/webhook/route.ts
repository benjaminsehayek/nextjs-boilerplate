import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = (subscription as any).items.data[0].price.id;
      const tierInfo = TIER_MAP[priceId] || { tier: 'analysis', tokens: 0, scans: 5 };

      await supabase.from('profiles').update({
        subscription_tier: tierInfo.tier,
        subscription_status: 'active',
        subscription_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        content_tokens_limit: tierInfo.tokens,
        scan_credits_limit: tierInfo.scans,
        content_tokens_used: 0,
        scan_credits_used: 0,
        billing_period_start: new Date().toISOString(),
      }).eq('stripe_customer_id', session.customer);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as any;
      const priceId = sub.items.data[0].price.id;
      const tierInfo = TIER_MAP[priceId] || { tier: 'analysis', tokens: 0, scans: 5 };

      await supabase.from('profiles').update({
        subscription_tier: tierInfo.tier,
        subscription_status: sub.status === 'active' ? 'active' : 'past_due',
        subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        content_tokens_limit: tierInfo.tokens,
        scan_credits_limit: tierInfo.scans,
      }).eq('stripe_customer_id', sub.customer);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'canceled',
      }).eq('stripe_customer_id', sub.customer);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase.from('profiles').update({
        subscription_status: 'past_due',
      }).eq('stripe_customer_id', invoice.customer);
      break;
    }
  }

  return new NextResponse('OK');
}
