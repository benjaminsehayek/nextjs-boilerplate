# Website Builder — Phase 1 Build Specification

> **Purpose**: Unambiguous build spec for the Builder agent. Every decision is final. No "consider" — only "do this".
>
> **Platform anchor**: ScorchLocal is a multi-location, multi-market local SEO automation platform. The AI is the worker. Every decision below serves that goal.

---

## 1. Phase 1 Feature Decisions

### 1.1 Code Editor: CodeMirror 6 via `@uiw/react-codemirror`

**Decision**: CodeMirror 6 with `@uiw/react-codemirror` (planning doc Option A).

**Why**: ~130 KB gzipped (10x lighter than Monaco), best mobile support, MIT license, active development. Monaco is 1.5-2 MB and has no mobile support.

**Install command**:
```bash
npm install @uiw/react-codemirror @codemirror/lang-html @codemirror/lang-css @codemirror/lang-javascript @codemirror/theme-one-dark
```

**Implementation**: Separate instances per tab (Approach 2 from planning doc). Three tabs: HTML, CSS, JS. Each tab gets its own `<CodeMirror>` instance. Must use `dynamic(() => import(...), { ssr: false })` — CodeMirror accesses the DOM.

---

### 1.2 Generation API: Non-streaming, via existing `/api/claude/generate` proxy

**Decision**: Non-streaming single response (planning doc Option C for generation).

**Why**: The existing `/api/claude/generate` route already proxies to Anthropic with auth checks, subscription gating, model whitelisting, and timeout handling. Reuse it. Streaming adds complexity (partial HTML in editor, debounced preview) with no user-facing value in Phase 1 where pages are ~2-4K tokens.

**Model**: `claude-sonnet-4-6` (already whitelisted in the existing route).

**Change needed**: The existing route caps `max_tokens` at 2048. The website builder needs up to 4096 for full page generation. **Increase the cap in the existing route from 2048 to 4096.**

**Schema.org generation**: Second call to the same `/api/claude/generate` route with `model: 'claude-haiku-4-5-20251001'` and `maxTokens: 500`. Haiku is already whitelisted.

---

### 1.3 Page Serving: Next.js catch-all route handler (planning doc Option A)

**Decision**: `src/app/sites/[businessSlug]/[...slug]/route.ts` — a Next.js route handler that queries `site_pages` and returns full HTML.

**URL structure**: `https://app.scorchlocal.com/sites/{businessSlug}/{slug}`

Examples:
- `https://app.scorchlocal.com/sites/acme-plumbing/portland-or/hvac-repair`
- `https://app.scorchlocal.com/sites/acme-plumbing/blog/winter-hvac-tips`

**Why**: Zero new infrastructure. Ships with the app. Custom domains added later via middleware rewrite.

**`businessSlug`**: Derived from `business.name` via `toSlug()`. Stored on `businesses` table — but for Phase 1, we compute it at query time from a new `business_slug` column on `site_pages` (avoids altering the businesses table). The `business_slug` is set when a page is created, derived from `business.name`.

**Cache-Control**: `public, s-maxage=300, stale-while-revalidate=86400` on published pages. No cache on draft/preview.

**robots meta**: `index, follow` for published; `noindex, nofollow` for draft/scheduled. Injected server-side, always.

**canonical**: For Phase 1 (no custom domains), canonical is the ScorchLocal URL. Injected server-side.

---

### 1.4 Save/Publish: REST API

**Decision**: Two API routes:
1. `POST /api/website-builder/pages` — upsert (create or update) a page
2. `PATCH /api/website-builder/pages/[pageId]/publish` — publish a page

**Why**: Separating save from publish matches the Draft/Published deployment model (planning doc Option B). Users save frequently, publish deliberately.

---

### 1.5 ContentStrategy Integration: "Build Page" button on CalendarItemCard

**Decision**: Add a "Build Page" button to `CalendarItemCard` for items with `type === 'website_addition' || type === 'website_change'`. The button navigates to `/website-builder?calendarItemId={item.id}`.

**Why**: This closes the calendar-to-builder loop. The builder page reads the calendar item data from the URL param and pre-populates the editor.

---

### 1.6 Schema.org: Haiku-generated JSON-LD at save time

**Decision**: When a page is saved, if `schema_json` is empty or the content has changed, auto-generate JSON-LD via a Haiku call. Stored in `site_pages.schema_json`. Injected as `<script type="application/ld+json">` in the route handler.

**Schema types by page type**:
| Page Type | Schema Types |
|---|---|
| `location_service` | `LocalBusiness` + `Service` + `FAQPage` (if FAQ present) |
| `city_landing` | `LocalBusiness` (with `areaServed`) |
| `blog` | `Article` + `BlogPosting` |
| `foundation` | `LocalBusiness` or `WebPage` |

**Model**: `claude-haiku-4-5-20251001`, max_tokens 500.

**Data inputs**: `business.name`, `business.phone`, `business.address`, `location.*`, `service.name`, `page.meta_title`, page HTML (first 3000 chars).

---

### 1.7 DB Tables

**Decision**: Schema A from planning doc (flat `site_pages` table) + `keyword_assignments` table from Section 0.4. No version history in Phase 1. No `business_domains` table in Phase 1 (custom domains are Phase 2+).

---

## 2. Complete File List

### New Files (CREATE)

| # | File Path | Purpose |
|---|---|---|
| 1 | `src/app/(dashboard)/website-builder/page.tsx` | Main website builder page (editor + preview) |
| 2 | `src/components/tools/WebsiteBuilder/PageEditor.tsx` | CodeMirror editor with HTML/CSS/JS tabs |
| 3 | `src/components/tools/WebsiteBuilder/PagePreview.tsx` | Split-pane iframe preview (`srcdoc`) |
| 4 | `src/components/tools/WebsiteBuilder/MetaSidebar.tsx` | Meta title, description, OG image, schema display |
| 5 | `src/components/tools/WebsiteBuilder/PageList.tsx` | List of existing pages for the business |
| 6 | `src/app/api/website-builder/pages/route.ts` | POST: create/update page (upsert) |
| 7 | `src/app/api/website-builder/pages/[pageId]/publish/route.ts` | PATCH: publish a page |
| 8 | `src/app/api/website-builder/generate/route.ts` | POST: generate page content (location-aware prompt) |
| 9 | `src/app/api/website-builder/schema/route.ts` | POST: generate Schema.org JSON-LD via Haiku |
| 10 | `src/app/sites/[businessSlug]/[...slug]/route.ts` | GET: public page serving (catch-all) |
| 11 | `src/lib/websiteBuilder/slugs.ts` | Slug generation utilities |
| 12 | `src/lib/websiteBuilder/prompts.ts` | Location-aware prompt builders |

### Existing Files (MODIFY)

| # | File Path | Change |
|---|---|---|
| 1 | `src/types/index.ts` | Add `SitePage`, `PageType`, `PageStatus`, `KeywordAssignment` types |
| 2 | `src/components/tools/ContentStrategy/CalendarItemCard.tsx` | Add "Build Page" button for `website_addition` / `website_change` items |
| 3 | `src/components/layout/Sidebar.tsx` | Add "Website Builder" nav item |
| 4 | `src/app/api/claude/generate/route.ts` | Raise `max_tokens` cap from 2048 to 4096 |
| 5 | `src/app/globals.css` | Add website-builder-specific component classes inside `@layer components` |

---

## 3. DB Migration SQL

Paste this into the Supabase SQL editor as a single migration.

```sql
-- ============================================================================
-- WEBSITE BUILDER: site_pages + keyword_assignments
-- ============================================================================

-- site_pages: stores all user-created pages
CREATE TABLE public.site_pages (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                 UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- Multi-location scope
  location_id                 UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  market_id                   UUID REFERENCES public.markets(id) ON DELETE SET NULL,
  service_id                  UUID REFERENCES public.services(id) ON DELETE SET NULL,
  -- Page identity
  business_slug               TEXT NOT NULL,  -- derived from business.name, used in public URL
  slug                        TEXT NOT NULL,  -- page path e.g. "portland-or/hvac-repair"
  title                       TEXT,
  type                        TEXT NOT NULL CHECK (type IN (
    'location_service',
    'city_landing',
    'blog',
    'service_area',
    'foundation'
  )),
  -- Content
  html                        TEXT DEFAULT '',
  css                         TEXT DEFAULT '',
  js                          TEXT DEFAULT '',
  -- SEO
  meta_title                  TEXT,
  meta_description            TEXT,
  og_image_url                TEXT,
  schema_json                 TEXT,  -- JSON-LD string, injected as <script type="application/ld+json">
  -- Publishing
  status                      TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  published_at                TIMESTAMPTZ,
  -- Integration links
  content_calendar_item_id    TEXT,  -- CalendarItemV2.id
  site_audit_issue_id         TEXT,  -- DetailedIssue reference
  -- Generation metadata
  generated_by                TEXT DEFAULT 'claude-sonnet-4-6',
  generation_prompt_hash      TEXT,
  -- Timestamps
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  UNIQUE(business_id, slug)
);

-- Indexes
CREATE INDEX site_pages_business_slug_idx ON public.site_pages(business_slug, slug);
CREATE INDEX site_pages_status_idx ON public.site_pages(status);
CREATE INDEX site_pages_matrix_idx ON public.site_pages(business_id, location_id, service_id, type);
CREATE INDEX site_pages_market_idx ON public.site_pages(market_id, status);
CREATE INDEX site_pages_calendar_item_idx ON public.site_pages(content_calendar_item_id);

-- RLS
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business pages"
  ON public.site_pages FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business pages"
  ON public.site_pages FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business pages"
  ON public.site_pages FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own business pages"
  ON public.site_pages FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Public read for the page-serving route (unauthenticated visitors)
-- This policy allows the catch-all route handler to read published pages
-- without requiring the visitor to be logged in.
CREATE POLICY "Anyone can read published pages"
  ON public.site_pages FOR SELECT
  USING (status = 'published');


-- ============================================================================
-- keyword_assignments: prevents keyword cannibalization
-- ============================================================================

CREATE TABLE public.keyword_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  keyword         TEXT NOT NULL,  -- normalized lowercase
  page_id         UUID REFERENCES public.site_pages(id) ON DELETE SET NULL,
  market_id       UUID REFERENCES public.markets(id) ON DELETE SET NULL,
  service_id      UUID REFERENCES public.services(id) ON DELETE SET NULL,
  volume          INT,
  kd              INT,
  intent          TEXT,  -- 'transactional' | 'commercial' | 'informational'
  local_type      TEXT,  -- 'near_me' | 'city_name' | 'none'
  roi_score       NUMERIC,
  data_stage      INT DEFAULT 1,  -- 1=estimated, 2=ppc_calibrated, 3=measured
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, keyword)
);

CREATE INDEX keyword_assignments_business_idx ON public.keyword_assignments(business_id);
CREATE INDEX keyword_assignments_page_idx ON public.keyword_assignments(page_id);

-- RLS
ALTER TABLE public.keyword_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business keyword assignments"
  ON public.keyword_assignments FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own business keyword assignments"
  ON public.keyword_assignments FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business keyword assignments"
  ON public.keyword_assignments FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own business keyword assignments"
  ON public.keyword_assignments FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );
```

---

## 4. TypeScript Types

Add these to `src/types/index.ts`:

```typescript
// ============================================================================
// Website Builder Types
// ============================================================================

export type PageType = 'location_service' | 'city_landing' | 'blog' | 'service_area' | 'foundation';
export type PageStatus = 'draft' | 'published';

export interface SitePage {
  id: string;
  business_id: string;
  location_id: string | null;
  market_id: string | null;
  service_id: string | null;
  business_slug: string;
  slug: string;
  title: string | null;
  type: PageType;
  html: string;
  css: string;
  js: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  schema_json: string | null;
  status: PageStatus;
  published_at: string | null;
  content_calendar_item_id: string | null;
  site_audit_issue_id: string | null;
  generated_by: string;
  generation_prompt_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface KeywordAssignment {
  id: string;
  business_id: string;
  keyword: string;
  page_id: string | null;
  market_id: string | null;
  service_id: string | null;
  volume: number | null;
  kd: number | null;
  intent: string | null;
  local_type: string | null;
  roi_score: number | null;
  data_stage: number;
  assigned_at: string;
}
```

---

## 5. API Route Specifications

### 5.1 `POST /api/website-builder/pages`

**Purpose**: Create or update a page (upsert).

**Auth**: Server-side `supabase.auth.getUser()` (same pattern as `/api/gsc/analytics`).

**Request body**:
```typescript
interface SavePageRequest {
  id?: string;                         // if present, update; if absent, create
  businessId: string;                  // UUID
  businessSlug: string;                // derived from business.name
  slug: string;                        // page path
  title: string;
  type: PageType;
  html: string;
  css: string;
  js: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  schemaJson?: string;
  locationId?: string;
  marketId?: string;
  serviceId?: string;
  contentCalendarItemId?: string;
  siteAuditIssueId?: string;
}
```

**Response (200)**:
```typescript
interface SavePageResponse {
  page: SitePage;
}
```

**Error responses**:
- `400` — validation error (missing required fields, invalid type)
- `401` — not authenticated
- `403` — business does not belong to user
- `409` — slug conflict (UNIQUE violation on `business_id, slug`)

**Validation**: Use `zod`. Required: `businessId`, `businessSlug`, `slug`, `title`, `type`. Slug must match `^[a-z0-9][a-z0-9/-]*[a-z0-9]$`.

**Business ownership check**: Query `businesses` table to verify `business_id` belongs to `user.id`. Do NOT rely solely on RLS — explicitly verify to return a clear 403.

---

### 5.2 `PATCH /api/website-builder/pages/[pageId]/publish`

**Purpose**: Set `status = 'published'`, set `published_at = now()`.

**Auth**: Server-side `supabase.auth.getUser()`.

**Request body**: None (page ID is in the URL path).

**Pre-publish validation** (server-side, blocks publish on failure):
- `meta_title` present and <= 60 chars (if missing, return error suggesting auto-generate)
- `meta_description` present and <= 160 chars
- `schema_json` present and valid JSON
- `html` word count >= 50 (basic sanity — not 300 for Phase 1)

**Response (200)**:
```typescript
interface PublishPageResponse {
  page: SitePage;
}
```

**Error responses**:
- `400` — validation failed (missing meta_title, schema_json, etc.) — return checklist of failures
- `401` — not authenticated
- `403` — page does not belong to user's business
- `404` — page not found

**On success**: If `content_calendar_item_id` is set, update the content strategy's `item_statuses` to mark that item as `'done'`. Do this by reading the `content_strategies` row for the page's `business_id`, updating the `item_statuses` JSONB field.

---

### 5.3 `POST /api/website-builder/generate`

**Purpose**: Generate page HTML content using Claude with location-aware context.

**Auth**: Server-side `supabase.auth.getUser()`.

**Request body**:
```typescript
interface GeneratePageRequest {
  businessId: string;
  pageType: PageType;
  title: string;
  primaryKeyword: string;
  keywords: string[];
  locationId?: string;     // for location_service pages
  marketId?: string;
  serviceId?: string;
  calendarItemAction?: string;   // from CalendarItemV2.action
  calendarItemRationale?: string; // from CalendarItemV2.rationale
}
```

**Response (200)**:
```typescript
interface GeneratePageResponse {
  html: string;
  css: string;
  suggestedMetaTitle: string;
  suggestedMetaDescription: string;
  suggestedSlug: string;
}
```

**Error responses**:
- `400` — validation error
- `401` — not authenticated
- `403` — subscription not active
- `502` — Claude API failure

**Implementation**:
1. Load business, location, market, service data from Supabase based on provided IDs.
2. Build a location-aware system prompt using the prompt builder from `src/lib/websiteBuilder/prompts.ts`.
3. Call `/api/claude/generate` internally (or directly call Anthropic API with same pattern) with `max_tokens: 4096`.
4. Parse the response. Claude returns HTML body content; the route also extracts a suggested meta title and meta description from the response (instruct Claude to output them in HTML comments at the top).
5. Generate a slug from city/state/service using `src/lib/websiteBuilder/slugs.ts`.

---

### 5.4 `POST /api/website-builder/schema`

**Purpose**: Generate Schema.org JSON-LD for a page.

**Auth**: Server-side `supabase.auth.getUser()`.

**Request body**:
```typescript
interface GenerateSchemaRequest {
  businessId: string;
  pageType: PageType;
  pageHtml: string;          // first 3000 chars
  metaTitle: string;
  locationId?: string;
  serviceId?: string;
}
```

**Response (200)**:
```typescript
interface GenerateSchemaResponse {
  schemaJson: string;  // valid JSON-LD string
}
```

**Implementation**: Load business + location + service data. Build a schema-specific prompt. Call Claude Haiku (`claude-haiku-4-5-20251001`) with max_tokens 500. Validate the response is valid JSON before returning.

---

### 5.5 `GET /sites/[businessSlug]/[...slug]/route.ts`

**Purpose**: Serve published pages to the public.

**Auth**: None (public route).

**URL params**: `businessSlug` (string), `slug` (string array, joined with `/`).

**Implementation**:
1. `const { businessSlug, slug } = await params;` (Next.js 15+ — params must be awaited)
2. Query `site_pages` using the Supabase **server** client (not browser client). Match on `business_slug = businessSlug` AND `slug = slug.join('/')` AND `status = 'published'`.
3. If not found, return 404.
4. Build full HTML document with:
   - `<meta charset="UTF-8">`
   - `<meta name="viewport" ...>`
   - `<title>{meta_title}</title>`
   - `<meta name="description" content="{meta_description}">`
   - `<meta name="robots" content="index, follow">` (always — only published pages reach this)
   - `<link rel="canonical" href="https://app.scorchlocal.com/sites/{businessSlug}/{slug}">`
   - `<style>{css}</style>`
   - `{html}` in body
   - `<script type="application/ld+json">{schema_json}</script>` if present
   - `<script>{js}</script>`
5. Return with `Content-Type: text/html; charset=utf-8` and `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`.

---

## 6. Component Specifications

### 6.1 `src/app/(dashboard)/website-builder/page.tsx` — Main Page

**Props**: None (it's a page component).

**Data**: Uses `useAuth()` for `business`, `user`, `loading`. Fetches page list from Supabase on mount. Reads `?calendarItemId=` from URL search params for ContentStrategy integration.

**Renders**:
- Loading skeleton while `loading` is true (same pattern as dashboard)
- If no business, show prompt to complete onboarding
- Left panel: `PageList` (existing pages) + "New Page" button
- Center: `PageEditor` (CodeMirror tabs)
- Right: `MetaSidebar` (meta fields, schema, publish button)
- Bottom split: `PagePreview` (iframe)

**Layout**: On large screens, two-column: editor top-left, preview top-right, meta sidebar on the right. On mobile, tabs: Edit / Preview / Settings.

**State management**: Local `useState` for current page data (html, css, js, meta, etc.). No global store needed — single-page editor.

---

### 6.2 `src/components/tools/WebsiteBuilder/PageEditor.tsx`

**Props**:
```typescript
interface PageEditorProps {
  html: string;
  css: string;
  js: string;
  onHtmlChange: (value: string) => void;
  onCssChange: (value: string) => void;
  onJsChange: (value: string) => void;
  generating: boolean;  // disable editing while generating
}
```

**Renders**: Tab bar (HTML / CSS / JS) + CodeMirror instance for the active tab. Dark theme (`oneDark`). Dynamic import with `ssr: false`.

**Data**: Props only. No own data fetching.

---

### 6.3 `src/components/tools/WebsiteBuilder/PagePreview.tsx`

**Props**:
```typescript
interface PagePreviewProps {
  html: string;
  css: string;
  js: string;
}
```

**Renders**: An `<iframe srcDoc={...}>` with `sandbox="allow-scripts"`. Content is debounced at 500ms. Combines html/css/js into a full HTML document string for `srcDoc`.

**Data**: Props only.

---

### 6.4 `src/components/tools/WebsiteBuilder/MetaSidebar.tsx`

**Props**:
```typescript
interface MetaSidebarProps {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  schemaJson: string;
  pageType: PageType;
  pageStatus: PageStatus;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onOgImageUrlChange: (value: string) => void;
  onSchemaJsonChange: (value: string) => void;
  onGenerateSchema: () => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  publishing: boolean;
  generatingSchema: boolean;
}
```

**Renders**:
- Meta title input with character counter (max 60)
- Meta description textarea with character counter (max 160)
- OG image URL input
- Schema JSON-LD display (read-only textarea) + "Generate Schema" button
- "Save Draft" button
- "Publish" button (disabled if not saved, shows pre-publish checklist failures)
- Page status badge (Draft / Published)

**Data**: Props only.

---

### 6.5 `src/components/tools/WebsiteBuilder/PageList.tsx`

**Props**:
```typescript
interface PageListProps {
  pages: SitePage[];
  selectedPageId: string | null;
  onSelectPage: (page: SitePage) => void;
  onNewPage: () => void;
  loading: boolean;
}
```

**Renders**: Scrollable list of pages grouped by type. Each item shows title, slug, status badge, and page type label. "New Page" button at the top.

**Data**: Props only (parent fetches pages).

---

## 7. CalendarItemCard Modification Spec

**File**: `src/components/tools/ContentStrategy/CalendarItemCard.tsx`

### Props Addition

Add one new optional prop:

```typescript
interface CalendarItemCardProps {
  // ... existing props ...
  onBuildPage?: (item: CalendarItemV2) => void;  // NEW
}
```

### UI Change

In the "Generate buttons" section (line ~258-289), after the existing generate/brief buttons, add:

```tsx
{(item.type === 'website_addition' || item.type === 'website_change') && onBuildPage && (
  <button
    onClick={() => onBuildPage(item)}
    className="btn-ghost text-xs py-1.5 inline-flex items-center gap-1"
  >
    Build Page
  </button>
)}
```

### Parent Change

In `src/app/(dashboard)/content-strategy/page.tsx`, where `CalendarItemCard` is rendered (inside the `UnifiedCalendar` component), pass the `onBuildPage` prop. The handler navigates to the website builder:

```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

function handleBuildPage(item: CalendarItemV2) {
  router.push(`/website-builder?calendarItemId=${item.id}`);
}
```

**Note**: The `UnifiedCalendar` component needs to accept and pass through the `onBuildPage` prop to `CalendarItemCard`. Check its props interface and add the pass-through.

---

## 8. Build Order

The Builder MUST follow this exact sequence. Each step's dependencies are listed.

```
Step 1: DB Migration
  - Run the SQL from Section 3 in Supabase SQL editor
  - No code dependencies

Step 2: TypeScript Types
  - Add types from Section 4 to src/types/index.ts
  - Depends on: Step 1 (types must match schema)

Step 3: Slug Utilities
  - Create src/lib/websiteBuilder/slugs.ts
  - Depends on: Step 2 (uses types)

Step 4: Prompt Builders
  - Create src/lib/websiteBuilder/prompts.ts
  - Depends on: Step 2 (uses types)

Step 5: Existing Route Modification
  - Modify src/app/api/claude/generate/route.ts (raise max_tokens cap to 4096)
  - No dependencies on prior steps

Step 6: Save API Route
  - Create src/app/api/website-builder/pages/route.ts
  - Depends on: Steps 2, 3

Step 7: Publish API Route
  - Create src/app/api/website-builder/pages/[pageId]/publish/route.ts
  - Depends on: Step 6

Step 8: Generate API Route
  - Create src/app/api/website-builder/generate/route.ts
  - Depends on: Steps 4, 5

Step 9: Schema API Route
  - Create src/app/api/website-builder/schema/route.ts
  - Depends on: Step 2

Step 10: Page Serving Route
  - Create src/app/sites/[businessSlug]/[...slug]/route.ts
  - Depends on: Step 2

Step 11: Install CodeMirror
  - npm install @uiw/react-codemirror @codemirror/lang-html @codemirror/lang-css @codemirror/lang-javascript @codemirror/theme-one-dark
  - No code dependencies

Step 12: PageEditor Component
  - Create src/components/tools/WebsiteBuilder/PageEditor.tsx
  - Depends on: Step 11

Step 13: PagePreview Component
  - Create src/components/tools/WebsiteBuilder/PagePreview.tsx
  - No dependencies on prior steps

Step 14: MetaSidebar Component
  - Create src/components/tools/WebsiteBuilder/MetaSidebar.tsx
  - Depends on: Step 2

Step 15: PageList Component
  - Create src/components/tools/WebsiteBuilder/PageList.tsx
  - Depends on: Step 2

Step 16: Main Website Builder Page
  - Create src/app/(dashboard)/website-builder/page.tsx
  - Depends on: Steps 6-15 (all API routes + all components)

Step 17: Sidebar Navigation
  - Modify src/components/layout/Sidebar.tsx — add Website Builder link
  - No dependencies

Step 18: CalendarItemCard Modification
  - Modify src/components/tools/ContentStrategy/CalendarItemCard.tsx
  - Modify UnifiedCalendar to pass through onBuildPage prop
  - Modify content-strategy/page.tsx to provide the handler
  - Depends on: Step 16 (the builder page must exist for navigation)

Step 19: CSS Additions
  - Add any website-builder-specific classes to globals.css inside @layer components
  - No dependencies

Step 20: Smoke Test
  - Verify: create page, edit HTML/CSS/JS, preview updates, save, publish, view at public URL
  - Depends on: All prior steps
```

**Parallelization notes**: Steps 3-5 can run in parallel. Steps 6-10 can run in parallel. Steps 12-15 can run in parallel. Steps 17-19 can run in parallel.

---

## 9. Known Constraints Checklist

Every file the Builder creates or modifies MUST pass ALL applicable checks:

### Auth & Data Access
- [ ] Client components use `useAuth()` from `@/lib/context/AuthContext` — NEVER `supabase.auth.getUser()` on the client
- [ ] API routes use `const supabase = await createClient()` from `@/lib/supabase/server` (NOT the browser client)
- [ ] API routes call `supabase.auth.getUser()` for auth — server-side only
- [ ] Business ownership is verified explicitly (not just via RLS) in mutation routes

### Next.js 15+ Compatibility
- [ ] Route handler `params` are awaited: `const { slug } = await params;`
- [ ] `Cache-Control` headers set on all route handlers (no implicit caching in Next.js 15)
- [ ] `export const maxDuration = 60;` on generation routes (Vercel timeout)
- [ ] CodeMirror loaded via `dynamic(() => import(...), { ssr: false })` — no DOM access during SSR

### CSS & Styling
- [ ] All custom CSS classes are inside `@layer components` in `globals.css`
- [ ] Component styling uses existing Tailwind classes and design tokens (`char-*`, `ash-*`, `flame-*`)
- [ ] Cards use the `.card` class from globals.css
- [ ] Buttons use `btn-primary`, `btn-secondary`, `btn-ghost` from globals.css

### Data Scoping (Multi-Business Safety)
- [ ] Every query includes `business_id` filter — no data leaks between businesses
- [ ] `location_id`, `market_id`, `service_id` are set on `site_pages` where applicable
- [ ] RLS policies match the pattern: `business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())`
- [ ] Public page serving route only returns `status = 'published'` pages

### SEO & Content Safety
- [ ] Published pages get `<meta name="robots" content="index, follow">`
- [ ] Draft/preview pages get `<meta name="robots" content="noindex, nofollow">`
- [ ] Canonical URL is injected server-side in the catch-all route
- [ ] Schema.org JSON-LD is validated as valid JSON before storage

### Integration
- [ ] CalendarItemCard "Build Page" button only shows for `website_addition` and `website_change` types
- [ ] Publishing a page with `content_calendar_item_id` marks the calendar item as `'done'`
- [ ] `keyword_assignments` table has `UNIQUE(business_id, keyword)` constraint

### Existing Patterns
- [ ] Page follows the loading guard pattern: `if (loading) return <Skeleton />; if (!user) return null;`
- [ ] Supabase browser client uses the singleton from `@/lib/supabase/client`
- [ ] Error states are displayed to the user (not silently swallowed)
- [ ] `z` (zod) is used for request body validation in API routes

---

## 10. Slug Utilities Reference

**File**: `src/lib/websiteBuilder/slugs.ts`

```typescript
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function locationServiceSlug(city: string, state: string, serviceName: string): string {
  const cityState = `${toSlug(city)}-${state.toLowerCase()}`;
  return `${cityState}/${toSlug(serviceName)}`;
}

export function cityLandingSlug(city: string, state: string): string {
  return `${toSlug(city)}-${state.toLowerCase()}`;
}

export function blogSlug(title: string): string {
  return `blog/${toSlug(title)}`;
}

export function businessSlug(businessName: string): string {
  return toSlug(businessName);
}
```

---

## 11. What Is NOT in Phase 1

These are explicitly deferred. Do not build them:

- Custom domains (`business_domains` table, DNS verification, SSL provisioning)
- Bulk/matrix generation (location x service batch generation)
- Version history (`site_page_versions` table)
- Scheduled publishing (`status = 'scheduled'`, `publish_at`, cron jobs)
- Asset/image management (Supabase Storage uploads)
- SERP preview component
- Sitemap auto-generation
- LocalGrid integration (auto-register keywords on publish)
- OffPageAudit integration (surface pages as link targets)
- SiteAudit integration ("Fix this issue" button)
- Content similarity detection (cosine similarity between pages)
- Location enrichment (Google Maps, OpenMeteo, Census API)
- Research-backed blog generation (Claude tool use with web_search)
- IndexNow / GSC URL submission
- Keyword ROI engine (traffic score calculations)
- Import from existing website
