'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';
import { signOut as serverSignOut } from '@/app/actions/auth';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data } = await (supabase as any)
            .from('profiles')
            .select('id, full_name, company_name, phone, avatar_url, stripe_customer_id, subscription_tier, subscription_status, subscription_period_end, content_tokens_used, content_tokens_limit, scan_credits_used, scan_credits_limit, created_at, updated_at')
            .eq('id', user.id)
            .single();
          setProfile(data as Profile | null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await (supabase as any)
            .from('profiles')
            .select('id, full_name, company_name, phone, avatar_url, stripe_customer_id, subscription_tier, subscription_status, subscription_period_end, content_tokens_used, content_tokens_limit, scan_credits_used, scan_credits_limit, created_at, updated_at')
            .eq('id', session.user.id)
            .single();
          setProfile(data as Profile | null);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await serverSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, company_name, phone, avatar_url, stripe_customer_id, subscription_tier, subscription_status, subscription_period_end, content_tokens_used, content_tokens_limit, scan_credits_used, scan_credits_limit, created_at, updated_at')
        .eq('id', user.id)
        .single();
      setProfile(data as Profile | null);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return { user, profile, loading, signOut, refreshProfile };
}
