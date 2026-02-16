'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { UsageCard } from '@/components/billing/UsageCard';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';
import { useState, useEffect } from 'react';

export default function BillingPage() {
  const { profile, loading: userLoading } = useUser();
  const { tier, loading: subLoading } = useSubscription();
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success redirect from Stripe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('session_id')) {
        setShowSuccess(true);
        // Clear the session_id from URL
        window.history.replaceState({}, '', '/billing');
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000);
      }
    }
  }, []);

  const loading = userLoading || subLoading;

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <CurrentPlanCard profile={profile} tier={tier} />
          <UsageCard profile={profile} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PaymentMethodCard />

          {/* Billing History Placeholder */}
          <div className="card">
            <div className="p-6">
              <h3 className="font-display text-lg mb-4">Billing History</h3>
              <p className="text-sm text-ash-400 mb-4">
                Your payment history and invoices will appear here.
              </p>
              <div className="p-4 bg-char-700 rounded-btn text-center">
                <p className="text-ash-500 text-sm">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
