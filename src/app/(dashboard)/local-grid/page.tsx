'use client';

import { useState, useEffect } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { BusinessLookup } from '@/components/tools/LocalGrid/BusinessLookup';
import { GridConfigurator } from '@/components/tools/LocalGrid/GridConfigurator';
import { ScanProgress } from '@/components/tools/LocalGrid/ScanProgress';
import { ResultsDashboard } from '@/components/tools/LocalGrid/ResultsDashboard';
import { generateGridPoints, findBusinessRank, calculateCost } from '@/components/tools/LocalGrid/utils';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { useSubscription } from '@/lib/hooks/useSubscription';
import type { BusinessInfo, GridConfig, GridScanResult, HeatmapData, RankData } from '@/components/tools/LocalGrid/types';

type ScanState = 'setup' | 'configure' | 'scanning' | 'complete' | 'error';

export default function LocalGridPage() {
  const { user } = useUser();
  const { business } = useBusiness(user?.id);
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

  const runGridScan = async (
    scanId: string,
    businessInfo: BusinessInfo,
    config: GridConfig,
    gridPoints: any[],
    userId?: string
  ) => {
    try {
      // Update status to scanning
      await (supabase as any)
        .from('grid_scans')
        .update({ status: 'scanning' })
        .eq('id', scanId);

      const allRankData: RankData[] = [];

      // Process each keyword
      for (let kIdx = 0; kIdx < config.keywords.length; kIdx++) {
        const keyword = config.keywords[kIdx];

        // Update progress
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

        // Process each grid point for this keyword
        for (let pIdx = 0; pIdx < gridPoints.length; pIdx++) {
          const point = gridPoints[pIdx];

          // Update current point
          await (supabase as any)
            .from('grid_scans')
            .update({
              progress: {
                current: kIdx,
                total: config.keywords.length,
                currentKeyword: keyword.text,
                currentPoint: pIdx + 1,
              },
            })
            .eq('id', scanId);

          try {
            // Call DataForSEO Local Pack API
            const response = await fetch('/api/dataforseo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endpoint: 'serp/google/organic/live/advanced',
                data: [
                  {
                    keyword: keyword.text,
                    location_coordinate: `${point.lat},${point.lng}`,
                    language_code: 'en',
                    device: 'mobile',
                    os: 'ios',
                  },
                ],
              }),
            });

            const result = await response.json();

            if (result.tasks?.[0]?.result?.[0]?.items) {
              const searchResults = result.tasks[0].result[0].items;

              // Find business rank in results
              const { rank, url } = findBusinessRank(
                searchResults,
                businessInfo.website || '',
                businessInfo.name
              );

              // Store rank data
              const rankData: RankData = {
                keyword: keyword.text,
                point: point.position,
                rank,
                url,
                topResults: searchResults.slice(0, 5).map((item: any, idx: number) => ({
                  position: idx + 1,
                  title: item.title || '',
                  domain: item.domain || '',
                  url: item.url || '',
                })),
              };

              allRankData.push(rankData);

              // Update grid point with rank
              gridPoints[pIdx].rank = rank;
              gridPoints[pIdx].url = url;
            }
          } catch (pointError) {
            console.error(`Error scanning point ${pIdx + 1}:`, pointError);
            // Continue with next point even if this one fails
          }

          // Small delay to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Calculate heatmap data
      const heatmapData: Record<string, HeatmapData> = {};
      config.keywords.forEach((keyword) => {
        const keywordData = allRankData.filter((d) => d.keyword === keyword.text);
        const rankedPoints = keywordData.filter((d) => d.rank !== null);

        heatmapData[keyword.text] = {
          keyword: keyword.text,
          points: gridPoints.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            rank: p.rank,
            intensity: p.rank ? (p.rank <= 3 ? 1 : p.rank <= 10 ? 0.7 : 0.4) : 0,
          })),
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
          heatmap_data: heatmapData,
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
