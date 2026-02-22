'use client';

import { ScoreRing } from '@/components/ui/ScoreRing';
import type { NAPConsistencyProps } from './types';

export default function NAPConsistency({ nap }: NAPConsistencyProps) {
  return (
    <div className="space-y-6">
      {/* Score Ring */}
      <div className="card p-6 flex items-center gap-6">
        <ScoreRing score={nap.score} size={100} />
        <div>
          <h3 className="text-lg font-display text-ash-300">NAP Consistency</h3>
          <p className="text-sm text-ash-500 mt-1">
            Name, Address, and Phone consistency across listings
          </p>
        </div>
      </div>

      {/* Golden Record */}
      <div>
        <h3 className="text-lg font-display text-ash-300 mb-4">
          Golden Record (from GBP)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-ash-500 uppercase tracking-wide mb-2">
              Business Name
            </div>
            <div className="text-sm font-display text-ash-300">
              {nap.canonical.name}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-ash-500 uppercase tracking-wide mb-2">
              Address
            </div>
            <div className="text-sm font-display text-ash-300">
              {nap.canonical.address}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-ash-500 uppercase tracking-wide mb-2">
              Phone
            </div>
            <div className="text-sm font-display text-ash-300">
              {nap.canonical.phone}
            </div>
          </div>
        </div>
      </div>

      {/* Mismatches or Success */}
      {nap.mismatches.length > 0 ? (
        <div>
          <h3 className="text-lg font-display text-ash-300 mb-4">
            Mismatches Found ({nap.mismatches.length})
          </h3>
          <div className="space-y-3">
            {nap.mismatches.map((m, idx) => (
              <div key={idx} className="card p-5">
                <div className="text-xs text-ash-500 uppercase tracking-wide mb-3">
                  {m.field}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-success mb-1 block">Expected</span>
                    <div className="text-sm text-success bg-success/10 rounded-btn px-3 py-2">
                      {m.expected}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-danger mb-1 block">Found</span>
                    <div className="text-sm text-danger bg-danger/10 rounded-btn px-3 py-2">
                      {m.found}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center">
          <div className="text-3xl mb-3 text-success">\u2713</div>
          <p className="text-success font-display text-lg">
            NAP information is consistent across all listings
          </p>
        </div>
      )}
    </div>
  );
}
