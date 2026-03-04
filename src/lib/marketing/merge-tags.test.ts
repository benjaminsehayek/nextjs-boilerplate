import { describe, it, expect } from 'vitest';
import { processMergeTags, extractMergeTags, AVAILABLE_TAGS } from './merge-tags';
import type { Contact } from '@/components/tools/LeadDatabase/types';

// Minimal contact fixture
function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'test-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '(503) 555-0100',
    company: 'Test Co',
    city: 'Portland',
    state: 'OR',
    source: 'direct',
    elv: 0,
    emailOptIn: true,
    smsOptIn: false,
    tags: [],
    lists: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('processMergeTags', () => {
  it('replaces {{first_name}} with contact firstName', () => {
    const result = processMergeTags('Hello {{first_name}}!', makeContact(), '#');
    expect(result).toBe('Hello Jane!');
  });

  it('replaces {{last_name}} with contact lastName', () => {
    const result = processMergeTags('Dear {{last_name}}', makeContact(), '#');
    expect(result).toBe('Dear Doe');
  });

  it('replaces {{full_name}} with trimmed firstName + lastName', () => {
    const result = processMergeTags('Hi {{full_name}}', makeContact(), '#');
    expect(result).toBe('Hi Jane Doe');
  });

  it('replaces {{company}} with contact company', () => {
    const result = processMergeTags('From {{company}}', makeContact(), '#');
    expect(result).toBe('From Test Co');
  });

  it('replaces {{email}} with contact email', () => {
    const result = processMergeTags('Email: {{email}}', makeContact(), '#');
    expect(result).toBe('Email: jane@example.com');
  });

  it('replaces {{unsubscribe_url}} with the provided URL', () => {
    const result = processMergeTags(
      'Click {{unsubscribe_url}} to opt out',
      makeContact(),
      'https://example.com/unsub'
    );
    expect(result).toBe('Click https://example.com/unsub to opt out');
  });

  it('replaces a missing (empty) contact field with an empty string', () => {
    const contact = makeContact({ company: '' });
    const result = processMergeTags('Company: {{company}}', contact, '#');
    expect(result).toBe('Company: ');
  });

  it('replaces all occurrences of the same tag', () => {
    const result = processMergeTags('{{first_name}} {{first_name}}', makeContact(), '#');
    expect(result).toBe('Jane Jane');
  });

  it('leaves plain text without merge tags unchanged', () => {
    const result = processMergeTags('No tags here', makeContact(), '#');
    expect(result).toBe('No tags here');
  });

  it('handles a template with multiple different tags', () => {
    const result = processMergeTags(
      'Hi {{first_name}}, welcome to {{company}} in {{city}}, {{state}}.',
      makeContact(),
      '#'
    );
    expect(result).toBe('Hi Jane, welcome to Test Co in Portland, OR.');
  });
});

describe('extractMergeTags', () => {
  it('returns an empty array for a template with no tags', () => {
    expect(extractMergeTags('Hello world')).toEqual([]);
  });

  it('returns unique tags used in the template', () => {
    const tags = extractMergeTags('{{first_name}} and {{first_name}} and {{email}}');
    expect(tags).toHaveLength(2);
    expect(tags).toContain('{{first_name}}');
    expect(tags).toContain('{{email}}');
  });

  it('returns all distinct tags in a full template', () => {
    const template = 'Hi {{first_name}} {{last_name}}, contact {{email}} or visit {{city}}.';
    const tags = extractMergeTags(template);
    expect(tags).toContain('{{first_name}}');
    expect(tags).toContain('{{last_name}}');
    expect(tags).toContain('{{email}}');
    expect(tags).toContain('{{city}}');
  });
});

describe('AVAILABLE_TAGS', () => {
  it('includes {{first_name}} tag', () => {
    const found = AVAILABLE_TAGS.find(t => t.tag === '{{first_name}}');
    expect(found).toBeDefined();
  });

  it('every tag has a non-empty label and example', () => {
    for (const t of AVAILABLE_TAGS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.example.length).toBeGreaterThan(0);
    }
  });
});
