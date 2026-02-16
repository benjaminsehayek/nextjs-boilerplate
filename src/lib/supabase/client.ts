import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[Supabase Client] Missing environment variables!');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? 'defined' : 'MISSING');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'defined' : 'MISSING');
    throw new Error('Supabase environment variables are not defined');
  }

  console.log('[Supabase Client] Creating client with URL:', url.substring(0, 20) + '...');

  return createBrowserClient(url, key);
}
