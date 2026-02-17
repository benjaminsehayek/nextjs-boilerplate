'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Business } from '@/types';

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadBusinesses() {
      console.log('[useBusiness] Starting to load businesses...');
      try {
        console.log('[useBusiness] Calling getUser()...');
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[useBusiness] getUser() completed, user:', user ? 'authenticated' : 'not authenticated');

        if (!user) {
          setLoading(false);
          return;
        }

        console.log('[useBusiness] Querying businesses...');
        const { data } = await (supabase as any)
          .from('businesses')
          .select('id, user_id, domain, name, place_id, cid, feature_id, phone, address, city, state, zip, latitude, longitude, industry, categories, created_at, updated_at')
          .eq('user_id', user.id);

        console.log('[useBusiness] Businesses loaded:', data?.length || 0);
        const biz = (data as Business[]) || [];
        setBusinesses(biz);
        setBusiness(biz[0] || null);
      } catch (error) {
        console.error('[useBusiness] Error loading businesses:', error);
      } finally {
        console.log('[useBusiness] Setting loading to false');
        setLoading(false);
      }
    }

    loadBusinesses();
  }, []); // Empty dependency - supabase client is stable

  const switchBusiness = (id: string) => {
    const found = businesses.find((b) => b.id === id);
    if (found) setBusiness(found);
  };

  return { business, businesses, loading, switchBusiness };
}
