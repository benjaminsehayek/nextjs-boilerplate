import Link from 'next/link';
import type { Profile, SubscriptionTier } from '@/types';
import { SUBSCRIPTION_TIERS } from '@/lib/stripe/config';

interface CurrentPlanCardProps {
  profile: Profile | null;
  tier: SubscriptionTier;
}

export function CurrentPlanCard({ profile, tier }: CurrentPlanCardProps) {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const status = profile?.subscription_status || 'inactive';

  // Determine status badge color
  const statusColors = {
    active: 'bg-success/10 text-success border-success',
    past_due: 'bg-warning/10 text-warning border-warning',
    canceled: 'bg-danger/10 text-danger border-danger',
    trialing: 'bg-heat-500/10 text-heat-500 border-heat-500',
    incomplete: 'bg-ash-500/10 text-ash-400 border-ash-500',
    inactive: 'bg-ash-500/10 text-ash-400 border-ash-500',
  };

  const statusColor = statusColors[status as keyof typeof statusColors] || statusColors.inactive;

  // Format next billing date
  const nextBillingDate = profile?.subscription_period_end
    ? new Date(profile.subscription_period_end).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="card">
      <div className="p-6">
        <h3 className="font-display text-lg mb-4">Current Plan</h3>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h4 className="font-display text-2xl mb-1">{tierConfig.name}</h4>
            {tier !== 'free' && typeof tierConfig.price !== 'number' && (
              <p className="text-ash-400">
                ${tierConfig.price.monthly}/month
              </p>
            )}
          </div>
          <span
            className={`
              px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border
              ${statusColor}
            `}
          >
            {status}
          </span>
        </div>

        {nextBillingDate && status === 'active' && (
          <div className="mb-6 p-4 bg-char-700 rounded-btn">
            <p className="text-sm text-ash-400 mb-1">Next billing date</p>
            <p className="font-semibold">{nextBillingDate}</p>
          </div>
        )}

        {status === 'past_due' && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning rounded-btn">
            <p className="text-sm text-warning">
              ⚠️ Your payment is past due. Please update your payment method to avoid service interruption.
            </p>
          </div>
        )}

        {status === 'canceled' && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-btn">
            <p className="text-sm text-danger">
              Your subscription has been canceled. Access will end on {nextBillingDate}.
            </p>
          </div>
        )}

        <Link href="/plans" className="btn-primary w-full block text-center">
          View All Plans
        </Link>
      </div>
    </div>
  );
}
