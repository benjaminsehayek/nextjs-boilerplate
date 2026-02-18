'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signOut as serverSignOut } from '@/app/actions/auth';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

const PROFILE_SELECT =
  'id, full_name, company_name, phone, avatar_url, stripe_customer_id, subscription_tier, subscription_status, subscription_period_end, content_tokens_used, content_tokens_limit, scan_credits_used, scan_credits_limit, created_at, updated_at';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient(); // singleton — same instance every call

  useEffect(() => {
    // One-time load: verify session with Supabase auth server
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          const { data } = await (supabase as any)
            .from('profiles')
            .select(PROFILE_SELECT)
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

    // One listener for the entire app — handles token refresh, sign-in, sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await (supabase as any)
            .from('profiles')
            .select(PROFILE_SELECT)
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
        .select(PROFILE_SELECT)
        .eq('id', user.id)
        .single();
      setProfile(data as Profile | null);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
