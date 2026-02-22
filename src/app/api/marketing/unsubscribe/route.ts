import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/marketing/unsubscribe';

// Service role client — unsubscribe is a public endpoint (no user auth)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
);

/**
 * GET /api/marketing/unsubscribe?token=xxx
 * Public endpoint — no auth required.
 * Verifies HMAC token and unsubscribes the contact.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(renderPage('error', 'Invalid unsubscribe link.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const decoded = verifyUnsubscribeToken(token);
  if (!decoded) {
    return new NextResponse(renderPage('error', 'This unsubscribe link is invalid or has expired.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const { contactId, campaignId, channel } = decoded;

  // Update contact unsubscribe status
  const updateField = channel === 'email' ? 'unsubscribed_email' : 'unsubscribed_sms';
  await (supabase as any)
    .from('contacts')
    .update({ [updateField]: true })
    .eq('id', contactId);

  // Log the unsubscribe
  await (supabase as any).from('unsubscribe_log').insert({
    contact_id: contactId,
    campaign_id: campaignId,
    channel,
    reason: 'one_click_unsubscribe',
  });

  // Update campaign recipient status if applicable
  if (campaignId) {
    await (supabase as any)
      .from('campaign_recipients')
      .update({ status: 'unsubscribed' })
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId);
  }

  return new NextResponse(
    renderPage('success', `You have been unsubscribed from ${channel} messages. You will no longer receive these communications.`),
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    },
  );
}

/**
 * POST /api/marketing/unsubscribe — RFC 8058 List-Unsubscribe-Post
 */
export async function POST(request: NextRequest) {
  // For RFC 8058 one-click, the token comes in the URL
  return GET(request);
}

function renderPage(type: 'success' | 'error', message: string): string {
  const title = type === 'success' ? 'Unsubscribed' : 'Error';
  const color = type === 'success' ? '#22c55e' : '#ef4444';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ScorchLocal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #111; color: #e5e5e5; }
    .card { max-width: 400px; padding: 2rem; text-align: center; background: #1a1a1a; border-radius: 12px; border: 1px solid #333; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { color: ${color}; margin: 0 0 0.5rem; font-size: 1.5rem; }
    p { color: #999; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${type === 'success' ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
