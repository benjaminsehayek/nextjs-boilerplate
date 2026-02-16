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
      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('business_locations')
          .select('*')
          .eq('business_id', businessId)
          .order('is_primary', { ascending: false })
          .order('location_name', { ascending: true });

        const locs = (data as BusinessLocation[]) || [];
        setLocations(locs);

        // Auto-select primary location or first location
        const primary = locs.find(l => l.is_primary) || locs[0] || null;
        setSelectedLocation(primary);
      } catch (error) {
        console.error('Error loading locations:', error);
      } finally {
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
