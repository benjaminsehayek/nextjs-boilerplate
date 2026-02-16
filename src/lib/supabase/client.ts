import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  // Return existing client if already created (singleton pattern)
  if (client) {
    console.log('[Supabase Client] Returning existing client');
    return client;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[Supabase Client] Missing environment variables!');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? 'defined' : 'MISSING');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'defined' : 'MISSING');
    throw new Error('Supabase environment variables are not defined');
  }

  console.log('[Supabase Client] Creating NEW client with URL:', url.substring(0, 20) + '...');

  // Use standard createClient instead of createBrowserClient from @supabase/ssr
  client = createSupabaseClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  console.log('[Supabase Client] Client created successfully');
  return client;
}
