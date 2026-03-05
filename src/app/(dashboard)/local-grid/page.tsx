'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { GridConfigurator } from '@/components/tools/LocalGrid/GridConfigurator';
import { ScanProgress } from '@/components/tools/LocalGrid/ScanProgress';
import { ResultsDashboard } from '@/components/tools/LocalGrid/ResultsDashboard';
import { generateGridPoints, findBusinessRank, extractMapItems, calculateCost, getCachedResult, setCachedResult, clearScanCache, detectInputType, parseGoogleMapsUrl, autoZoomForRadius } from '@/components/tools/LocalGrid/utils';
import { dfsCall } from '@/lib/dataforseo';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { updateLocationCoords } from '@/app/actions/onboarding';
import type { BusinessInfo, GridConfig, GridPoint, GridScanResult, HeatmapData, MapsSerpItem, RankData, ScanLogEntry } from '@/components/tools/LocalGrid/types';
import type { BusinessLocation, Business } from '@/types';

type ScanState = 'location' | 'configure' | 'scanning' | 'complete' | 'error';

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
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>}>
      <LocalGridInner />
    </Suspense>
  );
}

function LocalGridInner() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { business } = useBusiness();
  const { locations, selectedLocation, selectLocation, refreshLocations, loading: locationsLoading } = useLocations(business?.id);
  const { scansRemaining } = useSubscription();
  const supabase = createClient();

  const [scanState, setScanState] = useState<ScanState>('location');
  const [currentScan, setCurrentScan] = useState<GridScanResult | null>(null);
  const [heatmapData, setHeatmapData] = useState<Record<string, HeatmapData>>({});
  const [error, setError] = useState<string | null>(null);
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);
  const [scanCenter, setScanCenter] = useState<{ lat: number; lng: number } | null>(null);
  // pendingLocation holds the loc object passed to handleSelectLocation (may have fresher coords
  // than the hook's selectedLocation if auto-geocoding happened in LocationStep)
  const [pendingLocation, setPendingLocation] = useState<BusinessLocation | null>(null);
  // GSC-15: pre-fill keyword from suggestion
  const [suggestedKeyword, setSuggestedKeyword] = useState<string | undefined>(undefined);

  const addLog = useCallback((message: string, type: ScanLogEntry['type'] = 'info') => {
    setScanLog((prev) => [...prev, { message, type, timestamp: Date.now() }]);
  }, []);

  // In configure state, prefer pendingLocation (has fresh coords) over selectedLocation (may be stale)
  const activeLocation = (scanState === 'configure' && pendingLocation) ? pendingLocation : selectedLocation;

  const businessInfo: BusinessInfo | null =
    activeLocation && business ? locationToBusinessInfo(activeLocation, business) : null;

  const locationNeedsCoords = activeLocation && (!activeLocation.latitude || !activeLocation.longitude);

  // Load a specific scan by ?scanId= query param (from reports page)
  useEffect(() => {
    if (!business) return;
    const scanId = searchParams?.get('scanId');

    async function loadScan(id: string) {
      const { data } = await (supabase as any)
        .from('grid_scans')
        .select('*')
        .eq('id', id)
        .eq('business_id', business!.id)
        .maybeSingle();

      if (data && data.status === 'complete') {
        setCurrentScan(data as GridScanResult);
        setHeatmapData(processHeatmapData(data));
        setScanState('complete');
      }
    }

    if (scanId) {
      loadScan(scanId);
    }
  }, [business, searchParams, supabase]);

  // Subscribe to scan updates during scanning
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
          if (updatedScan.business_id !== business?.id) return;
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

  const handleSelectLocation = (loc: BusinessLocation) => {
    selectLocation(loc.id);
    setPendingLocation(loc); // store with potentially updated coords from auto-geocoding
    setScanCenter({ lat: loc.latitude || 0, lng: loc.longitude || 0 });
    setScanState('configure');
  };

  const handleStartScan = async (config: GridConfig) => {
    if (!businessInfo || !business || !scanCenter) return;

    if (scansRemaining <= 0) {
      setError('No scan credits remaining. Please upgrade your plan.');
      setScanState('error');
      return;
    }

    // Set scanning state immediately to prevent double-click creating duplicate scans
    setScanState('scanning');
    setError(null);

    // Build businessInfo with the potentially-adjusted scanCenter
    const effectiveBizInfo: BusinessInfo = {
      ...businessInfo,
      latitude: scanCenter.lat,
      longitude: scanCenter.lng,
    };

    try {
      const gridPoints = generateGridPoints(
        { lat: scanCenter.lat, lng: scanCenter.lng },
        config.size,
        config.radius
      );

      const { data: scan, error: dbError } = await (supabase as any)
        .from('grid_scans')
        .insert({
          business_id: business.id,
          location_id: activeLocation?.id || null,
          business_info: effectiveBizInfo,
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

      const heatmap = await runGridScan(
        scan.id,
        effectiveBizInfo,
        config,
        gridPoints,
        user?.id,
        (progress) => setCurrentScan((prev) => (prev ? { ...prev, progress } : prev))
      );

      // Directly update state — don't rely on Supabase realtime subscription
      setHeatmapData(heatmap);
      setCurrentScan((prev) => (prev ? { ...prev, status: 'complete', points: gridPoints } : prev));
      setScanState('complete');
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
    userId?: string,
    onProgress?: (progress: GridScanResult['progress']) => void
  ): Promise<Record<string, HeatmapData>> => {
    try {
      await (supabase as any)
        .from('grid_scans')
        .update({ status: 'scanning' })
        .eq('id', scanId)
        .eq('business_id', business!.id);

      addLog(`Business: ${bizInfo.name}`, 'info');
      addLog(`Grid: ${config.size}×${config.size}, Radius: ${config.radius} mi, Keywords: ${config.keywords.length}`, 'info');

      const allRankData: RankData[] = [];
      let cacheHits = 0;
      let firstMatchLogged = false;
      let firstResultLogged = false; // one-time debug dump

      for (let kIdx = 0; kIdx < config.keywords.length; kIdx++) {
        const keyword = config.keywords[kIdx];
        addLog(`Scanning keyword: "${keyword.text}"...`, 'info');

        const kwStartProgress = {
          current: kIdx,
          total: config.keywords.length,
          currentKeyword: keyword.text,
          currentPoint: 0,
        };
        await (supabase as any)
          .from('grid_scans')
          .update({ progress: kwStartProgress })
          .eq('id', scanId)
          .eq('business_id', business!.id);
        onProgress?.(kwStartProgress);

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

              const zoom = autoZoomForRadius(config.radius);
              const result = await dfsCall<any>('serp/google/maps/live/advanced', [
                {
                  keyword: keyword.text,
                  location_coordinate: `${point.lat.toFixed(7)},${point.lng.toFixed(7)},${zoom}z`,
                  language_code: 'en',
                  device: 'desktop',
                  os: 'windows',
                  depth: 20,
                },
              ]);

              const resultData = result.tasks?.[0]?.result?.[0] || null;

              // One-time debug: log raw response shape to browser console
              if (!firstResultLogged) {
                firstResultLogged = true;
                const raw = result.tasks?.[0]?.result?.[0];
                const items = raw?.items || [];
                console.log('[LocalGrid DEBUG] First API response:', {
                  taskStatus: result.tasks?.[0]?.status_message,
                  resultItems: items.length,
                  itemTypes: items.slice(0, 5).map((i: any) => ({ type: i.type, title: i.title, rank_group: i.rank_group })),
                  bizName: bizInfo.name,
                  bizCid: bizInfo.cid,
                  bizPlaceId: bizInfo.placeId,
                });
              }

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
                topResults: mapItems
                  .slice()
                  .sort((a: MapsSerpItem, b: MapsSerpItem) => a.rank_group - b.rank_group)
                  .slice(0, 5)
                  .map((item: MapsSerpItem, idx: number) => ({
                    position: idx + 1, // organic position, not raw rank_group
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

          const batchProgress = {
            current: kIdx,
            total: config.keywords.length,
            currentKeyword: keyword.text,
            currentPoint: Math.min(batchStart + BATCH_SIZE, gridPoints.length),
          };
          await (supabase as any)
            .from('grid_scans')
            .update({ progress: batchProgress })
            .eq('id', scanId)
            .eq('business_id', business!.id);
          onProgress?.(batchProgress);

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

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
        .eq('id', scanId)
        .eq('business_id', business!.id);

      // B11-12: credit deduction via server-side API route (not client RPC)
      fetch('/api/local-grid/deduct-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business!.id, scanId }),
      }).catch((err) => {
        console.error('[LocalGrid] Failed to deduct scan credit:', err);
      });

      addLog('Scan complete!', 'success');
      if (cacheHits > 0) {
        addLog(`${cacheHits} cached results used (saved API calls)`, 'info');
      }

      // LM-03: Rank tracking alert — compare with previous scan for same location/business
      try {
        const locationId = activeLocation?.id || null;
        let prevQuery = (supabase as any)
          .from('grid_scans')
          .select('id, heatmap_data')
          .eq('business_id', business!.id)
          .eq('status', 'complete')
          .neq('id', scanId)
          .order('scan_date', { ascending: false })
          .limit(1);

        if (locationId) prevQuery = prevQuery.eq('location_id', locationId);

        const { data: prevScan } = await prevQuery.maybeSingle();

        if (prevScan?.heatmap_data) {
          const drops: { keyword: string; oldRank: number; newRank: number }[] = [];
          for (const keyword of config.keywords) {
            const kw = keyword.text;
            const prevAvg = (prevScan.heatmap_data as Record<string, HeatmapData>)[kw]?.averageRank;
            const newAvg = heatmap[kw]?.averageRank;
            if (prevAvg && newAvg && newAvg - prevAvg > 3) {
              drops.push({
                keyword: kw,
                oldRank: Math.round(prevAvg),
                newRank: Math.round(newAvg),
              });
            }
          }

          if (drops.length > 0) {
            fetch('/api/local-grid/alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scanId, businessId: business!.id, drops }),
            }).catch((err) => console.warn('[LocalGrid] Failed to send rank alert:', err));
            addLog(`Ranking alert sent for ${drops.length} keyword(s) with significant drops`, 'warning');
          }
        }
      } catch (alertErr) {
        // Non-critical — log but don't fail the scan
        console.warn('[LocalGrid] Rank alert check failed:', alertErr);
      }

      return heatmap;
    } catch (err) {
      console.error('Scan error:', err);
      await (supabase as any)
        .from('grid_scans')
        .update({ status: 'failed' })
        .eq('id', scanId)
        .eq('business_id', business!.id);
      throw err; // re-throw so handleStartScan can catch it
    }
  };

  const handleNewScan = () => {
    setCurrentScan(null);
    setHeatmapData({});
    setScanState('location');
    setScanLog([]);
    setScanCenter(null);
    setPendingLocation(null);
    setSuggestedKeyword(undefined);
    clearScanCache();
  };

  // GSC-15: "Track in Grid" — keep same location, go to configure with keyword pre-filled
  const handleTrackSuggestedKeyword = (keyword: string) => {
    setSuggestedKeyword(keyword);
    // If we already have a location selected, jump straight to configure
    if (activeLocation && scanCenter) {
      setCurrentScan(null);
      setHeatmapData({});
      setScanLog([]);
      setScanState('configure');
      clearScanCache();
    } else {
      // No location yet — go to location picker; keyword will be applied after selection
      handleNewScan();
      setSuggestedKeyword(keyword);
    }
  };

  return (
    <ToolGate tool="local-grid">
      <ToolPageShell
        icon="📍"
        name="Local Grid"
        description="Maps ranking heat map across your service area"
      >
        {/* Error state */}
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

        {/* Step 1: Location picker */}
        {scanState === 'location' && (
          <LocationStep
            locations={locations}
            loading={locationsLoading}
            onSelect={handleSelectLocation}
          />
        )}

        {/* Missing coordinates fallback */}
        {scanState === 'configure' && locationNeedsCoords && activeLocation && (
          <LocationCoordsSetup
            location={activeLocation}
            onUpdated={async () => {
              // Refresh locations to get updated coordinates without a full page reload
              await refreshLocations();
              // selectedLocation is now updated in useLocations (preserves current selection)
              if (selectedLocation?.id) {
                selectLocation(selectedLocation.id);
              }
            }}
          />
        )}

        {/* Step 2: Configure (only if location has coords) */}
        {scanState === 'configure' && businessInfo && !locationNeedsCoords && scanCenter && (
          <GridConfigurator
            business={businessInfo}
            scanCenter={scanCenter}
            onCenterChange={(lat, lng) => setScanCenter({ lat, lng })}
            onStartScan={handleStartScan}
            onBack={handleNewScan}
            initialKeyword={suggestedKeyword}
          />
        )}

        {/* Step 3: Scanning */}
        {scanState === 'scanning' && currentScan && (
          <ScanProgress scan={currentScan} logEntries={scanLog} />
        )}

        {/* Step 4: Results */}
        {scanState === 'complete' && currentScan && (
          <ResultsDashboard
            scan={currentScan}
            heatmapData={heatmapData}
            onNewScan={handleNewScan}
            businessId={business?.id}
            onSuggestKeyword={handleTrackSuggestedKeyword}
          />
        )}
      </ToolPageShell>
    </ToolGate>
  );
}

// ── Location picker step ────────────────────────────────────────────────

function LocationStep({
  locations,
  loading,
  onSelect,
}: {
  locations: BusinessLocation[];
  loading: boolean;
  onSelect: (loc: BusinessLocation) => void;
}) {
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [geocodeErrors, setGeocodeErrors] = useState<Record<string, string>>({});

  const handleClick = async (loc: BusinessLocation) => {
    if (loc.latitude && loc.longitude) {
      onSelect(loc);
      return;
    }

    // Auto-attempt geocoding from existing address fields
    const query = [loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ');
    if (!query) {
      onSelect(loc); // no address at all — let LocationCoordsSetup handle it
      return;
    }

    setGeocodingId(loc.id);
    setGeocodeErrors((prev) => ({ ...prev, [loc.id]: '' }));

    try {
      const resp = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`
      );
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const { error } = await updateLocationCoords({ location_id: loc.id, latitude: lat, longitude: lng });
        if (!error) {
          onSelect({ ...loc, latitude: lat, longitude: lng });
          return;
        }
      }
      // Geocoding returned nothing — fall through to LocationCoordsSetup
      onSelect(loc);
    } catch {
      setGeocodeErrors((prev) => ({ ...prev, [loc.id]: 'Auto-geocode failed — try manual setup' }));
    } finally {
      setGeocodingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 w-48 bg-char-800 rounded mb-2" />
            <div className="h-3 w-64 bg-char-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl mb-3">📍</div>
        <h3 className="font-display text-lg mb-2">No locations found</h3>
        <p className="text-sm text-ash-400">
          Add a business location during onboarding to use Local Grid.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display">Select a Location</h2>
          <p className="text-sm text-ash-400 mt-1">Choose which location to analyze</p>
        </div>
        <Link href="/local-grid/reports" className="btn-ghost text-sm">
          View Saved Reports →
        </Link>
      </div>

      <div className="space-y-3">
        {locations.map((loc) => {
          const hasCoords = !!(loc.latitude && loc.longitude);
          const isGeocoding = geocodingId === loc.id;
          const geocodeError = geocodeErrors[loc.id];
          return (
            <button
              key={loc.id}
              onClick={() => handleClick(loc)}
              disabled={isGeocoding}
              className="card card-interactive w-full text-left p-5 transition-all hover:border-flame-500/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display">{loc.location_name}</span>
                    {loc.is_primary && (
                      <span className="text-xs bg-flame-500/20 text-flame-400 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ash-300">
                    {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}
                  </p>
                  {isGeocoding && (
                    <p className="text-xs text-ash-400 mt-1">Finding coordinates...</p>
                  )}
                  {!hasCoords && !isGeocoding && (
                    <p className="text-xs text-amber-400 mt-1">
                      {geocodeError || 'Click to set up coordinates'}
                    </p>
                  )}
                </div>
                <div className="text-ash-400 text-lg flex-shrink-0">
                  {isGeocoding ? (
                    <span className="inline-block w-5 h-5 border-2 border-ash-600 border-t-flame-500 rounded-full animate-spin" />
                  ) : (
                    '→'
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Inline lookup for locations missing coordinates ───────────────────

function LocationCoordsSetup({ location, onUpdated }: { location: BusinessLocation; onUpdated: () => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      const query = `${location.address || ''}, ${location.city}, ${location.state} ${location.zip || ''}`.trim();
      if (!query || query === ',') {
        setError('Please enter a search term or add an address to this location');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) { setError('Address not found'); return; }
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
