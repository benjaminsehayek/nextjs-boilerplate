'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MapDisplay } from './MapDisplay';
import type { GridScanResult, HeatmapData } from './types';

interface ResultsDashboardProps {
  scan: GridScanResult;
  heatmapData: Record<string, HeatmapData>;
  onNewScan: () => void;
}

export function ResultsDashboard({ scan, heatmapData, onNewScan }: ResultsDashboardProps) {
  const [selectedKeyword, setSelectedKeyword] = useState(
    scan.config.keywords[0]?.text || ''
  );
  const exportRef = useRef<HTMLDivElement>(null);

  const currentHeatmap = heatmapData[selectedKeyword];
  const totalPoints = scan.config.size * scan.config.size;
  const overallStats = calculateOverallStats(heatmapData, totalPoints);

  const handleExportPng = useCallback(async () => {
    if (!exportRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#0f1115',
        scale: 2,
      });
      const link = document.createElement('a');
      const safeName = scan.business_info.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const safeKw = selectedKeyword.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `${safeName}-${safeKw}-grid.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // html2canvas not available or failed
    }
  }, [scan.business_info.name, selectedKeyword]);

  const visibilityColor = (score: number) => {
    if (score >= 50) return 'text-green-400';
    if (score >= 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display mb-1">Grid Scan Results</h2>
          <p className="text-sm text-ash-300">{scan.business_info.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPng} className="btn-ghost text-sm">
            📄 Export PNG
          </button>
          <Link href="/local-grid/reports" className="btn-secondary text-sm">
            Saved Reports
          </Link>
          <button onClick={onNewScan} className="btn-primary">
            New Scan
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-6 text-center">
          <div className="text-3xl font-display text-heat-400 mb-1">
            {overallStats.avgRank > 0 ? `#${overallStats.avgRank.toFixed(1)}` : 'N/A'}
          </div>
          <div className="text-sm text-ash-400">Avg. Rank</div>
        </div>

        <div className="card p-6 text-center">
          <div className={`text-3xl font-display mb-1 ${visibilityColor(overallStats.top3Visibility)}`}>
            {overallStats.top3Visibility.toFixed(0)}%
          </div>
          <div className="text-sm text-ash-400">Top 3 Visibility</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl font-display text-green-400 mb-1">
            {overallStats.visibility.toFixed(0)}%
          </div>
          <div className="text-sm text-ash-400">Coverage</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl font-display text-ash-100 mb-1">
            {overallStats.rankingPoints}
          </div>
          <div className="text-sm text-ash-400">Points Ranking</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl font-display text-ash-100 mb-1">
            ${scan.total_cost.toFixed(2)}
          </div>
          <div className="text-sm text-ash-400">Scan Cost</div>
        </div>
      </div>

      {/* Keyword Selector */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4">Select Keyword</h3>
        <div className="flex flex-wrap gap-2">
          {scan.config.keywords.map((keyword) => {
            const data = heatmapData[keyword.text];
            const isSelected = selectedKeyword === keyword.text;
            const kwVisibility = data ? data.visibilityScore : 0;

            return (
              <button
                key={keyword.id}
                onClick={() => setSelectedKeyword(keyword.text)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-flame-500 text-white'
                    : 'bg-char-900/50 hover:bg-char-900'
                }`}
              >
                <div className="font-medium">{keyword.text}</div>
                {data && (
                  <div className="flex items-center gap-2 text-xs mt-1 opacity-80">
                    <span>{data.pointsRanking}/{totalPoints} pts</span>
                    <span className={isSelected ? '' : visibilityColor(kwVisibility)}>
                      {kwVisibility.toFixed(0)}% top 3
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map (wrapped in export ref) */}
      <div ref={exportRef}>
        {currentHeatmap && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display">Ranking Heatmap</h3>
              <div className="text-sm text-ash-300">
                Showing results for &quot;{selectedKeyword}&quot;
              </div>
            </div>

            <MapDisplay
              business={scan.business_info}
              gridPoints={scan.points}
              heatmapData={currentHeatmap}
              showHeatmap={true}
            />
          </div>
        )}
      </div>

      {/* Keyword Stats */}
      {currentHeatmap && (
        <div className="card p-6">
          <h3 className="text-lg font-display mb-4">Keyword Performance</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-char-900/30 rounded-lg">
              <div className="text-xs text-ash-400 mb-1">Average Rank</div>
              <div className="text-2xl font-display text-heat-400">
                {currentHeatmap.averageRank > 0
                  ? `#${currentHeatmap.averageRank.toFixed(1)}`
                  : 'Not Ranking'}
              </div>
            </div>

            <div className="p-4 bg-char-900/30 rounded-lg">
              <div className="text-xs text-ash-400 mb-1">Top 3 Visibility</div>
              <div className={`text-2xl font-display ${visibilityColor(currentHeatmap.visibilityScore)}`}>
                {currentHeatmap.visibilityScore.toFixed(0)}%
              </div>
              <div className="text-xs text-ash-400 mt-1">
                {currentHeatmap.top3Count} of {totalPoints} points
              </div>
            </div>

            <div className="p-4 bg-char-900/30 rounded-lg">
              <div className="text-xs text-ash-400 mb-1">Points Ranking</div>
              <div className="text-2xl font-display text-green-400">
                {currentHeatmap.pointsRanking} / {totalPoints}
              </div>
              <div className="text-xs text-ash-400 mt-1">
                {((currentHeatmap.pointsRanking / totalPoints) * 100).toFixed(0)}% coverage
              </div>
            </div>

            <div className="p-4 bg-char-900/30 rounded-lg">
              <div className="text-xs text-ash-400 mb-1">Not Ranking</div>
              <div className="text-2xl font-display text-ash-300">
                {currentHeatmap.notRanking}
              </div>
              <div className="text-xs text-ash-400 mt-1">
                {((currentHeatmap.notRanking / totalPoints) * 100).toFixed(0)}% gaps
              </div>
            </div>
          </div>

          {/* Best/Worst Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl">🎯</div>
                <div className="text-sm font-display">Strongest Areas</div>
              </div>
              <div className="text-xs text-ash-300">
                {currentHeatmap.pointsRanking > 0
                  ? `Your business appears in top 20 at ${currentHeatmap.pointsRanking} locations`
                  : 'No rankings found in this grid'}
              </div>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl">⚠️</div>
                <div className="text-sm font-display">Opportunity Areas</div>
              </div>
              <div className="text-xs text-ash-300">
                {currentHeatmap.notRanking > 0
                  ? `${currentHeatmap.notRanking} locations need SEO improvement`
                  : 'Great coverage across all grid points!'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Keywords Summary */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4">All Keywords Summary</h3>

        <div className="space-y-3">
          {scan.config.keywords.map((keyword) => {
            const data = heatmapData[keyword.text];
            if (!data) return null;

            const coverage = (data.pointsRanking / totalPoints) * 100;

            return (
              <div key={keyword.id} className="p-4 bg-char-900/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{keyword.text}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={visibilityColor(data.visibilityScore)}>
                      {data.visibilityScore.toFixed(0)}% top 3
                    </span>
                    <span className="text-ash-400">
                      {data.averageRank > 0 ? `Avg #${data.averageRank.toFixed(1)}` : 'Not Ranking'}
                    </span>
                  </div>
                </div>

                <div className="relative h-2 bg-char-900 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-heat-500"
                    style={{ width: `${coverage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-ash-400">
                  <span>
                    {data.pointsRanking} / {totalPoints} points
                  </span>
                  <span>{coverage.toFixed(0)}% coverage</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scan Info */}
      <div className="card p-4 bg-char-900/30">
        <div className="flex items-center justify-between text-sm text-ash-400">
          <span>Scan Date: {new Date(scan.scan_date).toLocaleString()}</span>
          <span>Grid: {scan.config.size}×{scan.config.size}</span>
          <span>Radius: {scan.config.radius} mi</span>
        </div>
      </div>
    </div>
  );
}

function calculateOverallStats(heatmapData: Record<string, HeatmapData>, totalPoints: number) {
  const keywords = Object.values(heatmapData);

  if (keywords.length === 0) {
    return { avgRank: 0, visibility: 0, top3Visibility: 0, rankingPoints: 0 };
  }

  const totalRanks = keywords.reduce((sum, kw) => sum + kw.averageRank, 0);
  const avgRank = totalRanks / keywords.length;

  const totalRankingPoints = keywords.reduce((sum, kw) => sum + kw.pointsRanking, 0);
  const maxPossible = totalPoints * keywords.length;

  const visibility = maxPossible > 0 ? (totalRankingPoints / maxPossible) * 100 : 0;

  const totalTop3 = keywords.reduce((sum, kw) => sum + (kw.top3Count || 0), 0);
  const top3Visibility = maxPossible > 0 ? (totalTop3 / maxPossible) * 100 : 0;

  return {
    avgRank,
    visibility,
    top3Visibility,
    rankingPoints: totalRankingPoints,
  };
}
