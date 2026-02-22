// HMAC-signed Unsubscribe Token System
// Generates secure, stateless tokens for one-click email/SMS unsubscribe

import { createHmac } from 'crypto';

const SEPARATOR = '.';

/**
 * Generate an HMAC-SHA256 signed unsubscribe token.
 * Token format: base64(contactId:campaignId:channel).base64(signature)
 */
export function generateUnsubscribeToken(
  contactId: string,
  campaignId: string,
  channel: 'email' | 'sms',
): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET not configured');

  const payload = `${contactId}:${campaignId}:${channel}`;
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${encodedPayload}${SEPARATOR}${signature}`;
}

/**
 * Verify and decode an unsubscribe token.
 * Returns the decoded data or null if invalid.
 */
export function verifyUnsubscribeToken(
  token: string,
): { contactId: string; campaignId: string; channel: 'email' | 'sms' } | null {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;

  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;

  const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  const segments = payload.split(':');
  if (segments.length !== 3) return null;

  const [contactId, campaignId, channel] = segments;
  if (channel !== 'email' && channel !== 'sms') return null;

  return { contactId, campaignId, channel };
}

/**
 * Generate a full unsubscribe URL for embedding in emails/SMS.
 */
export function generateUnsubscribeUrl(
  contactId: string,
  campaignId: string,
  channel: 'email' | 'sms',
): string {
  const token = generateUnsubscribeToken(contactId, campaignId, channel);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
}
