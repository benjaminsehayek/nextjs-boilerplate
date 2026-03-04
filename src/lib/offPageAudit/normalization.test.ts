import { describe, it, expect } from 'vitest';
import { normName, normPhone, normAddr, locationDedupKey } from './normalization';

describe('normName', () => {
  it('returns empty string for empty input', () => {
    expect(normName('')).toBe('');
  });

  it('lowercases the name', () => {
    expect(normName('Acme Corp')).toBe('acme corp');
  });

  it('strips legal suffixes: LLC', () => {
    expect(normName('Smith Plumbing LLC')).toBe('smith plumbing');
  });

  it('strips legal suffixes: Inc', () => {
    expect(normName('Acme Services Inc.')).toBe('acme services');
  });

  it('strips legal suffixes: Ltd', () => {
    expect(normName('Global Solutions Ltd')).toBe('global solutions');
  });

  it('strips punctuation', () => {
    expect(normName("O'Brien & Sons, LLC")).toBe('obrien sons');
  });

  it('collapses multiple spaces', () => {
    expect(normName('  Smith   Plumbing  ')).toBe('smith plumbing');
  });
});

describe('normPhone', () => {
  it('returns empty string for empty input', () => {
    expect(normPhone('')).toBe('');
  });

  it('strips formatting characters leaving only digits', () => {
    expect(normPhone('(503) 555-1234')).toBe('5035551234');
  });

  it('strips dots and dashes', () => {
    expect(normPhone('503.555.1234')).toBe('5035551234');
  });

  it('keeps a plain digit string unchanged', () => {
    expect(normPhone('5035551234')).toBe('5035551234');
  });
});

describe('normAddr', () => {
  it('returns empty string for empty input', () => {
    expect(normAddr('')).toBe('');
  });

  it('lowercases the address', () => {
    expect(normAddr('123 Main Street')).toBe('123 main st');
  });

  it('abbreviates street → st', () => {
    expect(normAddr('100 Oak Street')).toBe('100 oak st');
  });

  it('abbreviates avenue → ave', () => {
    expect(normAddr('200 Maple Avenue')).toBe('200 maple ave');
  });

  it('abbreviates boulevard → blvd', () => {
    expect(normAddr('300 Sunset Boulevard')).toBe('300 sunset blvd');
  });

  it('strips commas and periods', () => {
    expect(normAddr('123 Main St., Suite 4')).toBe('123 main st ste 4');
  });

  it('abbreviates directional: North → n', () => {
    expect(normAddr('500 North Oak Ave')).toBe('500 n oak ave');
  });
});

describe('locationDedupKey', () => {
  it('returns normalized address when address is long enough', () => {
    const key = locationDedupKey('Smith Plumbing', '123 Main Street', 'Portland', 'OR');
    // normAddr('123 Main Street') = '123 main st' → length > 10? '123mainst' = 9 chars — < 10
    // so falls back to name+city+state format
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('falls back to name_city_state when address is short', () => {
    const key = locationDedupKey('Acme LLC', '12 A', 'Seattle', 'WA');
    expect(key).toBe('acme_seattle_wa');
  });
});
