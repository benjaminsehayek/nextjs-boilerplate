'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Business } from '@/types';

export function useBusiness(userId?: string) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) {
      setBusiness(null);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    async function loadBusinesses() {
      try {
        const { data } = await (supabase as any)
          .from('businesses')
          .select('id, user_id, domain, name, place_id, cid, feature_id, phone, address, city, state, zip, latitude, longitude, industry, categories, created_at, updated_at')
          .eq('user_id', userId);

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
  }, [userId]);

  const switchBusiness = (id: string) => {
    const found = businesses.find((b) => b.id === id);
    if (found) setBusiness(found);
  };

  return { business, businesses, loading, switchBusiness };
}
