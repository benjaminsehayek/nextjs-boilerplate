'use client';

import { fmtN } from '@/lib/dataforseo';
import type { CompetitorCompareProps } from './types';

export default function CompetitorCompare({ yourDomain, yourMetrics, competitors }: CompetitorCompareProps) {
  if (competitors.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-xl font-display mb-2 text-ash-300">
          No Competitor Data
        </h3>
        <p className="text-ash-400 mb-6">
          Add competitor domains during the scan setup to see comparison data here.
        </p>
        <a href="/off-page-audit" className="btn-primary">
          Start New Audit
        </a>
      </div>
    );
  }

  const allDomains = [
    {
      domain: yourDomain,
      backlinks: yourMetrics.totalBacklinks,
      referringDomains: yourMetrics.referringDomains,
      domainRating: yourMetrics.domainRating,
      toxicScore: yourMetrics.toxicScore,
      isYou: true,
    },
    ...competitors.map(c => ({ ...c, isYou: false })),
  ];

  // Find max values for scaling
  const maxBacklinks = Math.max(...allDomains.map(d => d.backlinks));
  const maxDomains = Math.max(...allDomains.map(d => d.referringDomains));
  const maxRating = Math.max(...allDomains.map(d => d.domainRating));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-2xl font-display text-flame-500 mb-1">
              #{allDomains.findIndex(d => d.isYou) + 1}
            </div>
            <div className="text-sm text-ash-400">Your Ranking</div>
            <p className="text-xs text-ash-500 mt-2">
              Out of {allDomains.length} domains
            </p>
          </div>
        </div>

        <div className="card p-5">
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-display text-ember-500 mb-1">
              {Math.round((yourMetrics.totalBacklinks / maxBacklinks) * 100)}%
            </div>
            <div className="text-sm text-ash-400">vs. Top Competitor</div>
            <p className="text-xs text-ash-500 mt-2">
              Backlink comparison
            </p>
          </div>
        </div>

        <div className="card p-5">
          <div className="text-center">
            <div className="text-3xl mb-2">
              {yourMetrics.domainRating > (competitors[0]?.domainRating || 0) ? '✅' : '📈'}
            </div>
            <div className={`text-2xl font-display mb-1 ${
              yourMetrics.domainRating > (competitors[0]?.domainRating || 0) ? 'text-success' : 'text-heat-500'
            }`}>
              {yourMetrics.domainRating > (competitors[0]?.domainRating || 0) ? 'Leading' : 'Trailing'}
            </div>
            <div className="text-sm text-ash-400">Domain Authority</div>
            <p className="text-xs text-ash-500 mt-2">
              {yourMetrics.domainRating > (competitors[0]?.domainRating || 0)
                ? 'You have higher DR'
                : 'Room for improvement'}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-char-700">
          <h3 className="text-lg font-display text-ash-300">Detailed Comparison</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-char-700">
                <th className="text-left p-4 text-sm font-display text-ash-400">Domain</th>
                <th className="text-right p-4 text-sm font-display text-ash-400">Backlinks</th>
                <th className="text-right p-4 text-sm font-display text-ash-400">Ref. Domains</th>
                <th className="text-right p-4 text-sm font-display text-ash-400">Domain Rating</th>
                <th className="text-right p-4 text-sm font-display text-ash-400">Toxic Score</th>
              </tr>
            </thead>
            <tbody>
              {allDomains.map((domain) => (
                <tr
                  key={domain.domain}
                  className={`border-b border-char-800 ${
                    domain.isYou ? 'bg-flame-500/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-ash-200 font-display">{domain.domain}</span>
                      {domain.isYou && (
                        <span className="px-2 py-0.5 text-xs rounded-btn bg-flame-500 text-white">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-right">
                      <div className="font-display text-flame-500 mb-1">
                        {fmtN(domain.backlinks)}
                      </div>
                      <div className="h-1.5 bg-char-900 rounded-pill overflow-hidden max-w-[100px] ml-auto">
                        <div
                          className="h-full bg-flame-gradient"
                          style={{ width: `${(domain.backlinks / maxBacklinks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-right">
                      <div className="font-display text-ember-500 mb-1">
                        {fmtN(domain.referringDomains)}
                      </div>
                      <div className="h-1.5 bg-char-900 rounded-pill overflow-hidden max-w-[100px] ml-auto">
                        <div
                          className="h-full bg-ember-gradient"
                          style={{ width: `${(domain.referringDomains / maxDomains) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-right">
                      <div className={`font-display mb-1 ${
                        domain.domainRating >= 60 ? 'text-success' :
                        domain.domainRating >= 40 ? 'text-ember-500' :
                        'text-heat-500'
                      }`}>
                        {domain.domainRating}
                      </div>
                      <div className="h-1.5 bg-char-900 rounded-pill overflow-hidden max-w-[100px] ml-auto">
                        <div
                          className={`h-full ${
                            domain.domainRating >= 60 ? 'bg-success' :
                            domain.domainRating >= 40 ? 'bg-ember-gradient' :
                            'bg-heat-gradient'
                          }`}
                          style={{ width: `${(domain.domainRating / maxRating) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-right">
                      <div className={`font-display ${
                        domain.toxicScore < 30 ? 'text-success' :
                        domain.toxicScore < 60 ? 'text-heat-500' :
                        'text-danger'
                      }`}>
                        {domain.toxicScore}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitive Insights */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4 text-ash-300">Competitive Insights</h3>
        <div className="space-y-4">
          {/* Backlinks Gap */}
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔗</span>
              <div className="flex-1">
                <h4 className="font-display text-sm text-ash-300 mb-1">Backlink Gap Analysis</h4>
                <p className="text-sm text-ash-400 mb-2">
                  {yourMetrics.totalBacklinks >= maxBacklinks
                    ? `You're leading with ${fmtN(yourMetrics.totalBacklinks)} backlinks. Maintain your momentum!`
                    : `You need approximately ${fmtN(maxBacklinks - yourMetrics.totalBacklinks)} more backlinks to match the top competitor.`}
                </p>
              </div>
            </div>
          </div>

          {/* Domain Authority Gap */}
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <h4 className="font-display text-sm text-ash-300 mb-1">Authority Comparison</h4>
                <p className="text-sm text-ash-400 mb-2">
                  {yourMetrics.domainRating >= maxRating
                    ? 'Your domain rating is the highest among compared domains!'
                    : `Focus on acquiring high-quality backlinks from authoritative sites to increase your domain rating from ${yourMetrics.domainRating} to ${maxRating}.`}
                </p>
              </div>
            </div>
          </div>

          {/* Link Quality */}
          <div className="p-4 bg-char-900 rounded-btn border border-char-700">
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {yourMetrics.toxicScore < Math.min(...competitors.map(c => c.toxicScore)) ? '✅' : '⚠️'}
              </span>
              <div className="flex-1">
                <h4 className="font-display text-sm text-ash-300 mb-1">Link Quality Assessment</h4>
                <p className="text-sm text-ash-400 mb-2">
                  {yourMetrics.toxicScore < Math.min(...competitors.map(c => c.toxicScore))
                    ? 'You have the cleanest backlink profile with the lowest toxicity score!'
                    : 'Consider auditing your backlink profile and disavowing toxic links to improve quality.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4 text-ash-300">Recommended Actions</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-flame-gradient flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              1
            </div>
            <div>
              <h4 className="font-display text-sm text-ash-300 mb-1">Analyze Competitor Backlinks</h4>
              <p className="text-sm text-ash-400">
                Identify where your competitors are getting backlinks and target similar opportunities.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-ember-gradient flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              2
            </div>
            <div>
              <h4 className="font-display text-sm text-ash-300 mb-1">Focus on Quality Over Quantity</h4>
              <p className="text-sm text-ash-400">
                One high-quality backlink from an authoritative domain is worth more than dozens of low-quality links.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-heat-gradient flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              3
            </div>
            <div>
              <h4 className="font-display text-sm text-ash-300 mb-1">Monitor Changes Regularly</h4>
              <p className="text-sm text-ash-400">
                Run monthly audits to track your progress and identify new opportunities or threats.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
