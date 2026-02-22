'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signOut as serverSignOut } from '@/app/actions/auth';
import type { User } from '@supabase/supabase-js';
import type { Profile, Business } from '@/types';

const PROFILE_SELECT = '*';

const BUSINESS_SELECT = '*';

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
  // Prevents the safety-net effect from re-retrying on every render after a failure.
  // Reset to false on sign-out so the next sign-in gets a fresh retry budget.
  const profileRetried = useRef(false);

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
          // If SIGNED_IN fires after a null INITIAL_SESSION (i.e., the user
          // just logged in from the login page), re-enter loading while we
          // fetch the profile — otherwise the dashboard renders with
          // profile=null (free tier) for ~150ms before the fetch completes.
          if (initialized && _event === 'SIGNED_IN') {
            setLoading(true);
          }
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

            // If the profile query failed (e.g. session not yet fully set in the
            // @supabase/ssr client, or a transient DB cold-start), retry once
            // after a short delay rather than silently falling back to free tier.
            let profileData = profileResult.data as Profile | null;
            if (profileResult.error || !profileData) {
              console.warn('Profile fetch failed, retrying in 500ms:', profileResult.error);
              await new Promise(r => setTimeout(r, 500));
              const retry = await (supabase as any)
                .from('profiles')
                .select(PROFILE_SELECT)
                .eq('id', session.user.id)
                .single();
              if (retry.error) console.error('Profile retry failed:', retry.error);
              else profileData = retry.data as Profile;
            }

            if (businessResult.error) console.error('Business query error:', businessResult.error);
            setProfile(profileData);
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
          profileRetried.current = false; // allow retry on next sign-in
        }

        // Clear safety timer HERE (after data loaded), not at callback start —
        // if Promise.all hangs, the safety timer still fires as a fallback.
        clearTimeout(safetyTimer);
        if (!initialized) {
          // First auth event: flip loading→false unconditionally.
          initialized = true;
          setLoading(false);
        } else if (_event === 'SIGNED_IN') {
          // SIGNED_IN after a null INITIAL_SESSION: we re-entered loading above,
          // so we need to exit it now that the profile is loaded.
          setLoading(false);
        }
        // TOKEN_REFRESHED / SIGNED_OUT / USER_UPDATED: state updated silently,
        // no loading state change needed.
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // Safety net: if auth finished loading but we have a user with no profile,
  // the initial fetch silently failed — try once more automatically.
  useEffect(() => {
    if (!loading && user && !profile && !profileRetried.current) {
      profileRetried.current = true;
      refreshProfile();
    }
  // refreshProfile is stable (only uses supabase singleton + user state)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile]);

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
      const { data, error } = await (supabase as any)
        .from('businesses')
        .select(BUSINESS_SELECT)
        .eq('user_id', user.id);
      if (error) console.error('refreshBusiness query error:', error);
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
