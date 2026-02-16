import type { Profile } from '@/types';

interface UsageCardProps {
  profile: Profile | null;
}

export function UsageCard({ profile }: UsageCardProps) {
  const scansUsed = profile?.scan_credits_used || 0;
  const scansLimit = profile?.scan_credits_limit || 1;
  const tokensUsed = profile?.content_tokens_used || 0;
  const tokensLimit = profile?.content_tokens_limit || 0;

  const scansPercentage = Math.round((scansUsed / scansLimit) * 100);
  const tokensPercentage = tokensLimit > 0 ? Math.round((tokensUsed / tokensLimit) * 100) : 0;

  // Calculate reset date from subscription_period_end
  const resetDate = profile?.subscription_period_end
    ? new Date(profile.subscription_period_end)
    : new Date(new Date().setMonth(new Date().getMonth() + 1));
  const resetDateString = resetDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="card">
      <div className="p-6">
        <h3 className="font-display text-lg mb-6">Usage This Month</h3>

        {/* Scans */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Scans</span>
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Content Articles</span>
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

        {/* Reset Date */}
        <div className="pt-4 border-t border-char-700">
          <p className="text-sm text-ash-400">
            Resets on <span className="font-semibold text-ash-200">{resetDateString}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
