// Content Similarity Check — pure TypeScript, no external dependencies
// Prevents doorway-page spam by detecting near-duplicate content across bulk-generated pages.

import type { SimilarityIssue } from '@/types';

// ── English stop words (common words to exclude from similarity comparison) ──

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'about', 'above', 'after', 'again', 'also', 'any', 'because',
  'before', 'between', 'down', 'during', 'even', 'here', 'if', 'into',
  'like', 'much', 'new', 'now', 'off', 'once', 'over', 'still', 'then',
  'there', 'through', 'under', 'up', 'us', 'well', 'while', 'as',
]);

// ── Strip HTML tags and collapse whitespace ─────────────────────────────────

export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ── Tokenize into word frequency map (bag-of-words) ─────────────────────────

export function tokenize(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    // Strip non-alphanumeric, skip short words and stop words
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length < 3 || STOP_WORDS.has(clean)) continue;
    freq.set(clean, (freq.get(clean) ?? 0) + 1);
  }

  return freq;
}

// ── Cosine similarity between two texts ─────────────────────────────────────

export function cosineSimilarity(textA: string, textB: string): number {
  const freqA = tokenize(textA);
  const freqB = tokenize(textB);

  if (freqA.size === 0 || freqB.size === 0) return 0;

  // Build union of all terms
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, countA] of freqA) {
    const countB = freqB.get(term) ?? 0;
    dotProduct += countA * countB;
    normA += countA * countA;
  }

  for (const [, countB] of freqB) {
    normB += countB * countB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ── Check all pairs in a bulk generation batch ──────────────────────────────

const SIMILARITY_WARN = 0.75;
const SIMILARITY_BLOCK = 0.85;

export function checkBulkSimilarity(
  pages: { slug: string; html: string }[],
): SimilarityIssue[] {
  const issues: SimilarityIssue[] = [];

  // Pre-strip HTML for all pages
  const stripped = pages.map((p) => ({
    slug: p.slug,
    text: stripHtml(p.html),
  }));

  // Compare every pair
  for (let i = 0; i < stripped.length; i++) {
    for (let j = i + 1; j < stripped.length; j++) {
      const similarity = cosineSimilarity(stripped[i].text, stripped[j].text);

      if (similarity > SIMILARITY_WARN) {
        issues.push({
          slugA: stripped[i].slug,
          slugB: stripped[j].slug,
          similarity: Math.round(similarity * 100) / 100,
          level: similarity > SIMILARITY_BLOCK ? 'block' : 'warn',
        });
      }
    }
  }

  // Sort by severity (highest similarity first)
  issues.sort((a, b) => b.similarity - a.similarity);

  return issues;
}
