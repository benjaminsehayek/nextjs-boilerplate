'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import type { HeatmapData } from '@/components/tools/LocalGrid/types';

interface ScanRow {
  id: string;
  location_id: string | null;
  business_info: { name: string; city: string; state: string };
  config: { size: number; radius: number; keywords: { text: string }[] };
  scan_date: string;
  heatmap_data: Record<string, HeatmapData> | null;
  total_cost: number;
  deleted_at: string | null;
}

export default function LocalGridReportsPage() {
  const { loading: authLoading } = useAuth();
  const { business } = useBusiness();
  const { locations } = useLocations(business?.id);
  const supabase = createClient();
  const { toast } = useToast();

  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  const MAX_CUMULATIVE = 500; // B14-13: Hard cap to prevent unbounded load-more loop

  useEffect(() => {
    if (authLoading || !business) return;

    async function fetchScans() {
      const { data } = await (supabase as any)
        .from('grid_scans')
        .select('id, location_id, business_info, config, scan_date, heatmap_data, total_cost')
        .eq('business_id', business!.id)
        .eq('status', 'complete')
        .order('scan_date', { ascending: false })
        .limit(PAGE_SIZE + 1); // fetch one extra to detect if more exist

      const rows = (data as ScanRow[]) || [];
      setHasMore(rows.length > PAGE_SIZE);
      setScans(rows.slice(0, PAGE_SIZE));
      setLoadingScans(false);
    }

    fetchScans();
  }, [authLoading, business, supabase]);

  async function loadMoreScans() {
    if (!business || loadingMore) return;
    if (scans.length >= MAX_CUMULATIVE) { setHasMore(false); return; } // B14-13: hard cap
    setLoadingMore(true);
    const { data } = await (supabase as any)
      .from('grid_scans')
      .select('id, location_id, business_info, config, scan_date, heatmap_data, total_cost')
      .eq('business_id', business.id)
      .eq('status', 'complete')
      .order('scan_date', { ascending: false })
      .range(scans.length, scans.length + PAGE_SIZE);
    const rows = (data as ScanRow[]) || [];
    const merged = [...scans, ...rows];
    setHasMore(rows.length === PAGE_SIZE && merged.length < MAX_CUMULATIVE);
    setScans(merged.slice(0, MAX_CUMULATIVE));
    setLoadingMore(false);
  }

  if (authLoading) {
    return (
      <ToolGate tool="local-grid">
        <ToolPageShell icon="📍" name="Saved Reports" description="Past Local Grid scans">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="spinner" />
          </div>
        </ToolPageShell>
      </ToolGate>
    );
  }

  const locationName = (locationId: string | null) => {
    if (!locationId) return 'Unknown Location';
    const loc = locations.find((l) => l.id === locationId);
    return loc?.location_name || 'Unknown Location';
  };

  const overallVisibility = (heatmapData: Record<string, HeatmapData> | null) => {
    if (!heatmapData) return null;
    const keywords = Object.values(heatmapData);
    if (keywords.length === 0) return null;
    const avg = keywords.reduce((sum, kw) => sum + kw.visibilityScore, 0) / keywords.length;
    return avg;
  };

  const avgRank = (heatmapData: Record<string, HeatmapData> | null) => {
    if (!heatmapData) return null;
    const keywords = Object.values(heatmapData).filter((kw) => kw.averageRank > 0);
    if (keywords.length === 0) return null;
    return keywords.reduce((sum, kw) => sum + kw.averageRank, 0) / keywords.length;
  };

  const visColor = (score: number) => {
    if (score >= 50) return 'text-green-400';
    if (score >= 20) return 'text-amber-400';
    return 'text-red-400';
  };

  const handleArchiveScan = async (scanId: string) => {
    setArchivingId(scanId);
    const { error: archiveErr } = await (supabase as any)
      .from('grid_scans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', scanId)
      .eq('business_id', business!.id);
    if (archiveErr) {
      toast.error('Failed to archive scan');
      setArchivingId(null);
      return;
    }
    setScans((prev) => prev.filter((s) => s.id !== scanId));
    setArchivingId(null);
  };

  const filteredScans = locationFilter === 'all'
    ? scans
    : scans.filter((s) => s.location_id === locationFilter);

  // Group by location for display
  const grouped: Record<string, ScanRow[]> = {};
  for (const scan of filteredScans) {
    const key = scan.location_id || 'no-location';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(scan);
  }

  return (
    <ToolGate tool="local-grid">
      <ToolPageShell icon="📍" name="Saved Reports" description="Past Local Grid scans">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/local-grid" className="btn-ghost text-sm">
            ← Back to Local Grid
          </Link>

          {locations.length > 1 && (
            <select
              className="input text-sm"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {loadingScans ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-card bg-char-800">
                <Skeleton variant="line" className="w-32" />
                <Skeleton variant="line" className="w-24" />
                <Skeleton variant="line" className="flex-1" />
              </div>
            ))}
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-display text-lg mb-2">No saved reports yet</h3>
            <p className="text-sm text-ash-400 mb-4">
              Run a Local Grid scan to generate your first report.
            </p>
            <Link href="/local-grid" className="btn-primary">
              Run a Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([locationKey, locationScans]) => {
              const locId = locationKey === 'no-location' ? null : locationKey;
              const locLabel = locationName(locId);

              return (
                <div key={locationKey}>
                  <h3 className="text-sm font-display text-ash-400 uppercase tracking-wider mb-3">
                    {locLabel}
                  </h3>
                  <div className="space-y-3">
                    {locationScans.map((scan) => {
                      const visibility = overallVisibility(scan.heatmap_data);
                      const rank = avgRank(scan.heatmap_data);
                      const kwLabels = scan.config.keywords
                        .slice(0, 2)
                        .map((k) => k.text)
                        .join(', ');
                      const extraKw = scan.config.keywords.length > 2
                        ? ` +${scan.config.keywords.length - 2}`
                        : '';

                      return (
                        <div key={scan.id} className="card p-5 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-medium">
                                {new Date(scan.scan_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-ash-400">
                                {scan.config.size}×{scan.config.size} · {scan.config.radius} mi
                              </span>
                            </div>
                            <p className="text-xs text-ash-300 truncate">
                              {kwLabels}{extraKw}
                            </p>
                          </div>

                          <div className="flex items-center gap-6 shrink-0">
                            {rank !== null && (
                              <div className="text-center">
                                <div className="text-lg font-display text-heat-400">#{rank.toFixed(1)}</div>
                                <div className="text-xs text-ash-400">Avg Rank</div>
                              </div>
                            )}
                            {visibility !== null && (
                              <div className="text-center">
                                <div className={`text-lg font-display ${visColor(visibility)}`}>
                                  {visibility.toFixed(0)}%
                                </div>
                                <div className="text-xs text-ash-400">Top 3</div>
                              </div>
                            )}
                            <Link
                              href={`/local-grid?scanId=${scan.id}`}
                              className="btn-secondary text-sm shrink-0"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleArchiveScan(scan.id)}
                              disabled={archivingId === scan.id}
                              className="btn-ghost text-sm text-ash-400 hover:text-danger shrink-0 disabled:opacity-50"
                              title="Archive this scan"
                            >
                              {archivingId === scan.id ? '...' : 'Archive'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="text-center pt-4">
            <button
              onClick={loadMoreScans}
              disabled={loadingMore}
              className="btn-secondary"
            >
              {loadingMore ? 'Loading…' : 'Load More Scans'}
            </button>
          </div>
        )}
      </ToolPageShell>
    </ToolGate>
  );
}
