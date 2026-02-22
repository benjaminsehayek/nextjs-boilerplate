'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signOut as serverSignOut } from '@/app/actions/auth';
import type { User } from '@supabase/supabase-js';
import type { Profile, Business } from '@/types';

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

// ---------------------------------------------------------------------------
// Authenticated fetch helpers
// These use the Supabase REST API with an explicit Authorization header rather
// than relying on @supabase/ssr's cookie session state. Large JWTs are chunked
// across multiple cookies and can fail to reassemble, causing queries to go out
// unauthenticated → RLS blocks them → 0 rows → null profile → free-tier UI.
// ---------------------------------------------------------------------------
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function restFetch(path: string, jwt: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: SUPABASE_ANON,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase REST ${res.status}: ${body}`);
  }
  return res.json();
}

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
  // Holds the latest access_token so refreshProfile() can use it without
  // calling getSession() (which would be an extra round-trip).
  const accessTokenRef = useRef<string | null>(null);

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
          // Keep the latest JWT available for refreshProfile()
          accessTokenRef.current = session.access_token ?? null;

          // If SIGNED_IN fires after a null INITIAL_SESSION (i.e., the user
          // just logged in from the login page), re-enter loading while we
          // fetch the profile — otherwise the dashboard renders with
          // profile=null (free tier) for ~150ms before the fetch completes.
          if (initialized && _event === 'SIGNED_IN') {
            setLoading(true);
          }

          try {
            const jwt = session.access_token as string;
            const uid = session.user.id as string;

            const [profileArr, bizArr] = await Promise.all([
              restFetch(`profiles?id=eq.${uid}&select=*&limit=1`, jwt),
              restFetch(`businesses?user_id=eq.${uid}&select=*`, jwt),
            ]);

            const profileData = (profileArr[0] as Profile) ?? null;
            const bizList: Business[] = Array.isArray(bizArr) ? bizArr : [];

            setProfile(profileData);
            setBusinesses(bizList);
            setBusiness(bizList[0] || null);
          } catch (error) {
            console.error('Error loading profile/business:', error);
          }
        } else {
          accessTokenRef.current = null;
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
  // refreshProfile is stable (only uses refs + user state)
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
    const jwt = accessTokenRef.current;
    if (!jwt) return;
    try {
      const profileArr = await restFetch(
        `profiles?id=eq.${user.id}&select=*&limit=1`,
        jwt
      );
      setProfile((profileArr[0] as Profile) ?? null);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const refreshBusiness = async () => {
    if (!user) return;
    const jwt = accessTokenRef.current;
    if (!jwt) return;
    try {
      const bizArr = await restFetch(
        `businesses?user_id=eq.${user.id}&select=*`,
        jwt
      );
      const bizList: Business[] = Array.isArray(bizArr) ? bizArr : [];
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
