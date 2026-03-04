// POST /api/user/delete
// Body: { confirmEmail: string }
// Auth required. Permanently deletes all user data.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { apiError } from '@/lib/apiError';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  // 1. Auth check (server-side getUser)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* headers already sent */ }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return apiError('Unauthorized', 401, undefined, { 'X-Request-ID': requestId });
  }

  // 2. Parse and validate body
  let body: { confirmEmail?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400, undefined, { 'X-Request-ID': requestId });
  }

  const { confirmEmail } = body;
  if (!confirmEmail || confirmEmail.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
    return apiError('Email confirmation does not match', 400, undefined, { 'X-Request-ID': requestId });
  }

  // Use service role client for privileged operations
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() { /* no-op */ },
      },
    }
  );

  try {
    // 3. Find user's business IDs
    const { data: businesses } = await (serviceClient as any)
      .from('businesses')
      .select('id')
      .eq('user_id', user.id);

    const businessIds: string[] = (businesses || []).map((b: any) => b.id);

    // 4. Soft-delete contacts for all businesses
    if (businessIds.length > 0) {
      await (serviceClient as any)
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .in('business_id', businessIds);
    }

    // 5. Hard-delete businesses (cascades content_strategies, site_audits,
    //    off_page_audits, grid_scans, campaigns via DB cascade constraints)
    if (businessIds.length > 0) {
      await (serviceClient as any)
        .from('businesses')
        .delete()
        .eq('user_id', user.id);
    }

    // 6. Delete profile
    await (serviceClient as any)
      .from('profiles')
      .delete()
      .eq('user_id', user.id);

    // 7. Delete Supabase auth user (service role required)
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error(`[user/delete][${requestId}] Auth delete failed:`, deleteAuthError.message);
      // Non-fatal — data already deleted; auth cleanup may be retried
    }

    return NextResponse.json({ success: true }, { headers: { 'X-Request-ID': requestId } });
  } catch (err: any) {
    console.error(`[user/delete][${requestId}]`, err);
    return apiError('Account deletion failed. Please try again.', 500, undefined, { 'X-Request-ID': requestId });
  }
}
