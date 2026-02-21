'use client';

import { useState, useEffect } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { BusinessLookup } from '@/components/tools/LocalGrid/BusinessLookup';
import { GridConfigurator } from '@/components/tools/LocalGrid/GridConfigurator';
import { ScanProgress } from '@/components/tools/LocalGrid/ScanProgress';
import { ResultsDashboard } from '@/components/tools/LocalGrid/ResultsDashboard';
import { generateGridPoints, findBusinessRank, extractMapItems, calculateCost, getCachedResult, setCachedResult, clearScanCache } from '@/components/tools/LocalGrid/utils';
import { dfsCall } from '@/lib/dataforseo';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { useSubscription } from '@/lib/hooks/useSubscription';
import type { BusinessInfo, GridConfig, GridPoint, GridScanResult, HeatmapData, MapsSerpItem, RankData } from '@/components/tools/LocalGrid/types';

type ScanState = 'setup' | 'configure' | 'scanning' | 'complete' | 'error';

export default function LocalGridPage() {
  const { user } = useUser();
  const { business } = useBusiness();
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);
  const { scansRemaining, profile } = useSubscription();
  const supabase = createClient();

  const [scanState, setScanState] = useState<ScanState>('setup');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [currentScan, setCurrentScan] = useState<GridScanResult | null>(null);
  const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapData>>({});
  const [error, setError] = useState<string | null>(null);

  // Load most recent scan on mount
  useEffect(() => {
    if (!business) return;

    async function loadRecentScan() {
      if (!business) return; // Guard against race condition

      const { data } = await (supabase as any)
        .from('grid_scans')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.status === 'complete') {
        setCurrentScan(data as GridScanResult);
        setHeatmapData(processHeatmapData(data));
        setScanState('complete');
        setBusinessInfo(data.business_info);
      }
    }

    loadRecentScan();
  }, [business, supabase]);

  // Subscribe to scan updates
  useEffect(() => {
    if (!currentScan || scanState !== 'scanning') return;

    const channel = supabase
      .channel(`grid_scan:${currentScan.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'grid_scans',
          filter: `id=eq.${currentScan.id}`,
        },
        (payload: any) => {
          const updatedScan = payload.new as GridScanResult;
          setCurrentScan(updatedScan);

          if (updatedScan.status === 'complete') {
            setHeatmapData(processHeatmapData(updatedScan));
            setScanState('complete');
          } else if (updatedScan.status === 'failed') {
            setError('Scan failed. Please try again.');
            setScanState('error');
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentScan, scanState, supabase]);

  const handleBusinessFound = (business: BusinessInfo) => {
    setBusinessInfo(business);
    setScanState('configure');
  };

  const handleStartScan = async (config: GridConfig) => {
    if (!businessInfo || !business) return;

    // Check scan credits
    if (scansRemaining <= 0) {
      setError('No scan credits remaining. Please upgrade your plan.');
      setScanState('error');
      return;
    }

    setError(null);

    try {
      // Generate grid points
      const gridPoints = generateGridPoints(
        { lat: businessInfo.latitude, lng: businessInfo.longitude },
        config.size,
        config.radius
      );

      // Create scan record in database
      const { data: scan, error: dbError } = await (supabase as any)
        .from('grid_scans')
        .insert({
          business_id: business.id,
          location_id: selectedLocation?.id || null,
          business_info: businessInfo,
          config,
          points: gridPoints,
          status: 'pending',
          scan_date: new Date().toISOString(),
          total_cost: calculateCost(gridPoints.length * config.keywords.length),
          progress: {
            current: 0,
            total: config.keywords.length,
          },
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setCurrentScan(scan as GridScanResult);
      setScanState('scanning');

      // Start background scan
      await runGridScan(scan.id, businessInfo, config, gridPoints, profile?.id);
    } catch (err) {
      console.error('Error starting scan:', err);
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setScanState('error');
    }
  };

  const BATCH_SIZE = 5; // Concurrent API calls per batch

  const runGridScan = async (
    scanId: string,
    bizInfo: BusinessInfo,
    config: GridConfig,
    gridPoints: GridPoint[],
    userId?: string
  ) => {
    try {
      // Update status to scanning
      await (supabase as any)
        .from('grid_scans')
        .update({ status: 'scanning' })
        .eq('id', scanId);

      const allRankData: RankData[] = [];
      let cacheHits = 0;

      // Process each keyword
      for (let kIdx = 0; kIdx < config.keywords.length; kIdx++) {
        const keyword = config.keywords[kIdx];

        // Update keyword-level progress
        await (supabase as any)
          .from('grid_scans')
          .update({
            progress: {
              current: kIdx,
              total: config.keywords.length,
              currentKeyword: keyword.text,
              currentPoint: 0,
            },
          })
          .eq('id', scanId);

        // Process grid points in concurrent batches
        for (let batchStart = 0; batchStart < gridPoints.length; batchStart += BATCH_SIZE) {
          const batch = gridPoints.slice(batchStart, batchStart + BATCH_SIZE);

          const batchResults = await Promise.allSettled(
            batch.map(async (point, batchIdx) => {
              const pIdx = batchStart + batchIdx;

              // Check localStorage cache first
              const cached = getCachedResult(keyword.text, point.lat, point.lng);
              if (cached) {
                cacheHits++;
                return { pIdx, point, data: cached, fromCache: true };
              }

              // Call DataForSEO Maps SERP API via dfsCall helper
              const result = await dfsCall<any>('serp/google/maps/live/advanced', [
                {
                  keyword: keyword.text,
                  location_coordinate: `${point.lat},${point.lng},100`,
                  language_code: 'en',
                  device: 'mobile',
                  os: 'ios',
                  depth: 20,
                },
              ]);

              const resultData = result.tasks?.[0]?.result?.[0] || null;

              // Cache the result
              if (resultData) {
                setCachedResult(keyword.text, point.lat, point.lng, resultData);
              }

              return { pIdx, point, data: resultData, fromCache: false };
            })
          );

          // Process batch results
          for (const settled of batchResults) {
            if (settled.status === 'rejected') {
              console.error('Batch point error:', settled.reason);
              continue;
            }

            const { pIdx, point, data } = settled.value;

            if (data) {
              // Extract map items (filters paid ads, handles response shape variants)
              const mapItems = extractMapItems(data);

              // Find business rank using 6-level cascade
              const { rank, url, matchMethod } = findBusinessRank(mapItems, bizInfo);

              const rankData: RankData = {
                keyword: keyword.text,
                point: point.position,
                rank,
                url,
                matchMethod,
                topResults: mapItems.slice(0, 5).map((item: MapsSerpItem) => ({
                  position: item.rank_group,
                  title: item.title || '',
                  domain: item.domain || '',
                  url: item.url || '',
                })),
              };

              allRankData.push(rankData);

              // Update grid point with rank
              gridPoints[pIdx].rank = rank;
              gridPoints[pIdx].url = url;
              gridPoints[pIdx].matchMethod = matchMethod;
            }
          }

          // Update progress after each batch (not every point)
          await (supabase as any)
            .from('grid_scans')
            .update({
              progress: {
                current: kIdx,
                total: config.keywords.length,
                currentKeyword: keyword.text,
                currentPoint: Math.min(batchStart + BATCH_SIZE, gridPoints.length),
              },
            })
            .eq('id', scanId);

          // Small delay between batches to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Calculate heatmap data per keyword
      const heatmap: Record<string, HeatmapData> = {};
      config.keywords.forEach((keyword) => {
        const keywordData = allRankData.filter((d) => d.keyword === keyword.text);
        const rankedPoints = keywordData.filter((d) => d.rank !== null);

        // Build a lookup from point position → rank for this keyword
        const pointRankMap = new Map<number, number | null>();
        keywordData.forEach((d) => pointRankMap.set(d.point, d.rank));

        heatmap[keyword.text] = {
          keyword: keyword.text,
          points: gridPoints.map((p) => {
            const rank = pointRankMap.get(p.position) ?? null;
            return {
              lat: p.lat,
              lng: p.lng,
              rank,
              intensity: rank ? (rank <= 3 ? 1 : rank <= 10 ? 0.7 : 0.4) : 0,
            };
          }),
          averageRank:
            rankedPoints.length > 0
              ? rankedPoints.reduce((sum, d) => sum + (d.rank || 0), 0) / rankedPoints.length
              : 0,
          pointsRanking: rankedPoints.length,
          notRanking: gridPoints.length - rankedPoints.length,
        };
      });

      // Save final results
      await (supabase as any)
        .from('grid_scans')
        .update({
          status: 'complete',
          points: gridPoints,
          rank_data: allRankData,
          heatmap_data: heatmap,
          progress: {
            current: config.keywords.length,
            total: config.keywords.length,
          },
        })
        .eq('id', scanId);

      // Decrement scan credits
      if (userId) {
        await (supabase as any).rpc('decrement_scan_credits', {
          p_user_id: userId,
        });
      }

      if (cacheHits > 0) {
        console.log(`Scan complete: ${cacheHits} cache hits saved API calls`);
      }
    } catch (err) {
      console.error('Scan error:', err);
      await (supabase as any)
        .from('grid_scans')
        .update({ status: 'failed' })
        .eq('id', scanId);
    }
  };

  const handleNewScan = () => {
    setBusinessInfo(null);
    setCurrentScan(null);
    setHeatmapData({});
    setScanState('setup');
    clearScanCache();
  };

  const handleBackToBusiness = () => {
    setScanState('setup');
  };

  return (
    <ToolGate tool="local-grid">
      <ToolPageShell
        icon="📍"
        name="Local Grid"
        description="Maps ranking heat map across your service area"
      >
        {error && scanState === 'error' && (
          <div className="card p-6 bg-red-500/10 border border-red-500/20 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="font-display mb-1">Error</h3>
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={handleNewScan} className="btn-secondary mt-4">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {scanState === 'setup' && (
          <>
            <LocationSelector
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={selectLocation}
              showAllOption={true}
            />
            <BusinessLookup
              onBusinessFound={handleBusinessFound}
              initialBusiness={businessInfo || undefined}
            />
          </>
        )}

        {scanState === 'configure' && businessInfo && (
          <GridConfigurator
            business={businessInfo}
            onStartScan={handleStartScan}
            onBack={handleBackToBusiness}
          />
        )}

        {scanState === 'scanning' && currentScan && (
          <ScanProgress scan={currentScan} />
        )}

        {scanState === 'complete' && currentScan && (
          <ResultsDashboard
            scan={currentScan}
            heatmapData={heatmapData}
            onNewScan={handleNewScan}
          />
        )}
      </ToolPageShell>
    </ToolGate>
  );
}

function processHeatmapData(scan: any): Record<string, HeatmapData> {
  // Extract heatmap data from scan record
  return scan.heatmap_data || {};
}
