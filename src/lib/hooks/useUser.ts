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

        // Add timeout to prevent indefinite hanging
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout after 5 seconds')), 5000)
        );

        const { data: { user }, error: authError } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any;

        if (authError) {
          console.error('[useUser] Auth error:', authError);
          throw authError;
        }

        console.log('[useUser] User loaded:', user ? 'authenticated' : 'not authenticated');
        setUser(user);

        if (user) {
          console.log('[useUser] Loading profile for user:', user.id);
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('[useUser] Profile error:', profileError);
          }

          console.log('[useUser] Profile loaded:', data ? 'success' : 'no data');
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
          const { data } = await supabase
            .from('profiles')
            .select('*')
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data as Profile | null);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return { user, profile, loading, signOut, refreshProfile };
}
