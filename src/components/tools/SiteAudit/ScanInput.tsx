'use client';

import { useState } from 'react';
import type { ScanInputProps } from './types';

export default function ScanInput({ onStartScan, isLoading, scansRemaining }: ScanInputProps) {
  const [domain, setDomain] = useState('');
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

    if (validateDomain(domain)) {
      onStartScan(domain);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Start Your <span className="text-gradient-flame">Site Audit</span>
          </h2>
          <p className="text-ash-400">
            Get a comprehensive 52-point technical SEO analysis in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="domain" className="input-label">
              Website Domain
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
            />
            {validationError && (
              <p className="text-danger text-sm mt-2">{validationError}</p>
            )}
            <p className="text-ash-500 text-xs mt-2">
              Enter your domain without http:// or www
            </p>
          </div>

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

          <button
            type="submit"
            disabled={isLoading || scansRemaining === 0}
            className="btn-primary w-full py-3"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner-sm"></span>
                Starting Scan...
              </span>
            ) : (
              'Start Site Audit'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-char-700">
          <h3 className="font-display text-sm text-ash-400 mb-4">
            What you'll get:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '📊', text: 'Overall SEO health score' },
              { icon: '🔍', text: '8 category breakdowns' },
              { icon: '⚠️', text: 'Critical issues identified' },
              { icon: '🎯', text: 'Quick win recommendations' },
              { icon: '📄', text: 'Page-by-page analysis' },
              { icon: '⚡', text: 'Performance metrics' },
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
          Scan typically takes 2-3 minutes. You can navigate away and come back to view results.
        </p>
      </div>
    </div>
  );
}
