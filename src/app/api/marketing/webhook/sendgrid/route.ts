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

  // B14-08: Cap batch size to prevent DoS via oversized webhook payloads
  const MAX_EVENTS_PER_BATCH = 250;
  if (events.length > MAX_EVENTS_PER_BATCH) {
    console.warn(`[SendGrid webhook] Batch size ${events.length} exceeds limit — processing first ${MAX_EVENTS_PER_BATCH}`);
    events = events.slice(0, MAX_EVENTS_PER_BATCH) as SendGridEvent[];
  }

  // Track critical errors (compliance-related) that warrant a 500 so SendGrid retries
  let criticalError = false;

  // B14-15: Basic email format validation helper
  const isValidEmail = (email: unknown): email is string =>
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  for (const event of events) {
    // Extract campaign_id and contact_id from custom args
    const campaignId = event.campaign_id;
    const contactId = event.recipient_id;

    if (!campaignId) continue;
    // Skip events with no valid email when email is needed for compliance ops
    if (event.event === 'bounce' || event.event === 'spamreport') {
      if (!isValidEmail(event.email)) continue;
    }

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
      case 'delivered': {
        const { error: e1 } = await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'delivered' })
          .eq('id', recipient.id);
        if (e1) console.error('[SendGrid webhook] delivered: recipient update failed', e1.message);
        const { error: e2 } = await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_delivered',
        });
        if (e2) console.error('[SendGrid webhook] delivered: counter increment failed', e2.message);
        break;
      }

      case 'open': {
        // Only count first open
        if (recipient.status !== 'opened' && recipient.status !== 'clicked') {
          const { error: e1 } = await (supabase as any)
            .from('campaign_recipients')
            .update({ status: 'opened', opened_at: now })
            .eq('id', recipient.id);
          if (e1) console.error('[SendGrid webhook] open: recipient update failed', e1.message);
          const { error: e2 } = await (supabase as any).rpc('increment_campaign_counter', {
            p_campaign_id: campaignId,
            p_field: 'total_opened',
          });
          if (e2) console.error('[SendGrid webhook] open: counter increment failed', e2.message);
        }
        break;
      }

      case 'click': {
        const { error: e1 } = await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'clicked', clicked_at: now })
          .eq('id', recipient.id);
        if (e1) console.error('[SendGrid webhook] click: recipient update failed', e1.message);
        const { error: e2 } = await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_clicked',
        });
        if (e2) console.error('[SendGrid webhook] click: counter increment failed', e2.message);
        // Log link click
        if (event.url) {
          const { error: e3 } = await (supabase as any).from('campaign_link_clicks').insert({
            campaign_id: campaignId,
            recipient_id: recipient.id,
            url: event.url,
          });
          if (e3) console.error('[SendGrid webhook] click: link click log failed', e3.message);
        }
        break;
      }

      case 'bounce': {
        const { error: e1 } = await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'bounced', error_message: event.reason })
          .eq('id', recipient.id);
        if (e1) console.error('[SendGrid webhook] bounce: recipient update failed', e1.message);
        const { error: e2 } = await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_bounced',
        });
        if (e2) console.error('[SendGrid webhook] bounce: counter increment failed', e2.message);
        // Only hard bounces permanently opt-out contacts; soft bounces are transient (mailbox full, etc.)
        // B14-01: Use contactId (validated via campaign_recipients) not event.email to prevent cross-tenant update
        if (event.type === 'hard' && contactId) {
          const { error: e3 } = await (supabase as any)
            .from('contacts')
            .update({ opted_email: false })
            .eq('id', contactId);
          if (e3) {
            console.error('[SendGrid webhook] bounce: contact opt-out update failed', e3.message);
            criticalError = true;
          }
        }
        break;
      }

      case 'spamreport': {
        const { error: e1 } = await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'unsubscribed' })
          .eq('id', recipient.id);
        if (e1) console.error('[SendGrid webhook] spamreport: recipient update failed', e1.message);
        const { error: e2 } = await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_unsubscribed',
        });
        if (e2) console.error('[SendGrid webhook] spamreport: counter increment failed', e2.message);
        // Spam report: mark contact as opted out and unsubscribed (compliance-critical)
        // B14-01: Use contactId (validated via campaign_recipients) not event.email to prevent cross-tenant update
        if (contactId) {
          const { error: e3 } = await (supabase as any)
            .from('contacts')
            .update({ opted_email: false, unsub_email: true })
            .eq('id', contactId);
          if (e3) {
            console.error('[SendGrid webhook] spamreport: contact compliance update failed', e3.message);
            criticalError = true;
          }
        }
        if (contactId) {
          const { error: e4 } = await (supabase as any).from('unsubscribe_log').insert({
            contact_id: contactId,
            campaign_id: campaignId,
            channel: 'email',
            reason: 'spam_report',
          });
          if (e4) {
            console.error('[SendGrid webhook] spamreport: unsubscribe log insert failed', e4.message);
            criticalError = true;
          }
        }
        break;
      }

      case 'group_unsubscribe':
      case 'unsubscribe': {
        const { error: e1 } = await (supabase as any)
          .from('campaign_recipients')
          .update({ status: 'unsubscribed' })
          .eq('id', recipient.id);
        if (e1) console.error('[SendGrid webhook] unsubscribe: recipient update failed', e1.message);
        const { error: e2 } = await (supabase as any).rpc('increment_campaign_counter', {
          p_campaign_id: campaignId,
          p_field: 'total_unsubscribed',
        });
        if (e2) console.error('[SendGrid webhook] unsubscribe: counter increment failed', e2.message);
        // Mark contact as unsubscribed (compliance-critical)
        if (contactId) {
          const { error: e3 } = await (supabase as any)
            .from('contacts')
            .update({ unsub_email: true })
            .eq('id', contactId);
          if (e3) {
            console.error('[SendGrid webhook] unsubscribe: contact unsub update failed', e3.message);
            criticalError = true;
          }
          // Log unsubscribe (compliance-critical)
          const { error: e4 } = await (supabase as any).from('unsubscribe_log').insert({
            contact_id: contactId,
            campaign_id: campaignId,
            channel: 'email',
            reason: 'unsubscribe',
          });
          if (e4) {
            console.error('[SendGrid webhook] unsubscribe: unsubscribe log insert failed', e4.message);
            criticalError = true;
          }
        }
        break;
      }

      case 'deferred':
        // Deferred delivery — log only, no DB change needed
        console.log(`[SendGrid] Deferred: ${event.email}, campaign: ${campaignId}, reason: ${event.reason}`);
        break;
    }
  }

  // Return 500 on compliance-critical failures so SendGrid retries the batch
  if (criticalError) {
    return new NextResponse('DB update failed for compliance-critical event', { status: 500 });
  }

  return new NextResponse('OK');
}
