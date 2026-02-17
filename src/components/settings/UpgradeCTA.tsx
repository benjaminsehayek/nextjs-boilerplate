import Link from 'next/link';

interface UpgradeCTAProps {
  title: string;
  description: string;
  feature?: string;
  compact?: boolean;
}

export function UpgradeCTA({ title, description, feature, compact = false }: UpgradeCTAProps) {
  if (compact) {
    return (
      <div className="bg-gradient-to-r from-flame-500/10 to-heat-500/10 border border-flame-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-ash-100 mb-1">{title}</p>
            <p className="text-xs text-ash-400">{description}</p>
          </div>
          <Link href="/settings?tab=billing" className="btn-primary text-sm whitespace-nowrap">
            Upgrade
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-br from-flame-500/5 to-heat-500/5 border-flame-500/30 p-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl">🚀</div>
        <div className="flex-1">
          <h3 className="font-display text-lg mb-2">{title}</h3>
          <p className="text-ash-300 mb-4">{description}</p>
          {feature && (
            <div className="bg-char-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-ash-200">✨ {feature}</p>
            </div>
          )}
          <Link href="/settings?tab=billing" className="btn-primary inline-block">
            Upgrade Your Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
