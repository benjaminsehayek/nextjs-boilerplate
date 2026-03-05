// Publish Checklist — pre-publish validation gate
// Runs server-side before status can be set to 'published'.

import type { SitePage, ChecklistItem, ChecklistResult } from '@/types';

// ── Individual check functions ──────────────────────────────────────────────

function checkMetaTitle(page: Partial<SitePage>): ChecklistItem {
  const title = page.meta_title?.trim();
  if (!title) {
    return { label: 'Meta title', passed: false, blocking: true, detail: 'Meta title is missing' };
  }
  if (title.length > 60) {
    return {
      label: 'Meta title',
      passed: false,
      blocking: true,
      detail: `Meta title is ${title.length} chars (max 60)`,
    };
  }
  return { label: 'Meta title', passed: true, blocking: true };
}

function checkMetaDescription(page: Partial<SitePage>): ChecklistItem {
  const desc = page.meta_description?.trim();
  if (!desc) {
    return { label: 'Meta description', passed: false, blocking: true, detail: 'Meta description is missing' };
  }
  if (desc.length > 160) {
    return {
      label: 'Meta description',
      passed: false,
      blocking: true,
      detail: `Meta description is ${desc.length} chars (max 160)`,
    };
  }
  return { label: 'Meta description', passed: true, blocking: true };
}

function checkSchemaJson(page: Partial<SitePage>): ChecklistItem {
  const schema = page.schema_json?.trim();
  if (!schema) {
    return { label: 'Schema JSON-LD', passed: false, blocking: true, detail: 'Schema JSON-LD is missing' };
  }
  try {
    JSON.parse(schema);
    return { label: 'Schema JSON-LD', passed: true, blocking: true };
  } catch {
    return { label: 'Schema JSON-LD', passed: false, blocking: true, detail: 'Schema JSON-LD is invalid JSON' };
  }
}

function checkWordCount(page: Partial<SitePage>): ChecklistItem {
  const html = page.html ?? '';
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = text.split(' ').filter((w) => w.length > 0).length;

  if (wordCount < 300) {
    return {
      label: 'Word count',
      passed: false,
      blocking: false,
      detail: `Only ${wordCount} words (minimum 300 recommended)`,
    };
  }
  return { label: 'Word count', passed: true, blocking: false };
}

function checkH1Present(page: Partial<SitePage>): ChecklistItem {
  const html = page.html ?? '';
  const hasH1 = /<h1[\s>]/i.test(html);

  if (!hasH1) {
    return { label: 'H1 tag', passed: false, blocking: false, detail: 'No H1 tag found in content' };
  }
  return { label: 'H1 tag', passed: true, blocking: false };
}

// ── Main checklist runner ───────────────────────────────────────────────────

export function runPublishChecklist(page: Partial<SitePage>): ChecklistResult {
  const checks = [
    checkMetaTitle(page),
    checkMetaDescription(page),
    checkSchemaJson(page),
    checkWordCount(page),
    checkH1Present(page),
  ];

  const blocking = checks.filter((c) => !c.passed && c.blocking);
  const warnings = checks.filter((c) => !c.passed && !c.blocking);
  const passed = blocking.length === 0;

  return { passed, blocking, warnings };
}
