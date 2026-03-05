# Website Builder Tool — Implementation Planning

**Scope**: Code-based page editor (HTML/CSS/JS) for publishing location service pages, blog posts, and foundation pages — with custom domain support and deep integration across all platform tools.

> **Research status**: All technical options verified against official documentation (March 2026). Platform alignment analysis added March 2026.

---

## Platform Fit Analysis

### The Goal
ScorchLocal's mission is to let local businesses automate their marketing using AI as the worker — across **multiple markets** and **multiple locations** per market.

### How the Website Builder Fits (and Where the Original Framing Was Wrong)

The original scope framed this as a "blog + foundation pages" tool. That framing misses the most valuable use case entirely.

**The real primary use case is: location service pages.**

A local business with:
- 3 services (HVAC repair, AC installation, furnace tune-up)
- 3 markets (Portland metro, Vancouver WA, Salem OR)
- 2–3 cities per market

...needs **18–27 location service pages** minimum ("HVAC Repair in Portland, OR", "HVAC Repair in Lake Oswego, OR", "AC Installation in Vancouver, WA", etc.). These pages are the foundation of local SEO — they're what ranks in "service + city" searches.

Building these manually takes days. Claude can generate all of them in minutes from the `Market`, `BusinessLocation`, and `Service` data already in the platform. **This is the automation story.**

### The Full Content Hierarchy

```
Business
├── Market: Portland Metro
│   ├── Cities: Portland, Lake Oswego, Beaverton, Tigard
│   └── Pages needed:
│       ├── Location service pages: "HVAC Repair in Portland" × each service
│       ├── City landing pages: "HVAC Company in Portland"
│       └── Blog posts: local seasonal topics, Portland-specific
├── Market: Vancouver WA
│   ├── Cities: Vancouver, Camas, Battle Ground
│   └── Pages needed: same structure
└── Market: Salem OR
    └── ...
```

### What the Platform's Existing Data Already Provides

| Existing Type | Fields Used by Builder |
|---|---|
| `Market` | `name`, `cities[]`, `state`, `latitude/longitude` — scopes all content to a market |
| `BusinessLocation` | `city`, `state`, `phone`, `address`, `place_id`, `cid`, `gbp_listing` — NAP data for each location |
| `Service` | `name`, `profit_per_job`, `close_rate` — which services to create pages for |
| `CalendarItemV2` | `locationName`, `type: 'website_addition' | 'website_change'`, `primaryKeyword`, `keywords[]` — content calendar already plans what to build |
| `EnrichedKeyword` | `localType: 'near_me' | 'city_name'`, `volume`, `intent` — which keywords to target per location |
| `GridScan` | `location_id`, `results` — shows which keywords rank poorly in which grid zones (i.e., where to add pages) |
| `DetailedIssue` | `category`, `fix`, `urls` — site audit tells us what pages are missing |

### Integration Quality Assessment

| Tool | Integration Quality | Notes |
|---|---|---|
| **ContentStrategy** | Strong | `CalendarItemV2` already has `locationName` + `type: 'website_addition'`. "Build this" button closes the loop. |
| **SiteAudit** | Strong | Issues like "thin content", "missing service pages" directly map to page creation tasks. |
| **LocalGrid** | Currently missing | After publishing "HVAC Repair in Portland", that keyword+location should auto-register in LocalGrid for tracking. |
| **OffPageAudit** | Currently missing | Published location pages become linkable assets — off-page strategy should reference them. |
| **LeadIntelligence** | Potential future | If leads are attributed to a market via `market_id`, published pages for that market should be surfaced. |
| **Marketing** | Potential future | Published blog posts → auto-draft email campaign promoting the post to `contacts` in that market. |

### Key Gaps in the Original Plan (now addressed below)

1. **No location/market scope on pages** — Every page needs `location_id` and `market_id` foreign keys
2. **No bulk generation** — The automation value is generating all location × service combinations at once, not one page at a time
3. **No LocalGrid feedback loop** — Published pages should trigger/update grid tracking
4. **No OffPageAudit connection** — Published pages are link-building targets
5. **URL structure doesn't reflect local SEO best practices** — `/[market]/[service]/` or `/[city]/[service]/` is how local SEO URLs should be structured
6. **Templates don't prioritize location service pages** — They're the most important page type, currently listed last
7. **Multi-domain strategy not thought through** — One domain with market/location paths is better for authority consolidation than separate domains per market

---

## Codebase Constraints (must-read before implementation)

> Added by gap-check review. These constraints are verified against the actual codebase and must be followed in all Phase 1 implementation.

1. **Next.js version is 16.0.10** (`package.json` — `"next": "16.0.10"`). The doc references "Next.js 15+" for `params` awaiting — this is correct behaviour in v16 too. v16 renamed `middleware.ts` to `proxy.ts` (Section 12 mentions this), but the actual codebase still uses `middleware.ts` (which still works in v16 via compat).

2. **Auth — never call `supabase.auth.getUser()` in client components.** All shared data (user, profile, business) comes from `useAuth()` in `src/lib/context/AuthContext.tsx`. See MEMORY.md for the definitive explanation. Server-side route handlers (`src/lib/supabase/server.ts`) calling `getUser()` is fine — middleware and API routes already do this.

3. **Server-side Supabase client is async.** `createClient()` from `src/lib/supabase/server.ts` must be `await`ed (it awaits `cookies()`). The route handler examples in this doc correctly do `const supabase = await createClient()`.

4. **Client-side Supabase client is a module-level singleton.** `createClient()` from `src/lib/supabase/client.ts` returns a cached instance. Safe to call multiple times.

5. **Tailwind v4 — all custom component CSS must be inside `@layer components` in `src/app/globals.css`.** Unlayered CSS beats ALL layered styles. Any new `.editor-*` or `.matrix-*` classes must go in `@layer components`.

6. **Middleware protected paths.** `src/middleware.ts` (line 35-46) lists protected routes. `/website-builder` must be added to the `protectedPaths` array.

7. **API route auth pattern.** All API routes follow the pattern in `src/app/api/gsc/analytics/route.ts`: server-side `createClient()` → `getUser()` → 401 if no user → rate limit check → validate body with Zod. New `/api/website-builder/*` routes must follow this pattern.

8. **No `vercel.json` exists yet.** Vercel Cron jobs (Section 12 background jobs) will require creating this file. The app is on Vercel Pro plan (implied by current deployment).

---

## Table of Contents

0. [Keyword ROI Engine & Silo Architecture](#0-keyword-roi-engine--silo-architecture)
1. [Code Editor UI](#1-code-editor-ui)
2. [Content Generation (Claude Integration)](#2-content-generation-claude-integration)
3. [Multi-Location Page Generation (Bulk Automation)](#3-multi-location-page-generation-bulk-automation)
4. [Page Serving & Hosting Model](#4-page-serving--hosting-model)
5. [Custom Domain Management](#5-custom-domain-management)
6. [DNS Verification](#6-dns-verification)
7. [SSL Certificate Provisioning](#7-ssl-certificate-provisioning)
8. [Asset & Image Management](#8-asset--image-management)
9. [Page Preview](#9-page-preview)
10. [Templates & Starting Points](#10-templates--starting-points)
11. [Deployment Model (Draft vs Published)](#11-deployment-model-draft-vs-published)
12. [Routing Architecture](#12-routing-architecture)
13. [Background Jobs (DNS Polling & Scheduling)](#13-background-jobs-dns-polling--scheduling)
14. [Database Schema Options](#14-database-schema-options)
15. [SiteAudit Integration](#15-siteaudit-integration)
16. [ContentStrategy Integration](#16-contentstrategy-integration)
17. [LocalGrid Integration](#17-localgrid-integration)
18. [OffPageAudit Integration](#18-offpageaudit-integration)
19. [SEO & Meta Management](#19-seo--meta-management)
20. [Recommended Stack Combination](#20-recommended-stack-combination)

---

## 0. Keyword ROI Engine & Silo Architecture

This section defines how keyword data drives page prioritization, how ROI is calculated (and why raw keyword planner volume is insufficient), and how the silo architecture prevents keyword cannibalization — the primary failure mode for AI-generated SEO content in 2026.

---

### 0.1 The Fundamental Problem: Volume Estimates Are Unreliable

Keyword planner volume figures (from DataForSEO, Google Keyword Planner, Semrush, etc.) are **modeled estimates**, not measured counts. They are:

- **±30–50% inaccurate** for any given keyword/geography combination
- **Rounded** to broad ranges (e.g., "1K–10K") at low volumes
- **Nationally biased** — local search volume for "HVAC repair Portland OR" is extrapolated from regional/national data

This means the classic ROI formula `Traffic × Conversion Rate × Close Rate × Profit = ROI` **cannot be applied directly to keyword planner volume** for a local business. The "Traffic" input is an estimate with a wide error band.

**The only source of ground-truth local search volume is PPC impression data.**

---

### 0.2 Three-Stage ROI Data Quality Model

ROI calculations evolve as the business accumulates real data. Each stage is more accurate than the last:

#### Stage 1 — Estimated (Default, No PPC Required)
- **Source**: Keyword planner volume × geographic modifier
- **Accuracy**: ±30–50%
- **Formula**: `estimated_traffic = keyword_volume × kd_discount × intent_multiplier × local_multiplier × seasonal_multiplier`
- **Use for**: Initial page prioritization when the business has no PPC history

#### Stage 2 — PPC-Calibrated (Requires Active PPC Campaigns)
- **Source**: Google Ads impression share data
- **Formula**: `true_market_volume = ppc_impressions / impression_share`
  - Example: If a business got 400 impressions at 40% impression share, the true market is 1,000 searches/month
- **Accuracy**: Actual market size (not estimated) — this is measured, not modeled
- **Use for**: Refining ROI for any keyword where PPC campaigns exist
- **Future integration**: Google Ads API → `campaigns.impressions`, `campaigns.search_impression_share`
- **Data flow**: `Lead.source = 'ppc'` already in the platform; impression share requires Google Ads API connection (not yet built)

#### Stage 3 — Measured (Requires Ranking + GSC + LeadIntelligence)
- **Source**: GSC organic CTR + actual leads attributed via `Lead.market_id`
- **Formula**: `actual_traffic = gsc_impressions × organic_ctr` then validate against `Lead` count
- **Accuracy**: Exact (for the pages that are ranking)
- **Use for**: Retrospective ROI validation — "did this page deliver?" vs. what we estimated
- **Data already available**: GSC integration exists; `Lead.market_id` exists

The platform should display the data quality stage alongside each ROI figure so users understand confidence level.

---

### 0.3 The Full Weighted ROI Formula

```
ROI = traffic_score × conversion_rate × close_rate × profit_per_job
```

Where each variable is:

| Variable | Source | Notes |
|---|---|---|
| `traffic_score` | See modular traffic system below | Deliberately downweighted — volume data is unreliable |
| `conversion_rate` | `Profile.site_conversion_rate` (default 3%) | Business-level setting |
| `close_rate` | `Service.close_rate` | Per-service; already in DB |
| `profit_per_job` | `Service.profit_per_job` | Per-service; already in DB |

> **Why downweight traffic?** Google Keyword Planner returns volume ranges (not exact counts), and even the ranges carry ±30–50% geographic variance. Traffic is still directionally useful for prioritization but should not dominate the score. Intent and profit are more reliable signals.

---

#### Modular Traffic System: Two Sources, One Interface

The traffic input is resolved from whichever data source is available, in priority order:

```
traffic_score = resolve_traffic(keyword, market)

resolve_traffic():
  IF ppc_impression_data exists for this keyword+market:
    → use Stage 2 (PPC-calibrated) path
  ELSE:
    → use Stage 1 (keyword planner range) path
```

This keeps the ROI formula identical regardless of data source. The enrichment is additive — PPC data slots in without changing how downstream calculations work.

---

#### Stage 1: Keyword Planner Range → Bucketed Representative Value

Google Keyword Planner never returns an exact number — it returns a range. Each range is assigned a conservative representative value (the low end of the range, not the midpoint) to avoid over-estimating:

| Volume Range | Representative Value | Rationale |
|---|---|---|
| 1–10 | 3 | Effectively negligible; mostly noise |
| 10–100 | 30 | Low-volume local niche |
| 100–1,000 | 200 | Core local keyword range |
| 1,000–10,000 | 2,000 | High-volume; often more competitive |
| 10,000–100,000 | 15,000 | Likely national/broad; rarely local |
| 100,000+ | 50,000 | National term; discount heavily |

> Using the low end of each bucket is intentional — it produces conservative ROI estimates. Overestimating leads to chasing low-value keywords. Conservative estimates build trust with users when actual traffic matches or exceeds projections.

Then apply the traffic multiplier stack to get `traffic_score`:

```
traffic_score = bucket_value
  × volume_reliability_weight    ← NEW: caps total traffic influence
  × kd_discount
  × intent_multiplier
  × local_multiplier
  × seasonal_multiplier
  × funnel_multiplier
```

**Volume Reliability Weight**: A flat downweight applied to all Stage 1 traffic figures to reflect that the range data is modeled, not measured. Recommended value: **0.5** (halves the traffic contribution). This means a keyword with 100–1,000 volume contributes `200 × 0.5 = 100` effective visits before other multipliers.

> When PPC data upgrades a keyword to Stage 2, the reliability weight is removed (set to 1.0) because the true volume is now measured.

---

#### Stage 2: PPC-Calibrated Traffic (Enrichment Layer)

When the business is running PPC campaigns and has Google Ads data connected:

```
true_market_volume = ppc_impressions / impression_share
traffic_score = true_market_volume × kd_discount × intent_multiplier × local_multiplier × seasonal_multiplier × funnel_multiplier
```

No volume reliability weight — this is measured data.

**Data flow for enrichment:**
```typescript
interface KeywordTrafficSource {
  stage: 1 | 2 | 3;
  raw_value: number;           // bucket_value (stage 1) or true_market_volume (stage 2/3)
  reliability_weight: number;  // 0.5 for stage 1, 1.0 for stage 2+
  source_label: string;        // "Keyword Planner estimate" | "PPC-calibrated" | "GSC measured"
}

function resolveTraffic(keyword: string, marketId: string): KeywordTrafficSource {
  const ppcData = getPPCData(keyword, marketId);  // null if no Google Ads connected
  if (ppcData) {
    return {
      stage: 2,
      raw_value: ppcData.impressions / ppcData.impression_share,
      reliability_weight: 1.0,
      source_label: 'PPC-calibrated',
    };
  }
  return {
    stage: 1,
    raw_value: volumeRangeToBucketValue(keyword.volume_range),
    reliability_weight: 0.5,
    source_label: 'Keyword Planner estimate',
  };
}
```

The ROI formula receives `raw_value × reliability_weight` as its traffic input — the formula itself never changes between stages.

---

#### Remaining Multipliers

**KD Discount** (keyword difficulty → realistic rank probability):
| KD Range | Achievable CTR |
|---|---|
| 0–30 | 20% (top 3 realistic) |
| 30–60 | 6% (top 10 realistic) |
| 60–80 | 2% (page 2 realistic) |
| 80+ | 0.5% (unlikely to rank near-term) |

**Intent Multiplier** (how likely searcher converts):
| Intent | Multiplier |
|---|---|
| Transactional ("hire HVAC Portland") | 1.0 |
| Commercial ("best HVAC Portland") | 0.6 |
| Informational ("how HVAC works") | 0.15 |

**Local Multiplier** (`EnrichedKeyword.localType`):
| localType | Multiplier | Rationale |
|---|---|---|
| `near_me` | ×1.3 | High intent, location-implicit |
| `city_name` | ×1.0 | Normal local search |
| `none` | ×0.7 | Generic, harder to rank locally |

**Seasonal Multiplier** (`EnrichedKeyword.seasonalMultiplier`):
- Direct from `EnrichedKeyword.seasonalMultiplier` (ratio of peak-month to annual average)
- Values >1.2 indicate seasonal keywords
- Apply when scheduling: create page 60 days before `EnrichedKeyword.peakMonth`

**Funnel Multiplier** (marketing funnel position):
| Funnel Stage | Multiplier | Example |
|---|---|---|
| BOFU (Bottom) | 1.0 | "emergency HVAC repair Portland" |
| MOFU (Middle) | 0.4 | "HVAC maintenance cost Portland" |
| TOFU (Top) | 0.1 | "how to stay warm in winter" |

> Funnel stage inferred from intent + keyword pattern. Transactional = BOFU, Commercial = MOFU, Informational = TOFU/MOFU.

---

#### Example Calculation (Stage 1 — No PPC)

| Input | Value |
|---|---|
| Keyword | "AC repair Portland OR" |
| Volume range | 100–1,000 → bucket value **200** |
| Reliability weight | **×0.5** (stage 1) → effective traffic **100** |
| KD | 45 → **×0.06** CTR |
| Intent | Transactional → **×1.0** |
| localType | `city_name` → **×1.0** |
| Seasonal | 1.2 (summer peak) → **×1.2** |
| Funnel | BOFU → **×1.0** |
| **traffic_score** | `100 × 0.06 × 1.0 × 1.0 × 1.2 × 1.0 = **7.2 visits/mo**` |
| Conversion rate | 3% |
| Close rate | 30% (`Service.close_rate`) |
| Profit per job | $400 (`Service.profit_per_job`) |
| **Monthly ROI** | `7.2 × 0.03 × 0.30 × $400 = **$25.92/mo**` |
| **Annual ROI** | `$25.92 × 12 = **$311/year**` |

#### Same Keyword, Stage 2 (PPC Connected)

| Input | Value |
|---|---|
| PPC impressions | 400/mo |
| Impression share | 40% |
| **True market volume** | `400 / 0.4 = **1,000 searches/mo**` |
| Reliability weight | **×1.0** (measured) |
| KD, intent, local, seasonal, funnel | same as above |
| **traffic_score** | `1,000 × 0.06 × 1.0 × 1.0 × 1.2 × 1.0 = **72 visits/mo**` |
| **Monthly ROI** | `72 × 0.03 × 0.30 × $400 = **$259.20/mo**` |
| **Annual ROI** | `$259.20 × 12 = **$3,110/year**` |

> The 10× difference between Stage 1 and Stage 2 illustrates why downweighting stage 1 is correct — the planner estimate (200) happened to be 5× below the true volume (1,000). Conservative estimates prevent false confidence; PPC data reveals the real opportunity.

---

### 0.4 Keyword-to-Page Assignment (Cannibalization Prevention)

Keyword cannibalization occurs when multiple pages on the same site target the same keyword. Google picks one to rank (usually the wrong one), which dilutes authority. AI systems are especially prone to this because they generate content independently per page without awareness of what other pages already target.

**The solution is a keyword assignment table with a UNIQUE constraint.**

#### `keyword_assignments` Table

```sql
CREATE TABLE keyword_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  keyword     text NOT NULL,                    -- normalized lowercase
  page_id     uuid REFERENCES site_pages(id) ON DELETE SET NULL,
  market_id   uuid REFERENCES markets(id),
  service_id  uuid REFERENCES services(id),
  volume      int,
  kd          int,
  intent      text,                             -- 'transactional' | 'commercial' | 'informational' | 'branded' (matches EnrichedKeyword.intent)
  local_type  text,                             -- 'near_me' | 'city_name' | 'none'
  roi_score   numeric,                          -- computed, stored for sorting
  data_stage  int DEFAULT 1,                    -- 1=estimated, 2=ppc_calibrated, 3=measured
  assigned_at timestamptz DEFAULT now(),
  UNIQUE (business_id, keyword)                 -- ONE keyword → ONE page, enforced at DB level
);
```

**Key behaviors:**
- Before any page can claim a keyword, check this table
- If a keyword is already assigned to another page, the new page cannot use it as `primaryKeyword`
- Secondary keywords (`keywords[]` on a page) should also be checked and reserved
- When a page is deleted, its keyword assignments are freed (`ON DELETE SET NULL`) and become available for reassignment
- The AI generation prompt must include "do not optimize for any keyword in this list: [assigned keywords not belonging to this page]"

#### Keyword Assignment Flow

```
1. Run keyword research for business + market
2. Compute ROI score for each keyword (formula above)
3. Sort all keywords by ROI score descending
4. For each keyword (highest ROI first):
   a. Find the most appropriate page type (service page / city landing / blog)
   b. If no page exists yet → create a "recommended" page suggestion
   c. If page exists → assign keyword to it (INSERT INTO keyword_assignments)
   d. Skip if already assigned (UNIQUE constraint handles this)
5. Output: prioritized page creation queue
```

---

### 0.5 Silo Architecture

A silo groups related pages and concentrates topical authority in one place, preventing link equity from leaking across unrelated topics.

#### Silo Structure for a Local Service Business

```
Domain Root
├── /[city-state]/                          ← City landing pages (hub)
│   ├── /[city-state]/[service]/            ← Location service pages (spokes)
│   └── /[city-state]/blog/                 ← Local blog posts
├── /services/[service]/                    ← Service overview pages (national)
└── /blog/                                  ← General blog (non-local)
```

**Example for "Portland HVAC" silo:**
```
/portland-or/                               ← "HVAC Company in Portland, OR"
├── /portland-or/ac-repair/                 ← "AC Repair in Portland, OR"
├── /portland-or/furnace-installation/      ← "Furnace Installation in Portland, OR"
├── /portland-or/hvac-maintenance/          ← "HVAC Maintenance in Portland, OR"
└── /portland-or/blog/ac-tune-up-tips/      ← "5 Signs Your AC Needs Tuning (Portland)"
```

#### Internal Linking Rules (Authority Flow)

| From | To | Rationale |
|---|---|---|
| City landing page | Each service page in that city | Hub distributes authority to spokes |
| Service page | City landing page | Spokes reference the hub |
| Service page | Service overview page | Passes topical authority upward |
| Blog post | Most relevant service page | Content supports money pages |
| Blog post | City landing page | Reinforces local relevance |
| Service page | Other city pages for SAME service | Cross-city authority for the service |

**Never link:**
- Blog posts to each other (creates a flat structure, dilutes authority)
- Service pages for different services to each other (crosses silos)
- City landing pages to other city landing pages (dilutes geographic relevance)

#### URL Slug Generation Rules

```typescript
function generateSlug(city: string, state: string, service?: string): string {
  const citySlug = `${city}-${state}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!service) return `/${citySlug}/`;
  const serviceSlug = service.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `/${citySlug}/${serviceSlug}/`;
}
// "Portland", "OR", "AC Repair" → "/portland-or/ac-repair/"
// "Lake Oswego", "OR", null → "/lake-oswego-or/"
```

---

### 0.6 Integration with Existing Platform

#### `cannibalizationDetection.ts`
The existing file at `src/lib/siteAudit/cannibalizationDetection.ts` detects cannibalization after the fact (post-crawl analysis). The `keyword_assignments` table prevents it proactively. These are complementary:
- `keyword_assignments` → prevent at generation time
- `cannibalizationDetection.ts` → detect if it slips through (e.g., manually edited pages)

#### `ContentStrategy` Integration
- `CalendarItemV2.primaryKeyword` → look up in `keyword_assignments` to find the target page
- When a calendar item of type `website_addition` is "built", it creates a `site_pages` record and inserts into `keyword_assignments`
- The ROI score from `keyword_assignments.roi_score` should be surfaced on the calendar card

#### `Service` Data Already Available
The two most important per-service ROI inputs are already in the DB:
- `Service.profit_per_job` → the `P` in the formula
- `Service.close_rate` → the `CR` in the formula

No new data collection needed for Stage 1 ROI estimation.

#### Future: Google Ads API (Stage 2)
To upgrade from Stage 1 → Stage 2 ROI:
1. Connect Google Ads account (OAuth, similar to GSC connection)
2. Pull `campaigns.impressions` + `campaigns.search_impression_share` per keyword
3. Compute `true_volume = impressions / impression_share`
4. Update `keyword_assignments.volume` and set `data_stage = 2`
5. Recompute `roi_score` and re-sort the page creation queue

This is the highest-leverage data upgrade available — it converts guesses into measurements.

---

## 1. Code Editor UI

> ⚠️ Bundle sizes in original draft were wrong. Corrected below with verified figures.

### Option A: CodeMirror 6 (`@uiw/react-codemirror`)

**Install**:
```bash
npm install @codemirror/state @codemirror/view @codemirror/lang-html @codemirror/lang-css @codemirror/lang-javascript @uiw/react-codemirror
```

**Bundle size**: ~120–150 KB gzipped (HTML + CSS + JS languages + core). Fully tree-shakeable — only pay for languages you import.

**Multi-tab implementation** (two approaches):

*Approach 1 — Compartment swap (one instance, swap language):*
```tsx
import { Compartment } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

const language = new Compartment();
// Switch language at runtime:
view.dispatch({ effects: language.reconfigure(html()) }); // or css(), javascript()
```

*Approach 2 — Separate instances per tab (recommended):*
```tsx
import dynamic from 'next/dynamic';
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });

// HTML tab
<CodeMirror extensions={[html()]} value={htmlCode} onChange={setHtmlCode} />
// CSS tab
<CodeMirror extensions={[css()]} value={cssCode} onChange={setCssCode} />
// JS tab
<CodeMirror extensions={[javascript()]} value={jsCode} onChange={setJsCode} />
```

**Next.js / SSR**: `dynamic(..., { ssr: false })` required — `EditorView` accesses the DOM directly.
**Dark themes**: `@codemirror/theme-one-dark` built-in; many community themes via `@uiw/codemirror-themes`.
**Mobile**: Best of all three — CodeMirror 6 was redesigned specifically for touch. Works on iOS Safari and Android Chrome.
**License**: MIT. Free for commercial use.
**Maintenance**: Actively developed by Marijn Haverbeke (original author). GitHub activity high.
**Gotchas**: None major.

---

### Option B: Monaco Editor (`@monaco-editor/react`)

**Install**:
```bash
npm install @monaco-editor/react
```

**Bundle size**: ~1.5–2 MB gzipped. ⚠️ NOT tree-shakeable — bundles TypeScript language service, JSON schema validation, etc. even when unused. Uses Web Workers for language services.

**Multi-tab implementation** — use model-swapping to preserve undo history per tab:
```tsx
import Editor, { useMonaco } from '@monaco-editor/react';

// Create a model per language
const htmlModel  = monaco.editor.createModel(htmlCode,  'html');
const cssModel   = monaco.editor.createModel(cssCode,   'css');
const jsModel    = monaco.editor.createModel(jsCode,    'javascript');

// Switch tab:
editorRef.current.setModel(htmlModel); // swaps to HTML tab
```

**Next.js / SSR**: `dynamic(..., { ssr: false })` required. `@monaco-editor/react` loads Monaco via CDN by default, bypassing the webpack plugin requirement. For self-hosted builds, webpack config is needed:
```js
// next.config.js (only needed for offline/self-hosted workers)
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
config.plugins.push(new MonacoWebpackPlugin({ languages: ['html', 'css', 'javascript'] }));
```

**Dark themes**: `vs-dark` and `hc-black` built-in. Supports VS Code theme format.
**Mobile**: ⚠️ Poor. Microsoft explicitly does not support mobile. Virtual keyboard causes layout issues on iOS/Android.
**License**: MIT. Free for commercial use.
**Maintenance**: Actively maintained by Microsoft. `@monaco-editor/react` at 4.6.x.
**Gotchas**: Heavy bundle, no mobile, worker files must be accessible at a known URL path.

---

### Option C: Ace Editor (`react-ace`)

**Install**:
```bash
npm install react-ace ace-builds
```

**Bundle size**: ~150–200 KB gzipped (core ~100 KB + HTML/CSS/JS modes ~50–100 KB lazy-loaded). ⚠️ Mode imports are side-effect imports that must be loaded inside `dynamic()` in Next.js.

**Multi-tab implementation**:
```tsx
const AceEditor = dynamic(
  async () => {
    await import('ace-builds/src-noconflict/mode-html');
    await import('ace-builds/src-noconflict/mode-css');
    await import('ace-builds/src-noconflict/mode-javascript');
    await import('ace-builds/src-noconflict/theme-monokai');
    return import('react-ace');
  },
  { ssr: false }
);

<AceEditor mode="html" theme="monokai" value={htmlCode} onChange={setHtmlCode} />
```

**Next.js / SSR**: `dynamic(..., { ssr: false })` required. ⚠️ Webpack 5 (used by Next.js) produces "Critical dependency" warnings with `ace-builds`. Fix:
```js
// next.config.js
config.resolve.alias['ace-builds'] = require.resolve('ace-builds/src-noconflict');
```

**Dark themes**: Extensive — `monokai`, `dracula`, `tomorrow_night`, `solarized_dark`, etc.
**Mobile**: Limited. Better than Monaco but not designed for mobile.
**License**: BSD. Free for commercial use.
**Maintenance**: ⚠️ Slowing significantly. `react-ace` is near maintenance-only. PRs are slow to be reviewed. Not recommended for new projects.
**Gotchas**: Webpack 5 warnings, mode import side effects, declining development.

---

### Option D: Plain `<textarea>` + Prism.js

**Bundle size**: ~50 KB gzipped.
**Pros**: Zero complexity, instant load.
**Cons**: Known rendering glitches with highlight-over-textarea. No autocomplete. Poor UX for large files.
**Best for**: MVP only if you want zero dependencies and users write minimal code.

---

### Comparison Table

| | CodeMirror 6 | Monaco | Ace | textarea+Prism |
|---|---|---|---|---|
| **Bundle (gzipped)** | ~120–150 KB | ~1.5–2 MB | ~150–200 KB | ~50 KB |
| **Tree-shakeable** | Yes | No | Partial | N/A |
| **Mobile** | Good | Poor | Limited | OK |
| **Multi-tab** | Compartment / separate instances | Model swap | Separate instances | Manual |
| **SSR / Next.js** | `dynamic ssr:false` | `dynamic ssr:false` | `dynamic ssr:false` + mode imports inside | No issue |
| **Maintenance** | Active | Active (Microsoft) | Slowing | N/A |
| **License** | MIT | MIT | BSD | MIT |

### Recommendation: **CodeMirror 6 with `@uiw/react-codemirror`**
10x lighter than Monaco, best mobile support, clean language switching, active development.

---

## 2. Content Generation (Claude Integration)

### Available Models (current as of March 2026)

| Model | Context | Max Output | Use case |
|---|---|---|---|
| `claude-opus-4-6` | 200K tokens | 32K | Complex, multi-section pages |
| `claude-sonnet-4-6` | 200K tokens | 8192 default, up to 64K | Blog posts, foundation pages |
| `claude-haiku-4-5-20251001` | 200K tokens | 8192 | Quick section generation |

### Option A: Anthropic SDK streaming (`@anthropic-ai/sdk`)

**Install**: `npm install @anthropic-ai/sdk`

**API Route** — streams text tokens directly to the browser:
```typescript
// src/app/api/website-builder/generate/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  const { calendarItem, business, auditData } = await req.json();

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: buildSystemPrompt(business),
    messages: [{ role: 'user', content: buildPagePrompt(calendarItem, auditData) }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
```

**Client-side consumption**:
```tsx
const res = await fetch('/api/website-builder/generate', { method: 'POST', body: JSON.stringify(data) });
const reader = res.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  setHtmlCode(prev => prev + decoder.decode(value, { stream: true }));
}
```

**Pros**: Full control over prompt, streams directly into CodeMirror editor.
**Cons**: Partial HTML arrives mid-stream (incomplete tags). Need to debounce preview updates.

---

### Option B: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — Simpler alternative

**Install**: `npm install ai @ai-sdk/anthropic`

```typescript
// src/app/api/website-builder/generate/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
  });
  return result.toDataStreamResponse();
}
```

**Pros**: Much simpler implementation. First-class Next.js support. Built-in `useCompletion` / `useChat` React hooks for client.
**Cons**: Additional dependency; slight abstraction over the raw Anthropic SDK. Less control over exact SSE format.
**Best for**: If you want the simplest possible streaming implementation.

---

### Option C: Non-streaming (single response)

Standard `POST` to `/api/website-builder/generate` → Claude returns full HTML → populate editor.

**Pros**: Simpler — no streaming state management.
**Cons**: No feedback while waiting; long pages (4K tokens) may take 30–60 seconds with no UI update.
**Best for**: Foundation pages where the template is pre-structured and generation is fast.

---

### Option D: Two-step (outline → full page)

1. Claude generates a structured JSON outline (sections, headings, key points).
2. User can edit the outline before committing.
3. Claude generates full HTML from the approved outline.

**Pros**: User has control before full generation. Lower chance of total regeneration.
**Cons**: Two API calls. More UI complexity (outline approval step).

---

### Option E: Template + Claude fills content slots

Pre-built HTML/CSS templates with `{{placeholder}}` tokens. Claude only generates content text, not markup.

**Pros**: Consistent design across pages. Lower token usage. Faster generation.
**Cons**: All pages look similar unless you have multiple templates. Template maintenance needed.
**Best for**: Foundation pages (About, Services, Contact) where structure should be consistent.

---

### Prompt Data Available from Existing Tools

| Source | Fields |
|---|---|
| `CalendarItemV2` | `title`, `primaryKeyword`, `keywords[]`, `action`, `rationale`, `type`, `roiValue`, `week` |
| `EnrichedKeyword` | `volume`, `difficulty`, `competition`, `intent`, `seasonalMultiplier`, `cpc` |
| `DetailedIssue` | `severity`, `category`, `title`, `fix` |
| `business` | `name`, `address`, `industry`, `city`, `state` |
| `LighthouseData` | `performance`, `accessibility`, `seo` scores |

### Location-Aware Prompt Context

Every generation call must include location and market context from the existing data model. Generic content does not serve local SEO.

**System prompt for location service pages**:
```typescript
function buildLocationPagePrompt(
  service: Service,
  location: BusinessLocation,
  market: Market,
  keywords: EnrichedKeyword[]
) {
  return `You are writing a local SEO service page for ${service.name} in ${location.city}, ${location.state}.

Business: ${business.name}
Service: ${service.name}
Location: ${location.address}, ${location.city}, ${location.state} ${location.zip}
Phone: ${location.phone}
Market: ${market.name} (covers: ${market.cities.join(', ')})

Target keywords (use naturally throughout):
${keywords.filter(k => k.localType !== 'none').map(k => `- "${k.keyword}" (volume: ${k.volume}, intent: ${k.intent})`).join('\n')}

Requirements:
- Reference ${location.city} and nearby cities in ${market.name} naturally throughout
- Include the business phone number ${location.phone} in a call-to-action
- Mention the specific address for local trust signals
- Write for "service in city" search intent — transactional, ready-to-hire visitors
- Include an FAQ section with locally-relevant questions
- Do NOT mention competitors by name
- Output valid semantic HTML5 only, no markdown`;
}
```

### Recommendation
- **Location service pages**: Option A (Anthropic SDK streaming) with location-aware prompt — primary use case
- **Blog posts**: Option A (streaming) with market-specific seasonal context
- **Foundation pages** (About, Contact): Option E (template + fill) — consistent structure
- **Bulk generation across all locations**: Option C (non-streaming, parallel API calls) — see Section 3

---

## 3. Multi-Location Page Generation (Bulk Automation)

This section covers the core automation value proposition: generating an entire set of location service pages in one operation, rather than one page at a time.

### The Automation Model

Given the existing data:
- `businesses[].locations[]` — all business locations
- `businesses[].markets[]` — all markets with city arrays
- `services[]` — all active services

The builder should be able to:

1. **Preview the page matrix** — show the user a grid of all location × service combinations
2. **Generate all pages** — one Claude call per page, run in parallel (batched to avoid rate limits)
3. **Review and publish** — user reviews generated drafts, publishes individually or in bulk

### Option A: Full Matrix Generation (Location × Service)

```typescript
// src/app/api/website-builder/generate-batch/route.ts
export async function POST(req: Request) {
  const { businessId } = await req.json();

  // Load all data
  const [locations, services, markets, keywords] = await Promise.all([
    supabase.from('business_locations').select('*').eq('business_id', businessId),
    supabase.from('services').select('*').eq('business_id', businessId).eq('is_enabled', true),
    supabase.from('markets').select('*').eq('business_id', businessId),
    // keywords from most recent content strategy
    supabase.from('content_strategies').select('keywords').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1),
  ]);

  // Build the matrix: one page per location × service
  const matrix = locations.data!.flatMap(loc =>
    services.data!.map(svc => ({ location: loc, service: svc }))
  );

  // Generate all pages (batched, 3 at a time to respect rate limits)
  const results = await pLimit(3)(
    matrix.map(({ location, service }) => async () => {
      const marketForLocation = markets.data!.find(m => m.cities.includes(location.city));
      const relevantKeywords = filterKeywordsForLocation(keywords, location, service);
      const html = await generateLocationPage(service, location, marketForLocation, relevantKeywords);
      const slug = `${toSlug(location.city)}/${toSlug(service.name)}`;

      return supabase.from('site_pages').insert({
        business_id: businessId,
        location_id: location.id,
        market_id: marketForLocation?.id,
        service_id: service.id,
        slug,
        title: `${service.name} in ${location.city}, ${location.state}`,
        type: 'location_service',
        html,
        status: 'draft',
      });
    })
  );

  return Response.json({ generated: results.length });
}
```

**Pros**: One-click generation of the full local SEO page set. The core automation value.
**Cons**: Can be expensive in Claude API tokens at scale. Need batching + rate limiting.
**Rate limit consideration**: Anthropic allows high concurrency on Sonnet. Batch 3–5 at a time with `p-limit`.

---

### Option B: Market-by-Market Generation

User selects one market → generates all location × service pages for that market only.

**Pros**: More controlled. User can review one market's pages before moving to the next.
**Cons**: Multiple interactions to cover all markets.
**Best for**: Businesses with many markets where full matrix is overwhelming.

---

### Option C: Calendar-Driven Generation

Instead of the full matrix, generate only what the ContentStrategy calendar has planned. `CalendarItemV2` items with `type: 'website_addition'` already represent what needs to be built.

```typescript
// Get all pending website_addition calendar items
const pendingItems = calendarV2.filter(
  item => item.type === 'website_addition' && item_statuses[item.id] !== 'done'
);
// Generate a page for each → mark as done on publish
```

**Pros**: Aligned with the strategy. No over-generation. Uses the calendar as the task queue.
**Cons**: Only as good as the content strategy coverage. Doesn't generate the full matrix upfront.
**Best for**: Ongoing content automation after the initial site is built.

---

### Page Matrix UI

The builder dashboard should show a matrix view:

```
           Portland    Lake Oswego  Vancouver   Camas
HVAC Repair   ✓ Live    Draft        ✗ Missing  ✗ Missing
AC Install    Draft     ✗ Missing    ✗ Missing  ✗ Missing
Furnace Tune  ✗ Missing ✗ Missing   ✗ Missing  ✗ Missing
```

- **✓ Live** — page published, click to edit
- **Draft** — generated but not published, click to review/publish
- **✗ Missing** — not yet generated, click to generate or bulk-generate row/column

This makes the automation visible and gives the customer a clear sense of progress.

---

### Recommendation
- **MVP**: Option C (calendar-driven) — implement "Build this" on calendar items first
- **v2**: Option B (market-by-market) — add the matrix UI + market-level bulk generation
- **Growth tier**: Option A (full matrix automation) — one-click "Build all missing pages"

---

## 4. Page Serving & Hosting Model

### Option A: Next.js Route Handler (catch-all) — Zero new infrastructure

> **⚠️ INCOMPLETE CODE — see Section 22 for required additions.** The example below is a minimal skeleton. The production route handler MUST also include: (1) canonical URL injection (Section 22.2.1), (2) noindex on non-published pages (Section 22.2.3), (3) schema.org JSON-LD injection from `schema_json` column, and (4) serve drafts/scheduled pages for preview (with noindex) instead of returning 404. The combined handler is shown in Section 12 Option A.

> **⚠️ `business_slug` column gap**: This query uses `.eq('business_slug', businessSlug)` but `site_pages` has no `business_slug` column — it has `business_id UUID`. The route handler must first resolve the business slug to a `business_id` by looking up the `businesses` table (see DB Schema gap note in Section 13).

```typescript
// src/app/sites/[businessSlug]/[...slug]/route.ts
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ businessSlug: string; slug: string[] }> }
) {
  const { businessSlug, slug } = await params; // ⚠️ params must be awaited in Next.js 15+
  const supabase = await createClient();

  const { data: page } = await supabase
    .from('site_pages')
    .select('html, css, js, meta_title, meta_description')
    .eq('business_slug', businessSlug)
    .eq('slug', slug.join('/'))
    .eq('status', 'published')
    .single();

  if (!page) return new Response('Not found', { status: 404 });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.meta_title ?? ''}</title>
  <style>${page.css ?? ''}</style>
</head>
<body>
  ${page.html ?? ''}
  <script>${page.js ?? ''}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
```

> ⚠️ Next.js 15+ change: Route handlers default to **dynamic (no cache)**. Explicitly add `export const revalidate = 300` or `Cache-Control` headers to enable caching.

**URL structure**: `https://app.scorchlocal.com/sites/acme-plumbing/blog/my-post`
**Pros**: Zero new infrastructure. Deployed automatically with the app.
**Cons**: Pages are on ScorchLocal's domain until custom domain middleware is added.

---

### Option B: Supabase Storage + Public CDN URL

Render HTML → upload as `.html` file to Supabase Storage public bucket → serve via CDN URL.

**Free tier**: 1 GB storage, 2 GB/month bandwidth.
**Pro tier**: 100 GB storage, 200 GB/month bandwidth.
**CDN**: Yes — Cloudflare CDN for public bucket files.
**URL format**: `https://<ref>.supabase.co/storage/v1/object/public/<bucket>/acme/post.html`

**Pros**: Static file serving — very fast, highly cacheable.
**Cons**: URL is `*.supabase.co` — not brandable. Must re-upload on every edit. No dynamic content.

---

### Option C: Vercel Deployment API

On publish, use Vercel API to create/update a deployment with the page as a static file.

**Pros**: Vercel CDN + custom domains handled via Vercel Domains API. SSL automatic.
**Cons**: Deployment takes 30–90 seconds. Rate limits. Complex project-per-business management.
**API**: `POST https://api.vercel.com/v13/deployments`

---

### Option D: Cloudflare Pages API

Push HTML to Cloudflare Pages via API on publish. Cloudflare handles CDN and custom domains.

**Pros**: Cloudflare's global CDN. Custom domains via Cloudflare for SaaS.
**Cons**: Same 30–60 second deployment latency. Complex project management per customer.

---

### Option E: AWS S3 + CloudFront

Upload HTML to S3 → CloudFront CDN → custom domain via ACM.
**Pros**: Highly scalable, production-grade.
**Cons**: Significant AWS setup. Overkill for initial implementation.

---

### Recommendation: **Option A (Next.js catch-all route)**
Ships in a day. When custom domains are added, middleware intercepts the `Host` header and rewrites to the same catch-all route — no extra infrastructure.

---

## 4. Custom Domain Management

### Option A: Vercel Domains API

**How it works**: Call Vercel's REST API to add a domain to your project. Vercel provisions SSL automatically via Let's Encrypt.

**API endpoint**:
```
POST https://api.vercel.com/v10/projects/{projectId}/domains
Authorization: Bearer <VERCEL_TOKEN>
Content-Type: application/json

{ "name": "blog.theirdomain.com" }
```

**Remove domain**:
```
DELETE https://api.vercel.com/v10/projects/{projectId}/domains/{domain}
```

**Verify domain** (when claimed by another account):
```
POST https://api.vercel.com/v10/projects/{projectId}/domains/{domain}/verify
```

**DNS records customer must add**:
| Domain type | Record | Value |
|---|---|---|
| Subdomain (e.g. `blog.theirdomain.com`) | CNAME | Project-unique hash, e.g. `d1d4fc829fe7bc7c.vercel-dns-017.com` |
| Apex/root (`theirdomain.com`) | A | `76.76.21.21` |
| Wildcard (`*.theirdomain.com`) | Nameservers | `ns1.vercel-dns.com` / `ns2.vercel-dns.com` (full NS delegation required) |
| Ownership conflict | TXT | Unique token shown in dashboard / API response |

**SSL method**: Let's Encrypt — HTTP-01 for non-wildcard (automatic), DNS-01 for wildcard (requires Vercel NS).
**IPv6**: ⚠️ Not supported (no AAAA records).
**Custom SSL certs**: Enterprise plan only.

**Pricing**:
| Plan | Cost | Custom domains |
|---|---|---|
| Hobby | Free | 50/project, **non-commercial only** ⚠️ |
| Pro | $20/month | Unlimited |
| Enterprise | Custom | Unlimited |

**Rate limits**: Not publicly documented in official REST API reference.
**Webhooks**: Not confirmed for domain/SSL status events.

**Pros**: Automatic SSL, single API call, no cert management.
**Cons**: Only works if app is deployed on Vercel. Hobby plan is non-commercial. No AAAA records.

---

### Option B: Cloudflare for SaaS (Custom Hostnames)

**How it works**: Set up a Cloudflare zone as your "SaaS zone". Add each customer domain as a Custom Hostname via API. Cloudflare provisions SSL and routes traffic.

**API endpoint**:
```
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames
Authorization: Bearer <CF_API_TOKEN>
Content-Type: application/json

{
  "hostname": "blog.theirdomain.com",
  "ssl": {
    "method": "http",
    "type": "dv",
    "settings": { "http2": "on", "min_tls_version": "1.2" }
  }
}
```

**Check status**:
```
GET /zones/{zone_id}/custom_hostnames?hostname=blog.theirdomain.com
```
Returns `ssl.status`: `pending_validation` → `pending_issuance` → `pending_deployment` → `active`

**Remove domain**:
```
DELETE /zones/{zone_id}/custom_hostnames/{custom_hostname_id}
```

**DNS record customer must add**: `CNAME blog.theirdomain.com → <your-cf-zone-target>`
**Apex domains**: Customer needs CNAME flattening at their registrar (Cloudflare DNS supports this; others vary). Alternative: A record to your server IP.

**SSL methods**: DigiCert (default) or Let's Encrypt. HTTP validation or DNS validation (TXT under `_acme-challenge.`).
**SSL timing**: 90 seconds – 5 minutes (HTTP), up to 24 hours (propagation edge cases).

**Pricing**: ⚠️ Requires **Business or Enterprise Cloudflare zone** for the SaaS zone (not Hobby or Pro).
- First 100 custom hostnames: free
- Beyond 100: ~$0.10/hostname/month

**API rate limits**: 1,200 requests per 5 minutes per token.
**Webhooks**: Yes — Cloudflare Notifications system for certificate status changes.

**Pros**: Platform-agnostic (works on any host), global CDN for all customer pages, automatic SSL, webhook support.
**Cons**: Requires Business/Enterprise CF zone (higher cost than implied). Apex domains tricky without CNAME flattening.

---

### Option C: Let's Encrypt + ACME (self-managed)

**How it works**: Your server runs an ACME client (acme.sh, certbot, or programmatic via `acme-client` npm package) to request/renew certificates for each customer domain.

**ACME endpoints**:
- Production: `https://acme-v02.api.letsencrypt.org/directory`
- Staging (no rate limits, untrusted certs): `https://acme-staging-v02.api.letsencrypt.org/directory`

**Challenge types**:
- **HTTP-01**: Let's Encrypt fetches `http://<domain>/.well-known/acme-challenge/<token>`. Works for non-wildcard domains. Port 80 must be accessible.
- **DNS-01**: Customer adds `_acme-challenge.<domain> TXT <token>`. Required for wildcard certs. Needs DNS API automation for SaaS use.

**Rate limits**:
| Limit | Value |
|---|---|
| Certificates per registered domain/week | **50** |
| Failed validations per account/hostname/hour | 5 |
| New orders per account per 3 hours | 300 |
| Duplicate cert (same domain set) per week | 5 |

**Certificate validity**: 90 days. Renew at 60 days. Renewals don't count toward the 50/week limit.

**Pros**: Free SSL. No per-domain cost. Full control.
**Cons**: Requires persistent server (not serverless-friendly). Cert renewal management. Rate limits can be hit during rapid onboarding.
**Best for**: Self-hosted VPS deployments (not Vercel/serverless).

---

### Option D: Caddy (Auto-HTTPS via On-Demand TLS)

**How it works**: Caddy is a reverse proxy with automatic HTTPS. "On-Demand TLS" obtains a cert on the first HTTPS request for each new domain. You implement an `ask` endpoint Caddy calls before issuing.

**Caddyfile config**:
```
{
  on_demand_tls {
    ask https://yourapp.com/api/check-domain
    interval 2m
    burst 5
  }
}

:443 {
  tls {
    on_demand
  }
  reverse_proxy localhost:3000
}
```

**Your `ask` endpoint** — returns `200 OK` to allow cert, any other status to deny:
```typescript
// src/app/api/check-domain/route.ts
export async function GET(req: Request) {
  const domain = new URL(req.url).searchParams.get('domain');
  const { data } = await supabase.from('business_domains').select().eq('domain', domain).single();
  return data ? new Response('OK') : new Response('Forbidden', { status: 403 });
}
```

**Admin API** (localhost:2019 only — never expose publicly):
```
PUT    http://localhost:2019/config/           — replace full config
PATCH  http://localhost:2019/config/{path}     — update config at path
GET    http://localhost:2019/config/           — get current config
DELETE http://localhost:2019/config/{path}     — remove config
POST   http://localhost:2019/load              — graceful config reload
```

**Wildcard domains**: ⚠️ NOT supported with On-Demand TLS. DNS-01 challenge required for wildcards, which needs a DNS provider plugin.
**SSL timing**: ~1–5 seconds added to the first request for a new domain (cert acquired during TLS handshake).
**Pricing**: Free (Apache 2.0 open source). Pay only for server infrastructure.
**Webhooks**: No built-in webhook for cert events. Plugin (`caddy-events`) available.
**Config persistence**: ⚠️ Config is in-memory by default; must write to disk or re-apply after restart.

**Pros**: Fully automatic HTTPS. No Let's Encrypt management code. Great for VPS deployments.
**Cons**: Requires your own server. No wildcard On-Demand TLS. Admin API must stay localhost.

---

### Option E: AWS Certificate Manager (ACM) + CloudFront

**DCV method**: ACM uses CNAME validation exclusively for auto-renewable certificates:
```
_<token1>.blog.theirdomain.com CNAME _<token2>.acm-validations.aws.
```
This prefixed-label CNAME bypasses the apex CNAME restriction (underscore prefix is a distinct label, not zone apex).

**SSL timing**: 5–30 minutes typical; up to 72 hours worst case. ACM polls every ~1 hour.
**Pricing**: Free (ACM certs are free). CloudFront has separate data transfer costs.
**Pros**: Enterprise-grade. Cert auto-renews as long as CNAME validation record stays.
**Cons**: Very complex setup (ACM + CloudFront + Lambda@Edge for routing). High AWS expertise required. Overkill for MVP.

---

### Comparison Table

| | Vercel | Cloudflare for SaaS | Let's Encrypt | Caddy | ACM |
|---|---|---|---|---|---|
| **Add domain** | `POST /v10/projects/{id}/domains` | `POST /zones/{id}/custom_hostnames` | ACME `new-order` | Config API PATCH | `RequestCertificate` API |
| **SSL** | Auto (Let's Encrypt) | Auto (DigiCert or LE) | Self-managed | Auto (Let's Encrypt) | Auto (ACM) |
| **SSL timing** | Minutes | 90s–5min | Minutes | ~1–5s first request | 5–30min |
| **Customer DNS** | A `76.76.21.21` or CNAME hash | CNAME to CF zone | A/CNAME to your server | A/CNAME to your server | A/CNAME to CloudFront |
| **Apex domain** | A record | CNAME flatten or A | A record | A record | A → CloudFront |
| **Wildcard** | Yes (Vercel NS required) | Yes (Enterprise) | Yes (DNS-01 only) | No | Yes |
| **Pricing** | Free (Hobby, non-commercial) / $20/mo Pro (unlimited) | ~$0.10/hostname/mo after 100 free (Business CF zone required) | Free | Free (+ server cost) | Free certs |
| **Platform** | Vercel only | Any host | Self-hosted | Self-hosted | AWS |
| **Webhooks** | Not confirmed | Yes (CF Notifications) | No | No (plugin only) | No (polling) |

### Recommendation
- **On Vercel**: Vercel Domains API. Simplest path, automatic everything.
- **Platform-agnostic or on other hosts**: Cloudflare for SaaS. Note: requires Business/Enterprise CF zone.
- **Self-hosted VPS**: Caddy with On-Demand TLS.

---

## 5. DNS Verification

### The APEX / Root Domain Problem

**RFC 1034 §3.6.2** forbids CNAME records at the zone apex because a CNAME must be the only record at its label — which would eliminate the required SOA and NS records.

**Solutions by platform**:
| Approach | Works at apex? | Notes |
|---|---|---|
| **A record** (static IP) | Yes | Universal; loses some edge routing intelligence |
| **ALIAS/ANAME** (proprietary) | Yes | Route 53, Cloudflare DNS, DNSimple, NS1 — NOT standard DNS |
| **NS delegation** | Yes | Customer transfers full zone control to your DNS |
| **CNAME** | ❌ No | RFC-prohibited at apex |

ALIAS/ANAME records are **non-standard proprietary extensions** — the nameserver resolves the CNAME target server-side and returns A records to the client. Only works if the customer's registrar supports it.

---

### Option A: CNAME Verification (subdomains only)

Customer adds: `blog.theirdomain.com CNAME <unique-hash>.scorchlocal.com`

**Programmatic check**:
```typescript
import { Resolver } from 'node:dns/promises';

const resolver = new Resolver();
resolver.setServers(['8.8.8.8:53', '1.1.1.1:53']); // pin to known resolvers

async function verifyCname(domain: string, expectedTarget: string): Promise<boolean> {
  try {
    const cnames = await resolver.resolveCname(domain);
    return cnames.some(c => c.toLowerCase() === expectedTarget.toLowerCase());
  } catch (err: any) {
    if (['ENOTFOUND', 'ENODATA'].includes(err.code)) return false; // non-retriable
    throw err; // ETIMEOUT, ESERVFAIL — retriable
  }
}
```

> ⚠️ NEVER use `dns.lookup()` for verification — it uses the OS resolver cache (`/etc/hosts` + local cache), not authoritative DNS. Use `dns/promises Resolver` with explicit DNS servers.

---

### Option B: TXT Record Ownership Verification

Customer adds: `_scorchlocal-verify.theirdomain.com TXT "abc123xyz"`

**Purpose**: Proves domain ownership before accepting it. Can be added without disrupting existing DNS. Recommended as a preliminary step.

**Check**:
```typescript
const txtRecords = await resolver.resolveTxt('_scorchlocal-verify.theirdomain.com');
const flat = txtRecords.flat();
return flat.includes(expectedToken);
```

---

### Option C: A Record Verification (apex domains)

Customer adds: `theirdomain.com A 76.76.21.21` (Vercel's IP) or your server's IP.

**Check**:
```typescript
const addresses = await resolver.resolve4('theirdomain.com');
return addresses.includes(expectedIp);
```

---

### Option D: CAA Record Check (⚠️ New — not in original draft)

If a customer's zone has CAA records, they restrict which CAs can issue certificates. If their CAA only allows `letsencrypt.org` but you use DigiCert (Cloudflare for SaaS default), cert issuance fails.

**Check before accepting domain**:
```typescript
try {
  const caaRecords = await resolver.resolveCaa('theirdomain.com');
  // [{ critical: 0, issue: 'letsencrypt.org' }]
  // Warn user if their CAA blocks your chosen CA
} catch (err: any) {
  if (err.code === 'ENODATA') return []; // no CAA records = any CA allowed
}
```

---

### Polling Strategy

**TTL best practice**: Ask customers to lower their domain's TTL to 300 seconds (5 minutes) 24–48 hours before pointing DNS. Default TTLs of 3600–86400 seconds mean old values persist for up to 24 hours after changes.

**Recommended polling with exponential backoff**:
```typescript
async function pollDnsVerification(domain: string, expectedCname: string) {
  let delay = 10_000; // 10 seconds initial
  const maxDelay = 300_000; // 5 minutes max
  const maxAttempts = 48; // ~2 hours total

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const verified = await verifyCname(domain, expectedCname);
    if (verified) return { verified: true, attempt };

    const jitter = delay * 0.2 * (Math.random() * 2 - 1); // ±20%
    await sleep(Math.min(delay + jitter, maxDelay));
    delay = Math.min(delay * 1.5, maxDelay); // 1.5x backoff
  }
  return { verified: false };
}
```

**Error code handling**:
| Code | Meaning | Action |
|---|---|---|
| `ENOTFOUND` | Domain doesn't exist (NXDOMAIN) | Non-retriable — stop |
| `ENODATA` | No record of this type | Non-retriable — keep polling |
| `ETIMEOUT` | Resolver timeout | Retriable |
| `ESERVFAIL` | Auth server failure | Retriable |
| `ECONNREFUSED` | Resolver unreachable | Retriable |

---

### SSL DCV (Domain Control Validation) for Certs

After DNS verification passes, SSL issuance requires a separate DCV step with the CA. Two methods:

| Method | How | Supported by |
|---|---|---|
| **CNAME DCV** | `_acme-challenge.domain CNAME <token>.dcv.digicert.com` | Cloudflare, ACM (preferred — auto-renews) |
| **TXT DCV** | `_acme-challenge.domain TXT <token>` | Let's Encrypt, Cloudflare, ACM |
| **HTTP DCV** | `/.well-known/acme-challenge/<token>` file | Let's Encrypt HTTP-01 (domain must already point to you) |

---

## 6. SSL Certificate Provisioning

### Provisioning Timelines

| Provider | Typical | Worst Case | Notes |
|---|---|---|---|
| Vercel (Let's Encrypt) | 1–5 min after DNS propagates | 30 min | HTTP-01 for non-wildcard; auto-renews |
| Cloudflare for SaaS (DigiCert) | 90s – 5 min | 24 hours (propagation) | API returns `ssl.status` to poll |
| Cloudflare for SaaS (Let's Encrypt) | 1–15 min | 24 hours | Configurable |
| ACM | 5–30 min | 72 hours | Polls every ~1 hour; CNAME DCV |
| Let's Encrypt (self-managed) | Seconds – 5 min | Depends on retry config | HTTP-01 fastest; DNS-01 slower |
| Caddy On-Demand TLS | 1–5 seconds added to first request | Minutes | Acquires cert during TLS handshake |

### Status Lifecycle

```
pending_dns → dns_verified → ssl_provisioning → ssl_active → (serving)
```

Store `ssl_status` in `business_domains` table. Poll Cloudflare's `GET /zones/{id}/custom_hostnames/{id}` or Vercel's domain endpoint for status updates.

### Common Failure Causes

1. **DNS propagation lag**: CA's resolver hasn't seen the new record yet.
2. **Let's Encrypt rate limit**: 50 certs/registered domain/week.
3. **CAA record conflict**: Customer's CAA restricts which CAs can issue — check `resolveCaa()` during verification.
4. **DNSSEC misconfiguration**: Broken DNSSEC chain blocks CA validation.
5. **Port 80 blocked**: HTTP-01 challenge fails if port 80 is not accessible.

---

## 7. Asset & Image Management

### Option A: Supabase Storage (already in stack)

**Free tier**: 1 GB storage, 2 GB/month bandwidth, 50 MB max file size.
**Pro tier**: 100 GB storage, 200 GB/month bandwidth, 5 GB max file size.
**CDN**: Yes — Cloudflare CDN for public buckets. Private buckets are NOT CDN-cached (signed URLs bypass CDN).
**RLS**: Full Postgres RLS on `storage.objects` table.

**Public URL format**:
```
https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
```

**Get URL in code**:
```typescript
const { data } = supabase.storage.from('site-assets').getPublicUrl('business-123/hero.png');
// data.publicUrl = "https://xxx.supabase.co/storage/v1/object/public/site-assets/business-123/hero.png"
```

**Image transformation** (⚠️ Pro tier only — not available on free):
```typescript
const { data } = supabase.storage.from('site-assets').getPublicUrl('hero.png', {
  transform: { width: 800, height: 600, resize: 'cover', quality: 80, format: 'webp' },
});
// URL becomes: .../render/image/public/site-assets/hero.png?width=800&height=600...
```

**Pros**: Zero new services. RLS for access control. CDN included on public buckets.
**Cons**: Image transformation is Pro-only. CDN only for public files.

---

### Option B: Cloudinary

**Install**: `npm install next-cloudinary cloudinary`

**Free tier**: 25 GB storage, 25 GB/month bandwidth, 25 credits/month.
> ⚠️ Cloudinary moved to a credits model in 2023–2024. Verify exact credit-to-transformation ratio at [cloudinary.com/pricing](https://cloudinary.com/pricing).

**Paid tiers**: Plus ~$89/mo (225 GB), Advanced ~$224/mo (600 GB).

**Transformation URL syntax**:
```
https://res.cloudinary.com/<cloud>/image/upload/w_800,h_600,c_fill,f_webp,q_auto/<public-id>
```

Common params: `w_N` (width), `h_N` (height), `c_fill/fit/scale` (crop), `f_auto/webp/avif` (format), `q_auto/N` (quality), `g_face` (face detection gravity), `r_max` (circle).

**Next.js usage**:
```tsx
import { CldImage } from 'next-cloudinary';
<CldImage src="business-123/hero" width={800} height={600} crop="fill" format="webp" quality="auto" alt="Hero" />
```

**Pros**: On-the-fly transforms on free tier. Auto WebP/AVIF. Great for Lighthouse scores (image optimization).
**Cons**: New service. Credit model complexity.

---

### Option C: Uploadthing

**Install**: `npm install uploadthing @uploadthing/react`

**Free tier**: 2 GB storage, ~10 GB/month bandwidth, up to 2 GB per file.
**Paid**: Starter ~$10/mo (50 GB), Pro ~$30/mo (200 GB).

**App Router setup**:
```typescript
// src/app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from 'uploadthing/next';
const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: '4MB', maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      // your auth check
      return { userId: 'user_123' };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

// src/app/api/uploadthing/route.ts
import { createRouteHandler } from 'uploadthing/next';
export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
```

**Supported types**: `image`, `video`, `audio`, `pdf`, `text`, `blob`.
**Pros**: Designed for Next.js App Router. Minimal setup. Clean API.
**Cons**: No image transformations. Newer service, smaller ecosystem.

---

### Recommendation

| Use case | Choice |
|---|---|
| MVP / minimal setup | Supabase Storage (already in stack) |
| Need image transforms (resize, WebP, quality) | Cloudinary |
| Simplest possible upload in Next.js | Uploadthing |

For website builder pages: Supabase Storage for MVP. Add Cloudinary later if Lighthouse image scores become important.

---

## 8. Page Preview

### Option A: Split-pane `<iframe srcdoc>` (recommended)

```tsx
const [html, setHtml] = useState('');
const [css, setCss] = useState('');
const [js, setJs] = useState('');

// Debounce 500ms to avoid iframe re-renders on every keystroke
const debouncedPreview = useDebounce(`
  <html><head><style>${css}</style></head>
  <body>${html}<script>${js}</script></body></html>
`, 500);

<div className="grid grid-cols-2 gap-4">
  <div> {/* Editor tabs */} </div>
  <iframe
    srcDoc={debouncedPreview}
    sandbox="allow-scripts"
    className="w-full h-full border border-char-700 rounded"
  />
</div>
```

**Gotcha**: `srcdoc` doesn't resolve relative URLs (e.g., `<img src="/logo.png">`). External CDN URLs in the HTML (Supabase/Cloudinary) work fine. Relative paths do not.
**Pros**: Zero infrastructure. True live preview. Isolated (sandboxed).
**Cons**: Relative URL limitation. Large HTML re-renders iframe entirely.

---

### Option B: Server-side Preview Route

```typescript
// src/app/api/website-builder/preview/[pageId]/route.ts
export async function GET(_req: Request, { params }) {
  const { pageId } = await params;
  const { data: page } = await supabase.from('site_pages').select().eq('id', pageId).single();
  const html = `<!DOCTYPE html>...${page.html}...`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
```

**Pros**: Real URL shareable for review. Identical to published output. Works with relative URLs.
**Cons**: Requires save before preview. Manual refresh needed. Extra API round-trip.

---

### Option C: Blob URL (open in new tab)

```typescript
const blob = new Blob([fullHtml], { type: 'text/html' });
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
setTimeout(() => URL.revokeObjectURL(url), 10000); // cleanup
```

**Pros**: Full browser tab. Zero server round-trip. No setup.
**Cons**: Temporary — URL is lost on tab close. Can't share.

---

### Recommendation: **Option A (split-pane srcdoc) as primary** + **Option B (shareable preview URL) as secondary** "Share preview" feature.

---

## 10. Templates & Starting Points

### Priority Order (Revised for Local Marketing)

| Priority | Page Type | Why |
|---|---|---|
| 1 | **Location service page** | Core local SEO asset. "HVAC Repair in Portland, OR." Drives "service + city" rankings. |
| 2 | **City landing page** | "HVAC Company in Portland" — market-level hub page linking to all service pages |
| 3 | **Blog post** | Topical authority + seasonal content. Secondary traffic driver. |
| 4 | **Service area page** | "We serve Portland, Lake Oswego, Beaverton..." — supports service pages |
| 5 | **Foundation pages** | About, Contact, Homepage — needed but not where the ranking leverage is |

---

### Option A: Location Service Page Template (primary)

The most important template. Structure is fixed; Claude fills all content.

```html
<!-- Template structure — Claude fills {{tokens}} -->
<header class="hero">
  <h1>{{service_name}} in {{city}}, {{state}}</h1>
  <p class="hero-sub">{{tagline referencing city and service}}</p>
  <a href="tel:{{phone}}" class="cta-primary">Call {{phone}}</a>
</header>

<section class="why-us">
  <h2>Why {{city}} Residents Choose {{business_name}}</h2>
  {{3-4 locally-relevant differentiators}}
</section>

<section class="service-details">
  <h2>Our {{service_name}} Services in {{city}}</h2>
  {{detailed service description with local context}}
</section>

<section class="service-area">
  <h2>Serving {{city}} and Nearby Communities</h2>
  <p>We proudly serve {{city}}, {{nearby_cities_from_market}}.</p>
</section>

<section class="faq">
  <h2>{{service_name}} FAQs for {{city}} Homeowners</h2>
  {{4-6 locally-relevant Q&As}}
</section>

<section class="cta-bottom">
  <h2>Get {{service_name}} in {{city}} Today</h2>
  <p>{{location.address}} | {{location.phone}}</p>
  <a href="tel:{{phone}}">Call Now</a>
</section>

<!-- Schema.org JSON-LD injected automatically -->
```

**Claude data inputs**: `service.name`, `location.city/state/address/phone`, `market.cities[]`, `EnrichedKeyword[]` with `localType: 'city_name' | 'near_me'`

---

### Option B: City Landing Page Template

Hub page for a market — links down to all service pages in that city.

```html
<h1>{{business_name}} — {{service_category}} in {{city}}, {{state}}</h1>
<p>{{market intro paragraph}}</p>

<!-- Service cards grid -->
<section class="services-grid">
  {{for each service: card linking to /city/service page}}
</section>

<section class="service-area-map">
  <h2>Our {{city}} Service Area</h2>
  {{cities covered in this market}}
</section>
```

**Generated once per market** (not per location × service). Links all location service pages together for PageRank flow.

---

### Option C: Blog Post Template

```html
<article>
  <header>
    <h1>{{title}}</h1>
    <p class="meta">{{publish_date}} | {{location.city}}, {{state}}</p>
  </header>
  <section class="intro">{{intro paragraph with primary keyword}}</section>
  {{body sections H2/H3}}
  <section class="cta">
    <h2>Need {{service}} in {{city}}?</h2>
    <a href="tel:{{phone}}">Call {{business_name}}: {{phone}}</a>
  </section>
</article>
```

**Context**: Blog posts should reference the business's market and location in the CTA section. Generic blog posts with no local angle are low value for local SEO.

---

### Option D: Blank (user-written)

User writes their own HTML/CSS/JS from scratch. Editor starts empty.
**Best for**: Advanced users, one-off custom pages.

---

### Option E: Import from existing website

Fetch an existing page from their domain → extract HTML/CSS → load into editor.
**Cons**: External stylesheet references break. Use as inspiration only, not a production workflow.

---

### Recommendation
- **MVP**: Options A (location service) + C (blog post). These two cover 80% of the value.
- **v2**: Option B (city landing page) — ties the location pages together.
- **Later**: Block picker for custom layouts.

---

## 10. Deployment Model (Draft vs Published)

### Option A: Save = Live immediately
**Pros**: Simplest state model.
**Cons**: Typos go live immediately. No safe editing.

---

### Option B: Draft / Published States (recommended for MVP)

```sql
status ENUM('draft', 'published') DEFAULT 'draft'
published_at TIMESTAMPTZ  -- set when first published
```

Explicit "Publish" button. Only `status = 'published'` rows are served by the catch-all route.

**Pros**: Standard, familiar pattern. Safe editing experience.
**Cons**: User must remember to publish.

---

### Option C: Draft / Published + Scheduled Publish

```sql
status ENUM('draft', 'published', 'scheduled') DEFAULT 'draft'
publish_at TIMESTAMPTZ  -- when to go live
```

Vercel Cron job runs every 5 minutes: `UPDATE site_pages SET status='published' WHERE publish_at <= NOW() AND status='scheduled'`.

**ContentStrategy alignment**: Calendar items have `week: number`. Auto-suggest `publish_at` as the Monday of that week when opening builder from a calendar item.

**Cron setup** (`vercel.json`):
```json
{
  "crons": [{ "path": "/api/website-builder/publish-scheduled", "schedule": "*/5 * * * *" }]
}
```
> ⚠️ Vercel Hobby plan: 1 cron job max, once per day only. Pro plan required for 5-minute intervals.

---

### Option D: Version History

Every save creates a new `site_page_versions` row. Published page points to a specific version ID.

**Pros**: Safe rollback. Never lose work.
**Cons**: Storage grows over time. More complex queries.
**Best for**: v2 feature.

---

### Recommendation: **Option B (Draft/Published) for MVP**, **Option C (scheduling) in v2** aligned with ContentStrategy calendar.

---

## 12. Routing Architecture

> ⚠️ Next.js v16 renamed `middleware.ts` to `proxy.ts`. A codemod is available: `npx @next/codemod@canary middleware-to-proxy .`. Old `middleware.ts` files still work with the old name.

### Local SEO URL Structure Principles

URL structure matters for local SEO. For location service pages, the path should reflect the geographic hierarchy:

- **Best**: `acmeplumbing.com/portland-or/hvac-repair/` — city in URL, service as subfolder
- **Good**: `acmeplumbing.com/hvac-repair/portland-or/` — service first, city second
- **Avoid**: `acmeplumbing.com/page/43` — no keyword signal

All routes below should use slugs in the format `/[city-state]/[service-slug]/` for location service pages.

---

### Option A: Path-based routing (no custom domains)

**URL**: `https://app.scorchlocal.com/sites/acme-plumbing/portland-or/hvac-repair`

> **⚠️ Same `business_slug` gap as Section 4** — see DB schema note. Must resolve slug→business_id first.
> **⚠️ Must incorporate canonical + noindex + schema injection from Section 22** — the code below omits these for brevity. The builder must merge Section 22.2.1 (canonical), 22.2.3 (noindex on drafts), and 22.2.2 (schema.org) into this handler. Also: remove the `status = 'published'` filter to allow draft preview (serve drafts with `noindex, nofollow`).

```typescript
// src/app/sites/[businessSlug]/[...slug]/route.ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ businessSlug: string; slug: string[] }> }
) {
  const { businessSlug, slug } = await params; // Must await in Next.js 15+
  const supabase = await createClient();

  const { data: page } = await supabase
    .from('site_pages')
    .select('html, css, js, meta_title, meta_description, schema_json')
    .eq('business_slug', businessSlug)
    .eq('slug', slug.join('/'))
    .eq('status', 'published')
    .single();

  if (!page) return new Response('Not found', { status: 404 });

  const html = buildFullHtml(page);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
```

Zero middleware changes. Works immediately. Pages are on ScorchLocal's domain but still indexable.

---

### Option B: Subdomain per business (mid-tier)

**URL**: `https://acme-plumbing.scorchlocal.com/portland-or/hvac-repair`

Requires wildcard DNS `*.scorchlocal.com → server` + wildcard SSL.

---

### Option C: Customer's own domain (premium) — Multi-domain vs single domain decision

This is the most important routing decision for local SEO.

**Single domain with location paths (recommended for local SEO)**:
```
acmeplumbing.com/portland-or/hvac-repair/
acmeplumbing.com/portland-or/ac-installation/
acmeplumbing.com/vancouver-wa/hvac-repair/
```
- Consolidates all domain authority into one domain
- Google's local algorithm understands geo-targeted paths
- One custom domain to manage per business

**Subdomain per market (not recommended)**:
```
portland.acmeplumbing.com/hvac-repair/
vancouver.acmeplumbing.com/hvac-repair/
```
- Domain authority is split across subdomains (Google treats subdomains somewhat separately)
- Multiple SSL certs and routing rules
- More complex to manage

**Separate domain per market (not recommended)**:
```
acmeplumbingportland.com
acmeplumbingvancouver.com
```
- Authority completely fragmented
- High cost and overhead
- Only valid if markets are truly separate business brands

**Custom domain middleware**:
```typescript
// proxy.ts (or middleware.ts)
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  if (!host.endsWith('.scorchlocal.com') && host !== 'app.scorchlocal.com') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-custom-domain', host);

    return NextResponse.rewrite(
      new URL(`/sites/_custom${request.nextUrl.pathname}`, request.url),
      { request: { headers: requestHeaders } }
    );
  }
  return NextResponse.next();
}
```

---

### URL Slug Convention

```typescript
// Generate slugs consistently across all location service pages
function locationServiceSlug(location: BusinessLocation, service: Service): string {
  const cityState = `${toSlug(location.city)}-${location.state.toLowerCase()}`;
  const serviceName = toSlug(service.name);
  return `${cityState}/${serviceName}`; // e.g. "portland-or/hvac-repair"
}

function cityLandingSlug(market: Market): string {
  return toSlug(market.name); // e.g. "portland-metro"
}

function blogSlug(title: string, location?: BusinessLocation): string {
  const base = toSlug(title);
  return location ? `blog/${location.city.toLowerCase()}-${base}` : `blog/${base}`;
}
```

---

### Recommendation
Build in order: **Option A** (path-based, zero config) → **Option C single-domain** (custom domain, premium). Never recommend multi-domain or subdomain-per-market to customers for SEO reasons.

---

## 12. Background Jobs (DNS Polling & Scheduling)

### Option A: Vercel Cron Jobs

```json
// vercel.json
{
  "crons": [
    { "path": "/api/crons/verify-domains", "schedule": "*/10 * * * *" },
    { "path": "/api/crons/publish-scheduled", "schedule": "*/5 * * * *" }
  ]
}
```

**Securing the endpoint**:
```typescript
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // do work
}
```

**Important constraints**:
- Timezone is always **UTC**
- Named values (`MON`, `JAN`) are NOT supported in cron expressions
- **Hobby plan**: 1 cron job max, once per day. **Pro plan required** for per-minute jobs.
- No retry on failure — design endpoints to be idempotent
- Cron jobs only run against the **production deployment**
- Duplicate delivery is possible — use distributed locking if needed

---

### Option B: Supabase pg_cron

Available on **Pro plan and above** only. Runs inside the database.

```sql
-- Enable extension (dashboard: Database → Extensions → pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- DNS verification job (every 10 minutes)
SELECT cron.schedule(
  'verify-pending-domains',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://app.scorchlocal.com/api/crons/verify-domains',
      headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);

-- Publish scheduled pages (every 5 minutes)
SELECT cron.schedule(
  'publish-scheduled-pages',
  '*/5 * * * *',
  $$UPDATE site_pages SET status = 'published', published_at = NOW()
    WHERE status = 'scheduled' AND publish_at <= NOW()$$
);
```

**Key facts**:
- Minimum resolution: 1 minute
- All times in UTC
- View jobs: `SELECT * FROM cron.job;`
- View history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`
- Remove: `SELECT cron.unschedule('verify-pending-domains');`
- For HTTP calls, also enable: `CREATE EXTENSION IF NOT EXISTS pg_net;`

---

### Option C: BullMQ (Redis-backed job queue)

```bash
npm install bullmq ioredis
```

**Pros**: Delayed jobs, retries with backoff, priority queues, job history. Ideal for DNS polling with exponential backoff.
**Cons**: Requires Redis (Upstash Redis is serverless-friendly at ~$0.20/100K commands).
**Best for**: High-volume production use with many concurrent domain verifications.

---

### Option D: Inngest (serverless-native event queue)

```bash
npm install inngest
```

Inngest is serverless-friendly and integrates directly with Next.js. Good for:
- Scheduled functions (cron syntax)
- Step functions with retries and backoff
- No Redis required

**Pros**: Easy Next.js integration. No separate Redis. Generous free tier.
**Cons**: Another service dependency.

---

### Recommendation
- **MVP**: Vercel Cron (free on Pro plan, minimal setup).
- **Scale / complex retry logic**: BullMQ + Upstash Redis or Inngest.
- **DB-only solution**: Supabase pg_cron (Pro plan) for simple scheduled tasks.

---

## 13. Database Schema Options

### Schema A: Flat pages table (MVP — recommended)

```sql
CREATE TABLE site_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  -- Multi-location scope (critical for local marketing platform)
  location_id     UUID REFERENCES business_locations(id) ON DELETE SET NULL,
  market_id       UUID REFERENCES markets(id) ON DELETE SET NULL,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  -- Page identity
  slug            TEXT NOT NULL,
  title           TEXT,
  type            TEXT CHECK (type IN (
    'location_service',  -- "HVAC Repair in Portland, OR" — primary type
    'city_landing',      -- "HVAC Company in Portland" — hub page per market
    'blog',              -- Blog post (optionally location-scoped)
    'service_area',      -- "Cities we serve" page
    'foundation'         -- About, Contact, Homepage
  )),
  -- Content
  html            TEXT,
  css             TEXT,
  js              TEXT,
  -- SEO
  meta_title      TEXT,
  meta_description TEXT,
  og_image_url    TEXT,
  schema_json     JSONB,  -- JSON-LD LocalBusiness / Article / Service structured data
  -- Publishing
  status          TEXT CHECK (status IN ('draft', 'published', 'scheduled')) DEFAULT 'draft',
  publish_at      TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  -- Integration links (cross-tool)
  content_calendar_item_id TEXT,  -- CalendarItemV2.id → auto-mark done on publish
  site_audit_issue_id      TEXT,  -- DetailedIssue reference → tracks what fix this page addresses
  grid_scan_id             UUID REFERENCES grid_scans(id) ON DELETE SET NULL, -- which scan surfaced the gap
  -- Generation metadata
  generated_by            TEXT DEFAULT 'claude-sonnet-4-6',
  generation_prompt_hash  TEXT,   -- detect if prompt inputs changed (re-gen needed)
  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, slug)
);

-- Fast lookups for the route handler
CREATE INDEX site_pages_business_slug_idx ON site_pages(business_id, slug);
CREATE INDEX site_pages_status_idx ON site_pages(status);
-- Matrix view: all pages for a business by location+service
CREATE INDEX site_pages_matrix_idx ON site_pages(business_id, location_id, service_id, type);
-- Find all pages for a market
CREATE INDEX site_pages_market_idx ON site_pages(market_id, status);
```

> **GAP — `business_slug` resolution**: The catch-all route handler (Section 4 / 12) queries `site_pages` with `.eq('business_slug', businessSlug)` but the schema above has no `business_slug` column — only `business_id UUID`. **Fix**: Either (a) add a `slug TEXT UNIQUE` column to the `businesses` table and resolve via a join / two-step lookup: `businesses.slug → business_id → site_pages`, or (b) denormalize by adding `business_slug TEXT` to `site_pages`. Option (a) is cleaner (single source of truth for business slug). The `businesses` table in `src/types/index.ts` has `domain: string` which could serve as the slug, but a dedicated `slug` field is safer (domains can change).

---

### Schema B: Pages + Version History (v2)

```sql
CREATE TABLE site_pages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID REFERENCES businesses(id) ON DELETE CASCADE,
  slug                 TEXT NOT NULL,
  title                TEXT,
  type                 TEXT,
  status               TEXT DEFAULT 'draft',
  current_version_id   UUID,   -- FK to site_page_versions (latest draft)
  published_version_id UUID,   -- FK to site_page_versions (live version)
  content_calendar_item_id TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, slug)
);

CREATE TABLE site_page_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      UUID REFERENCES site_pages(id) ON DELETE CASCADE,
  html         TEXT,
  css          TEXT,
  js           TEXT,
  meta_title   TEXT,
  meta_description TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  created_by   UUID REFERENCES auth.users(id)
);
```

---

### Schema C: Custom Domains table

```sql
CREATE TABLE business_domains (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES businesses(id) ON DELETE CASCADE,
  domain              TEXT NOT NULL UNIQUE,
  -- Verification
  verification_token  TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  dns_verified        BOOLEAN DEFAULT false,
  dns_verified_at     TIMESTAMPTZ,
  -- SSL
  ssl_status          TEXT CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')) DEFAULT 'pending',
  ssl_active_at       TIMESTAMPTZ,
  -- Provider tracking
  provider            TEXT CHECK (provider IN ('vercel', 'cloudflare', 'caddy')),
  provider_domain_id  TEXT,   -- ID returned by Vercel/Cloudflare API
  -- Polling state
  last_checked_at     TIMESTAMPTZ,
  check_attempts      INT DEFAULT 0,
  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX business_domains_domain_idx ON business_domains(domain);
CREATE INDEX business_domains_pending_idx ON business_domains(dns_verified, ssl_status)
  WHERE dns_verified = false OR ssl_status != 'active';
```

---

### Recommendation: **Schema A + C for MVP**. Add Schema B (versions) in v2.

---

## 14. SiteAudit Integration

### Integration A: "Fix this issue" → Pre-populated builder

Add a "Create page" button on `DetailedIssue` cards where `issue.category` maps to a page type (e.g. missing About page, thin service content, no FAQ page).

**Data passed to builder**:
```typescript
{
  title: issue.title,           // → page title suggestion
  type: 'foundation',           // derived from issue.category
  prompt: issue.fix,            // → Claude generation prompt
  slug: deriveSlug(issue.urls), // → URL slug suggestion
  siteAuditIssueId: issue.id,   // → stored in site_pages.site_audit_issue_id
}
```

---

### Integration B: Audit published pages

After a page is published, add its URL to the next site audit crawl scope. Show per-page audit scores in the builder.

**Requires**: Site audit to support partial/incremental crawls (not currently implemented).

---

### Integration C: Lighthouse score feedback

After page is saved and preview URL exists, run Lighthouse API on the preview URL → show performance/SEO scores inline in the editor.

**API**: Google's PageSpeed Insights API is free and wraps Lighthouse: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&strategy=mobile`

---

### Integration D: Issue-to-content pipeline

Site audit detects "thin content on /services/hvac" → automatically creates a ContentStrategy calendar item → shows "Build page" button in content calendar → builder opens with pre-loaded brief.

**Full pipeline**: Audit finds gap → Strategy plans → Builder implements.
**Complexity**: Medium-high. Requires cross-tool state propagation.

---

### Integration E: Cannibalization Tier 3/4 → Fix task priority

**Current state**: `cannibalizationDetection.ts` runs a 4-tier conflict system. ContentStrategy currently only reads Tier 1 (SERP-verified) and Tier 2 (wrong page ranking) into `website_change` calendar tasks. Tier 3 (n-gram overlap) and Tier 4 (title conflicts) are detected but never surfaced as actionable tasks.

**Gap**: Every Tier 3/4 conflict is a page that should be rewritten or consolidated — a real task that falls off the floor.

**Fix**: Route all four tiers into the calendar as `website_change` tasks, with priority derived from tier:

| Cannibalization Tier | Calendar Priority |
|---|---|
| Tier 1 — SERP-verified (Google ranked wrong page) | `high` |
| Tier 2 — Wrong page ranking (internal signal) | `high` |
| Tier 3 — N-gram overlap (semantic) | `medium` |
| Tier 4 — Title conflict only | `low` |

**In `unifiedCalendar.ts`**: Extend the `quickWins` section to include Tier 3/4 conflicts, not just Tier 1/2.

---

### Integration F: PageSpeed CrUX → Fix task priority

Site Audit fetches per-page PageSpeed Insights and CrUX metrics (LCP, CLS, FID/INP). Pages with poor Core Web Vitals are a ranking signal but currently only show in the SiteAudit dashboard — they don't generate higher-priority fix tasks.

**Fix**: When building `website_change` fix tasks from `quick_wins`, boost priority if the affected page also has CrUX scores below threshold:
- LCP > 4.0s or CLS > 0.25 → upgrade fix task to `high` priority
- LCP 2.5–4.0s or CLS 0.1–0.25 → `medium`

This surfaces the highest-impact pages (both content issues AND performance issues) at the top of the calendar queue.

---

### Integration G: Local pack detection → GBP post priority

Site Audit keyword markets include `_localSerp` data with a `hasLocalPack` flag per keyword. This signals whether a keyword triggers a Google Maps local pack in search results — i.e., whether ranking on Google Maps for that keyword is high-value.

**Current state**: ContentStrategy generates GBP posts and website additions but doesn't use `hasLocalPack` to prioritize which keywords get GBP posts vs. blog posts.

**Fix**: Keywords where `hasLocalPack = true` should be routed to GBP posts first (since they directly feed the local pack), then to location service pages. Keywords without a local pack are better suited for organic blog content.

```typescript
// In unifiedCalendar.ts keyword routing
const localPackKeywords = enrichedKeywords.filter(k => k._localSerp?.hasLocalPack);
const organicOnlyKeywords = enrichedKeywords.filter(k => !k._localSerp?.hasLocalPack);

// localPackKeywords → GBP posts + location service pages (highest local ranking impact)
// organicOnlyKeywords → blog posts + service overview pages
```

---

## 15. ContentStrategy Integration

### Integration A: "Build this page" button on calendar items

On `CalendarItemV2` cards with `type: 'blog_post' | 'website_change' | 'website_addition'`, add a "Build" button.

> **Codebase note**: `CalendarItemCard` (`src/components/tools/ContentStrategy/CalendarItemCard.tsx`) currently accepts props: `{ item, businessName, domain, industry, city?, state?, onStatusChange, onContentGenerated? }`. A new `onBuildPage?: (item: CalendarItemV2) => void` callback prop must be added for the "Build this" button. The parent page (`src/app/(dashboard)/content-strategy/page.tsx`) will handle navigation to `/website-builder/new?calendarItemId={item.id}`.

**Pre-populated builder state**:
```typescript
{
  title: item.title,
  primaryKeyword: item.primaryKeyword,
  keywords: item.keywords,
  prompt: `${item.action}\n\nRationale: ${item.rationale}`,
  // Map CalendarItemV2.type → site_pages.type
  // ⚠️ 'website_addition' should map to 'location_service' (not 'foundation')
  //    when location context is present, or 'blog' for blog-type additions.
  //    'foundation' is only for About/Contact/Homepage pages.
  type: item.type === 'blog_post' ? 'blog'
      : item.type === 'website_addition' && item.locationName ? 'location_service'
      : item.type === 'website_addition' ? 'location_service'  // default — most additions are service pages
      : item.type === 'website_change' ? 'location_service'    // fixes target existing pages
      : 'foundation',
  publishAt: weekToDate(item.week), // convert week number to Monday date
  contentCalendarItemId: item.id,
}
```

---

### Integration B: Auto-mark calendar item as "done" on publish

When a page is published:
```typescript
// In the publish API route
if (page.content_calendar_item_id) {
  await supabase.rpc('update_calendar_item_status', {
    strategy_business_id: page.business_id,
    item_id: page.content_calendar_item_id,
    new_status: 'done',
  });
}
```

---

### Integration C: Suggested publish date from calendar week

```typescript
function weekToDate(week: number): Date {
  const year = new Date().getFullYear();
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 - jan1.getDay() + 1;
  return new Date(jan1.getTime() + daysOffset * 86400000);
}
```

---

### Integration D: ROI tracking

Calendar item has `roiValue`. After publishing, track page views → compare against projected ROI.
**Requires**: Analytics integration (GA4 Measurement Protocol or custom event tracking). Future feature.

---

### Integration E: Citation tier → calendar priority

**Current state**: ContentStrategy reads missing citations from OffPageAudit and generates `offpage_post` calendar items. All missing citations are treated with equal priority regardless of directory tier.

**Gap**: A missing Yelp listing (critical tier) and a missing neighbourhood directory (low tier) get the same calendar priority. Customers act on the wrong things first.

**Fix**: Map OffPageAudit citation tiers directly to calendar priority:

| OffPageAudit Tier | Calendar Priority |
|---|---|
| Critical (Yelp, Google, Angi, HomeAdvisor) | `high` |
| High (Houzz, Thumbtack, BBB, Nextdoor) | `medium` |
| Medium (industry-specific directories) | `medium` |
| Low (neighbourhood/local directories) | `low` |

This is a one-line change in `unifiedCalendar.ts` — citation items already exist, they just need their `priority` field set from tier data that's already available.

---

### Integration F: KD discount flows into calendar ROI

Section 0 documents the KD discount table (KD 0–30 → 20% CTR, etc.). The `unifiedCalendar.ts` ROI calculation currently uses funnel multiplier but not KD discount. `EnrichedKeyword.difficulty` is available when keyword research has been run.

**Fix**: Apply the KD discount in `unifiedCalendar.ts` before computing `roiValue` on each calendar item. Two keywords with identical volume will then rank differently based on how achievable ranking is — which is the correct behavior.

---

## 17. LocalGrid Integration

LocalGrid tracks how a business ranks across a geographic grid for given keywords. Published location service pages directly affect these rankings — so the two tools must talk to each other.

### Integration A: Auto-register keywords in LocalGrid after publish

When a location service page is published, its target keywords should automatically be added to LocalGrid tracking for the relevant location.

```typescript
// In the publish API route
async function onPagePublished(page: SitePage) {
  if (page.type !== 'location_service' || !page.location_id) return;

  const location = await getLocation(page.location_id);
  const keywords = extractTargetKeywords(page); // from meta_title + schema_json

  // Check if a grid scan exists for this location
  const { data: existingScan } = await supabase
    .from('grid_scans')
    .select('id, keywords')
    .eq('location_id', page.location_id)
    .order('scanned_at', { ascending: false })
    .limit(1)
    .single();

  if (existingScan) {
    // Add new keywords to the next scan queue
    const mergedKeywords = Array.from(new Set([...existingScan.keywords, ...keywords]));
    await supabase.from('grid_scans').update({ keywords: mergedKeywords }).eq('id', existingScan.id);
  }
  // If no scan exists, surface a prompt in the LocalGrid tool to scan this location
}
```

---

### Integration B: Use LocalGrid gaps to drive page creation

LocalGrid data shows which keywords rank poorly (rank > 10 or not ranking) across the grid. These gaps directly map to missing pages.

```typescript
// Surface in the Page Matrix UI
function getPageGapFromGridScan(scan: GridScan, location: BusinessLocation): PageGap[] {
  const results = scan.results as GridScanResult;
  return scan.keywords
    .filter(keyword => {
      const points = results.points.filter(p => p.rank === null || p.rank > 10);
      return points.length > results.points.length * 0.5; // ranking in <50% of grid
    })
    .map(keyword => ({
      keyword,
      location,
      suggestedPageType: 'location_service',
      urgency: 'high', // not ranking in majority of grid
    }));
}
```

**In the builder UI**: "You're not ranking for 'HVAC repair' in most of the Portland grid. Generate a page? →"

---

### Integration C: Track ranking improvement after page publish

After a page is published, flag the location for a re-scan in LocalGrid. Show before/after ranking data alongside the page in the builder.

```
Page: "HVAC Repair in Portland, OR"
Published: Jan 15, 2026
LocalGrid before:  avg rank 18.3, visibility 23%
LocalGrid after:   avg rank 6.1, visibility 71%  ← re-scanned Feb 1
```

**This closes the loop**: Build → Publish → Track → Improve. Makes the ROI of page creation visible to the customer.

---

### Integration D: Surface Site Audit keyword volume in grid dashboard

**Current state**: LocalGrid shows rank per grid point for whatever keywords the user has configured to scan. It shows rank, visibility score, and competitor data — but no context on how many people are actually searching for those keywords.

**Gap**: A user can rank #1 in their grid for a keyword that gets 3 searches/month and not know it's a low-value win. Conversely, they might be tracking the wrong keywords entirely.

**Fix**: Cross-reference `local_grid_scans.keywords` against `site_audits.crawl_data.keywords` (the keyword market data from Site Audit). For each grid keyword, pull volume range, intent, and competition from the most recent Site Audit for that business and surface it in the grid dashboard:

```
Keyword: "HVAC repair Portland"
Grid visibility: 71% (you're in top 3 for 71% of the grid)
Search volume: 100–1,000/mo  ← from Site Audit keyword data
Intent: Transactional         ← from Site Audit
Local pack: Yes               ← from Site Audit _localSerp
```

This turns the grid from a pure rank tracker into a rank + opportunity tracker.

---

## 18. OffPageAudit Integration

Published location pages are **link-building targets** — they're the pages that citations, guest posts, and local directories should link to. The OffPageAudit tool tracks this.

### Integration A: Surface published pages as link targets in OffPageAudit

When viewing the OffPageAudit for a location, show which builder pages exist for that location and how many backlinks each has.

```typescript
// In OffPageAudit LocationTab component — new "Builder Pages" panel
const { data: pages } = await supabase
  .from('site_pages')
  .select('title, slug, type, published_at')
  .eq('location_id', location.id)
  .eq('status', 'published')
  .eq('type', 'location_service');

// Cross-reference with backlinks data from the audit
// Show: page URL, backlink count, referring domains, top anchor texts
```

**Value**: "You have 3 location service pages but only the homepage has backlinks. Your citation strategy should link to these specific pages."

---

### Integration B: Citation strategy uses page URLs

When OffPageAudit generates citation recommendations, it should recommend linking to the specific location service page URL, not just the homepage.

**Before**: "Add your business to Yelp, Angi, HomeAdvisor"
**After**: "Add your business to Yelp, Angi, HomeAdvisor — link to `acmeplumbing.com/portland-or/hvac-repair/` for maximum local relevance"

---

### Integration C: Missing pages surface in OffPageAudit

If the OffPageAudit detects that a location has citations but the business has no matching location service page, surface a "Missing page" alert.

```
⚠️ You have 12 citations for your Vancouver, WA location but no published
   page targeting "HVAC repair in Vancouver, WA". Build one to maximize
   the SEO value of your citations.  [Build page →]
```

---

### Integration D: Domain rating deduplication

**Current state**: Both SiteAudit and OffPageAudit independently call DataForSEO's `domain_analytics/whois/overview` (or backlink summary) to fetch domain rating for the same domain. This is a double API cost with identical results.

**Fix**: SiteAudit runs first and stores `domain_rank` in `site_audits.crawl_data`. OffPageAudit should read from the most recent SiteAudit record instead of making a redundant API call. If no SiteAudit has run, OffPageAudit fetches independently as a fallback.

```typescript
// In OffPageAudit initialization
const { data: latestAudit } = await supabase
  .from('site_audits')
  .select('crawl_data->domain_rank_overview')
  .eq('business_id', businessId)
  .eq('status', 'complete')
  .order('completed_at', { ascending: false })
  .limit(1)
  .single();

const domainRating = latestAudit?.domain_rank_overview?.rank
  ?? await fetchDomainRatingFromDataForSEO(domain); // fallback
```

**Savings**: Every OffPageAudit run saves 1 DataForSEO API call.

---

### Integration E: Lead segmentation by physical location

**Current state**: LeadIntelligence groups leads by `market_id` (abstract market entity). OffPageAudit discovers physical GBP locations with real city/address data. These are never connected.

**Gap**: A business in Portland with locations in Portland, Lake Oswego, and Beaverton can't see which physical location is generating leads — only which abstract "market" they belong to.

**Fix**: When OffPageAudit runs and discovers physical locations, match them to `markets` by city/state and store a `location_id` on the lead's market. Then LeadIntelligence can break down leads by physical location, not just market.

This matters most for businesses with multiple locations in the same market (e.g., two HVAC locations both serving Portland Metro) where lead source by address tells them which location is under-performing.

---

## 19. SEO & Meta Management

### Option A: Simple meta fields (MVP)

Text inputs in the editor UI sidebar:
- `<title>` (meta title)
- `<meta name="description">` (150–160 chars)
- `<meta property="og:image">` (URL)

Injected into the `<head>` when the page is rendered.

---

### Option B: AI-generated meta from page content

After Claude generates the page body, a second (fast, cheap) Claude call generates optimized meta title + description:

```typescript
const meta = await client.messages.create({
  model: 'claude-haiku-4-5-20251001', // fast + cheap
  max_tokens: 200,
  messages: [{
    role: 'user',
    content: `Generate an SEO meta title (60 chars max) and meta description (155 chars max) for this page content:\n\n${pageHtml.slice(0, 3000)}`
  }],
});
```

---

### Option C: Google SERP preview

Show a live preview of how the page will appear in Google search results as the user types.

```tsx
<div className="border rounded p-3 bg-white font-sans max-w-lg">
  <div className="text-[#1a0dab] text-lg truncate">{metaTitle || 'Page Title'}</div>
  <div className="text-[#006621] text-sm">{pageUrl}</div>
  <div className="text-[#545454] text-sm mt-1 line-clamp-2">{metaDescription || 'No description'}</div>
</div>
```

---

### Option D: Schema.org JSON-LD generation

Auto-generate structured data based on page type:
- `Article` for blog posts (name, author, datePublished, image)
- `LocalBusiness` for foundation pages
- `Service` for service pages
- `FAQPage` for pages with FAQ sections

Claude can generate JSON-LD given business data + page content. Stored in `site_pages.schema_json` and injected as `<script type="application/ld+json">`.

---

### Option E: Sitemap auto-generation

```typescript
// src/app/sites/[businessSlug]/sitemap.xml/route.ts
export async function GET(_req: Request, { params }) {
  const { businessSlug } = await params;
  const { data: pages } = await supabase
    .from('site_pages')
    .select('slug, updated_at')
    .eq('business_slug', businessSlug)
    .eq('status', 'published');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages?.map(p => `<url><loc>https://${customDomain}/${p.slug}</loc><lastmod>${p.updated_at}</lastmod></url>`).join('')}
</urlset>`;

  return new Response(sitemap, { headers: { 'Content-Type': 'text/xml' } });
}
```

---

### Recommendation: **Options A + B + D for MVP**

Schema.org (Option D) is NOT a v2 feature — it's a publish prerequisite. See Section 22 for why. Add C (SERP preview) and E (sitemap) in v2.

---

## 20. Recommended Stack Combination

### MVP Stack (Aligned with Local Marketing Platform Goal)

| Feature | Choice | Why |
|---|---|---|
| **Primary page type** | Location service pages | Core local SEO asset. Where ranking leverage is. |
| Code editor | CodeMirror 6 + `@uiw/react-codemirror` | ~130KB, mobile-friendly, active |
| Location service page generation | Anthropic SDK streaming + location-aware prompt | City/service/NAP context baked in |
| Blog post generation | Anthropic SDK streaming | Streams into editor, market-scoped CTA |
| Foundation page generation | Template + Claude fill slots | Consistent structure |
| Bulk generation | Calendar-driven (MVP) → full matrix (v2) | Automation is the value prop |
| Page serving | Next.js catch-all route handler | Zero new infra |
| Custom domains | Vercel Domains API (if on Vercel) | Auto SSL, single API call |
| Custom domains | Cloudflare for SaaS (platform-agnostic) | Works anywhere, auto SSL |
| DNS verification | CNAME + polling every 10 min (Vercel Cron) | Simple for customers |
| Background jobs | Vercel Cron (Pro plan) | DNS polling + scheduled publish |
| Assets | Supabase Storage | Already in stack |
| Preview | Split-pane `srcdoc` iframe (500ms debounce) | Best DX |
| Deployment | Draft / Published + Scheduled | Calendar sync requires scheduling |
| Routing (no custom domain) | `/sites/[businessSlug]/[city-state]/[service]/` | Local SEO URL structure |
| Routing (custom domain) | `proxy.ts` host header → single domain path-based | Consolidates authority |
| DB | `site_pages` with `location_id`, `market_id`, `service_id` | Multi-location aware from day 1 |
| SiteAudit | "Fix issue" → pre-populate + issue tracking | Closes the audit → build loop |
| ContentStrategy | "Build this" + auto-mark done + publish_at from week | Closes the calendar → build loop |
| LocalGrid | Auto-register keywords on publish + gap-driven prompts | Closes the rank → build loop |
| OffPageAudit | Surface pages as link targets + missing page alerts | Closes the citation → page loop |
| SEO | Auto-generate meta + schema.org from location data | Local business markup is critical |

---

### The Full Automation Loop (Platform Vision)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA INPUTS                                  │
│  SiteAudit: missing pages, cannibalization, CrUX, local pack flags  │
│  OffPageAudit: missing citations, link gaps, backlink profile        │
│  LocalGrid: ranking gaps per location per keyword                    │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
              ContentStrategy: ROI-sorted plan
              (CalendarItemV2 with location, service, keyword,
               priority from: KD + tier + local pack + CrUX)
                             ↓
              WebsiteBuilder: Claude executes the plan
              (bulk generates location × service pages,
               blog posts, citation-targeted pages)
                             ↓
              Pages published to customer's domain
                             ↓
         ┌───────────────────┴────────────────────┐
         ↓                                        ↓
  LocalGrid re-scan                       OffPageAudit:
  (before/after rank                      citations now link
   improvement per                        to specific page
   location)                              URLs, not homepage
         ↓                                        ↓
         └───────────────────┬────────────────────┘
                             ↓
              LeadIntelligence: new leads attributed
              to market + location where pages went live
              (calendar_item_id on lead → measures content ROI)
                             ↓
              SiteAudit re-crawl: scores the new pages,
              detects any new issues, feeds next cycle
                             ↓
                      ← repeat →
```

Every tool feeds the next. The website builder is the **production step** — where AI executes the strategy the other tools define. Key loops that close the feedback cycle:

| Loop | Signal | Response |
|---|---|---|
| Rank → Build | LocalGrid shows poor visibility for keyword | WebsiteBuilder generates missing location page |
| Audit → Build | SiteAudit finds thin/missing service page | ContentStrategy adds `website_addition`, Builder creates it |
| Citations → Build | OffPageAudit shows citations with no target page | Builder creates the page, citations now have value |
| Lead → Validate | LeadIntelligence shows lead spike after publish | Validates ROI estimate for that calendar item |
| Cannibalization → Fix | SiteAudit detects Tier 1–4 conflict | Calendar generates `website_change` task, Builder rewrites |

---

## 21. Cross-Tool Integration Map

This section documents data flows and gaps between ALL tools — not just WebsiteBuilder integrations. These are platform-level issues that affect accuracy, API cost, and how well the tools reinforce each other.

### 21.1 Full Data Flow Map

Who produces what, and who should consume it:

| Producer | Data | Current Consumer | Should Also Feed |
|---|---|---|---|
| **SiteAudit** | Keyword markets (volume, intent, KD, local pack) | ContentStrategy | LocalGrid (volume context), WebsiteBuilder (keyword targeting) |
| **SiteAudit** | Cannibalization conflicts (Tier 1–4) | ContentStrategy (Tier 1–2 only) | ContentStrategy Tier 3–4 (gap), WebsiteBuilder (block keyword reuse) |
| **SiteAudit** | CrUX/PageSpeed per page | SiteAudit dashboard only | ContentStrategy (fix task priority boost) |
| **SiteAudit** | Domain rating / rank overview | SiteAudit crawl_data | OffPageAudit (currently fetches independently — double cost) |
| **SiteAudit** | Business detection (name, city, categories) | SiteAudit dashboard | OffPageAudit (could pre-fill location discovery) |
| **OffPageAudit** | Physical GBP locations (city, address, placeId) | ContentStrategy (GBP routing) | LeadIntelligence (physical location lead segmentation) |
| **OffPageAudit** | Missing citations by tier | ContentStrategy (untriaged) | ContentStrategy with priority from tier (gap) |
| **OffPageAudit** | Competitor backlink gap domains | ContentStrategy (link outreach tasks) | WebsiteBuilder (pages that need backlinks identified) |
| **LocalGrid** | Rank per grid point per keyword | LocalGrid dashboard | WebsiteBuilder (gap → page creation), SiteAudit (compare to market keyword rank) |
| **ContentStrategy** | Calendar items with ROI score | WebsiteBuilder ("Build" button) | LeadIntelligence (calendar_item_id → lead attribution) |
| **WebsiteBuilder** | Published page URLs per location | LocalGrid (keyword auto-register) | OffPageAudit (link targets), SiteAudit (re-crawl scope) |
| **LeadIntelligence** | Leads by market + source | LeadIntelligence dashboard | ContentStrategy (validate ROI estimates retroactively) |

---

### 21.2 The Four Critical Platform Gaps

These are the highest-impact gaps that affect the entire platform, not just individual tools.

---

#### Gap 1: No Lead-to-Content Attribution

**Problem**: A blog post is published in Week 4. Organic leads spike in Week 8. There is no way to know the post caused the spike because `contacts` has no reference to what content was live when the lead came in.

**Fix**: Add `content_calendar_item_id` as a nullable foreign key on the `contacts` table.

```sql
ALTER TABLE contacts
  ADD COLUMN content_calendar_item_id uuid REFERENCES ... ON DELETE SET NULL;
```

Attribution logic:
1. When a lead arrives with `source = 'website'` or `source = 'referral'`
2. Look up what pages were published in the 30–60 days prior for the lead's `market_id`
3. Assign `content_calendar_item_id` to the most relevant recently-published calendar item (match by `service_requested` keyword vs. page `primaryKeyword`)

**Impact**: Completes the Stage 3 ROI measurement loop — estimated ROI → actual leads from that page.

---

#### Gap 2: Location Entity Fragmentation

**Problem**: The platform has three different ways of representing a location:
- `markets` table (abstract, cities array, area codes)
- `business_locations` table (physical GBP with address/placeId/cid)
- OffPageAudit location objects (discovered from GBP API, stored in JSONB)

These three entities are never explicitly linked. A lead's `market_id` doesn't know which `business_locations` it corresponds to. OffPageAudit location data isn't tied to a `business_locations` record.

**Fix**: Add a `location_id` FK from `markets` to `business_locations` (for markets that map to a single physical location) and ensure OffPageAudit links its discovered locations back to `business_locations.id`.

```sql
ALTER TABLE markets ADD COLUMN primary_location_id uuid REFERENCES business_locations(id);
```

**Impact**: Enables physical-location-level lead segmentation in LeadIntelligence, enables citation strategy to link to the right page for the right physical location, reduces location data mismatches across tools.

---

#### Gap 3: Domain Rating Double-Fetch

**Problem**: SiteAudit fetches domain rating as part of its crawl (`domain_rank_overview` in `crawl_data`). OffPageAudit fetches the same metric independently via DataForSEO backlink analytics. Every time a user runs both tools on the same domain, the platform pays for the same data twice.

**Fix**: OffPageAudit reads domain rating from the most recent completed SiteAudit for the same business. Falls back to independent fetch if no SiteAudit has run.

**Impact**: Reduces DataForSEO API costs. Also ensures both tools show the same domain rating number (currently they could diverge if one is stale).

---

#### Gap 4: Cannibalization Prevention is Reactive, Not Proactive

**Problem**: `cannibalizationDetection.ts` runs post-crawl analysis — it finds cannibalization that already exists. But the ContentStrategy calendar and WebsiteBuilder can create new pages that cannibalize existing ones, because the content generation has no awareness of what keywords are already owned.

**Current state**: WebsiteBuilder planning doc (Section 0.4) documents the `keyword_assignments` table with a UNIQUE constraint. This hasn't been built yet.

**Fix**: Before any page generation (single or bulk), query `keyword_assignments` for all keywords already claimed in the business. Pass the full list into the Claude prompt as "avoid these keywords — they're owned by other pages." This is the only mechanism that prevents AI cannibalization at generation time.

**Without this**: Bulk generating 25 location service pages will inevitably produce pages that overlap on semantic variants of the same keyword — especially near_me variants like "AC repair near me" which every location page will want to target.

---

### 21.3 Data Quality Dependencies (Build Order)

Some tools produce better results when other tools have already run. The recommended run order:

```
1. SiteAudit        → establishes keyword markets, domain rating, page inventory, cannibalization
2. OffPageAudit     → reads from SiteAudit (domain rating, business detection)
3. LocalGrid        → reads from SiteAudit (keyword markets for volume context)
4. ContentStrategy  → reads from SiteAudit + OffPageAudit + LocalGrid (all data)
5. WebsiteBuilder   → reads from ContentStrategy (calendar) + keyword_assignments (anti-cannibalization)
6. LeadIntelligence → reads from WebsiteBuilder (published pages) + ContentStrategy (calendar items)
```

No tool is blocked if predecessors haven't run — each degrades gracefully (uses defaults or skips enrichment). But the full accuracy of the ROI model and calendar prioritization requires running them in this order.

---

## 22. Publish-Time SEO Prevention

> **The problem**: Site Audit catches SEO issues *after* they've already done damage — a noindexed page might sit in Google's index for weeks before the next crawl, a schema-less page misses rich results from day one, and canonical confusion splits authority silently. The website builder must prevent the highest-impact issues at publish time, not detect them later.

### 22.1 What's Already Caught (Safety Net — Acceptable Lag)

These are real issues, but Site Audit catching them post-publish is an acceptable workflow. Fix the next time the audit runs.

| Issue | Caught by | Lag |
|---|---|---|
| Missing canonical tags | SiteAudit — canonicals check | Next crawl |
| Noindex on live pages | SiteAudit — non-indexable check | Next crawl |
| Broken links from deleted pages | SiteAudit — links category | Next crawl |
| Missing alt text | SiteAudit — accessibility | Next crawl |
| H1 missing or multiple | SiteAudit — content category | Next crawl |
| Thin content (<300 words) | SiteAudit — content category | Next crawl |
| Duplicate meta title/description | SiteAudit — meta category | Next crawl |
| Redirect chains | SiteAudit — technical | Next crawl |
| NAP inconsistency | OffPageAudit — NAP scoring | Next audit |

---

### 22.2 What Has Zero Coverage — Must Be Built Into the Builder

Three gaps have no detection mechanism anywhere in the platform. They must be handled at publish time or they won't be handled at all.

---

#### 22.2.1 Canonical Split (scorchlocal.com/sites/ vs. custom domain)

**Problem**: The same page is served on two URLs simultaneously — `app.scorchlocal.com/sites/acme/portland-or/ac-repair/` (the ScorchLocal hosted version) and `acmeplumbing.com/portland-or/ac-repair/` (the custom domain). Google may index both, splitting PageRank between them, or choose the wrong one as canonical.

**Why Site Audit can't catch it**: It crawls one domain per run. It will never know the ScorchLocal URL exists when auditing the custom domain, and vice versa.

**Fix — inject canonical server-side in the route handler, always**:

```typescript
// src/app/sites/[businessSlug]/[...slug]/route.ts
export async function GET(_req: Request, { params }: ...) {
  const { businessSlug, slug } = await params;
  const host = req.headers.get('host') ?? '';

  // Resolve canonical: prefer custom domain if one is active
  const { data: domain } = await supabase
    .from('business_domains')
    .select('domain, ssl_status')
    .eq('business_id', page.business_id)
    .eq('ssl_status', 'active')
    .single();

  const canonicalBase = domain
    ? `https://${domain.domain}`
    : `https://app.scorchlocal.com/sites/${businessSlug}`;
  const canonicalUrl = `${canonicalBase}/${slug.join('/')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="canonical" href="${canonicalUrl}" />
  ...
</head>`;
}
```

**Result**: Regardless of which domain serves the request, the canonical always points to the same URL — the custom domain if active, the ScorchLocal URL if not. Google consolidates authority to one URL from day one.

**Additional step**: When a custom domain is activated (`ssl_status` goes to `active`), set the new canonical URL on all existing published pages in a background job. Old ScorchLocal-hosted URLs return a 301 redirect to the custom domain.

---

#### 22.2.2 Schema.org JSON-LD (Zero Detection Anywhere)

**Problem**: Site Audit has no structured data detection. Schema-less pages miss rich results (star ratings, FAQs, service cards in SERPs) from the moment they publish. No tool will ever surface this gap unless schema generation is built into the publish flow.

**Why it matters for local service pages specifically**: `LocalBusiness` + `Service` schema directly feeds Google's local knowledge panel and service carousels. For local SEO, this is one of the highest-leverage structured data types.

**Fix — generate schema as part of the content generation step, not after**:

The main Claude call (Sonnet) generates the page body. A second call (Haiku — cheap, fast) generates the JSON-LD immediately after, using the page content + business data as input.

```typescript
// After main page generation completes:
async function generateSchema(
  pageType: CalendarItemType,
  business: Business,
  location: BusinessLocation | null,
  service: Service | null,
  pageHtml: string,
  publishedAt: string,
): Promise<string> {
  const prompt = buildSchemaPrompt(pageType, business, location, service, pageHtml);
  const result = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });
  return result.content[0].text; // returns JSON string
}

function buildSchemaPrompt(...): string {
  // pageType → schema type mapping:
  // 'location_service' → LocalBusiness + Service + FAQPage (if FAQ section present)
  // 'blog_post'        → Article + BlogPosting
  // 'city_landing'     → LocalBusiness
  // 'website_addition' → Service
}
```

**Schema types by page type**:

| Page Type | Schema Types |
|---|---|
| `location_service` | `LocalBusiness` + `Service` + `FAQPage` (if FAQ present) |
| `city_landing` | `LocalBusiness` (with `areaServed` from market cities) |
| `blog_post` | `Article` + `BlogPosting` (author = business name) |
| `website_addition` | `Service` |
| `website_change` | inherit from existing page |

**Data already available** for schema generation:
- `business.name`, `business.phone`, `business.address` → `LocalBusiness.name/telephone/address`
- `location.city`, `location.state`, `location.latitude`, `location.longitude` → `LocalBusiness.address/geo`
- `location.place_id`, `location.cid` → `LocalBusiness.sameAs` (Google Maps URL)
- `service.name` → `Service.name`
- `CalendarItemV2.primaryKeyword` → `Service.description`
- `page.published_at` → `Article.datePublished`

**Stored in**: `site_pages.schema_json` (text). Injected in the route handler as `<script type="application/ld+json">`.

---

#### 22.2.3 Draft Pages Getting Indexed

**Problem**: If a draft page is ever accessible at a URL (e.g., for the live preview route or if someone shares the ScorchLocal URL), Google may crawl and index it. A draft might have placeholder content, incomplete NAP data, or thin text that harms domain quality scores.

**Fix — `noindex` injected server-side based on `status`, always**:

```typescript
// In the catch-all route handler
const robotsContent = page.status === 'published'
  ? 'index, follow'
  : 'noindex, nofollow';  // draft, scheduled, archived

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="robots" content="${robotsContent}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ...`;
```

This is a 2-line addition to the route handler. It means:
- `status = 'draft'` → `noindex, nofollow` — preview works, Google won't index it
- `status = 'scheduled'` → `noindex, nofollow` — page is accessible at the URL but not indexable until publish time passes
- `status = 'published'` → `index, follow` — normal indexing

**Scheduled publishing**: When the scheduler job flips `status → 'published'`, it should also immediately trigger a GSC indexing ping (see 22.2.4) so Google knows to re-evaluate the URL.

---

#### 22.2.4 GSC Indexing Submission (Nothing Triggers This)

**Problem**: After a page publishes, Google finds it on its own schedule — typically within days to weeks depending on crawl budget. For a new domain with no existing crawl budget, this could be weeks. There's no mechanism in the platform that tells Google "this URL exists now, please crawl it."

**Two options**:

**Option A — IndexNow (recommended for MVP)**

IndexNow is an open protocol supported by Bing and Yandex; Google announced support in 2023 though it treats it as a crawl hint, not a guarantee.

```typescript
// After page.status → 'published'
async function pingIndexNow(pageUrl: string, businessDomain: string) {
  const key = process.env.INDEXNOW_KEY!; // one key per domain, stored in business_domains

  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: businessDomain,
      key,
      keyLocation: `https://${businessDomain}/${key}.txt`,
      urlList: [pageUrl],
    }),
  });
}
```

Setup: Generate and store an IndexNow key per custom domain. Serve the key file at `/{key}.txt` from the catch-all route. One-time setup when domain goes active.

**Option B — Google Search Console URL Inspection API**

GSC's URL Inspection API can programmatically request indexing for a specific URL. Requires the business to have GSC connected (which they already do for the existing GSC integration in the platform).

```typescript
// POST https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run
// (URL Inspection endpoint for indexing requests is different — requires OAuth)
// scope: https://www.googleapis.com/auth/webmasters
```

**Complexity**: Higher — requires GSC OAuth token per user. Better long-term since it uses the existing GSC connection. Consider for v2.

**Recommendation**: IndexNow for MVP (no user-level OAuth), GSC API for v2 once GSC is deeply integrated.

---

### 22.3 Content Similarity Prevention (Bulk Generation Gap)

**Problem**: The cannibalization detection system (`cannibalizationDetection.ts`) uses keyword overlap between pages — but two location service pages can pass keyword checks while being 85%+ identical in body text. Example: "AC Repair in Portland, OR" and "AC Repair in Vancouver, WA" generated by the same Claude prompt with the same template, only the city name swapped. Google's Helpful Content system detects this as doorway page spam.

**Why existing tools miss this**:
- Keyword assignments table prevents keyword targeting overlap ✓
- Cannibalization detection checks title/keyword signals ✓
- **Neither checks actual content similarity between pages** ✗

**Two-layer fix**:

**Layer 1 — Prompt-level (at generation time)**

Each location service page prompt must include a "uniqueness requirement" section:

```typescript
function buildUniquenessRequirement(
  location: BusinessLocation,
  market: Market,
  otherLocations: BusinessLocation[],
): string {
  return `
UNIQUENESS REQUIREMENTS — this page must be meaningfully different from other location pages:
- Reference at least one local landmark, neighbourhood, or geographic feature specific to ${location.city}
- Include service-area-specific detail (e.g., local climate, typical home types in ${location.city})
- The FAQ section must contain at least 2 questions specific to ${location.city} (not generic)
- Do NOT reuse sentences or paragraphs that would appear on pages for: ${otherLocations.map(l => l.city).join(', ')}
- Every section must contain ${location.city}-specific context, not just a city-name substitution
`;
}
```

**Layer 2 — Post-generation similarity check (before saving to draft)**

After bulk generation, before committing pages to the DB, run a lightweight similarity check:

```typescript
// Cosine similarity on stripped text (no HTML, no NAP data)
function cosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA); // simple word frequency map
  const tokensB = tokenize(textB);
  // standard tf-idf cosine similarity
}

// Flag any pair with similarity > 0.75 before saving
const pageTexts = generatedPages.map(p => ({ id: p.slug, text: stripHtml(p.html) }));
for (let i = 0; i < pageTexts.length; i++) {
  for (let j = i + 1; j < pageTexts.length; j++) {
    const sim = cosineSimilarity(pageTexts[i].text, pageTexts[j].text);
    if (sim > 0.75) {
      flaggedPairs.push({ a: pageTexts[i].id, b: pageTexts[j].id, similarity: sim });
    }
  }
}
```

If flagged pairs exist, surface them in the bulk generation review UI before the user can publish:

```
⚠️ 2 pages are too similar (>75% content overlap):
   "AC Repair in Portland, OR" ↔ "AC Repair in Lake Oswego, OR" — 81% similar
   Regenerate one or both with more location-specific detail before publishing.
   [Regenerate Portland] [Regenerate Lake Oswego] [Dismiss]
```

**Thresholds**:
- >85% similarity → block publish, force regeneration
- 75–85% → warn, allow override with confirmation
- <75% → pass

**No external API needed** — cosine similarity on bag-of-words is pure JS, runs in milliseconds per pair. For 25 pages, that's 300 comparisons — negligible.

---

### 22.4 Publish Checklist (Gate Before status → 'published')

These checks run server-side in the publish API route before `status` is set to `'published'`. Failed checks return errors to the UI, not silent failures.

| Check | Blocks publish? | Auto-fix possible? |
|---|---|---|
| Meta title present (≤60 chars) | Yes | Auto-generate via Haiku |
| Meta description present (≤160 chars) | Yes | Auto-generate via Haiku |
| Schema JSON-LD present and valid JSON | Yes | Auto-generate via Haiku |
| Canonical URL set | No (injected server-side automatically) | Yes — always injected |
| `robots` meta set based on status | No (injected server-side automatically) | Yes — always injected |
| Word count ≥ 300 | Warn only | No — surface to user |
| H1 tag present | Warn only | No — surface to user |
| At least one phone number in content | Warn only | No |
| Similarity score < 85% (bulk only) | Yes | Offer regeneration |

Auto-fixable checks run silently. Non-auto-fixable blocks surface as a pre-publish checklist panel in the editor UI, similar to WordPress's "Publish" sidebar.

---

### 22.5 Summary: Prevention vs. Detection

| Issue | Strategy | Where |
|---|---|---|
| Canonical split | **Prevent** — inject server-side always | Route handler |
| Draft indexed | **Prevent** — inject noindex server-side always | Route handler |
| Schema missing | **Prevent** — generate at publish time, block if absent | Publish API + Haiku call |
| GSC submission | **Prevent** — IndexNow ping after publish | Post-publish webhook |
| Content similarity | **Prevent** — prompt + similarity gate | Bulk generation + publish gate |
| Thin content, H1, alt text | **Detect** — Site Audit safety net | Acceptable lag |
| Broken links | **Detect** — Site Audit safety net | Acceptable lag |
| NAP inconsistency | **Detect** — OffPageAudit safety net | Acceptable lag |
| Duplicate meta | **Detect** — Site Audit safety net | Acceptable lag |

---

## 23. Content Enrichment & Research Pipeline

> **The problem**: Claude generates content from business data (NAP, services, keywords) but has no real-world knowledge of the specific location being targeted, the current state of technical topics, or the specific projects the business has completed. Generic prompts produce generic content. Enrichment is what closes that gap.

The right enrichment strategy differs by content type. Three separate pipelines are needed.

---

### 23.1 Architecture Overview

Two generation modes, selected based on content type and whether bulk generation is running:

```
BULK GENERATION (location × service matrix)
  ──────────────────────────────────────────
  Pre-pull phase (runs once per batch):
    → Location data API calls per unique location → cache 30 days
    → SERP top-page content per unique keyword → cache 7 days

  Generation phase (per page, parallel):
    → Assemble context block from cached data
    → Single Claude Sonnet call with enriched prompt
    → ~8–12s per page, predictable cost

SINGLE PAGE / RESEARCH-BACKED BLOG
  ──────────────────────────────────
  Research phase (Claude drives this):
    → Claude receives research prompt + web_search tool
    → Calls search 3–8 times, reads results
    → Synthesizes findings into generation context

  Generation phase:
    → Same Claude Sonnet call, but context came from live research
    → ~30–60s total, higher cost, highest quality
```

---

### 23.2 Location Page Enrichment

Location pages need grounding in real local context — not just the city name swapped in, but genuine references to the area that signal to both Google and readers that the business actually serves this place.

#### Data Sources

| Data | API | Cost | Cache TTL | What it adds to content |
|---|---|---|---|---|
| Nearby landmarks + neighbourhoods | Google Maps Places API (Nearby Search) | ~$0.032/req, $200/mo free | 30 days | "Near Orenco Station, Intel Jones Farm Campus, Tanasbourne" |
| Monthly avg high/low temperatures | OpenMeteo API | Free, no API key | 30 days | "Portland winters average 39°F — heating season runs Oct–Apr" |
| Housing stock age + type | US Census Bureau API (ACS) | Free | 90 days | "65% single-family homes, median build year 1978. Older ductwork common." |
| Neighbourhood names | Google Maps Geocoding + reverse | Included in Maps credit | 30 days | Proper local neighbourhood names vs. generic city name |

#### Implementation

Pull and cache before the generation batch starts. One fetch per unique location — not per page.

```typescript
interface LocationEnrichment {
  landmarks: string[];           // ["Orenco Station (0.8mi)", "Hillsboro Town Center (1.2mi)"]
  neighborhoods: string[];       // ["Orenco", "Quatama", "Tanasbourne", "South Hillsboro"]
  climate: {
    heatingSeasonMonths: string; // "October through April"
    avgWinterLow: number;        // 34 (°F)
    avgSummerHigh: number;       // 82 (°F)
    humidity: 'humid' | 'arid' | 'moderate';
  };
  housing: {
    medianBuildYear: number;     // 1978
    pctSingleFamily: number;     // 0.65
    pctOlderThan40Years: number; // 0.71
  };
}

async function fetchLocationEnrichment(
  lat: number,
  lng: number,
  city: string,
  state: string,
): Promise<LocationEnrichment> {
  const [places, climate, housing] = await Promise.all([
    fetchNearbyLandmarks(lat, lng),       // Google Maps Places API
    fetchClimateData(lat, lng),           // OpenMeteo
    fetchHousingData(city, state),        // US Census Bureau ACS API
  ]);
  return { landmarks: places.landmarks, neighborhoods: places.neighborhoods, climate, housing };
}
```

#### Prompt Injection Block

```typescript
function buildLocationEnrichmentBlock(enrichment: LocationEnrichment, service: Service): string {
  return `
LOCAL CONTEXT — use this naturally throughout the content, do not list it verbatim:

Climate: ${enrichment.climate.heatingSeasonMonths} is heating season
  (avg low ${enrichment.climate.avgWinterLow}°F). Summer avg high ${enrichment.climate.avgSummerHigh}°F.
  → Reference why this climate makes ${service.name} maintenance important locally.

Housing: ${Math.round(enrichment.housing.pctOlderThan40Years * 100)}% of homes built before
  ${new Date().getFullYear() - 40}. Median build year ${enrichment.housing.medianBuildYear}.
  → Reference older home considerations relevant to ${service.name} where appropriate.

Landmarks & neighbourhoods nearby: ${enrichment.landmarks.slice(0, 4).join(', ')}
Neighbourhoods served: ${enrichment.neighborhoods.join(', ')}
  → Reference 1–2 of these naturally (e.g. "serving homeowners in Orenco and Tanasbourne").

DO NOT fabricate local details beyond what is listed above.
DO NOT list these as bullet points — weave them into the prose naturally.
`;
}
```

#### Caching Strategy

Store enrichment in a `location_enrichment_cache` table keyed by `(lat_rounded, lng_rounded)` — round to 2 decimal places (~1km grid) so nearby locations share cache entries.

```sql
CREATE TABLE location_enrichment_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat_bucket   numeric(6,2) NOT NULL,  -- rounded to 2dp
  lng_bucket   numeric(6,2) NOT NULL,
  data         jsonb NOT NULL,
  fetched_at   timestamptz DEFAULT now(),
  UNIQUE (lat_bucket, lng_bucket)
);
-- Stale after 30 days — background job re-fetches
```

---

### 23.3 Blog Post / Technical Guide Enrichment

Blog content needs *topically current, specific* research. Unlike location data (deterministic, API-fetched), blog research is open-ended — you don't know what to pull until you know the topic. Claude driving its own research via tool use is the right architecture here.

#### Claude Tool Use (Research-First Generation)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateResearchedBlogPost(
  title: string,
  primaryKeyword: string,
  service: Service,
  location: BusinessLocation,
  market: Market,
  serpContext: SerpTopPages,  // top 3 ranking pages from DataForSEO — already available
): Promise<string> {

  const tools: Anthropic.Tool[] = [{
    name: 'web_search',
    description: 'Search the web for current, accurate technical information. Use for facts, statistics, best practices, codes/standards, and product specifications. Do not use for local business information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  }];

  const systemPrompt = `You are an expert content writer for ${service.name} businesses.
You write technically accurate, locally relevant blog posts that help homeowners and build trust.
Before writing, research the topic thoroughly using the web_search tool.
Research at minimum: current best practices, relevant codes/standards, and any ${location.city}-specific context.
Competing articles cover: ${serpContext.topTopics.join(', ')} — cover these topics and go deeper.`;

  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: `Write a comprehensive blog post:
Title: "${title}"
Primary keyword: "${primaryKeyword}"
Business: ${service.name} company serving ${location.city}, ${location.state}
Audience: Homeowners considering or needing ${service.name}

Research the topic first, then write 1,200–1,800 words of genuinely useful content.
End with a CTA referencing ${location.city} and the business phone ${location.phone}.
Output valid semantic HTML5 only.`,
  }];

  // Agentic loop — Claude calls tools until it has enough research
  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools,
    system: systemPrompt,
    messages,
  });

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (use) => {
        if (use.type !== 'tool_use') return null!;
        const searchResult = await callWebSearch(use.input.query as string);
        return {
          type: 'tool_result' as const,
          tool_use_id: use.id,
          content: searchResult,
        };
      })
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      tools,
      system: systemPrompt,
      messages,
    });
  }

  return response.content.find(b => b.type === 'text')?.text ?? '';
}
```

#### SERP Content as Baseline (Already Available — Zero Extra Cost)

DataForSEO already fetches top-ranking URLs for each keyword in the content strategy pipeline. Extend this to also scrape their content summary (what H2s they use, what topics they cover). This becomes the minimum baseline context for every blog post — no extra API call.

```typescript
// Add to existing keyword enrichment pipeline
interface SerpTopPages {
  keyword: string;
  topTopics: string[];     // H2s extracted from top 3 pages
  avgWordCount: number;    // tells Claude how long to write
  commonQuestions: string[]; // PAA boxes from SERP
}
```

#### When to Use Each Approach

| Scenario | Approach | Latency | Quality |
|---|---|---|---|
| Bulk blog generation (calendar queue) | SERP context injection | ~8–12s | Good |
| Single blog post (user-initiated) | Claude tool use (research-first) | ~30–60s | Excellent |
| Technical how-to guide | Claude tool use | ~45–90s | Excellent |
| Seasonal / topical post | SERP context + location enrichment | ~8–12s | Good |

Expose this in the UI as two generation modes: **Quick Generate** (bulk-safe, SERP context) and **Research & Write** (tool use, single post, user waits).

#### Web Search API Options

| Option | Cost | Quality | Setup |
|---|---|---|---|
| **Brave Search API** | $3/1,000 queries (free tier: 2,000/mo) | Good | Simple API key |
| **Serper.dev** | $50/month (unlimited on paid) | Good, fast | Simple API key |
| **DataForSEO SERP** | Already in stack | Good | Already integrated |
| **Jina.ai Reader** | Free tier generous | Good for page content | No key needed |

**Recommendation**: Use DataForSEO SERP for keyword-based research (already paying), Jina.ai Reader (`r.jina.ai/{url}`) for fetching full content of competitor pages. No new paid API needed.

---

### 23.4 GBP Post Enrichment — Project Library

GBP posts perform best when grounded in real, specific completed projects. External data cannot provide this — it has to come from the business. The right answer is a **Project Library** feature, not external enrichment.

#### Why External Data Fails for GBP Posts

Generic GBP posts like "We provide HVAC services in Portland" get low engagement and provide minimal local SEO signal. Google prioritises GBP posts that:
- Reference a specific completed job
- Name a specific neighbourhood or area
- Include a specific outcome ("reduced gas bill 30%")
- Have a photo of the actual work

None of this can be fabricated or pulled from the web. It has to come from the business's own job records.

#### Project Library DB Schema

```sql
CREATE TABLE business_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id      uuid REFERENCES services(id),
  location_id     uuid REFERENCES business_locations(id),
  market_id       uuid REFERENCES markets(id),

  -- Job details
  job_type        text NOT NULL,       -- "installation" | "repair" | "maintenance" | "inspection"
  title           text,                -- optional: user's label for the job
  problem         text,                -- what was wrong / what the customer needed
  work_performed  text NOT NULL,       -- what was done
  outcome         text,                -- result, customer feedback, measurable improvement
  equipment_used  text,                -- brand, model, spec — e.g. "Bryant Evolution 20 SEER"
  home_type       text,                -- "1970s ranch", "new construction", "commercial unit"

  -- Media
  photo_urls      text[],              -- Supabase Storage URLs

  -- Metadata
  completed_date  date NOT NULL,
  city            text,                -- actual city of the job (may differ from location)
  used_in_posts   uuid[],              -- content_calendar_item_ids that used this project
  created_at      timestamptz DEFAULT now()
);
```

#### Project Entry UI

A simple form, minimum friction. Business fills in after each job:

```
Service:        [AC Installation ▼]
Location:       [Portland, OR ▼]
Date:           [Jan 28, 2026]
Job type:       [Installation ▼]
What was done:  [Replaced 22-year-old Carrier unit with Bryant Evolution 20 SEER two-stage system]
Problem/reason: [Unit failed mid-winter, cracked heat exchanger]
Outcome:        [Customer reports 30% reduction in January gas bill]
Home type:      [1980s single-family, 1,850 sq ft]
Photos:         [Upload ▒▒▒▒]
```

Mobile-optimised — technicians fill this in from the job site. This is the hardest adoption challenge but also the highest-value input in the platform.

#### Claude Prompt from Project Entry

```typescript
function buildGBPPostPrompt(
  project: BusinessProject,
  location: BusinessLocation,
  business: Business,
): string {
  return `Write a Google Business Profile post about a recently completed ${project.job_type}.

Project details:
- Service: ${project.work_performed}
- Location: ${project.city ?? location.city}, ${location.state}
- Problem solved: ${project.problem}
- Outcome: ${project.outcome ?? 'job completed successfully'}
- Equipment: ${project.equipment_used ?? 'professional-grade equipment'}
- Home type: ${project.home_type ?? 'local home'}

Requirements:
- 150–300 words (GBP post optimal length)
- Friendly, professional tone — not salesy
- Mention the specific neighbourhood/city
- Include a specific detail from the job (equipment model, home age, measurable outcome)
- End with a soft CTA and the phone number ${location.phone}
- Do NOT make up any details not listed above

Output plain text only (GBP does not render HTML).`;
}
```

#### Project Library → Content Calendar Integration

Projects feed more than just GBP posts:

| Project data | Feeds | How |
|---|---|---|
| Installation of new equipment | GBP post | "We just installed X in [city]" |
| Unusual repair / interesting problem | Blog post | "Case study: why this Portland home's AC kept failing" |
| Before/after photos | Location service page | Hero image or "recent work" gallery section |
| Customer outcome/quote | Foundation pages | Testimonial section |
| Equipment used | Schema.org `Service` | `offers.itemOffered` with brand/model |

The calendar item type `offpage_post` already maps to GBP posting. Add a `project_id` FK to `calendar_items` so every GBP post traces back to a real job.

```sql
ALTER TABLE content_strategies
  -- calendar_v2 is jsonb — add project_id to CalendarItemV2 interface instead:
```

```typescript
// In CalendarItemV2 type (src/types/index.ts)
interface CalendarItemV2 {
  // ... existing fields
  projectId?: string;  // references business_projects.id — GBP posts only
}
```

---

### 23.5 SERP Reference Enrichment (All Content Types)

DataForSEO is already in the stack and already fetching top-ranking pages per keyword. Extend it to also pull content structure from those pages. This becomes baseline context for every generation — zero extra API cost.

#### What to Extract from Top-Ranking Pages

```typescript
interface SerpContentContext {
  keyword: string;
  topPages: Array<{
    url: string;
    title: string;
    h2s: string[];           // section headings → what topics they cover
    wordCount: number;
    hasFAQ: boolean;
    hasVideo: boolean;
    schemaTypes: string[];   // what schema.org types they use
  }>;
  peopleAlsoAsk: string[];   // PAA questions from the SERP
  avgWordCount: number;      // benchmark for content length
  topicsToInclude: string[]; // union of H2 topics across top 3 pages
  topicsThatDifferentiate: string[]; // topics in top page but not others → differentiation opportunity
}
```

Use Jina.ai Reader (`https://r.jina.ai/{url}`) to fetch clean text from competitor pages — free, no API key, handles JS-rendered pages. Parse H2s and word count from the returned markdown.

```typescript
async function fetchSerpContentContext(keyword: string): Promise<SerpContentContext> {
  // Step 1: Get top URLs from DataForSEO (already in pipeline)
  const serpResults = await getDataForSEOResults(keyword);
  const topUrls = serpResults.organic.slice(0, 3).map(r => r.url);

  // Step 2: Fetch content via Jina Reader (free)
  const pageContents = await Promise.all(
    topUrls.map(url =>
      fetch(`https://r.jina.ai/${url}`)
        .then(r => r.text())
        .then(md => extractStructure(md)) // parse H2s, word count
    )
  );

  // Step 3: Extract PAA from SERP
  const paa = serpResults.people_also_ask?.map(q => q.question) ?? [];

  return buildSerpContext(keyword, pageContents, paa);
}
```

Cache per keyword, 7-day TTL — SERP rankings are relatively stable week-to-week.

---

### 23.6 Full Enriched Generation Pipeline

```
User triggers generation (single or bulk)
          ↓
RESEARCH PHASE
  ├── Location pages:  fetch LocationEnrichment (Places + OpenMeteo + Census) → cache 30d
  ├── All types:       fetch SerpContentContext (Jina + DataForSEO) → cache 7d
  └── GBP posts:       load ProjectLibrary entry (user-provided, no fetch needed)
          ↓
CONTEXT ASSEMBLY
  ├── Business data (NAP, services, markets) — existing
  ├── Keyword assignment data (anti-cannibalization) — Section 0
  ├── Location enrichment block — 23.2
  ├── SERP content context block — 23.5
  └── Project data block (GBP only) — 23.4
          ↓
GENERATION
  ├── Bulk / Quick:  Single Sonnet call with assembled context  (~8–12s)
  └── Single / Blog: Sonnet + tool use research loop            (~30–60s)
          ↓
POST-GENERATION
  ├── Schema generation (Haiku) — Section 22.2.2
  ├── Meta generation (Haiku) — Section 19 Option B
  ├── Similarity check — Section 22.3 (bulk only)
  └── Publish checklist — Section 22.4
```

---

### 23.7 Build Priority

| Feature | Priority | Effort | Impact |
|---|---|---|---|
| **Location enrichment** (OpenMeteo + Census + Places) | MVP | Medium — 3 APIs, caching layer | Eliminates "city name swap" content immediately |
| **SERP content context via Jina** | MVP | Low — Jina is free, already have SERP data | Ensures blog posts cover what ranks |
| **Project Library** (DB + form + GBP prompt) | v1 | Medium — new feature area | Only way to make GBP posts genuinely specific |
| **Claude tool use (Research & Write mode)** | v1 | Medium — agentic loop implementation | Highest quality single blog posts |
| **PAA injection into FAQ sections** | v1 | Low — already in SERP data | FAQ sections answer questions people actually ask |
| **Competitor page differentiation analysis** | v2 | Low — extend SERP context | Identifies gaps in competitor content to own |

---

### Feature Tier Suggestions (Revised)

| Feature | Tier | Rationale |
|---|---|---|
| Location service page creation (single) | All tiers | Core local SEO value |
| Blog post creation | All tiers | Content marketing basics |
| AI content generation | Uses existing content token budget | |
| Foundation pages (About, Contact) | Analysis+ | |
| Calendar-driven page building | Analysis+ | Requires ContentStrategy |
| Custom domain (single) | Marketing+ | |
| Scheduled publishing + calendar sync | Marketing+ | |
| Market-by-market bulk generation | Marketing+ | |
| Full matrix auto-generation (all locations × services) | Growth | The full automation product |
| LocalGrid → builder feedback loop | Growth | Requires GridScan data |
| OffPageAudit → builder integration | Growth | Requires OffPage data |
| Version history / rollback | Growth | |
| Multiple custom domains | Growth | |
| Schema.org JSON-LD auto-generation | Growth | |

---

### Platform Dependency

| Deployment | Custom Domain Solution |
|---|---|
| **Vercel** | Vercel Domains API (`POST /v10/projects/{id}/domains`) — simplest |
| **Any host (VPS, Fly.io, Railway)** | Cloudflare for SaaS — Business CF zone required |
| **Self-hosted VPS** | Caddy with On-Demand TLS — free, no third-party SaaS |

---

### What NOT to Do

- **Don't build one page at a time as the default** — the value is bulk automation across locations
- **Don't use separate domains per market** — fragments domain authority, hurts local SEO
- **Don't generate generic content without location context** — a blog post about "HVAC tips" has minimal local SEO value; "HVAC maintenance tips for Portland homeowners" does
- **Don't skip `location_id` / `market_id` on pages** — retrofitting multi-location awareness later is painful

---

*Last updated: 2026-03-04 — Technical options verified against official docs. Platform alignment analysis added based on `Market`, `BusinessLocation`, `Service`, `CalendarItemV2` type review.*
*Related tools: SiteAudit (`src/app/(dashboard)/site-audit/`), ContentStrategy (`src/app/(dashboard)/content-strategy/`), LocalGrid (`src/app/(dashboard)/local-grid/`), OffPageAudit (`src/app/(dashboard)/off-page-audit/`)*
