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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await (supabase as any)
          .from('businesses')
          .select('id, user_id, domain, name, place_id, cid, feature_id, phone, address, city, state, zip, latitude, longitude, industry, categories, created_at, updated_at')
          .eq('user_id', user.id);

        const biz = (data as Business[]) || [];
        setBusinesses(biz);
        setBusiness(biz[0] || null);
      } catch (error) {
        console.error('Error loading businesses:', error);
      } finally {
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
