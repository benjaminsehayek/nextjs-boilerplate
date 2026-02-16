'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
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
    console.log('Sign out initiated...');
    try {
      console.log('Calling supabase.auth.signOut()');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }

      console.log('Sign out successful, clearing state');
      setUser(null);
      setProfile(null);

      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();

      console.log('Redirecting to home page');
      // Force a hard reload to clear all state
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload anyway to clear state
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  return { user, profile, loading, signOut };
}
