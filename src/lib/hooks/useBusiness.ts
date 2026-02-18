'use client';

// useBusiness is now a thin wrapper around AuthContext.
// Business data (along with profile) is loaded once in AuthProvider at the root,
// eliminating per-page redundant fetches and loading race conditions.
import { useAuth } from '@/lib/context/AuthContext';

// _userId is accepted for backward compatibility but is no longer used —
// business data is read from the shared auth context.
export function useBusiness(_userId?: string) {
  const { business, businesses, loading, switchBusiness, refreshBusiness } = useAuth();
  return { business, businesses, loading, switchBusiness, refreshBusiness };
}
