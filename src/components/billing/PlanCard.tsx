import type { TierConfig, BillingInterval } from '@/lib/stripe/config';

interface PlanCardProps {
  tier: TierConfig;
  interval: BillingInterval;
  currentTier: string;
  onSelectPlan: (tier: string, interval: BillingInterval) => void;
  loading: boolean;
}

export function PlanCard({
  tier,
  interval,
  currentTier,
  onSelectPlan,
  loading,
}: PlanCardProps) {
  const isCurrent = tier.tier === currentTier;
  const isFree = tier.tier === 'free';

  // Determine price to display
  const price = isFree
    ? 0
    : tier.tier === 'free'
    ? 0
    : tier.price[interval];

  // Calculate annual savings
  const monthlySavings =
    !isFree && tier.tier !== 'free' && interval === 'annual'
      ? Math.round(
          ((tier.price.monthly * 12 - tier.price.annual) / tier.price.monthly / 12) * 100
        )
      : 0;

  // Determine button text
  let buttonText = 'Get Started';
  if (isCurrent) {
    buttonText = 'Current Plan';
  } else if (!isFree && currentTier !== 'free') {
    // Determine if upgrade or downgrade based on tier order
    const tierOrder = ['free', 'analysis', 'marketing', 'growth'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const thisIndex = tierOrder.indexOf(tier.tier);
    buttonText = thisIndex > currentIndex ? 'Upgrade' : 'Downgrade';
  }

  return (
    <div
      className={`
        card relative
        ${isCurrent ? 'border-2 border-flame-500 bg-flame-500/5' : 'border border-char-700'}
        ${tier.popular ? 'ring-2 ring-heat-500/50' : ''}
      `}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-heat-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
            Popular
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="px-3 py-1 bg-flame-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
            Current
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Tier name */}
        <h3 className="font-display text-2xl mb-2">{tier.name}</h3>

        {/* Price */}
        <div className="mb-6">
          {isFree ? (
            <div className="text-4xl font-bold">Free</div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">${price}</span>
                <span className="text-ash-400">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              {interval === 'annual' && monthlySavings > 0 && (
                <p className="text-sm text-success mt-1">
                  Save ${monthlySavings}/month with annual billing
                </p>
              )}
            </>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-ash-300">
              <span className="text-flame-500 mt-0.5">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Button */}
        <button
          onClick={() => onSelectPlan(tier.tier, interval)}
          disabled={isCurrent || loading}
          className={`
            w-full py-3 rounded-btn font-semibold transition-all
            ${
              isCurrent
                ? 'bg-char-700 text-ash-400 cursor-not-allowed'
                : 'btn-primary'
            }
            ${loading ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Processing...
            </span>
          ) : (
            buttonText
          )}
        </button>
      </div>
    </div>
  );
}
