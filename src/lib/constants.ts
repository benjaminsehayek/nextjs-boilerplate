// Timeout and polling constants — import these instead of hardcoding

// Site Audit
export const CRAWL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const CRAWL_POLL_INTERVAL_MS = 4_000;     // 4 seconds

// Claude API
export const CLAUDE_TIMEOUT_MS = 60_000;         // 60 seconds
export const CLAUDE_MAX_RETRIES = 2;
export const CLAUDE_RETRY_DELAYS_MS = [2_000, 4_000];

// DataForSEO
export const DATAFORSEO_CONCURRENCY_LIMIT = 8;

// Local Grid
export const GRID_REPORTS_PAGE_SIZE = 10;

// Content Strategy
export const CONTENT_CALENDAR_WEEKS = 12;
