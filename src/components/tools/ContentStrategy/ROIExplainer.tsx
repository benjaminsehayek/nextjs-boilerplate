'use client';

import { useState } from 'react';

export default function ROIExplainer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-flame-500/10 flex items-center justify-center">
            <span className="text-xl">📐</span>
          </div>
          <div>
            <h3 className="font-display text-ash-200">Two-Axis ROI Model</h3>
            <p className="text-xs text-ash-500">How we calculate monthly revenue potential</p>
          </div>
        </div>
        <span className="text-ash-500 text-xl">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="border-t border-char-700 p-5 bg-char-900 space-y-5">
          {/* Formula */}
          <div>
            <h4 className="font-display text-sm text-ash-300 mb-3">Formula</h4>
            <div className="bg-char-800 p-4 rounded-btn border border-char-700 font-mono text-sm text-ash-300 space-y-1">
              <div>Monthly Visitors = Search Volume x CTR (position 3 = 11%)</div>
              <div>Adjusted Conv Rate = Base Conv Rate x <span className="text-flame-500">Funnel Multiplier</span></div>
              <div>Monthly Leads = Monthly Visitors x Adjusted Conv Rate</div>
              <div>Monthly Closed = Monthly Leads x <span className="text-ember-500">Close Rate</span></div>
              <div className="text-success font-display">Monthly ROI = Monthly Closed x Profit Per Job</div>
            </div>
          </div>

          {/* Two Axes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-char-800 rounded-btn border border-char-700">
              <h4 className="font-display text-sm text-flame-500 mb-2">Axis 1: Keyword Intent</h4>
              <p className="text-xs text-ash-400 mb-3">
                Where the searcher is in the buying journey determines conversion likelihood.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-btn bg-success/20 text-success">Bottom Funnel</span>
                  <span className="font-display text-success">3.0x</span>
                </div>
                <div className="text-xs text-ash-500 ml-2">Emergency, near me, hire, fix, repair</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-btn bg-ember-500/20 text-ember-500">Middle Funnel</span>
                  <span className="font-display text-ember-500">1.5x</span>
                </div>
                <div className="text-xs text-ash-500 ml-2">Best, affordable, compare, reviews</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-btn bg-flame-400/20 text-flame-400">Top Funnel</span>
                  <span className="font-display text-flame-400">0.5x</span>
                </div>
                <div className="text-xs text-ash-500 ml-2">How to, cost, guide, tips, DIY</div>
              </div>
            </div>

            <div className="p-4 bg-char-800 rounded-btn border border-char-700">
              <h4 className="font-display text-sm text-ember-500 mb-2">Axis 2: Service Economics</h4>
              <p className="text-xs text-ash-400 mb-3">
                Each service has different profit margins and close rates.
              </p>
              <div className="space-y-2 text-xs text-ash-400">
                <div className="flex justify-between">
                  <span>Profit Per Job</span>
                  <span className="text-ash-300">Varies by service ($120-$8,000)</span>
                </div>
                <div className="flex justify-between">
                  <span>Close Rate</span>
                  <span className="text-ash-300">% of leads that become customers</span>
                </div>
                <div className="mt-3 p-3 bg-char-900 rounded-btn">
                  <div className="font-display text-ash-300 mb-1">Example:</div>
                  <div>Water Heater Repair</div>
                  <div>Profit: $320 | Close: 42%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="p-4 bg-char-800 rounded-btn border border-char-700">
            <h4 className="font-display text-sm text-ash-300 mb-3">Example: "emergency plumber near me" (1,200 vol)</h4>
            <div className="space-y-1 text-sm text-ash-400">
              <div>Visitors: 1,200 x 0.11 = <span className="text-ash-200">132/mo</span></div>
              <div>Conv Rate: 3% x <span className="text-success">3.0 (bottom)</span> = 9%</div>
              <div>Leads: 132 x 0.09 = <span className="text-ash-200">11.9/mo</span></div>
              <div>Closed: 11.9 x 0.45 = <span className="text-ash-200">5.3/mo</span></div>
              <div className="font-display text-success text-lg mt-2">
                ROI: 5.3 x $280 = $1,498/mo
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
