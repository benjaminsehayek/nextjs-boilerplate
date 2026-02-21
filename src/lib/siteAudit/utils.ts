// Site Audit Utility Functions

/**
 * Shorten a URL to just path for display purposes.
 * "https://example.com/services/plumbing" → "/services/plumbing"
 */
export function shortUrl(url: string, maxLen = 60): string {
  if (!url) return '—';
  try {
    const u = new URL(url);
    let path = u.pathname;
    if (path.length > maxLen) {
      path = path.slice(0, maxLen - 3) + '...';
    }
    return path || '/';
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen - 3) + '...' : url;
  }
}

/**
 * Format bytes to human readable (e.g., 1024 → "1.0 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Return a CSS-compatible color for a score.
 */
export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--success, #22c55e)';
  if (score >= 50) return 'var(--warning, #f59e0b)';
  return 'var(--danger, #ef4444)';
}

/**
 * Return a Tailwind class for score color.
 */
export function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

/**
 * Detect country code for DataForSEO from location string.
 * Returns the DataForSEO country_iso_code number.
 */
export function detectCountryCode(location: string): number {
  const loc = (location || '').toLowerCase();
  if (loc.includes('canada')) return 2124;
  if (loc.includes('united kingdom') || loc.includes('england') || loc.includes('scotland')) return 2826;
  if (loc.includes('australia')) return 2036;
  return 2840; // US default
}

/**
 * Clamp a number between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Compute progress percentage from crawled/queued pages.
 */
export function crawlProgressPercent(crawled: number, queued: number, finished: boolean): number {
  if (finished) return 100;
  const total = crawled + queued;
  if (total === 0) return 5;
  return Math.min(95, Math.round((crawled / total) * 100));
}
