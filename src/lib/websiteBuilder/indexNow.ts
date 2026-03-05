// IndexNow ping utility
// Notifies Bing/Yandex/etc when a page is published or updated.
// See: https://www.indexnow.org/documentation

const INDEXNOW_KEY = process.env.INDEXNOW_API_KEY ?? '';

/**
 * Ping IndexNow to notify search engines of a newly published/updated page.
 * Safe to call fire-and-forget (errors are silenced).
 */
export async function pingIndexNow(domain: string, slugs: string[]): Promise<void> {
  if (!INDEXNOW_KEY) return;

  const host = domain.replace(/^https?:\/\//, '').split('/')[0];
  const urlList = slugs.map((s) => `https://${host}/${s}`);

  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // Non-blocking — ignore errors silently
  }
}
