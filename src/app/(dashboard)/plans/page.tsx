'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { BillingToggle } from '@/components/billing/BillingToggle';
import { PlanCard } from '@/components/billing/PlanCard';
import { SUBSCRIPTION_TIERS, type BillingInterval } from '@/lib/stripe/config';
import type { CheckoutResponse } from '@/types';

export default function PlansPage() {
  const { tier: currentTier, loading: subLoading } = useSubscription();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (tier: string, interval: BillingInterval) => {
    // Handle free tier separately (future implementation)
    if (tier === 'free') {
      setError('Downgrading to free tier is not yet supported. Please contact support.');
      return;
    }

    // Prevent selecting current plan
    if (tier === currentTier) {
      return;
    }

    setLoading(tier);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, interval }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url }: CheckoutResponse = await response.json();

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate checkout. Please try again.'
      );
      setLoading(null);
    }
  };

  if (subLoading) {
    return (
      <ToolPageShell
        icon="📊"
        name="Plans"
        description="Choose the plan that fits your business"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-96 bg-char-700 animate-pulse rounded-btn" />
          ))}
        </div>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell
      icon="📊"
      name="Plans"
      description="Choose the plan that fits your business"
    >
      {/* Billing Toggle */}
      <div className="mb-8 flex justify-center">
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
            currentTier={currentTier}
            onSelectPlan={handleSelectPlan}
            loading={loading === tierConfig.tier}
          />
        ))}
      </div>

      {/* Back to Billing */}
      <div className="mt-8 text-center">
        <Link href="/billing" className="btn-ghost inline-flex items-center gap-2">
          <span>←</span>
          <span>Back to Billing</span>
        </Link>
      </div>
    </ToolPageShell>
  );
}
