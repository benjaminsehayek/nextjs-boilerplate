// CAN-SPAM and TCPA Compliance Validation

import type { Contact } from '@/components/tools/LeadDatabase/types';
import type { Channel } from './types';

export interface ComplianceResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate email content for CAN-SPAM compliance.
 */
export function validateEmailCompliance(
  htmlBody: string,
  textBody: string,
  senderName: string | null,
  senderEmail: string | null,
): ComplianceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!senderName) errors.push('Sender name is required');
  if (!senderEmail) errors.push('Sender email is required');

  // Check for unsubscribe link
  const hasUnsubLink =
    htmlBody.includes('{{unsubscribe_url}}') ||
    htmlBody.includes('unsubscribe') ||
    textBody.includes('{{unsubscribe_url}}') ||
    textBody.includes('unsubscribe');
  if (!hasUnsubLink) {
    errors.push('Email must contain an unsubscribe link (use {{unsubscribe_url}})');
  }

  // Check content isn't empty
  if (!textBody.trim()) {
    errors.push('Email body cannot be empty');
  }

  // Warnings
  if (htmlBody && !htmlBody.includes('{{first_name}}')) {
    warnings.push('Consider personalizing with {{first_name}} for better engagement');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate SMS content for TCPA compliance.
 */
export function validateSMSCompliance(
  body: string,
): ComplianceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!body.trim()) {
    errors.push('SMS body cannot be empty');
  }

  // Check for STOP instruction
  const hasStopInstruction =
    body.toLowerCase().includes('stop') ||
    body.toLowerCase().includes('opt out') ||
    body.toLowerCase().includes('unsubscribe');
  if (!hasStopInstruction) {
    errors.push('SMS must include opt-out instructions (e.g., "Reply STOP to unsubscribe")');
  }

  // Character count warnings
  const charCount = body.length;
  if (charCount > 320) {
    errors.push(`SMS exceeds 320 characters (${charCount}). Will be split into 3+ messages.`);
  } else if (charCount > 160) {
    warnings.push(`SMS is ${charCount} characters. Will be sent as 2 messages.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Check if a contact can receive messages on the given channel.
 */
export function canSendToContact(contact: Contact, channel: Channel): boolean {
  if (channel === 'email') {
    return !!(
      contact.email &&
      contact.emailOptIn &&
      !contact.unsubscribedEmail
    );
  }
  if (channel === 'sms') {
    return !!(
      contact.phone &&
      contact.smsOptIn &&
      !contact.unsubscribedSMS
    );
  }
  return false;
}

/**
 * Filter contacts to only those eligible for the given channel.
 * Returns eligible contacts and a count of filtered-out contacts.
 */
export function filterEligibleContacts(
  contacts: Contact[],
  channel: Channel,
): { eligible: Contact[]; filtered: number; reasons: Record<string, number> } {
  const reasons: Record<string, number> = {};
  const eligible: Contact[] = [];

  for (const contact of contacts) {
    if (channel === 'email') {
      if (!contact.email) {
        reasons['No email address'] = (reasons['No email address'] || 0) + 1;
      } else if (!contact.emailOptIn) {
        reasons['Not opted in'] = (reasons['Not opted in'] || 0) + 1;
      } else if (contact.unsubscribedEmail) {
        reasons['Unsubscribed'] = (reasons['Unsubscribed'] || 0) + 1;
      } else {
        eligible.push(contact);
      }
    } else {
      if (!contact.phone) {
        reasons['No phone number'] = (reasons['No phone number'] || 0) + 1;
      } else if (!contact.smsOptIn) {
        reasons['Not opted in'] = (reasons['Not opted in'] || 0) + 1;
      } else if (contact.unsubscribedSMS) {
        reasons['Unsubscribed'] = (reasons['Unsubscribed'] || 0) + 1;
      } else {
        eligible.push(contact);
      }
    }
  }

  return {
    eligible,
    filtered: contacts.length - eligible.length,
    reasons,
  };
}
