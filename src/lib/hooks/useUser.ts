'use client';

// useUser is now a thin wrapper around AuthContext.
// All auth state (getUser, onAuthStateChange, profile) lives in a single
// AuthProvider at the root — one network call, one listener, for the whole app.
import { useAuth } from '@/lib/context/AuthContext';

export function useUser() {
  return useAuth();
}
