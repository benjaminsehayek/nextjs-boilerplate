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
        if (!user) return;

        const { data } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false });

        const biz = (data as Business[]) || [];
        setBusinesses(biz);
        setBusiness(biz.find((b) => b.is_primary) || biz[0] || null);
      } catch (error) {
        console.error('Error loading businesses:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBusinesses();
  }, []);

  const switchBusiness = (id: string) => {
    const found = businesses.find((b) => b.id === id);
    if (found) setBusiness(found);
  };

  return { business, businesses, loading, switchBusiness };
}
