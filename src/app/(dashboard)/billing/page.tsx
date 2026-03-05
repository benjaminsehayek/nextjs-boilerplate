'use client';

import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/components/ui/Toast';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { UsageCard } from '@/components/billing/UsageCard';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';
import { BillingToggle } from '@/components/billing/BillingToggle';
import { PlanCard } from '@/components/billing/PlanCard';
import { SUBSCRIPTION_TIERS, type BillingInterval } from '@/lib/stripe/config';
import type { CheckoutResponse } from '@/types';
import { useState, useEffect } from 'react';

// ── Feature loss lists when downgrading to Free ───────────────────────────────

const FREE_TIER_FEATURES_LOST: string[] = [
  'Email/SMS campaigns',
  'Contact database',
  'Site & off-page auditing',
  'Lead intelligence',
  'AI content generation',
  'Local grid scanning',
  'Keyword research tools',
  'Priority support',
];

// ── Feature loss lists by tier ────────────────────────────────────────────────

const TIER_FEATURES_LOST: Record<string, string[]> = {
  growth: [
    'AI content generation',
    'Local grid scanning',
    'Campaign sending limit increases',
    'Priority support',
  ],
  analysis: [
    'Site auditing',
    'Off-page auditing',
    'Lead intelligence',
    'Keyword research tools',
  ],
  marketing: [
    'Email/SMS campaigns',
    'Contact database',
    'SendGrid integration',
    'Campaign analytics',
  ],
};

// ── CancelConfirmModal ────────────────────────────────────────────────────────

function CancelConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  periodEnd,
  tier,
  loading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  periodEnd: string;
  tier: string;
  loading: boolean;
  error: string | null;
}) {
  if (!isOpen) return null;

  const featuresLost = TIER_FEATURES_LOST[tier] || [];

  return (
    <div
      className="animate-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-modal-card card max-w-md w-full p-6">
        <h2 className="font-display text-xl mb-2">Cancel Subscription?</h2>
        <p className="text-sm text-ash-300 mb-4">
          Your plan will remain active until{' '}
          <span className="font-semibold text-ash-100">{periodEnd}</span>.
        </p>

        {featuresLost.length > 0 && (
          <>
            <p className="text-sm text-ash-400 mb-2">After that, you&apos;ll lose access to:</p>
            <ul className="mb-5 space-y-1.5">
              {featuresLost.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-ash-300">
                  <span className="text-danger text-xs">✕</span>
                  {feature}
                </li>
              ))}
            </ul>
          </>
        )}

        {error && (
          <p className="text-sm text-danger mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Keep My Plan
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger flex-1 disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DowngradeConfirmModal ─────────────────────────────────────────────────────

function DowngradeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  periodEnd,
  loading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  periodEnd: string;
  loading: boolean;
  error: string | null;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="animate-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-modal-card card max-w-md w-full p-6">
        <h2 className="font-display text-xl mb-2">Downgrade to Free?</h2>
        <p className="text-sm text-ash-300 mb-4">
          Downgrading to Free will cancel your subscription at the end of the current billing period.
          You&apos;ll keep full access until{' '}
          <span className="font-semibold text-ash-100">{periodEnd}</span>.
        </p>

        <p className="text-sm text-ash-400 mb-2">At that time, you&apos;ll lose access to:</p>
        <ul className="mb-5 space-y-1.5">
          {FREE_TIER_FEATURES_LOST.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-ash-300">
              <span className="text-danger text-xs">✕</span>
              {feature}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-sm text-danger mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Keep My Plan
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger flex-1 disabled:opacity-50"
          >
            {loading ? 'Downgrading...' : 'Downgrade to Free'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { profile, tier, loading } = useSubscription();
  const { refreshProfile } = useUser();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancel subscription state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelledAt, setCancelledAt] = useState<number | null>(null);

  // BL-01: Downgrade to free state
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [downgradeError, setDowngradeError] = useState<string | null>(null);
  const [downgradedAt, setDowngradedAt] = useState<number | null>(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPlan = async (planTier: string, planInterval: BillingInterval) => {
    if (checkoutLoading !== null) return;

    if (planTier === 'free') {
      // BL-01: Show downgrade confirmation modal
      if (tier !== 'free') {
        setShowDowngradeConfirm(true);
        setDowngradeError(null);
      }
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

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || 'Failed to cancel subscription. Please try again.');
        return;
      }
      setCancelledAt(data.cancelsAt as number);
      setShowCancelConfirm(false);
      toast.success('Subscription cancelled');
      refreshProfile();
    } catch {
      setCancelError('Network error. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // BL-01: Downgrade to free — same cancel endpoint, cancel_at_period_end
  const handleDowngradeToFree = async () => {
    setDowngradeLoading(true);
    setDowngradeError(null);
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setDowngradeError(data.error || 'Failed to downgrade. Please try again.');
        return;
      }
      setDowngradedAt(data.cancelsAt as number);
      setShowDowngradeConfirm(false);
      toast.success('Plan will downgrade to Free at period end');
      refreshProfile();
    } catch {
      setDowngradeError('Network error. Please try again.');
    } finally {
      setDowngradeLoading(false);
    }
  };

  // Format a Unix timestamp (seconds) as a human-readable date
  const formatUnixDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  // Determine if we're in a 'cancelling' state (either just cancelled or profile says so)
  const isCancelling =
    cancelledAt !== null ||
    (profile as any)?.subscription_status === 'cancelling';

  const cancelsOnDate =
    cancelledAt !== null
      ? formatUnixDate(cancelledAt)
      : profile?.subscription_period_end
      ? new Date(profile.subscription_period_end).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

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

      {/* Cancelled success message */}
      {cancelledAt !== null && cancelsOnDate && (
        <div className="mb-6 p-4 bg-char-800 border border-ash-600 rounded-btn">
          <p className="text-sm text-ash-300">
            Subscription cancelled. Access continues until{' '}
            <span className="font-semibold text-ash-100">{cancelsOnDate}</span>.
          </p>
        </div>
      )}

      {/* BL-01: Downgrade to free confirmation banner */}
      {downgradedAt !== null && (
        <div className="mb-6 p-4 bg-char-800 border border-ash-600 rounded-btn flex items-center gap-3">
          <span className="inline-block px-2 py-0.5 bg-ash-700 text-ash-300 rounded-full text-xs font-medium shrink-0">
            Downgrading to Free
          </span>
          <p className="text-sm text-ash-300">
            Your plan will downgrade to Free on{' '}
            <span className="font-semibold text-ash-100">{formatUnixDate(downgradedAt)}</span>.
            You have full access until then.
          </p>
        </div>
      )}

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CurrentPlanCard profile={profile} tier={tier} />
        <UsageCard profile={profile} />
      </div>

      {/* Cancel subscription section — only show for paid active/cancelling plans */}
      {tier !== 'free' && (
        <div className="mb-12">
          {isCancelling && cancelsOnDate ? (
            <p className="text-sm text-ash-400">
              <span className="inline-block px-2 py-0.5 bg-danger/10 text-danger rounded-full text-xs font-medium mr-2">
                Cancels on {cancelsOnDate}
              </span>
              Your plan remains active until then.
            </p>
          ) : (
            <button
              onClick={() => { setShowCancelConfirm(true); setCancelError(null); }}
              className="btn-ghost text-danger text-sm"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <CancelConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => { setShowCancelConfirm(false); setCancelError(null); }}
        onConfirm={handleCancelSubscription}
        periodEnd={
          profile?.subscription_period_end
            ? new Date(profile.subscription_period_end).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : 'the end of your billing period'
        }
        tier={tier}
        loading={cancelLoading}
        error={cancelError}
      />

      {/* BL-01: Downgrade to Free Confirmation Modal */}
      <DowngradeConfirmModal
        isOpen={showDowngradeConfirm}
        onClose={() => { setShowDowngradeConfirm(false); setDowngradeError(null); }}
        onConfirm={handleDowngradeToFree}
        periodEnd={
          profile?.subscription_period_end
            ? new Date(profile.subscription_period_end).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : 'the end of your billing period'
        }
        loading={downgradeLoading}
        error={downgradeError}
      />

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
          <div className="mb-6 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-btn text-sm flex items-center justify-between gap-3">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="hover:opacity-80 flex-shrink-0"
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
