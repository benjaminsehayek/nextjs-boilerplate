'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { GridConfigurator } from '@/components/tools/LocalGrid/GridConfigurator';
import { ScanProgress } from '@/components/tools/LocalGrid/ScanProgress';
import { ResultsDashboard } from '@/components/tools/LocalGrid/ResultsDashboard';
import { generateGridPoints, findBusinessRank, extractMapItems, calculateCost, getCachedResult, setCachedResult, clearScanCache, detectInputType, parseGoogleMapsUrl } from '@/components/tools/LocalGrid/utils';
import { dfsCall } from '@/lib/dataforseo';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { updateLocationCoords } from '@/app/actions/onboarding';
import type { BusinessInfo, GridConfig, GridPoint, GridScanResult, HeatmapData, MapsSerpItem, RankData, ScanLogEntry } from '@/components/tools/LocalGrid/types';
import type { BusinessLocation, Business } from '@/types';

type ScanState = 'configure' | 'scanning' | 'complete' | 'error';

function locationToBusinessInfo(loc: BusinessLocation, biz: Business): BusinessInfo {
  return {
    name: biz.name,
    address: loc.address || '',
    city: loc.city,
    state: loc.state,
    zipCode: loc.zip || '',
    latitude: loc.latitude || 0,
    longitude: loc.longitude || 0,
    phone: loc.phone || biz.phone || undefined,
    website: biz.domain ? `https://${biz.domain}` : undefined,
    placeId: loc.place_id || undefined,
    cid: loc.cid || undefined,
    domain: biz.domain || undefined,
  };
}

export default function LocalGridPage() {
  const { user } = useUser();
  const { business } = useBusiness();
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);
  const { scansRemaining, profile } = useSubscription();
  const supabase = createClient();

  const [scanState, setScanState] = useState<ScanState>('configure');
  const [currentScan, setCurrentScan] = useState<GridScanResult | null>(null);
  const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapData>>({});
  const [error, setError] = useState<string | null>(null);
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);

  const addLog = useCallback((message: string, type: ScanLogEntry['type'] = 'info') => {
    setScanLog((prev) => [...prev, { message, type, timestamp: Date.now() }]);
  }, []);

  // Derive businessInfo from selected location
  const businessInfo: BusinessInfo | null =
    selectedLocation && business ? locationToBusinessInfo(selectedLocation, business) : null;

  const locationNeedsCoords = selectedLocation && (!selectedLocation.latitude || !selectedLocation.longitude);

  // Load most recent scan on mount
  useEffect(() => {
    if (!business) return;

    async function loadRecentScan() {
      if (!business) return;

      const { data } = await (supabase as any)
        .from('grid_scans')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.status === 'complete') {
        setCurrentScan(data as GridScanResult);
        setHeatmapData(processHeatmapData(data));
        setScanState('complete');
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

  const handleStartScan = async (config: GridConfig) => {
    if (!businessInfo || !business) return;

    if (scansRemaining <= 0) {
      setError('No scan credits remaining. Please upgrade your plan.');
      setScanState('error');
      return;
    }

    setError(null);

    try {
      const gridPoints = generateGridPoints(
        { lat: businessInfo.latitude, lng: businessInfo.longitude },
        config.size,
        config.radius
      );

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

      await runGridScan(scan.id, businessInfo, config, gridPoints, profile?.id);
    } catch (err) {
      console.error('Error starting scan:', err);
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setScanState('error');
    }
  };

  const BATCH_SIZE = 5;

  const runGridScan = async (
    scanId: string,
    bizInfo: BusinessInfo,
    config: GridConfig,
    gridPoints: GridPoint[],
    userId?: string
  ) => {
    try {
      await (supabase as any)
        .from('grid_scans')
        .update({ status: 'scanning' })
        .eq('id', scanId);

      addLog(`Business: ${bizInfo.name}`, 'info');
      addLog(`Grid: ${config.size}×${config.size}, Radius: ${config.radius} mi, Keywords: ${config.keywords.length}`, 'info');

      const allRankData: RankData[] = [];
      let cacheHits = 0;
      let firstMatchLogged = false;

      for (let kIdx = 0; kIdx < config.keywords.length; kIdx++) {
        const keyword = config.keywords[kIdx];
        addLog(`Scanning keyword: "${keyword.text}"...`, 'info');

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

        for (let batchStart = 0; batchStart < gridPoints.length; batchStart += BATCH_SIZE) {
          const batch = gridPoints.slice(batchStart, batchStart + BATCH_SIZE);

          const batchResults = await Promise.allSettled(
            batch.map(async (point, batchIdx) => {
              const pIdx = batchStart + batchIdx;

              const cached = getCachedResult(keyword.text, point.lat, point.lng);
              if (cached) {
                cacheHits++;
                return { pIdx, point, data: cached, fromCache: true };
              }

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

              if (resultData) {
                setCachedResult(keyword.text, point.lat, point.lng, resultData);
              }

              return { pIdx, point, data: resultData, fromCache: false };
            })
          );

          for (const settled of batchResults) {
            if (settled.status === 'rejected') {
              console.error('Batch point error:', settled.reason);
              continue;
            }

            const { pIdx, point, data } = settled.value;

            if (data) {
              const mapItems = extractMapItems(data);
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

              gridPoints[pIdx].rank = rank;
              gridPoints[pIdx].url = url;
              gridPoints[pIdx].matchMethod = matchMethod;
              gridPoints[pIdx].competitors = mapItems.slice(0, 5).map((item: MapsSerpItem) => ({
                name: item.title || 'Unknown',
                rank: item.rank_group,
              }));

              if (rank !== null && !firstMatchLogged && matchMethod) {
                addLog(`Matching by: ${matchMethod}`, 'success');
                firstMatchLogged = true;
              }
            }
          }

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

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Log keyword completion
        const kwData = allRankData.filter((d) => d.keyword === keyword.text);
        const kwFound = kwData.filter((d) => d.rank !== null).length;
        addLog(`"${keyword.text}" complete — found at ${kwFound}/${gridPoints.length} points`, kwFound > 0 ? 'success' : 'warning');
      }

      const heatmap: Record<string, HeatmapData> = {};
      config.keywords.forEach((keyword) => {
        const keywordData = allRankData.filter((d) => d.keyword === keyword.text);
        const rankedPoints = keywordData.filter((d) => d.rank !== null);
        const top3Points = rankedPoints.filter((d) => d.rank !== null && d.rank <= 3);

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
          top3Count: top3Points.length,
          visibilityScore: gridPoints.length > 0 ? (top3Points.length / gridPoints.length) * 100 : 0,
        };
      });

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

      if (userId) {
        await (supabase as any).rpc('decrement_scan_credits', {
          p_user_id: userId,
        });
      }

      addLog('Scan complete!', 'success');
      if (cacheHits > 0) {
        addLog(`${cacheHits} cached results used (saved API calls)`, 'info');
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
    setCurrentScan(null);
    setHeatmapData({});
    setScanState('configure');
    setScanLog([]);
    clearScanCache();
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

        {/* Location selector (always visible when not scanning) */}
        {scanState === 'configure' && (
          <LocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={selectLocation}
            showAllOption={false}
          />
        )}

        {/* Missing coordinates fallback */}
        {scanState === 'configure' && locationNeedsCoords && selectedLocation && (
          <LocationCoordsSetup
            location={selectedLocation}
            onUpdated={() => window.location.reload()}
          />
        )}

        {/* Grid configurator (only if location has coordinates) */}
        {scanState === 'configure' && businessInfo && !locationNeedsCoords && (
          <GridConfigurator
            business={businessInfo}
            onStartScan={handleStartScan}
            onBack={handleNewScan}
          />
        )}

        {scanState === 'scanning' && currentScan && (
          <ScanProgress scan={currentScan} logEntries={scanLog} />
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

// ── Inline lookup for locations missing coordinates ──────────────────

function LocationCoordsSetup({ location, onUpdated }: { location: BusinessLocation; onUpdated: () => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      // Try geocoding from existing address
      const query = `${location.address || ''}, ${location.city}, ${location.state} ${location.zip || ''}`.trim();
      if (!query || query === ',') {
        setError('Please enter a search term or add an address to this location');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await resp.json();
        if (data.length === 0) { setError('Address not found'); return; }
        const { error: saveErr } = await updateLocationCoords({
          location_id: location.id,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        });
        if (saveErr) throw new Error(saveErr);
        onUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to geocode');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const inputType = detectInputType(trimmed);
      let lat = 0, lng = 0, placeId = '', cid = '';

      if (inputType === 'mapsUrl') {
        const parsed = parseGoogleMapsUrl(trimmed);
        if (parsed.lat && parsed.lng) {
          lat = parsed.lat;
          lng = parsed.lng;
          placeId = parsed.placeId || '';
          cid = parsed.cid || '';
        }
      }

      if (!lat || !lng) {
        // Try name/domain lookup
        const result = await dfsCall<any>('business_data/business_listings/search/live', [
          { categories: [], filters: ['title', 'like', `%${trimmed}%`], language_code: 'en', limit: 1 },
        ]);
        const item = result.tasks?.[0]?.result?.[0]?.items?.[0];
        if (item) {
          lat = item.latitude || 0;
          lng = item.longitude || 0;
          placeId = item.place_id || '';
          cid = item.cid || '';
        }
      }

      if (!lat || !lng) {
        setError('Could not find coordinates. Try a Google Maps URL or business name.');
        return;
      }

      const { error: saveErr } = await updateLocationCoords({
        location_id: location.id,
        latitude: lat,
        longitude: lng,
        place_id: placeId || undefined,
        cid: cid || undefined,
      });
      if (saveErr) throw new Error(saveErr);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setLoading(false);
    }
  }, [input, location, onUpdated]);

  return (
    <div className="card p-6 mb-6 border border-yellow-500/20 bg-yellow-500/5">
      <h3 className="font-display mb-2">Location needs coordinates</h3>
      <p className="text-sm text-ash-300 mb-4">
        "{location.location_name}" needs latitude/longitude coordinates for grid scanning.
        Search to add them, or we can try geocoding the existing address.
      </p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="Business name, Google Maps URL, or leave empty to geocode address"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
        />
        <button
          className="btn-primary"
          onClick={handleLookup}
          disabled={loading}
        >
          {loading ? 'Updating...' : input.trim() ? 'Lookup' : 'Geocode Address'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function processHeatmapData(scan: any): Record<string, HeatmapData> {
  return scan.heatmap_data || {};
}
