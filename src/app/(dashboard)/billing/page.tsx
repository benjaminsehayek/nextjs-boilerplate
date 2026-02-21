'use client';

import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUser } from '@/lib/hooks/useUser';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { UsageCard } from '@/components/billing/UsageCard';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';
import { BillingToggle } from '@/components/billing/BillingToggle';
import { PlanCard } from '@/components/billing/PlanCard';
import { SUBSCRIPTION_TIERS, type BillingInterval } from '@/lib/stripe/config';
import type { CheckoutResponse } from '@/types';
import { useState, useEffect } from 'react';

export default function BillingPage() {
  const { profile, tier, loading } = useSubscription();
  const { refreshProfile } = useUser();
  const [showSuccess, setShowSuccess] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for success redirect from Stripe — refresh profile to pick up new tier/credits
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('session_id')) {
        setShowSuccess(true);
        window.history.replaceState({}, '', '/billing');
        refreshProfile();
        setTimeout(() => setShowSuccess(false), 5000);
      }
    }
  }, []);

  const handleSelectPlan = async (planTier: string, planInterval: BillingInterval) => {
    if (planTier === 'free') {
      setError('Downgrading to free tier is not yet supported. Please contact support.');
      return;
    }

    if (planTier === tier) {
      return;
    }

    setCheckoutLoading(planTier);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: planTier, interval: planInterval }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url }: CheckoutResponse = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate checkout. Please try again.'
      );
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <ToolPageShell
        icon="💳"
        name="Billing"
        description="Manage your subscription and billing"
      >
        <div className="space-y-4">
          <div className="h-48 bg-char-700 animate-pulse rounded-btn" />
          <div className="h-48 bg-char-700 animate-pulse rounded-btn" />
        </div>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell
      icon="💳"
      name="Billing"
      description="Manage your subscription and billing"
    >
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-success/10 border border-success rounded-btn flex items-center gap-3">
          <span className="text-success text-xl">✓</span>
          <div>
            <p className="font-semibold text-success">Subscription updated successfully!</p>
            <p className="text-sm text-success/80">
              Your account has been upgraded. Changes may take a few moments to reflect.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <CurrentPlanCard profile={profile} tier={tier} />
        <UsageCard profile={profile} />
      </div>

      {/* Upgrade Plans Section */}
      <div className="mb-8">
        <h2 className="font-display text-2xl mb-2">Upgrade Your Plan</h2>
        <p className="text-ash-400 mb-6">
          Choose the plan that fits your business needs
        </p>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <BillingToggle interval={interval} onChange={setInterval} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-btn flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-danger text-xl">⚠️</span>
              <p className="text-sm text-danger">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-danger hover:text-danger/80"
            >
              ✕
            </button>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {Object.values(SUBSCRIPTION_TIERS).map((tierConfig) => (
            <PlanCard
              key={tierConfig.tier}
              tier={tierConfig}
              interval={interval}
              currentTier={tier}
              onSelectPlan={handleSelectPlan}
              loading={checkoutLoading === tierConfig.tier}
            />
          ))}
        </div>
      </div>

      {/* Additional Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
        {/* Consulting Card */}
        <div className="card">
          <div className="p-6">
            <h3 className="font-display text-lg mb-2 flex items-center gap-2">
              <span>📞</span>
              <span>Need Marketing Strategy Help?</span>
            </h3>
            <p className="text-sm text-ash-400 mb-4">
              Want personalized marketing strategy and consulting? Give us a call!
            </p>
            <a
              href="tel:425-232-6029"
              className="btn-primary w-full block text-center"
            >
              Call 425-232-6029
            </a>
          </div>
        </div>

        {/* Payment Method */}
        <PaymentMethodCard />
      </div>
    </ToolPageShell>
  );
}
