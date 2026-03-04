'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface GSCConnection {
  id: string;
  connected: boolean;
  account_id: string | null;
  account_name: string | null;
  last_sync: string | null;
  expires_at: string | null;
}

export function useGSCConnection(businessId: string | undefined) {
  const [connection, setConnection] = useState<GSCConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConnection = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from('platform_connections')
        .select('id, connected, account_id, account_name, last_sync, expires_at')
        .eq('business_id', businessId)
        .eq('platform', 'search_console')
        .maybeSingle();
      setConnection(data ?? null);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { fetchConnection(); }, [fetchConnection]);

  const connect = useCallback(() => {
    if (!businessId) return;
    window.location.href = `/api/auth/gsc/authorize?businessId=${encodeURIComponent(businessId)}`;
  }, [businessId]);

  const disconnect = useCallback(async () => {
    if (!businessId) return;
    await fetch('/api/auth/gsc/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    });
    setConnection(null);
  }, [businessId]);

  return { connection, loading, connect, disconnect, refetch: fetchConnection };
}
