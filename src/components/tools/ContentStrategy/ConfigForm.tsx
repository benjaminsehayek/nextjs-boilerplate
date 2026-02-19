'use client';

import { useState } from 'react';
import type { ConfigFormProps, ContentStrategyConfig, EconomicsConfig } from './types';

export default function ConfigForm({ onStartAnalysis, isLoading, scansRemaining, defaultDomain = '', defaultIndustry = '' }: ConfigFormProps) {
  const [domain, setDomain] = useState(defaultDomain);
  const [industry, setIndustry] = useState(defaultIndustry);
  const [showEconomics, setShowEconomics] = useState(false);
  const [economics, setEconomics] = useState<EconomicsConfig>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  function validateDomain(input: string): boolean {
    if (!input || input.trim().length === 0) {
      setValidationError('Please enter a domain');
      return false;
    }

    // Remove protocol if present
    let cleaned = input.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/\/$/, '');

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleaned)) {
      setValidationError('Please enter a valid domain (e.g., example.com)');
      return false;
    }

    setValidationError(null);
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateDomain(domain)) {
      return;
    }

    const config: ContentStrategyConfig = {
      domain: domain.trim(),
      industry: industry.trim() || undefined,
      economics: showEconomics ? economics : {},
    };

    onStartAnalysis(config);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center">
            <span className="text-4xl">📝</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Build Your <span className="text-gradient-flame">Content Strategy</span>
          </h2>
          <p className="text-ash-400">
            ROI-based keyword research with content planning and cannibalization detection
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain Input */}
          <div>
            <label htmlFor="domain" className="input-label">
              Website Domain <span className="text-danger">*</span>
            </label>
            <input
              id="domain"
              type="text"
              className="input"
              placeholder="example.com"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setValidationError(null);
              }}
              disabled={isLoading}
              required
            />
            {validationError && (
              <p className="text-danger text-sm mt-2">{validationError}</p>
            )}
            <p className="text-ash-500 text-xs mt-2">
              Enter your domain without http:// or www
            </p>
          </div>

          {/* Industry Input */}
          <div>
            <label htmlFor="industry" className="input-label">
              Industry / Niche
            </label>
            <input
              id="industry"
              type="text"
              className="input"
              placeholder="e.g., Real Estate, Dentistry, E-commerce"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-ash-500 text-xs mt-2">
              Optional: Helps improve keyword clustering accuracy
            </p>
          </div>

          {/* Economics Toggle */}
          <div className="bg-char-900 rounded-btn p-4 border border-char-700">
            <button
              type="button"
              onClick={() => setShowEconomics(!showEconomics)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-flame-500/10 flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <div className="input-label mb-1">Revenue Tracking (Optional)</div>
                  <p className="text-sm text-ash-500">
                    Calculate estimated value of content opportunities
                  </p>
                </div>
              </div>
              <div className="text-2xl text-ash-500">
                {showEconomics ? '▼' : '▶'}
              </div>
            </button>

            {showEconomics && (
              <div className="mt-4 pt-4 border-t border-char-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="conversionRate" className="input-label">
                      Conversion Rate (%)
                    </label>
                    <input
                      id="conversionRate"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="input"
                      placeholder="2.5"
                      value={economics.conversionRate || ''}
                      onChange={(e) =>
                        setEconomics({
                          ...economics,
                          conversionRate: parseFloat(e.target.value) || undefined,
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="averageOrderValue" className="input-label">
                      Average Order Value ($)
                    </label>
                    <input
                      id="averageOrderValue"
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      placeholder="125.00"
                      value={economics.averageOrderValue || ''}
                      onChange={(e) =>
                        setEconomics({
                          ...economics,
                          averageOrderValue: parseFloat(e.target.value) || undefined,
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="leadValue" className="input-label">
                      Lead Value ($)
                    </label>
                    <input
                      id="leadValue"
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      placeholder="50.00"
                      value={economics.leadValue || ''}
                      onChange={(e) =>
                        setEconomics({
                          ...economics,
                          leadValue: parseFloat(e.target.value) || undefined,
                        })
                      }
                      disabled={isLoading}
                    />
                    <p className="text-ash-500 text-xs mt-1">
                      For lead gen businesses
                    </p>
                  </div>

                  <div>
                    <label htmlFor="monthlyBudget" className="input-label">
                      Monthly Budget ($)
                    </label>
                    <input
                      id="monthlyBudget"
                      type="number"
                      step="100"
                      min="0"
                      className="input"
                      placeholder="5000"
                      value={economics.monthlyBudget || ''}
                      onChange={(e) =>
                        setEconomics({
                          ...economics,
                          monthlyBudget: parseFloat(e.target.value) || undefined,
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="bg-char-800 rounded-btn p-3 border border-char-700">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <p className="text-xs text-ash-400">
                      These values help prioritize content opportunities by ROI. You can add them later or skip entirely.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scans Remaining */}
          <div className="bg-char-900 rounded-btn p-4 border border-char-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="input-label mb-1">Scans Remaining</div>
                <div className="text-2xl font-display">
                  <span className={scansRemaining > 0 ? 'text-success' : 'text-danger'}>
                    {scansRemaining}
                  </span>
                  <span className="text-ash-500 text-base ml-2">this month</span>
                </div>
              </div>
              {scansRemaining === 0 && (
                <a href="/settings" className="btn-primary">
                  Upgrade Plan
                </a>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || scansRemaining === 0}
            className="btn-primary w-full py-3"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner-sm"></span>
                Starting Analysis...
              </span>
            ) : (
              'Analyze Content Strategy'
            )}
          </button>
        </form>

        {/* Features List */}
        <div className="mt-8 pt-6 border-t border-char-700">
          <h3 className="font-display text-sm text-ash-400 mb-4">
            What you'll get:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '🎯', text: 'Keyword clusters by intent' },
              { icon: '📅', text: 'Content calendar with priorities' },
              { icon: '⚠️', text: 'Cannibalization detection' },
              { icon: '💰', text: 'ROI-based opportunity scoring' },
              { icon: '📊', text: 'Search volume & difficulty data' },
              { icon: '🔍', text: 'Competitor gap analysis' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-ash-300">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-ash-500">
        <p>
          Analysis typically takes 3-5 minutes. You can navigate away and come back to view results.
        </p>
      </div>
    </div>
  );
}
