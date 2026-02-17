import Link from 'next/link';
import type { Profile } from '@/types';

interface QuickStatsProps {
  profile: Profile | null;
}

export function QuickStats({ profile }: QuickStatsProps) {
  if (!profile) {
    return null;
  }

  const scansUsed = profile.scan_credits_used || 0;
  const scansLimit = profile.scan_credits_limit || 1;
  const tokensUsed = profile.content_tokens_used || 0;
  const tokensLimit = profile.content_tokens_limit || 0;

  const scansPercentage = Math.round((scansUsed / scansLimit) * 100);
  const tokensPercentage = tokensLimit > 0 ? Math.round((tokensUsed / tokensLimit) * 100) : 0;

  const tierDisplay = {
    free: { name: 'Free', color: 'text-ash-400' },
    analysis: { name: 'Analysis', color: 'text-heat-500' },
    marketing: { name: 'Marketing', color: 'text-ember-500' },
    growth: { name: 'Growth', color: 'text-flame-500' },
  };

  const currentTier = tierDisplay[profile.subscription_tier] || tierDisplay.free;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg">Your Plan</h3>
        <Link href="/settings" className="text-sm text-flame-500 hover:text-flame-600">
          Manage →
        </Link>
      </div>

      {/* Subscription Tier */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={`font-display text-2xl ${currentTier.color}`}>
            {currentTier.name}
          </span>
          {profile.subscription_status === 'active' && (
            <span className="px-2 py-1 bg-success/20 text-success text-xs rounded">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="space-y-4">
        {/* Scans */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ash-300">Scans</span>
            <span className="text-sm text-ash-400">
              {scansUsed} / {scansLimit}
            </span>
          </div>
          <div className="h-2 bg-char-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                scansPercentage >= 90
                  ? 'bg-danger'
                  : scansPercentage >= 70
                  ? 'bg-warning'
                  : 'bg-flame-500'
              }`}
              style={{ width: `${Math.min(scansPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-ash-500 mt-1">
            {scansLimit - scansUsed} scans remaining
          </p>
        </div>

        {/* Content Tokens */}
        {tokensLimit > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ash-300">Content Articles</span>
              <span className="text-sm text-ash-400">
                {tokensUsed} / {tokensLimit}
              </span>
            </div>
            <div className="h-2 bg-char-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  tokensPercentage >= 90
                    ? 'bg-danger'
                    : tokensPercentage >= 70
                    ? 'bg-warning'
                    : 'bg-heat-500'
                }`}
                style={{ width: `${Math.min(tokensPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-ash-500 mt-1">
              {tokensLimit - tokensUsed} articles remaining
            </p>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {profile.subscription_tier === 'free' && (
        <div className="mt-6 pt-6 border-t border-char-700">
          <p className="text-sm text-ash-400 mb-3">
            Unlock more scans, content generation, and advanced features.
          </p>
          <Link href="/settings" className="btn-primary w-full text-center block">
            Upgrade Plan
          </Link>
        </div>
      )}
    </div>
  );
}
