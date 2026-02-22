// Merge Tag Processing for Email & SMS Templates

import type { Contact } from '@/components/tools/LeadDatabase/types';

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
  return template
    .replace(/\{\{first_name\}\}/g, contact.firstName || '')
    .replace(/\{\{last_name\}\}/g, contact.lastName || '')
    .replace(/\{\{full_name\}\}/g, `${contact.firstName || ''} ${contact.lastName || ''}`.trim())
    .replace(/\{\{company\}\}/g, contact.company || '')
    .replace(/\{\{email\}\}/g, contact.email || '')
    .replace(/\{\{phone\}\}/g, contact.phone || '')
    .replace(/\{\{city\}\}/g, contact.city || '')
    .replace(/\{\{state\}\}/g, contact.state || '')
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
