import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createVerify } from 'crypto';
import type { SendGridEvent } from '@/lib/marketing/types';

// Service role client — webhooks are server-to-server, no user auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
);

/**
 * Verify SendGrid webhook signature.
 */
function verifySignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  try {
    const timestampedPayload = timestamp + payload;
    const verifier = createVerify('SHA256');
    verifier.update(timestampedPayload);
    return verifier.verify(
      `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
      signature,
      'base64',
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Verify webhook signature if key is configured
  const signingKey = process.env.SENDGRID_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const signature = request.headers.get('x-twilio-email-event-webhook-signature') || '';
    const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp') || '';
    if (!verifySignature(signingKey, body, signature, timestamp)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }
  }

  let events: SendGridEvent[];
  try {
    events = JSON.parse(body);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  if (!Array.isArray(events)) {
    return new NextResponse('Expected array', { status: 400 });
  }

  for (const event of events) {
    // Extract campaign_id and contact_id from custom args
    const campaignId = event.campaign_id;
    const contactId = event.recipient_id;

    if (!campaignId) continue;

    // Find the recipient record
    let recipientQuery = (supabase as any)
      .from('campaign_recipients')
      .select('id, status')
      .eq('campaign_id', campaignId);

    if (contactId) {
      recipientQuery = recipientQuery.eq('contact_id', contactId);
    }

    const { data: recipients } = await recipientQuery;
    const recipient = recipients?.[0];
    if (!recipient) continue;

    const now = new Date().toISOString();

    switch (event.event) {
      case 'delivered':
        await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'delivered' })
          .eq('id', recipient.id);
        await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_delivered',
        });
        break;

      case 'open':
        // Only count first open
        if (recipient.status !== 'opened' && recipient.status !== 'clicked') {
          await (supabase as any)
            .from('campaign_recipients')
            .update({ status: 'opened', opened_at: now })
            .eq('id', recipient.id);
          await (supabase as any).rpc('increment_campaign_counter', {
            p_campaign_id: campaignId,
            p_field: 'total_opened',
          });
        }
        break;

      case 'click':
        await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'clicked', clicked_at: now })
          .eq('id', recipient.id);
        await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_clicked',
        });
        // Log link click
        if (event.url) {
          await (supabase as any).from('campaign_link_clicks').insert({
            campaign_id: campaignId,
            recipient_id: recipient.id,
            url: event.url,
          });
        }
        break;

      case 'bounce':
        await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'bounced', error_message: event.reason })
          .eq('id', recipient.id);
        await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_bounced',
        });
        break;

      case 'spamreport':
      case 'unsubscribe':
        await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'unsubscribed' })
          .eq('id', recipient.id);
        await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_unsubscribed',
        });
        // Mark contact as unsubscribed
        if (contactId) {
          await (supabase as any)
            .from('contacts')
            .update({ unsubscribed_email: true })
            .eq('id', contactId);
          // Log unsubscribe
          await (supabase as any).from('unsubscribe_log').insert({
            contact_id: contactId,
            campaign_id: campaignId,
            channel: 'email',
            reason: event.event === 'spamreport' ? 'spam_report' : 'unsubscribe',
          });
        }
        break;
    }
  }

  return new NextResponse('OK');
}
