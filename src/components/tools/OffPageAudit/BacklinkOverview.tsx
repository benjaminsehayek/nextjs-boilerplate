'use client';

import { ScoreRing } from '@/components/ui/ScoreRing';
import { fmtN } from '@/lib/dataforseo';
import type { BacklinkOverviewProps } from './types';

export default function BacklinkOverview({ metrics }: BacklinkOverviewProps) {
  const followPercentage = metrics.totalBacklinks > 0
    ? Math.round((metrics.followLinks / metrics.totalBacklinks) * 100)
    : 0;

  const toxicityColor = metrics.toxicScore < 30 ? 'success' : metrics.toxicScore < 60 ? 'ember-500' : 'danger';

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="flex justify-center mb-4">
            <ScoreRing score={metrics.domainRating} size={120} showGrade={false} />
          </div>
          <h3 className="text-lg font-display text-ash-300 mb-1">Domain Rating</h3>
          <p className="text-xs text-ash-500">
            Authority score based on backlink profile
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="flex justify-center mb-4">
            <ScoreRing score={metrics.qualityScore} size={120} showGrade={false} />
          </div>
          <h3 className="text-lg font-display text-ash-300 mb-1">Quality Score</h3>
          <p className="text-xs text-ash-500">
            Overall backlink quality assessment
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="text-5xl font-display mb-2" style={{ color: `var(--${toxicityColor})` }}>
            {metrics.toxicScore}
          </div>
          <h3 className="text-lg font-display text-ash-300 mb-1">Toxicity Score</h3>
          <p className="text-xs text-ash-500">
            Lower is better (0-30 = excellent)
          </p>
        </div>
      </div>

      {/* Backlink Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-btn bg-flame-gradient flex items-center justify-center text-xl">
              🔗
            </div>
            <div className="text-3xl font-display text-flame-500">
              {fmtN(metrics.totalBacklinks)}
            </div>
          </div>
          <div className="text-sm text-ash-400">Total Backlinks</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-btn bg-ember-gradient flex items-center justify-center text-xl">
              🌐
            </div>
            <div className="text-3xl font-display text-ember-500">
              {fmtN(metrics.referringDomains)}
            </div>
          </div>
          <div className="text-sm text-ash-400">Referring Domains</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-btn bg-success/20 flex items-center justify-center text-xl">
              ✓
            </div>
            <div className="text-3xl font-display text-success">
              {fmtN(metrics.followLinks)}
            </div>
          </div>
          <div className="text-sm text-ash-400">Follow Links</div>
          <div className="text-xs text-ash-500 mt-1">{followPercentage}% of total</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-btn bg-char-700 flex items-center justify-center text-xl">
              ⚫
            </div>
            <div className="text-3xl font-display text-ash-300">
              {fmtN(metrics.nofollowLinks)}
            </div>
          </div>
          <div className="text-sm text-ash-400">NoFollow Links</div>
          <div className="text-xs text-ash-500 mt-1">{100 - followPercentage}% of total</div>
        </div>
      </div>

      {/* Link Growth Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-ash-300">New Backlinks (30 days)</h3>
            <span className="text-2xl">📈</span>
          </div>
          <div className="text-4xl font-display text-success mb-2">
            +{fmtN(metrics.newBacklinks)}
          </div>
          <p className="text-sm text-ash-400">
            New backlinks acquired in the last month
          </p>
          <div className="mt-4 h-2 bg-char-900 rounded-pill overflow-hidden">
            <div
              className="h-full bg-success"
              style={{ width: '75%' }}
            />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-ash-300">Lost Backlinks (30 days)</h3>
            <span className="text-2xl">📉</span>
          </div>
          <div className="text-4xl font-display text-danger mb-2">
            -{fmtN(metrics.lostBacklinks)}
          </div>
          <p className="text-sm text-ash-400">
            Backlinks lost or removed in the last month
          </p>
          <div className="mt-4 h-2 bg-char-900 rounded-pill overflow-hidden">
            <div
              className="h-full bg-danger"
              style={{ width: '35%' }}
            />
          </div>
        </div>
      </div>

      {/* Health Summary */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4 text-ash-300">Backlink Profile Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              followPercentage >= 60 ? 'bg-success' : followPercentage >= 40 ? 'bg-ember-500' : 'bg-danger'
            }`}>
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <div className="font-display text-sm text-ash-300 mb-1">Link Ratio</div>
              <div className="text-xs text-ash-500">
                {followPercentage >= 60
                  ? 'Excellent follow/nofollow ratio'
                  : followPercentage >= 40
                  ? 'Good ratio, could improve'
                  : 'Too many nofollow links'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              metrics.toxicScore < 30 ? 'bg-success' : metrics.toxicScore < 60 ? 'bg-ember-500' : 'bg-danger'
            }`}>
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <div className="font-display text-sm text-ash-300 mb-1">Toxicity Level</div>
              <div className="text-xs text-ash-500">
                {metrics.toxicScore < 30
                  ? 'Clean backlink profile'
                  : metrics.toxicScore < 60
                  ? 'Some toxic links detected'
                  : 'High toxicity - needs cleanup'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              metrics.newBacklinks > metrics.lostBacklinks ? 'bg-success' : 'bg-ember-500'
            }`}>
              <span className="text-white text-sm">✓</span>
            </div>
            <div>
              <div className="font-display text-sm text-ash-300 mb-1">Link Growth</div>
              <div className="text-xs text-ash-500">
                {metrics.newBacklinks > metrics.lostBacklinks
                  ? 'Positive growth trend'
                  : 'More links lost than gained'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
