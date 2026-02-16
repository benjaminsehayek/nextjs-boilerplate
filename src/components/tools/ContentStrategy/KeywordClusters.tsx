'use client';

import { useState } from 'react';
import type { KeywordClustersProps, KeywordCluster, KeywordData } from './types';
import { fmtN } from '@/lib/dataforseo';

const INTENT_COLORS: Record<string, string> = {
  informational: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  navigational: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  transactional: 'bg-success/10 text-success border-success/30',
  commercial: 'bg-flame-500/10 text-flame-500 border-flame-500/30',
};

const INTENT_ICONS: Record<string, string> = {
  informational: '📚',
  navigational: '🧭',
  transactional: '💳',
  commercial: '🛍️',
};

export default function KeywordClusters({ clusters, onClusterSelect }: KeywordClustersProps) {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'opportunity'>('opportunity');

  const sortedClusters = [...clusters].sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return b.totalVolume - a.totalVolume;
      case 'difficulty':
        return a.avgDifficulty - b.avgDifficulty;
      case 'opportunity':
      default:
        return b.opportunityScore - a.opportunityScore;
    }
  });

  function handleClusterClick(cluster: KeywordCluster) {
    setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id);
    onClusterSelect?.(cluster);
  }

  function getDifficultyColor(difficulty: number): string {
    if (difficulty >= 70) return 'text-danger';
    if (difficulty >= 40) return 'text-warning';
    return 'text-success';
  }

  function getOpportunityColor(score: number): string {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-flame-500';
    return 'text-ash-400';
  }

  return (
    <div className="space-y-6">
      {/* Header with Sort Controls */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-display text-lg text-ash-200 mb-1">
              Keyword Clusters
            </h3>
            <p className="text-sm text-ash-500">
              {clusters.length} topic clusters identified
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-ash-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input text-sm py-2"
            >
              <option value="opportunity">Opportunity Score</option>
              <option value="volume">Search Volume</option>
              <option value="difficulty">Difficulty (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cluster Cards */}
      <div className="space-y-4">
        {sortedClusters.map((cluster) => {
          const isExpanded = expandedCluster === cluster.id;

          return (
            <div
              key={cluster.id}
              className="card overflow-hidden transition-all hover:border-flame-500/30"
            >
              {/* Cluster Header */}
              <button
                onClick={() => handleClusterClick(cluster)}
                className="w-full p-6 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{INTENT_ICONS[cluster.intent]}</span>
                      <div>
                        <h3 className="font-display text-lg text-ash-100">
                          {cluster.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-1 rounded-btn border ${
                              INTENT_COLORS[cluster.intent]
                            }`}
                          >
                            {cluster.intent}
                          </span>
                          <span className="text-xs text-ash-500">
                            {cluster.keywords.length} keywords
                          </span>
                        </div>
                      </div>
                    </div>

                    {cluster.existingContent && (
                      <div className="mb-3 p-3 bg-char-900 rounded-btn border border-char-700">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-success">✓</span>
                          <span className="text-ash-400">Existing content:</span>
                          <a
                            href={cluster.existingContent}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-flame-500 hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cluster.existingContent}
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-ash-500 mb-1">Total Volume</div>
                        <div className="font-display text-xl text-ash-200">
                          {fmtN(cluster.totalVolume)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ash-500 mb-1">Avg Difficulty</div>
                        <div className={`font-display text-xl ${getDifficultyColor(cluster.avgDifficulty)}`}>
                          {cluster.avgDifficulty.toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ash-500 mb-1">Opportunity</div>
                        <div className={`font-display text-xl ${getOpportunityColor(cluster.opportunityScore)}`}>
                          {cluster.opportunityScore.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-2xl text-ash-500 transition-transform">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </button>

              {/* Expanded Keyword List */}
              {isExpanded && (
                <div className="border-t border-char-700 p-6 bg-char-900">
                  <h4 className="font-display text-sm text-ash-400 mb-4">
                    Keywords in this cluster:
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {cluster.keywords
                      .sort((a, b) => b.searchVolume - a.searchVolume)
                      .map((keyword, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-char-800 rounded-btn border border-char-700 hover:border-flame-500/30 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-display text-ash-200 mb-1">
                              {keyword.keyword}
                            </div>
                            {keyword.currentRank && (
                              <div className="text-xs text-ash-500">
                                Current rank: #{keyword.currentRank}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-right">
                            <div>
                              <div className="text-xs text-ash-500 mb-1">Volume</div>
                              <div className="font-display text-sm text-ash-200">
                                {fmtN(keyword.searchVolume)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-ash-500 mb-1">CPC</div>
                              <div className="font-display text-sm text-ash-200">
                                ${keyword.cpc.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-ash-500 mb-1">Competition</div>
                              <div className="font-display text-sm text-ash-200">
                                {(keyword.competition * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-ash-500 mb-1">Difficulty</div>
                              <div className={`font-display text-sm ${getDifficultyColor(keyword.difficulty)}`}>
                                {keyword.difficulty.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {clusters.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="font-display text-lg text-ash-300 mb-2">
            No clusters found
          </h3>
          <p className="text-ash-500">
            Try adjusting your search criteria or industry focus
          </p>
        </div>
      )}
    </div>
  );
}
