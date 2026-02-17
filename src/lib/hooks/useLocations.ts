'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { BusinessLocation } from '@/types';

export function useLocations(businessId?: string) {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<BusinessLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadLocations() {
      console.log('[useLocations] Starting to load locations, businessId:', businessId);
      if (!businessId) {
        console.log('[useLocations] No businessId, skipping');
        setLoading(false);
        return;
      }

      try {
        console.log('[useLocations] Querying business_locations...');
        const { data } = await (supabase as any)
          .from('business_locations')
          .select('id, business_id, location_name, address, city, state, zip, latitude, longitude, phone, place_id, cid, gbp_listing, is_primary, created_at')
          .eq('business_id', businessId)
          .order('is_primary', { ascending: false })
          .order('location_name', { ascending: true });

        console.log('[useLocations] Locations loaded:', data?.length || 0);
        const locs = (data as BusinessLocation[]) || [];
        setLocations(locs);

        // Auto-select primary location or first location
        const primary = locs.find(l => l.is_primary) || locs[0] || null;
        setSelectedLocation(primary);
      } catch (error) {
        console.error('[useLocations] Error loading locations:', error);
      } finally {
        console.log('[useLocations] Setting loading to false');
        setLoading(false);
      }
    }

    loadLocations();
  }, [businessId]);

  const selectLocation = (locationId: string | null) => {
    if (locationId === null) {
      setSelectedLocation(null); // "All Locations" / business-level
      return;
    }

    const found = locations.find((l) => l.id === locationId);
    if (found) setSelectedLocation(found);
  };

  return {
    locations,
    selectedLocation,
    loading,
    selectLocation,
    hasMultipleLocations: locations.length > 1
  };
}
