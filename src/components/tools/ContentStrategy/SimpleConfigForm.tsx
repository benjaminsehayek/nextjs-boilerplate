'use client';

import { useState } from 'react';
import type { SimpleStrategyConfig } from '@/types';
import { INDUSTRY_PROFILES } from '@/lib/contentStrategy/constants';

interface SimpleConfigFormProps {
  domain: string;
  industry: string;
  onSubmit: (cfg: SimpleStrategyConfig) => void;
  loading?: boolean;
}

export default function SimpleConfigForm({ domain, industry, onSubmit, loading }: SimpleConfigFormProps) {
  // Pre-fill from industry profile defaults
  const profile = INDUSTRY_PROFILES.find(p => p.key === industry || p.name.toLowerCase() === industry?.toLowerCase());

  const [profitPerJob, setProfitPerJob] = useState(profile?.defaultProfit ?? 300);
  const [closeRate, setCloseRate] = useState(profile?.defaultClose ?? 40);
  const [conversionRate, setConversionRate] = useState(3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ profitPerJob, closeRate, conversionRate: conversionRate / 100 });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Read-only context */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-ash-500 mb-1">Domain</label>
          <div className="card px-3 py-2 text-ash-300 text-sm">{domain}</div>
        </div>
        <div>
          <label className="block text-xs text-ash-500 mb-1">Industry</label>
          <div className="card px-3 py-2 text-ash-300 text-sm capitalize">{industry || 'General'}</div>
        </div>
      </div>

      <div className="border-t border-char-700 pt-6">
        <h3 className="font-display text-ash-200 mb-1">Job Economics</h3>
        <p className="text-xs text-ash-500 mb-4">Used to calculate ROI for each content opportunity.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ash-300 mb-1">
              Average profit per job <span className="text-ash-500">(after costs)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ash-400">$</span>
              <input
                type="number"
                min={1}
                value={profitPerJob}
                onChange={e => setProfitPerJob(Number(e.target.value))}
                className="input w-full pl-7"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-ash-300 mb-1">
              Lead close rate <span className="text-ash-500">(% of leads you convert)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={closeRate}
                onChange={e => setCloseRate(Number(e.target.value))}
                className="input w-full pr-7"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ash-400">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-ash-300 mb-1">
              Website conversion rate <span className="text-ash-500">(% of visitors who contact you)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={conversionRate}
                onChange={e => setConversionRate(Number(e.target.value))}
                className="input w-full pr-7"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ash-400">%</span>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Generating…' : 'Generate 12-Week Strategy'}
      </button>
    </form>
  );
}
