'use client';

import { useState } from 'react';
import type { DomainInputProps } from './types';

export default function DomainInput({ onStartScan, isLoading, scansRemaining }: DomainInputProps) {
  const [domain, setDomain] = useState('');
  const [competitors, setCompetitors] = useState<string[]>(['', '', '']);
  const [showCompetitors, setShowCompetitors] = useState(false);
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
      const validCompetitors = competitors
        .filter(c => c.trim().length > 0)
        .map(c => c.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''));

      onStartScan(domain, validCompetitors.length > 0 ? validCompetitors : undefined);
    }
  }

  function handleCompetitorChange(index: number, value: string) {
    const newCompetitors = [...competitors];
    newCompetitors[index] = value;
    setCompetitors(newCompetitors);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center">
            <span className="text-4xl">🔗</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Start Your <span className="text-gradient-flame">Off-Page Audit</span>
          </h2>
          <p className="text-ash-400">
            Analyze backlinks, referring domains, anchor text, and competitor comparisons
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="domain" className="input-label">
              Target Domain
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

          <div className="border-t border-char-700 pt-6">
            <button
              type="button"
              onClick={() => setShowCompetitors(!showCompetitors)}
              className="flex items-center gap-2 text-sm font-display text-ash-300 hover:text-flame-500 transition-colors mb-4"
            >
              <span className={`transform transition-transform ${showCompetitors ? 'rotate-90' : ''}`}>
                ▶
              </span>
              Competitor Comparison (Optional)
            </button>

            {showCompetitors && (
              <div className="space-y-3">
                <p className="text-sm text-ash-400 mb-3">
                  Add up to 3 competitor domains to compare backlink profiles
                </p>
                {competitors.map((competitor, index) => (
                  <div key={index}>
                    <label htmlFor={`competitor-${index}`} className="input-label">
                      Competitor {index + 1}
                    </label>
                    <input
                      id={`competitor-${index}`}
                      type="text"
                      className="input"
                      placeholder="competitor.com"
                      value={competitor}
                      onChange={(e) => handleCompetitorChange(index, e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                ))}
              </div>
            )}
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
                Analyzing Backlinks...
              </span>
            ) : (
              'Start Off-Page Audit'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-char-700">
          <h3 className="font-display text-sm text-ash-400 mb-4">
            What you'll get:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '🔗', text: 'Total backlinks & referring domains' },
              { icon: '📊', text: 'Domain rating & quality score' },
              { icon: '⚠️', text: 'Toxic backlink detection' },
              { icon: '🎯', text: 'Anchor text distribution' },
              { icon: '🏆', text: 'Competitor backlink comparison' },
              { icon: '📈', text: 'Link growth & loss trends' },
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
          Analysis typically takes 2-3 minutes. You can navigate away and come back to view results.
        </p>
      </div>
    </div>
  );
}
