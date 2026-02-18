import { createBrowserClient } from '@supabase/ssr';

// Module-level singleton — all hooks share one client instance and one
// token-refresh mutex, preventing concurrent refresh races.
let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
