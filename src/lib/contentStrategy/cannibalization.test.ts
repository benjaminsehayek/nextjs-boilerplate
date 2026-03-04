import { describe, it, expect } from 'vitest';
import { detectCannibalization } from './cannibalization';
import type { CrawledPage } from './contentMap';

// Helpers
function makePage(url: string, title: string, h1: string = ''): CrawledPage {
  return { url, path: url, title, h1, desc: '', wordCount: 500, internalLinks: 5, type: 'service' };
}

describe('detectCannibalization', () => {
  it('returns empty array when no keywords are provided', () => {
    const result = detectCannibalization([], [makePage('/a', 'Plumber')]);
    expect(result).toEqual([]);
  });

  it('returns empty array when crawled pages list is empty', () => {
    const kws = [{ keyword: 'plumber austin', searchVolume: 500, assignedPage: null }];
    const result = detectCannibalization(kws, []);
    expect(result).toEqual([]);
  });

  it('detects high severity when 3+ pages target the same keyword', () => {
    const kws = [{ keyword: 'plumber austin', searchVolume: 800, assignedPage: null }];
    const pages = [
      makePage('/plumber-austin', 'Plumber Austin TX'),
      makePage('/austin-plumber', 'Austin Plumber Services'),
      makePage('/plumbing-austin-tx', 'Plumbing Austin TX'),
    ];
    const result = detectCannibalization(kws, pages);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe('high');
    expect(result[0].keyword).toBe('plumber austin');
    expect(result[0].competingPages.length).toBe(3);
  });

  it('detects medium severity when exactly 2 pages target the same keyword', () => {
    const kws = [{ keyword: 'hvac repair', searchVolume: 400, assignedPage: null }];
    const pages = [
      makePage('/hvac-repair', 'HVAC Repair Services'),
      makePage('/heating-repair', 'HVAC Repair and Heating'),
    ];
    const result = detectCannibalization(kws, pages);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe('medium');
    expect(result[0].competingPages.length).toBe(2);
  });

  it('does not flag pages that have no keyword overlap', () => {
    const kws = [{ keyword: 'roofing contractor', searchVolume: 600, assignedPage: null }];
    const pages = [
      makePage('/plumbing', 'Plumbing Services'),
      makePage('/electrician', 'Electrician Services'),
    ];
    const result = detectCannibalization(kws, pages);
    expect(result).toEqual([]);
  });

  it('treats duplicate keyword entries (same text) as a single keyword group', () => {
    const kws = [
      { keyword: 'plumber austin', searchVolume: 300, assignedPage: '/a' },
      { keyword: 'plumber austin', searchVolume: 300, assignedPage: '/b' },
    ];
    // Only 1 page — should not produce an issue (needs 2+ matching pages)
    const pages = [makePage('/plumber-austin', 'Plumber Austin TX')];
    const result = detectCannibalization(kws, pages);
    expect(result).toEqual([]);
  });

  it('sorts results with high severity before medium', () => {
    const kws = [
      { keyword: 'roofing repair', searchVolume: 200, assignedPage: null },
      { keyword: 'roof installation', searchVolume: 900, assignedPage: null },
    ];
    const pages = [
      makePage('/roofing-repair-1', 'Roofing Repair Experts'),
      makePage('/roofing-repair-2', 'Roofing Repair Services'),
      makePage('/roofing-repair-3', 'Roofing Repair Contractors'),
      makePage('/roof-installation-a', 'Roof Installation Services'),
      makePage('/roof-installation-b', 'Roof Installation Experts'),
    ];
    const result = detectCannibalization(kws, pages);
    expect(result[0].severity).toBe('high');
    expect(result[1].severity).toBe('medium');
  });
});
