import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/marketing/unsubscribe';

// Service role client — resubscribe is a public endpoint (no user auth required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
);

/**
 * POST /api/marketing/resubscribe
 * Public endpoint — requires a valid unsubscribe token to prevent cross-tenant abuse.
 * Body: { token: string } — same HMAC token used for unsubscribe, scopes to specific contact.
 */
export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { token } = body;

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const decoded = verifyUnsubscribeToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  const { contactId, channel } = decoded;
  const updateField = channel === 'email' ? 'unsub_email' : 'unsub_sms';

  // Update by contact id (not by email) to prevent cross-tenant scope
  const { error: updateError } = await (supabase as any)
    .from('contacts')
    .update({ [updateField]: false })
    .eq('id', contactId);

  if (updateError) {
    console.error('[resubscribe] DB error:', updateError);
    return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
