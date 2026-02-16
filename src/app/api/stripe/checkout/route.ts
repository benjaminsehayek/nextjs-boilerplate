import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/stripe/config';
import type { CheckoutRequest, CheckoutResponse } from '@/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export async function POST(request: Request) {
  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: CheckoutRequest = await request.json();
    const { tier, interval } = body;

    // 3. Validate tier and interval
    if (!tier || !interval) {
      return NextResponse.json(
        { error: 'Missing tier or interval' },
        { status: 400 }
      );
    }

    if (!(tier in SUBSCRIPTION_TIERS)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (interval !== 'monthly' && interval !== 'annual') {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

    // Free tier doesn't need checkout
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Free tier does not require checkout' },
        { status: 400 }
      );
    }

    // 4. Get or create Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 5. Get price ID from tier config
    const priceId = tierConfig.priceIds[interval];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this tier/interval' },
        { status: 500 }
      );
    }

    // 6. Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/plans`,
      metadata: {
        user_id: user.id,
        tier,
        interval,
      },
    });

    // 7. Return checkout URL
    const response: CheckoutResponse = {
      url: session.url!,
      sessionId: session.id,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Stripe checkout error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
