'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';
import { signOut as serverSignOut } from '@/app/actions/auth';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      console.log('[useUser] Starting to load user...');
      console.log('[useUser] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...');

      try {
        console.log('[useUser] Calling supabase.auth.getUser()...');

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('[useUser] Auth error:', authError);
          throw authError;
        }

        console.log('[useUser] User loaded:', user ? 'authenticated' : 'not authenticated');
        setUser(user);

        if (user) {
          console.log('[useUser] Loading profile for user:', user.id);
          const { data, error: profileError } = await (supabase as any)
            .from('profiles')
            .select('id, full_name, company_name, phone, avatar_url, stripe_customer_id, subscription_tier, subscription_status, subscription_period_end, content_tokens_used, content_tokens_limit, scan_credits_used, scan_credits_limit, created_at, updated_at')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('[useUser] Profile error:', profileError);
            console.error('[useUser] Full error details:', JSON.stringify(profileError, null, 2));
          }

          console.log('[useUser] Profile loaded:', data ? 'success' : 'no data');
          console.log('[useUser] Profile data:', JSON.stringify(data, null, 2));
          setProfile(data as Profile | null);
        }
      } catch (error) {
        console.error('[useUser] Error loading user:', error);
      } finally {
        console.log('[useUser] Setting loading to false');
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
  }, []); // Empty dependency array - supabase client is stable

  const signOut = async () => {
    try {
      // Call server action to properly clear server-side cookies
      await serverSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // If server action fails, try to clean up client-side and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
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
