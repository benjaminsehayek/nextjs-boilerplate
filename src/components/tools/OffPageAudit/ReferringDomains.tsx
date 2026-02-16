'use client';

import { useState } from 'react';
import { fmtN } from '@/lib/dataforseo';
import type { ReferringDomainsProps, ReferringDomain } from './types';

function getToxicityColor(level: string): string {
  switch (level) {
    case 'clean': return 'text-success';
    case 'suspicious': return 'text-heat-500';
    case 'toxic': return 'text-danger';
    default: return 'text-ash-400';
  }
}

function getToxicityBadge(level: string): string {
  switch (level) {
    case 'clean': return 'bg-success/10 border-success/30 text-success';
    case 'suspicious': return 'bg-heat-500/10 border-heat-500/30 text-heat-500';
    case 'toxic': return 'bg-danger/10 border-danger/30 text-danger';
    default: return 'bg-char-700 border-char-600 text-ash-400';
  }
}

export default function ReferringDomains({ domains, sortBy, onSortChange }: ReferringDomainsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterToxicity, setFilterToxicity] = useState<'all' | 'clean' | 'suspicious' | 'toxic'>('all');

  const sortedDomains = [...domains].sort((a, b) => {
    switch (sortBy) {
      case 'backlinks':
        return b.backlinks - a.backlinks;
      case 'domainRank':
        return b.domainRank - a.domainRank;
      case 'toxicity':
        return b.toxicityScore - a.toxicityScore;
      default:
        return 0;
    }
  });

  const filteredDomains = sortedDomains.filter(domain => {
    const matchesSearch = domain.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesToxicity = filterToxicity === 'all' || domain.toxicityLevel === filterToxicity;
    return matchesSearch && matchesToxicity;
  });

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-success mb-1">
            {domains.filter(d => d.toxicityLevel === 'clean').length}
          </div>
          <div className="text-sm text-ash-400">Clean Domains</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-heat-500 mb-1">
            {domains.filter(d => d.toxicityLevel === 'suspicious').length}
          </div>
          <div className="text-sm text-ash-400">Suspicious</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-display text-danger mb-1">
            {domains.filter(d => d.toxicityLevel === 'toxic').length}
          </div>
          <div className="text-sm text-ash-400">Toxic Domains</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search domains..."
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              className="input"
              value={filterToxicity}
              onChange={(e) => setFilterToxicity(e.target.value as any)}
            >
              <option value="all">All Toxicity</option>
              <option value="clean">Clean Only</option>
              <option value="suspicious">Suspicious</option>
              <option value="toxic">Toxic Only</option>
            </select>

            <select
              className="input"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
            >
              <option value="backlinks">Sort by Backlinks</option>
              <option value="domainRank">Sort by Domain Rank</option>
              <option value="toxicity">Sort by Toxicity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-ash-400">
        <span>
          Showing {filteredDomains.length} of {domains.length} domains
        </span>
      </div>

      {/* Domain List */}
      <div className="space-y-3">
        {filteredDomains.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-ash-400">No domains found matching your filters</p>
          </div>
        ) : (
          filteredDomains.map((domain) => (
            <div key={domain.domain} className="card-interactive p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-lg text-ash-200 truncate">
                      {domain.domain}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs rounded-btn border ${getToxicityBadge(domain.toxicityLevel)}`}>
                      {domain.toxicityLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <div className="text-ash-500 text-xs mb-1">Backlinks</div>
                      <div className="font-display text-flame-500">{fmtN(domain.backlinks)}</div>
                    </div>
                    <div>
                      <div className="text-ash-500 text-xs mb-1">Domain Rank</div>
                      <div className="font-display text-ember-500">{domain.domainRank}</div>
                    </div>
                    <div>
                      <div className="text-ash-500 text-xs mb-1">Follow</div>
                      <div className="font-display text-success">{fmtN(domain.follow)}</div>
                    </div>
                    <div>
                      <div className="text-ash-500 text-xs mb-1">NoFollow</div>
                      <div className="font-display text-ash-400">{fmtN(domain.nofollow)}</div>
                    </div>
                    <div>
                      <div className="text-ash-500 text-xs mb-1">First Seen</div>
                      <div className="font-display text-ash-300">
                        {new Date(domain.firstSeen).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Toxicity Warning */}
                  {domain.toxicityLevel === 'toxic' && (
                    <div className="mt-3 p-2 bg-danger/10 border border-danger/30 rounded-btn">
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-danger">⚠️</span>
                        <span className="text-danger">
                          Toxic domain detected. Consider disavowing this backlink in Google Search Console.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Domain Score Ring */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative inline-flex items-center justify-center w-16 h-16">
                    <svg width="64" height="64" className="transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="var(--char-700)"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke={domain.domainRank >= 60 ? 'var(--success)' : domain.domainRank >= 40 ? 'var(--ember-500)' : 'var(--heat-500)'}
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${(domain.domainRank / 100) * 175.93} 175.93`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="font-display text-sm text-ash-200">
                        {domain.domainRank}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-ash-500 mt-1">DR</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More (if needed in future) */}
      {filteredDomains.length > 50 && (
        <div className="text-center">
          <button className="btn-ghost">
            Load More Domains
          </button>
        </div>
      )}
    </div>
  );
}
