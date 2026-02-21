'use client';

import { useEffect, useRef } from 'react';
import type { BusinessInfo, GridPoint, HeatmapData } from './types';

interface MapDisplayProps {
  business: BusinessInfo;
  gridPoints: GridPoint[];
  heatmapData?: HeatmapData;
  showHeatmap?: boolean;
}

export function MapDisplay({ business, gridPoints, heatmapData, showHeatmap = false }: MapDisplayProps) {
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

      // Initialize map
      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView(
          [business.latitude, business.longitude],
          11
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing layers except base layer
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) return; // Keep base map
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

      // Add grid points
      if (gridPoints.length > 0) {
        gridPoints.forEach((point) => {
          let color = '#94A3B8'; // Default gray
          let size = showHeatmap ? 24 : 8;
          let textColor = '#fff';

          if (showHeatmap && point.rank !== null) {
            if (point.rank <= 3) {
              color = '#10B981'; // green
            } else if (point.rank <= 10) {
              color = '#FBBF24'; // yellow
              textColor = '#1a1a1a';
            } else if (point.rank <= 20) {
              color = '#FB923C'; // orange
              textColor = '#1a1a1a';
            } else {
              color = '#EF4444'; // red
            }
          } else if (point.rank === null && showHeatmap) {
            color = '#64748B'; // Not ranking - dark gray
            size = 20;
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

          // Add popup with ranking info + match method
          if (showHeatmap) {
            const matchLabel = point.matchMethod
              ? `<br><span style="font-size:10px;opacity:0.7">Matched by: ${point.matchMethod}</span>`
              : '';
            const popupContent = point.rank
              ? `<strong>Rank: #${point.rank}</strong>${matchLabel}<br>Distance: ${point.distance.toFixed(2)}km<br>Point ${point.position}`
              : `<strong>Not Ranking</strong><br>Distance: ${point.distance.toFixed(2)}km<br>Point ${point.position}`;
            marker.bindPopup(popupContent);
          } else {
            marker.bindPopup(`Point ${point.position}<br>Distance: ${point.distance.toFixed(2)}km`);
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
  }, [business, gridPoints, heatmapData, showHeatmap]);

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
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Top 3</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>4-10</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>11-20</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>20+</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-600"></div>
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
