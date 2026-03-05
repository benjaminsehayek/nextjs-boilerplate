// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageSummary {
  id: string;
  title: string;
  slug: string;
  type: string;
  published_at: string;
  location_id: string | null;
  market_id: string | null;
}

// ─── Client-side fetchers (call the API route) ───────────────────────────────

/**
 * Fetch published builder pages for a specific location via the API.
 * Returns an empty array if the API call fails (graceful degradation).
 */
export async function getPublishedPagesForLocation(
  locationId: string
): Promise<PageSummary[]> {
  try {
    const res = await fetch(
      `/api/website-builder/pages/published?locationId=${encodeURIComponent(locationId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.pages ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch the count of published pages per location in a single call.
 * Returns a Map of locationId -> page count.
 */
export async function getPublishedPageCountsByLocations(
  locationIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (locationIds.length === 0) return counts;

  // Fetch all published pages (no location filter) — let the API return all
  // and count client-side. For small page counts this is efficient enough.
  try {
    const res = await fetch('/api/website-builder/pages/published');
    if (!res.ok) return counts;
    const data = await res.json();
    const pages: PageSummary[] = data.pages ?? [];

    for (const page of pages) {
      if (page.location_id && locationIds.includes(page.location_id)) {
        counts.set(page.location_id, (counts.get(page.location_id) ?? 0) + 1);
      }
    }
  } catch {
    // Graceful degradation
  }

  return counts;
}
