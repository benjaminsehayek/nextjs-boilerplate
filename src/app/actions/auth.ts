'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createClient();

  // Sign out server-side (this clears the cookies properly)
  await supabase.auth.signOut();

  // Revalidate all paths to clear cached data
  revalidatePath('/', 'layout');

  // Redirect to landing/login page
  redirect('/');
}
