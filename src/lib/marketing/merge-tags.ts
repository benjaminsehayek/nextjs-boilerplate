// Merge Tag Processing for Email & SMS Templates

import type { Contact } from '@/components/tools/LeadDatabase/types';

// B13-08: Escape HTML special chars in contact values to prevent injection into email HTML
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface MergeTag {
  tag: string;
  label: string;
  example: string;
}

export const AVAILABLE_TAGS: MergeTag[] = [
  { tag: '{{first_name}}', label: 'First Name', example: 'John' },
  { tag: '{{last_name}}', label: 'Last Name', example: 'Smith' },
  { tag: '{{full_name}}', label: 'Full Name', example: 'John Smith' },
  { tag: '{{company}}', label: 'Company', example: 'Acme Corp' },
  { tag: '{{email}}', label: 'Email', example: 'john@example.com' },
  { tag: '{{phone}}', label: 'Phone', example: '(503) 555-1234' },
  { tag: '{{city}}', label: 'City', example: 'Portland' },
  { tag: '{{state}}', label: 'State', example: 'OR' },
  { tag: '{{unsubscribe_url}}', label: 'Unsubscribe Link', example: '#' },
];

/**
 * Replace merge tags in a template string with contact data.
 */
export function processMergeTags(
  template: string,
  contact: Contact,
  unsubscribeUrl: string,
): string {
  const e = escapeHtml;
  return template
    .replace(/\{\{first_name\}\}/g, e(contact.firstName || ''))
    .replace(/\{\{last_name\}\}/g, e(contact.lastName || ''))
    .replace(/\{\{full_name\}\}/g, e(`${contact.firstName || ''} ${contact.lastName || ''}`.trim()))
    .replace(/\{\{company\}\}/g, e(contact.company || ''))
    .replace(/\{\{email\}\}/g, e(contact.email || ''))
    .replace(/\{\{phone\}\}/g, e(contact.phone || ''))
    .replace(/\{\{city\}\}/g, e(contact.city || ''))
    .replace(/\{\{state\}\}/g, e(contact.state || ''))
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
}

/**
 * Extract all merge tags used in a template string.
 */
export function extractMergeTags(template: string): string[] {
  const matches = template.match(/\{\{[a-z_]+\}\}/g);
  if (!matches) return [];
  return [...new Set(matches)];
}

/**
 * Generate a preview of the template with sample data.
 */
export function previewTemplate(template: string): string {
  const sampleContact: Contact = {
    id: 'preview',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    phone: '(503) 555-1234',
    company: 'Acme Corp',
    city: 'Portland',
    state: 'OR',
    source: 'direct',
    elv: 500,
    emailOptIn: true,
    smsOptIn: true,
    tags: [],
    lists: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return processMergeTags(template, sampleContact, '#unsubscribe-preview');
}
