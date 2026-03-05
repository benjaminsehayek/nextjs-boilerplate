'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MapDisplay } from './MapDisplay';
import { GSCInsights } from './GSCInsights';
import type { GridScanResult, HeatmapData, GridPoint } from './types';
import { getKeywordSiteAuditContext, type KeywordContext } from '@/lib/websiteBuilder/gridFeedback';

const LS_HEATMAP_KEY = 'local-grid-heatmap';

// ─── Competitor Dominance ────────────────────────────────────────────

interface CompetitorDominance {
  name: string;
  top3Points: number;
  totalPoints: number;
}

function computeCompetitorDominance(scan: GridScanResult): CompetitorDominance[] {
  // rank_data is stored in the DB but not typed in GridScanResult — cast as any
  const rankData: Array<{
    topResults?: Array<{ position: number; title: string }>;
  }> = (scan as any).rank_data ?? [];

  const totalGridPoints = scan.config.size * scan.config.size;

  if (rankData.length === 0) {
    // Fall back to scan.points[].competitors (represents last-scanned keyword only)
    const counts = new Map<string, number>();
    for (const point of scan.points) {
      for (const comp of point.competitors ?? []) {
        if (comp.rank <= 3 && comp.name && comp.name !== 'Unknown') {
          counts.set(comp.name, (counts.get(comp.name) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([name, top3Points]) => ({ name, top3Points, totalPoints: totalGridPoints }))
      .sort((a, b) => b.top3Points - a.top3Points)
      .slice(0, 3);
  }

  const counts = new Map<string, number>();
  const keywordCount = scan.config.keywords.length || 1;

  for (const rd of rankData) {
    for (const result of rd.topResults ?? []) {
      if (result.position <= 3 && result.title && result.title !== 'Unknown') {
        counts.set(result.title, (counts.get(result.title) ?? 0) + 1);
      }
    }
  }

  // Each keyword-point combo counts separately — normalize by keyword count
  return Array.from(counts.entries())
    .map(([name, total]) => ({
      name,
      top3Points: Math.round(total / keywordCount),
      totalPoints: totalGridPoints,
    }))
    .sort((a, b) => b.top3Points - a.top3Points)
    .slice(0, 3);
}

function TopCompetitorsCard({ scan }: { scan: GridScanResult }) {
  const competitors = useMemo(() => computeCompetitorDominance(scan), [scan]);

  if (competitors.length === 0) return null;

  const top = competitors[0];
  const totalPoints = scan.config.size * scan.config.size;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-display mb-1">Top Competitors</h3>
      <p className="text-sm text-ash-400 mb-4">
        Businesses dominating your service area in top-3 map positions
      </p>

      {/* Biggest rival callout */}
      <div className="p-4 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
        <span className="text-xl mt-0.5">⚔️</span>
        <div>
          <p className="text-sm font-medium text-ash-100">
            Biggest rival: <span className="text-red-400">{top.name}</span>
          </p>
          <p className="text-xs text-ash-400 mt-0.5">
            Dominant at {top.top3Points}/{totalPoints} grid points in top 3
          </p>
        </div>
      </div>

      {/* Ranked list */}
      <div className="space-y-3">
        {competitors.map((comp, idx) => {
          const pct = totalPoints > 0 ? (comp.top3Points / totalPoints) * 100 : 0;
          return (
            <div key={comp.name} className="flex items-center gap-3">
              <span className="text-xs text-ash-500 w-4 text-right font-display">{idx + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ash-200 truncate max-w-[220px]">{comp.name}</span>
                  <span className="text-xs text-ash-400 ml-2 flex-shrink-0">
                    {comp.top3Points}/{totalPoints} pts
                  </span>
                </div>
                <div className="relative h-1.5 bg-char-900 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-red-500/60 rounded-full"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getRankStyle(rank: number | null | undefined): { bg: string; text: string } {
  if (rank == null) return { bg: 'bg-red-900/60', text: 'text-red-400' };
  if (rank <= 3) return { bg: 'bg-emerald-900/60', text: 'text-emerald-300' };
  if (rank <= 10) return { bg: 'bg-yellow-900/60', text: 'text-yellow-300' };
  if (rank <= 20) return { bg: 'bg-orange-900/60', text: 'text-orange-300' };
  return { bg: 'bg-red-900/60', text: 'text-red-400' };
}

function CssHeatmapGrid({ gridPoints, gridSize, heatmapData }: {
  gridPoints: GridPoint[];
  gridSize: number;
  heatmapData?: HeatmapData;
}) {
  // Build rank lookup from heatmapData for correct per-keyword ranks
  const rankLookup = new Map<string, number | null>();
  if (heatmapData) {
    heatmapData.points.forEach((p) => {
      rankLookup.set(`${p.lat.toFixed(7)},${p.lng.toFixed(7)}`, p.rank);
    });
  }

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
    >
      {gridPoints.map((point, idx) => {
        const rank = heatmapData
          ? (rankLookup.get(`${point.lat.toFixed(7)},${point.lng.toFixed(7)}`) ?? null)
          : point.rank ?? null;
        const { bg, text } = getRankStyle(rank);
        return (
          <div
            key={idx}
            title={rank != null ? `Rank #${rank}` : 'Not ranking'}
            className={`${bg} ${text} flex items-center justify-center rounded text-xs font-bold aspect-square min-w-0`}
            style={{ fontSize: `clamp(8px, ${Math.min(14, 60 / gridSize)}px, 14px)` }}
          >
            {rank != null ? rank : '—'}
          </div>
        );
      })}
    </div>
  );
}

interface ResultsDashboardProps {
  scan: GridScanResult;
  heatmapData: Record<string, HeatmapData>;
  onNewScan: () => void;
  businessId?: string;
  onSuggestKeyword?: (keyword: string) => void;
}

export function ResultsDashboard({ scan, heatmapData, onNewScan, businessId, onSuggestKeyword }: ResultsDashboardProps) {
  const [selectedKeyword, setSelectedKeyword] = useState(
    scan.config.keywords[0]?.text || ''
  );
  const [heatmapMode, setHeatmapMode] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [keywordContextMap, setKeywordContextMap] = useState<Map<string, KeywordContext>>(new Map());

  // Stable key for keyword list — prevents re-fetching when scan object reference changes
  const keywordTextsKey = useMemo(
    () => scan.config.keywords.map(k => k.text).join('\0'),
    [scan.config.keywords]
  );

  // Fetch Site Audit keyword context (volume, intent, local pack)
  useEffect(() => {
    if (!businessId) return;
    const keywordTexts = keywordTextsKey.split('\0').filter(Boolean);
    getKeywordSiteAuditContext(businessId, keywordTexts)
      .then(setKeywordContextMap)
      .catch(() => {});
  }, [businessId, keywordTextsKey]);

  // Load heatmap preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_HEATMAP_KEY);
      if (saved === 'true') setHeatmapMode(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleHeatmapMode() {
    setHeatmapMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LS_HEATMAP_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

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
    <div className="space-y-6 print-grid-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display mb-1">Grid Scan Results</h2>
          <p className="text-sm text-ash-300">{scan.business_info.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleHeatmapMode}
            data-no-print
            className={`text-sm px-3 py-1.5 rounded-btn border transition-all ${
              heatmapMode
                ? 'bg-char-700 text-ash-100 border-char-600'
                : 'text-ash-500 border-char-700 hover:text-ash-300 hover:border-char-600'
            }`}
          >
            {heatmapMode ? 'Map View' : 'Heatmap'}
          </button>
          <button onClick={handleExportPng} data-no-print className="btn-ghost text-sm">
            📄 Export PNG
          </button>
          <button
            data-no-print
            onClick={() => window.print()}
            className="btn-ghost text-sm"
          >
            🖨️ Print Grid
          </button>
          <Link href="/local-grid/reports" data-no-print className="btn-secondary text-sm">
            Saved Reports
          </Link>
          <button onClick={onNewScan} data-no-print className="btn-primary">
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
                {(() => {
                  const ctx = keywordContextMap.get(keyword.text.toLowerCase());
                  if (!ctx) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <span className={`kw-context-badge ${isSelected ? 'kw-context-badge-active' : ''}`}>
                        {ctx.volumeRange}
                      </span>
                      <span className={`kw-context-badge ${isSelected ? 'kw-context-badge-active' : ''}`}>
                        {ctx.intent}
                      </span>
                      {ctx.hasLocalPack && (
                        <span className={`kw-context-badge ${isSelected ? 'kw-context-badge-active' : ''}`}>
                          Local Pack
                        </span>
                      )}
                    </div>
                  );
                })()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map / Heatmap (wrapped in export ref) */}
      <div ref={exportRef}>
        {currentHeatmap && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display">
                {heatmapMode ? 'Heatmap Grid' : 'Ranking Map'}
              </h3>
              <div className="text-sm text-ash-300">
                Showing results for &quot;{selectedKeyword}&quot;
              </div>
            </div>

            {heatmapMode ? (
              <div className="space-y-4">
                <CssHeatmapGrid
                  gridPoints={scan.points}
                  gridSize={scan.config.size}
                  heatmapData={currentHeatmap}
                />
                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-900/60 border border-emerald-700/40" />
                    <span className="text-emerald-300">Top 3</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-yellow-900/60 border border-yellow-700/40" />
                    <span className="text-yellow-300">4–10</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-900/60 border border-orange-700/40" />
                    <span className="text-orange-300">11–20</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-900/60 border border-red-700/40" />
                    <span className="text-red-400">Not Ranking</span>
                  </div>
                </div>
              </div>
            ) : (
              <MapDisplay
                business={scan.business_info}
                gridPoints={scan.points}
                heatmapData={currentHeatmap}
                showHeatmap={true}
              />
            )}
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

          {/* Insight cards */}
          {(() => {
            const top3 = currentHeatmap.top3Count;
            const notRanking = currentHeatmap.notRanking;
            const nearTop3 = currentHeatmap.pointsRanking - top3; // ranking 4–20
            const top3Pct = totalPoints > 0 ? Math.round((top3 / totalPoints) * 100) : 0;

            let strengthTitle: string;
            let strengthBody: string;
            if (top3 === 0) {
              strengthTitle = 'Not yet in the top 3';
              strengthBody = `You don't appear in the top 3 results anywhere on this grid for "${selectedKeyword}". The top 3 spots capture ~75% of clicks — this keyword is your biggest growth lever.`;
            } else if (top3 === totalPoints) {
              strengthTitle = 'Dominant coverage';
              strengthBody = `You rank in the top 3 across your entire service area (${top3Pct}%). Customers searching for "${selectedKeyword}" will almost always find you first.`;
            } else {
              strengthTitle = `Top 3 in ${top3Pct}% of your area`;
              strengthBody = `${top3} of ${totalPoints} neighborhoods rank you in the top 3 for "${selectedKeyword}". These are the areas actively sending you customers right now.`;
            }

            let gapTitle: string;
            let gapBody: string;
            let gapColor: string;
            if (notRanking === 0 && nearTop3 === 0) {
              gapTitle = 'Full coverage — nothing to fix';
              gapBody = `Every area in your grid can find you in the top 3 for "${selectedKeyword}". Maintain your Google Business Profile activity to keep this position.`;
              gapColor = 'bg-green-500/10 border-green-500/20';
            } else if (notRanking === 0) {
              gapTitle = `${nearTop3} areas just outside the top 3`;
              gapBody = `You're ranking 4–20 in ${nearTop3} neighborhoods — visible but not prominent. Improving your profile, reviews, and local citations could push these into top-3 territory.`;
              gapColor = 'bg-amber-500/10 border-amber-500/20';
            } else if (nearTop3 === 0) {
              gapTitle = `Invisible in ${notRanking} neighborhoods`;
              gapBody = `${notRanking} areas can't find you at all for "${selectedKeyword}" — competitors are getting 100% of those calls. Adding service-area content and building local citations can close these gaps.`;
              gapColor = 'bg-red-500/10 border-red-500/20';
            } else {
              gapTitle = `${notRanking + nearTop3} areas need attention`;
              gapBody = `${notRanking} neighborhoods can't find you at all, and ${nearTop3} more rank you outside the top 3. Focusing on reviews, Google Business posts, and local citations in those areas can shift customers your way.`;
              gapColor = 'bg-red-500/10 border-red-500/20';
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-sm font-display mb-1">{strengthTitle}</div>
                  <p className="text-xs text-ash-300 leading-relaxed">{strengthBody}</p>
                </div>
                <div className={`p-4 border rounded-lg ${gapColor}`}>
                  <div className="text-sm font-display mb-1">{gapTitle}</div>
                  <p className="text-xs text-ash-300 leading-relaxed">{gapBody}</p>
                </div>
              </div>
            );
          })()}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{keyword.text}</span>
                    {(() => {
                      const ctx = keywordContextMap.get(keyword.text.toLowerCase());
                      if (!ctx) return null;
                      return (
                        <div className="flex items-center gap-1">
                          <span className="kw-context-badge">{ctx.volumeRange}</span>
                          <span className="kw-context-badge">{ctx.intent}</span>
                          {ctx.hasLocalPack && (
                            <span className="kw-context-badge">Local Pack</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-3 text-sm flex-shrink-0">
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

      {/* Top Competitors */}
      <TopCompetitorsCard scan={scan} />

      {/* GSC-14 + GSC-15: GSC Traffic Insights */}
      {businessId && (
        <GSCInsights
          businessId={businessId}
          scanKeywords={scan.config.keywords}
          onSuggestKeyword={onSuggestKeyword}
        />
      )}

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
