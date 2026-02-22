'use client';

import type { SocialPresenceProps } from './types';

export default function SocialPresence({ platforms }: SocialPresenceProps) {
  const foundCount = platforms.filter((p) => p.found).length;
  const totalCount = platforms.length || 8;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-white">Social Presence</h3>
        <span className="text-ash-300 text-sm">
          <span className="text-white font-semibold">{foundCount}</span> / {totalCount} platforms
          found
        </span>
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {platforms.map((platform) => (
          <div
            key={platform.platform}
            className={`card-interactive p-4 text-center border transition-colors ${
              platform.found
                ? 'border-green-500/20 hover:border-green-500/40'
                : 'border-white/5 hover:border-white/10'
            }`}
          >
            {/* Icon */}
            <div className="text-3xl mb-2">{platform.icon}</div>

            {/* Platform Name */}
            <p className="text-white text-sm font-medium mb-2">{platform.platform}</p>

            {/* Badge */}
            {platform.found ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-btn text-xs font-medium text-success bg-green-500/10">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Found
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded-btn text-xs font-medium text-ash-500 bg-char-900">
                Missing
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
