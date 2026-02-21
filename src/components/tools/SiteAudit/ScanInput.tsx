'use client';

import { useState } from 'react';
import type { ScanInputProps } from './types';

const MAX_PAGES_OPTIONS = [
  { value: 50, label: '50 pages', desc: 'Quick scan' },
  { value: 100, label: '100 pages', desc: 'Standard' },
  { value: 250, label: '250 pages', desc: 'Recommended' },
  { value: 500, label: '500 pages', desc: 'Deep scan' },
];

export default function ScanInput({ onStartScan, isLoading, scansRemaining, defaultDomain = '' }: ScanInputProps) {
  const [domain, setDomain] = useState(defaultDomain);
  const [maxPages, setMaxPages] = useState(250);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validateDomain(input: string): boolean {
    if (!input || input.trim().length === 0) {
      setValidationError('Please enter a domain');
      return false;
    }

    let cleaned = input.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/\/$/, '');

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
      onStartScan(domain, maxPages);
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
            Full-site crawl with 40+ issue checks, Lighthouse scores, and keyword intelligence
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

          {/* Max Pages Selector */}
          <div>
            <label className="input-label mb-2 block">Crawl Depth</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MAX_PAGES_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMaxPages(opt.value)}
                  className={
                    'p-3 rounded-btn border text-center transition-colors ' +
                    (maxPages === opt.value
                      ? 'border-flame-500 bg-flame-500/10 text-white'
                      : 'border-char-700 bg-char-900 text-ash-400 hover:border-ash-500')
                  }
                >
                  <div className="font-display text-sm">{opt.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
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
                <a href="/billing" className="btn-primary">
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
              { icon: '📊', text: '10-category health score' },
              { icon: '🔍', text: 'Full-site crawl (up to ' + maxPages + ' pages)' },
              { icon: '⚠️', text: '40+ issue types detected' },
              { icon: '🎯', text: 'Quick win recommendations' },
              { icon: '⚡', text: 'Lighthouse performance scores' },
              { icon: '📍', text: 'Local keyword rankings' },
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
          Analysis typically takes 2-5 minutes depending on site size. You can navigate away and come back.
        </p>
      </div>
    </div>
  );
}
