'use client';

import { useEffect, useRef } from 'react';

interface MapCenterPickerProps {
  center: { lat: number; lng: number };
  radiusMiles: number;
  onCenterChange: (lat: number, lng: number) => void;
}

export function MapCenterPicker({ center, radiusMiles, onCenterChange }: MapCenterPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView([center.lat, center.lng], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }).addTo(mapInstanceRef.current);

        // Draggable center marker
        const centerIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:#FF5C1A;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:grab;"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        markerRef.current = L.marker([center.lat, center.lng], {
          icon: centerIcon,
          draggable: true,
        }).addTo(mapInstanceRef.current);

        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          onCenterChange(pos.lat, pos.lng);

          // Update circle position
          if (circleRef.current) {
            circleRef.current.setLatLng([pos.lat, pos.lng]);
          }
        });

        // Radius preview circle
        const radiusMeters = radiusMiles * 1609.34;
        circleRef.current = L.circle([center.lat, center.lng], {
          radius: radiusMeters,
          color: '#FF5C1A',
          fillColor: '#FF5C1A',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '6 4',
        }).addTo(mapInstanceRef.current);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once

  // Update circle radius when radiusMiles changes
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(radiusMiles * 1609.34);
  }, [radiusMiles]);

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css"
      />
      <div
        ref={mapRef}
        className="w-full rounded-lg overflow-hidden shadow-lg"
        style={{ height: 300 }}
      />
      <p className="text-xs text-ash-400 mt-2">
        Scan center: {center.lat.toFixed(5)}°, {center.lng.toFixed(5)}° — drag the pin to adjust
      </p>
    </div>
  );
}
