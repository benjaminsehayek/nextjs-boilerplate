'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';

const tiers = [
  {
    name: 'Analysis',
    price: '$120',
    period: '/month',
    features: [
      'Site Audit',
      'Content Strategy',
      'Local Grid',
      'Off-Page Audit',
      '5 scans per month',
    ],
  },
  {
    name: 'Marketing',
    price: '$250',
    period: '/month',
    features: [
      'Everything in Analysis',
      'Lead Database',
      'Content Generation (6 articles/month)',
      'Email & SMS campaigns',
      '15 scans per month',
    ],
  },
  {
    name: 'Growth',
    price: '$450',
    period: '/month',
    features: [
      'Everything in Marketing',
      'Lead Intelligence',
      'Multi-location support',
      'Cross-tool pipeline',
      'Content Generation (30 articles/month)',
      '50 scans per month',
    ],
  },
];

export default function SettingsPage() {
  const { user, profile } = useUser();
  const { tier, scansRemaining, tokensRemaining } = useSubscription();

  return (
    <div>
      <h1 className="text-3xl font-display mb-8">
        <span className="text-flame-500">Settings</span>
      </h1>

      <div className="card p-6 mb-8">
        <h2 className="font-display text-xl mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="input-label">Name</div>
            <div className="text-ash-100">{profile?.full_name || 'Not set'}</div>
          </div>
          <div>
            <div className="input-label">Email</div>
            <div className="text-ash-100">{user?.email}</div>
          </div>
          <div>
            <div className="input-label">Current Plan</div>
            <div className="text-ash-100 capitalize">{tier}</div>
          </div>
          <div>
            <div className="input-label">Scans Remaining</div>
            <div className="text-ash-100">{scansRemaining} this month</div>
          </div>
        </div>
      </div>

      <h2 className="font-display text-2xl mb-6">Subscription Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`card p-6 ${
              tier === t.name.toLowerCase()
                ? 'border-flame-500 bg-flame-500/5'
                : ''
            }`}
          >
            <h3 className="font-display text-xl mb-2 text-flame-500">
              {t.name}
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-display">{t.price}</span>
              <span className="text-ash-400">{t.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {t.features.map((feature, i) => (
                <li key={i} className="text-sm text-ash-300 flex items-start gap-2">
                  <span className="text-success">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            {tier === t.name.toLowerCase() ? (
              <div className="btn-ghost w-full text-center cursor-default">
                Current Plan
              </div>
            ) : (
              <button className="btn-primary w-full">
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
