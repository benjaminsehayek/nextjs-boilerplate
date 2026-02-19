'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signOut as serverSignOut } from '@/app/actions/auth';
import type { User } from '@supabase/supabase-js';
import type { Profile, Business } from '@/types';

const PROFILE_SELECT =
  'id, full_name, company_name, phone, avatar_url, stripe_customer_id, subscription_tier, subscription_status, subscription_period_end, content_tokens_used, content_tokens_limit, scan_credits_used, scan_credits_limit, created_at, updated_at';

const BUSINESS_SELECT =
  'id, user_id, domain, name, place_id, cid, feature_id, phone, address, city, state, zip, latitude, longitude, industry, categories, created_at, updated_at';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  business: Business | null;
  businesses: Business[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
  switchBusiness: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  business: null,
  businesses: [],
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshBusiness: async () => {},
  switchBusiness: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient(); // singleton — same instance every call

  useEffect(() => {
    // Track whether INITIAL_SESSION has been processed so we only
    // call setLoading(false) once (on the first auth event).
    let initialized = false;

    // Safety: if onAuthStateChange never fires (bad config, offline),
    // unblock the UI after 8 seconds rather than spinning forever.
    const safetyTimer = setTimeout(() => {
      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    }, 8000);

    // onAuthStateChange fires INITIAL_SESSION immediately from the local
    // session store — no server round-trip needed. Security is enforced by:
    //   • middleware (server-side getUser() for protected routes)
    //   • API routes (server-side getUser() for DataForSEO / Stripe)
    //   • Supabase RLS policies (per-user data access)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const [profileResult, businessResult] = await Promise.all([
              (supabase as any)
                .from('profiles')
                .select(PROFILE_SELECT)
                .eq('id', session.user.id)
                .single(),
              (supabase as any)
                .from('businesses')
                .select(BUSINESS_SELECT)
                .eq('user_id', session.user.id),
            ]);
            setProfile(profileResult.data as Profile | null);
            const bizList: Business[] = businessResult.data || [];
            setBusinesses(bizList);
            setBusiness(bizList[0] || null);
          } catch (error) {
            console.error('Error loading profile/business:', error);
          }
        } else {
          setProfile(null);
          setBusiness(null);
          setBusinesses([]);
        }

        // Only flip loading→false on the very first event (INITIAL_SESSION).
        // Subsequent events (TOKEN_REFRESHED, SIGNED_OUT, etc.) update state
        // but don't re-trigger the loading skeleton.
        // Clear safety timer HERE (after data loaded), not at callback start —
        // if Promise.all hangs, the safety timer still fires as a fallback.
        clearTimeout(safetyTimer);
        if (!initialized) {
          initialized = true;
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
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

  const refreshBusiness = async () => {
    if (!user) return;
    try {
      const { data } = await (supabase as any)
        .from('businesses')
        .select(BUSINESS_SELECT)
        .eq('user_id', user.id);
      const bizList: Business[] = data || [];
      setBusinesses(bizList);
      setBusiness(bizList[0] || null);
    } catch (error) {
      console.error('Error refreshing business:', error);
    }
  };

  const switchBusiness = (id: string) => {
    const found = businesses.find((b) => b.id === id);
    if (found) setBusiness(found);
  };

  return (
    <AuthContext.Provider value={{ user, profile, business, businesses, loading, signOut, refreshProfile, refreshBusiness, switchBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
