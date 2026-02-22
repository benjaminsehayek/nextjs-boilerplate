'use client';

import { useEffect, useRef } from 'react';
import type { BusinessInfo, GridPoint, HeatmapData } from './types';
import { autoZoomForRadius } from './utils';

interface MapDisplayProps {
  business: BusinessInfo;
  gridPoints: GridPoint[];
  heatmapData?: HeatmapData;
  showHeatmap?: boolean;
  radiusMiles?: number; // Show radius preview circle when provided
}

export function MapDisplay({ business, gridPoints, heatmapData, showHeatmap = false, radiusMiles }: MapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamic import of Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix for default marker icon in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const zoom = radiusMiles ? autoZoomForRadius(radiusMiles) : 11;

      // Initialize map
      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView(
          [business.latitude, business.longitude],
          zoom
        );

        // Dark CARTO tiles to match dark app theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing layers except base layer
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) return;
        mapInstanceRef.current.removeLayer(layer);
      });

      // Add business center marker
      const businessIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: #FF5C1A; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([business.latitude, business.longitude], { icon: businessIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<strong>${business.name}</strong><br>${business.address}`);

      // Radius preview circle
      if (radiusMiles && !showHeatmap) {
        const radiusMeters = radiusMiles * 1609.34;
        L.circle([business.latitude, business.longitude], {
          radius: radiusMeters,
          color: '#FF5C1A',
          fillColor: '#FF5C1A',
          fillOpacity: 0.05,
          weight: 1,
          dashArray: '6 4',
        }).addTo(mapInstanceRef.current);
      }

      // Add grid points
      if (gridPoints.length > 0) {
        gridPoints.forEach((point) => {
          let color = '#94A3B8'; // Default gray
          let size = showHeatmap ? 28 : 8;
          let textColor = '#fff';

          if (showHeatmap && point.rank !== null) {
            if (point.rank <= 3) {
              color = '#22c55e'; // green
            } else if (point.rank <= 10) {
              color = '#f59e0b'; // amber
              textColor = '#1a1a1a';
            } else if (point.rank <= 20) {
              color = '#ef4444'; // red
            } else {
              color = '#6b7280'; // gray
            }
          } else if (point.rank === null && showHeatmap) {
            color = '#6b7280';
            size = 24;
          }

          const label = showHeatmap
            ? (point.rank !== null ? String(point.rank) : '—')
            : '';

          const pointIcon = showHeatmap
            ? L.divIcon({
                className: 'grid-point',
                html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${textColor};line-height:1;">${label}</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              })
            : L.divIcon({
                className: 'grid-point',
                html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              });

          const marker = L.marker([point.lat, point.lng], { icon: pointIcon }).addTo(
            mapInstanceRef.current
          );

          // Popup with ranking info + competitors
          if (showHeatmap) {
            const matchLabel = point.matchMethod
              ? `<br><span style="font-size:10px;opacity:0.7">Matched by: ${point.matchMethod}</span>`
              : '';

            let competitorsHtml = '';
            if (point.competitors && point.competitors.length > 0) {
              const compList = point.competitors
                .map((c) => {
                  const isYou = point.rank !== null && c.rank === point.rank;
                  return `<div style="font-size:10px;${isYou ? 'color:#FF5C1A;font-weight:700;' : 'opacity:0.8;'}">#${c.rank} ${c.name}${isYou ? ' ← You' : ''}</div>`;
                })
                .join('');
              competitorsHtml = `<div style="border-top:1px solid rgba(255,255,255,0.15);margin-top:6px;padding-top:6px;">${compList}</div>`;
            }

            const popupContent = point.rank
              ? `<strong>Rank: #${point.rank}</strong>${matchLabel}<br>Distance: ${point.distance.toFixed(2)} mi${competitorsHtml}`
              : `<strong>Not Ranking</strong><br>Distance: ${point.distance.toFixed(2)} mi${competitorsHtml}`;
            marker.bindPopup(popupContent);
          } else {
            marker.bindPopup(`Point ${point.position}<br>Distance: ${point.distance.toFixed(2)} mi`);
          }
        });

        // Fit bounds to show all points
        const bounds = L.latLngBounds([
          ...gridPoints.map((p) => [p.lat, p.lng] as [number, number]),
          [business.latitude, business.longitude],
        ]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [business, gridPoints, heatmapData, showHeatmap, radiusMiles]);

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css"
      />
      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg"
      />

      {/* Legend */}
      {showHeatmap && (
        <div className="absolute top-4 right-4 bg-char-950/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
          <h4 className="text-sm font-display mb-2">Ranking Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }}></div>
              <span>Top 3</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }}></div>
              <span>4-10</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }}></div>
              <span>11-20</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#6b7280' }}></div>
              <span>Not Ranking</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ash-700">
              <div className="w-4 h-4 rounded-full bg-flame-500"></div>
              <span>Your Business</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
