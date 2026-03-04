'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import type { BusinessLocation } from '@/types';

export function useLocations(businessId?: string) {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<BusinessLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadLocations = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await (supabase as any)
        .from('business_locations')
        .select('id, business_id, location_name, address, city, state, zip, latitude, longitude, phone, place_id, cid, gbp_listing, is_primary, created_at')
        .eq('business_id', businessId)
        .order('is_primary', { ascending: false })
        .order('location_name', { ascending: true });

      const locs = (data as BusinessLocation[]) || [];
      setLocations(locs);

      // Preserve currently selected location (with fresh data) after refresh
      setSelectedLocation((prev) => {
        if (prev) {
          const refreshed = locs.find((l) => l.id === prev.id);
          if (refreshed) return refreshed;
        }
        return locs.find(l => l.is_primary) || locs[0] || null;
      });
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const selectLocation = (locationId: string | null) => {
    if (locationId === null) {
      setSelectedLocation(null);
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
    refreshLocations: loadLocations,
    hasMultipleLocations: locations.length > 1
  };
}
