# ScorchLocal Design Guide
**Version 1.0 — For Local Business DIY Marketing Platform**

---

## 1. Design Philosophy

ScorchLocal serves two very different users sitting at the same desk:

| Layer | Who | Goal | Mental model |
|---|---|---|---|
| **Customer Layer** | The business owner | "Is my marketing working?" | Finance dashboard |
| **AI Agent Layer** | The AI doing the work | "What needs to be fixed?" | Issue tracker / task queue |

Every screen has a **primary layer**. A small number of screens serve both layers with strict section-level separation — those are documented explicitly in §16–17. A business owner should never feel overwhelmed by raw audit data on a Customer Layer screen. An AI agent should never have information hidden behind visual summaries on an Agent Layer screen.

**Core principle**: If the data relates to money, leads, or ROI → Customer Layer. If the data relates to bulk technical problems that need execution → AI Agent Layer.

---

## 2. The Two-Layer System

### Customer Layer Screens
- `/dashboard` — Home, overview, wins
- `/lead-intelligence` — Lead flow, cost, attribution
- `/billing` — Cost, plan, ROI context
- `/marketing` — Campaign performance

**Rules for Customer Layer:**
- Prioritize visuals over numbers. A bar chart beats a table. A donut beats a fraction.
- Lead with the outcome: "47 leads this month" not "Conversion rate: 3.2%"
- Limit visible numbers to 4–6 per screen. The rest go in expandable sections.
- Every number should have a comparison: vs last month, vs industry average, vs goal.
- Use green/red trend arrows, not raw deltas.
- Primary CTA on every screen — always one obvious next action.
- No raw URLs, domain strings, or technical identifiers visible.
- Financial framing: "Cost per lead: $18" not "CPC: $18.42"

### AI Agent Layer Screens
- `/site-audit` — Technical SEO crawl, issues, scoring
- `/off-page-audit` — Links, citations, reviews, GBP
- `/local-grid` — Geo rank tracking grid

### Split-Layer Screens (see §16–17 for full rules)
- `/content-strategy` — Config/prereq phase: AI Agent | Calendar phase: Customer
- `/lead-database` — Summary header: Customer | Contact table: AI Agent

**Rules for AI Agent Layer:**
- Data density is correct here. Tables, numbers, raw URLs are appropriate.
- Bulk selection, filter, sort, export — all expected patterns.
- Status badges, severity levels, counts — make them scannable, not pretty.
- Group issues by category and severity. The AI needs a task queue, not a story.
- Technical labels (H1, meta, canonical, DA, NAP) are fine.
- Export to CSV/JSON is a primary feature, not an afterthought.
- Empty states show diagnostic info: "No issues found in this category" not "You're all set! 🎉"

---

## 3. Color System

The palette is already defined. Use it strictly — never hardcode hex in JSX.

### Brand Scale (always reference by token name)

| Token | Role | Usage |
|---|---|---|
| `flame-500` (#FF5C1A) | Primary action | CTA buttons, active nav, interactive highlights |
| `flame-600` (#E04A0F) | Hover | `hover:bg-flame-600` on primary buttons |
| `flame-700` (#C03D0A) | Pressed / dark accent | `active:bg-flame-700` |
| `heat-400` (#FF9B3D) | Secondary accent | Badge backgrounds, chart series 2 |
| `heat-500` (#FF8419) | Secondary hover | |
| `ember-400` (#FFD166) | Tertiary accent | Low-severity tags, warm highlights |

### Surface Scale (dark mode as default)

| Token | Role |
|---|---|
| `char-900` (#0D0D0D) | Page background |
| `char-800` (#1A1A1A) | Card background |
| `char-700` (#2A2A2A) | Borders, dividers, hover states |
| `char-600` (#3D3D3D) | Secondary element backgrounds |
| `char-500` (#555555) | Muted / disabled text |
| `ash-100` (#FAF7F5) | Primary text |
| `ash-200` (#F0EBE7) | Secondary text |
| `ash-300` (#E0D9D3) | Tertiary text |
| `ash-400` (#BFB5AC) | Captions, labels |

### Semantic Colors (never deviate from these meanings)

| Color | Token | Only Use For |
|---|---|---|
| Green | `success` (#2ECC71) | Positive trend, resolved issue, connected state |
| Red | `danger` (#E74C3C) | Error, destructive action, declining trend, critical severity |
| Amber | `ember-500` (#FFC233) | Warning, medium severity, attention needed |
| Blue | `info` (#3498DB) | Informational, neutral context |

**Never use flame/heat for semantic states** — they are brand colors, not status colors. `ember-500` is the exception: it doubles as the warning semantic color. Do not use it for decorative purposes.

### Button Hierarchy (visual weight = importance)

```
ghost     → text-ash-300, no bg, no border
outline   → border border-char-600, transparent bg
secondary → bg-char-700 text-ash-200
primary   → .btn-primary (flame-gradient)
danger    → .btn-danger (red bg)
```

Use the existing `.btn-*` component classes. Do not create new button variants.

---

## 4. Typography

| Role | Font | Class |
|---|---|---|
| Display headings | Archivo Black | `font-display text-4xl+` |
| All UI text | DM Sans | (default body font) |
| Technical/code | Monospace | `.mono` class |

### Text Hierarchy in Components

```
Page titles:      text-2xl font-display text-ash-100
Section titles:   text-lg font-semibold text-ash-100
Card labels:      text-sm font-medium text-ash-300
Body content:     text-sm text-ash-200
Captions/meta:    text-xs text-ash-400
```

**Accessibility rule**: Never use `text-ash-400` or `char-500` for readable content — only captions and placeholders. All body text must be `ash-200` or lighter for sufficient contrast on `char-800` backgrounds.

---

## 5. Spacing & Grid

Use the Tailwind scale. Do not use arbitrary values like `p-[17px]`.

### Allowed Spacing Values
```
p-2  (8px)  — tight internal spacing (icon-to-label)
p-3  (12px) — compact elements
p-4  (16px) — list item padding
p-6  (24px) — card internal padding (ALWAYS)
p-8  (32px) — section padding
p-12 (48px) — page sections
```

**Universal card rule**: All cards use `p-6`. Never vary this. If content feels tight, reduce the content — not the padding.

### Gap Scale
```
gap-2 — icon + label inside a button
gap-3 — compact list items
gap-4 — items within a component
gap-6 — between cards in a grid
gap-8 — between major page sections
```

### Page Layout

Dashboard pages use a 12-column grid:

```tsx
// Main content area
<div className="grid grid-cols-12 gap-6">
  {/* Metric cards: 4 per row on desktop */}
  <div className="col-span-12 sm:col-span-6 lg:col-span-3">...</div>

  {/* Wide chart */}
  <div className="col-span-12 lg:col-span-8">...</div>

  {/* Narrow panel */}
  <div className="col-span-12 lg:col-span-4">...</div>

  {/* Full-width table */}
  <div className="col-span-12">...</div>
</div>
```

---

## 6. Component Patterns

### Metric Cards (Customer Layer)

Every metric card must have:
1. Label (small, muted)
2. Value (large, bold)
3. Trend indicator (% + arrow, color-coded)
4. Optional: sparkline from Recharts

```tsx
// Target pattern
<div className="card p-6">
  <p className="text-xs text-ash-400 uppercase tracking-wide">Leads This Month</p>
  <div className="flex items-end gap-3 mt-1">
    <span className="text-3xl font-display text-ash-100">47</span>
    <span className="text-sm text-success mb-1">↑ 12% vs last month</span>
  </div>
  {/* Optional 80×32 sparkline */}
  <ResponsiveContainer width={80} height={32}>
    <LineChart data={trend}>
      {/* Use JS constant — Recharts can't use Tailwind classes for stroke */}
      <Line type="monotone" dataKey="v" stroke={CHART_COLORS.primary} dot={false} strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

**Rule**: Each metric appears exactly once per screen. No repeated KPIs.

### Data Tables (AI Agent Layer)

Tables need:
- Severity/status dot in the first column (color-coded)
- Sortable column headers
- Bulk checkbox selection
- Row count in the section header
- Export button in the header area
- Inline actions: one primary + `MoreHorizontal` dropdown

```tsx
// Row pattern
<tr className="border-b border-char-700 hover:bg-char-700/40 transition-colors">
  <td className="w-8 p-4"><Checkbox /></td>
  <td className="p-4">
    <span className="w-2 h-2 rounded-full bg-danger inline-block mr-2" />
    {issue.title}
  </td>
  <td className="p-4 text-ash-400">{issue.count} pages</td>
  <td className="p-4 text-right">
    <Button size="sm" variant="outline">Fix</Button>
  </td>
</tr>
```

### Empty States

**Customer Layer empty states** — warm, encouraging:
```tsx
<div className="flex flex-col items-center justify-center py-16 gap-4">
  <div className="w-16 h-16 rounded-full bg-char-700 flex items-center justify-center">
    <TrendingUp className="w-8 h-8 text-ash-400" />
  </div>
  <h3 className="text-lg font-semibold text-ash-200">No leads yet</h3>
  <p className="text-sm text-ash-400 max-w-xs text-center">
    Connect your channels to start tracking where your leads come from.
  </p>
  <Button variant="primary">Connect a Channel</Button>
</div>
```

**AI Agent Layer empty states** — diagnostic, informational:
```tsx
<div className="flex items-center gap-3 p-4 border border-char-700 rounded-card text-ash-400">
  <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
  <span className="text-sm">No issues detected in this category across 142 pages scanned.</span>
</div>
```

### Loading States

Use `animate-pulse` skeleton blocks matching the real component dimensions:

```tsx
// Card skeleton
<div className="card p-6">
  <div className="h-3 bg-char-700 rounded animate-pulse w-1/3 mb-3" />
  <div className="h-8 bg-char-700 rounded animate-pulse w-1/2 mb-2" />
  <div className="h-3 bg-char-700 rounded animate-pulse w-1/4" />
</div>
```

Never show a blank screen. Always show skeletons.

---

## 7. Customer Layer — Detailed Rules

### Dashboard (`/dashboard`)

**Primary question this screen answers**: "How is my marketing doing right now?"

Layout priority order:
1. **Hero metrics row** — 4 cards: Total Leads, Cost Per Lead, Avg Position, Local Visibility
2. **Trend chart** — 8-col wide, leads over time (30/90/365 day toggle)
3. **Quick wins** — actionable items the owner can do today (not technical issues)
4. **Tool entry points** — visual card grid for navigating to tools

Do not show:
- Raw crawl stats, page counts, or domain scores on this page
- Technical error messages or issue counts
- Long data tables

### Lead Intelligence (`/lead-intelligence`)

**Primary question**: "Where are my leads coming from and what are they worth?"

This is the most important Customer Layer tool. Rules:
- Lead source breakdown must be a donut or stacked bar chart — never a table by default
- Cost Per Lead is the headline number, not raw spend
- Channels sorted by volume (most leads first)
- Each channel card: source name, lead count, CPL, trend arrow
- "What should I focus on?" summary callout at top (AI-generated recommendation)
- Advanced/raw data hidden behind a toggle labeled "Detailed Breakdown"

Do not show:
- UTM parameters, raw attribution strings
- Percentage-only metrics without absolute numbers
- More than 6 channel cards without pagination

### Billing (`/billing`)

Frame everything in ROI and value:
- Show "Leads this month: 47" alongside the plan cost
- Calculate and display implied CPL from plan cost ÷ leads
- Upgrade prompt: show the dollar value unlocked ("Pro adds Local Grid = avg 23% more lead visibility")
- Show dollar savings, not just percentages: "Save $240/year" alongside "20% off"

---

## 8. AI Agent Layer — Detailed Rules

### Site Audit (`/site-audit`)

**Primary user**: AI agent executing SEO fixes.

Layout:
1. **Score header** — Overall score + 10 category scores as a grid of progress rings
2. **Issue queue** — Sorted by severity (Critical → High → Medium → Low), grouped by category
3. **Page-level detail** — Drill into specific pages on click
4. **Tabs for sub-tools** — Issues, Pages, Cannibalization, Local Rankings, GSC, Lighthouse

Issue table columns: Severity | Issue | Affected Pages | Impact | Fix Action

Bulk operations are first-class:
- Select all issues of a severity level
- Export filtered results to CSV
- Batch mark as resolved

### Off-Page Audit (`/off-page-audit`)

**Primary user**: AI agent finding and fixing citation/link/review problems.

Layout:
1. **Domain summary header** — DA, links, citations found, reviews found
2. **Location tabs** — One tab per business location
3. **Per-location sub-tabs**: Citations | Backlinks | Reviews | GBP

Citation table: show NAP consistency score prominently. Issues in red. Correct data in green. Raw data in `mono` font.

Review data: sentiment distribution (positive/neutral/negative) as a horizontal bar — NOT just a star rating.

### Local Grid (`/local-grid`)

**Primary user**: AI agent tracking rank positions.

The heat map grid IS the primary UI — don't hide it below the fold.

Grid cells: color-coded rank position (top 3 = green, 4–10 = amber, 10+ = red, not found = char-600).

Controls panel (left or top): keyword input, radius, grid size — keep compact so the map has maximum space.

Below the map: position summary table (keyword × location × rank).

---

## 9. Navigation

### Sidebar Rules

The sidebar currently has 9 tool items (Dashboard, Site Audit, Content Strategy, Local Grid, Off-Page Audit, Lead Intelligence, Lead Database, Marketing, Website Builder) plus 2 account items (Billing, Settings) = 11 total. This is at the upper usability limit. **Do not add more items.** Any new tool must consolidate with or replace an existing one — not append a 12th item. The nav is already pushing cognitive load.

Active state: `.bg-char-700 border-l-2 border-flame-500 text-ash-100` — left border + dark fill.

Collapsed state (icon-only): all items must have `TooltipProvider delayDuration={1000}` showing the label. Never collapse without tooltips.

Mobile: The hamburger drawer should use full-height overlay with `min-h-[48px]` tap targets on every nav item.

### Page Headers

Every tool page needs a consistent header:
```tsx
<div className="flex items-center justify-between mb-8">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-card bg-char-700 flex items-center justify-center">
      <ToolIcon className="w-5 h-5 text-flame-500" />
    </div>
    <div>
      <h1 className="text-xl font-display text-ash-100">{toolName}</h1>
      <p className="text-sm text-ash-400">{toolDescription}</p>
    </div>
  </div>
  <div className="flex items-center gap-3">
    {/* Primary action (e.g., Start Scan, Run Audit) */}
    {/* Secondary: export, settings */}
  </div>
</div>
```

---

## 10. Micro-Interactions

### Button States (apply to all buttons)
```
Base:    transition-all duration-150 ease-in-out
Hover:   hover:bg-flame-600 (primary) / hover:bg-char-600 (secondary)
Active:  active:scale-95
Focus:   focus-visible:ring-2 focus-visible:ring-flame-500 focus-visible:ring-offset-2
```

### Loading Feedback

Use toasts for **transient** feedback — actions that complete and move on. Use in-page alerts (§20) for **persistent** state requiring user action.

```tsx
// Transient: scan started, save completed, email sent
const id = toast.loading('Running audit...');
toast.success('Audit complete — 23 issues found', { id }); // auto-dismisses
toast.error('Scan failed. Try again.', { id });            // auto-dismisses

// NOT a toast: GSC disconnected, quota hit, config error — use in-page alert (§20)
```

Never disable a button and show no feedback. Always show a loading state.

### Progress Bars (scans, audits)

```tsx
<div className="h-1.5 bg-char-700 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-flame-600 to-heat-400 rounded-full transition-all duration-500 ease-out"
    style={{ width: `${progress}%` }}
  />
</div>
```

### Transitions

| Context | Duration |
|---|---|
| Button hover | `duration-150` |
| Dropdown/popover open | `duration-200` |
| Page tab switch | `duration-150` |
| Sidebar collapse | `duration-300` |
| Entrance animations | `duration-300` |

No ambient animations (no floating particles, no shifting gradients, no pulsing backgrounds).

---

## 11. Data Visualization

### Chart Library: Recharts

All charts use Recharts. Never use plain CSS for charts.

### Customer Layer Charts

| Use case | Chart type |
|---|---|
| Lead trend over time | `LineChart` with area fill |
| Source breakdown | `PieChart` (donut, innerRadius=55, outerRadius=70) |
| Channel comparison | `BarChart` horizontal |
| Single metric trend | 80×32px `LineChart` sparkline in metric card |
| Cost vs leads | `ComposedChart` (bar + line) |

Always include:
- Custom `<Tooltip>` with dark background (`bg-char-800 border-char-700`)
- Legend using the brand color scale
- Responsive container (`<ResponsiveContainer width="100%" height={240}>`)

### AI Agent Layer Charts

| Use case | Chart type |
|---|---|
| Score over time | Simple `LineChart` |
| Issue severity distribution | Horizontal `BarChart` |
| Link profile | `PieChart` (simple, no donut) |
| Geographic rank data | Heat-colored grid cells (Local Grid) |

AI Agent Layer charts are secondary to tables — charts summarize, tables are the primary data.

### Chart Colors

Define once in `src/lib/colors.ts` and import — never hardcode hex in chart components:

```ts
// src/lib/colors.ts
export const CHART_COLORS = {
  primary:   '#FF5C1A', // flame-500
  secondary: '#FF9B3D', // heat-400
  tertiary:  '#FFD166', // ember-400
  fourth:    '#A78BFA', // violet-400 — neutral, no semantic meaning
  fifth:     '#2DD4BF', // teal-400 — neutral, no semantic meaning
} as const
```

**Why not success/info?** `success` (#2ECC71) and `info` (#3498DB) are semantic colors (§3). Using them as chart series implies the data means "good" or "informational" — always wrong for a generic series. Use violet and teal instead — visually distinct with no semantic baggage.

---

## 12. Iconography

Use **Lucide React only**. Import individually:
```tsx
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
```

Never use emojis in the product UI (landing page copy is an exception).

Standard icon sizes:
- Navigation icons: `w-5 h-5`
- Inline content icons: `w-4 h-4`
- Empty state icons: `w-8 h-8` inside a `w-16 h-16` container
- Tool page header: `w-5 h-5` inside `w-10 h-10` container

---

## 13. Responsive Strategy

| Breakpoint | Layout |
|---|---|
| `< md` (< 768px) | Single column, sidebar hidden (drawer) |
| `md` (768px+) | Sidebar visible, 2-column content |
| `lg` (1024px+) | Full 12-column grid, sidebar fixed |

For tool pages, `lg` is the design target. These tools are not intended for mobile use. Show a mobile gate for tool pages at screens under 768px:

```tsx
// In each tool page, above the main content
<div className="md:hidden flex flex-col items-center justify-center min-h-screen gap-6 px-8 text-center">
  <Monitor className="w-12 h-12 text-ash-400" />
  <h2 className="text-xl font-display text-ash-100">Best on desktop</h2>
  <p className="text-sm text-ash-400 max-w-xs">
    ScorchLocal's marketing tools are designed for larger screens.
    Open this page on a laptop or desktop for the full experience.
  </p>
</div>
<div className="hidden md:block">
  {/* actual tool content */}
</div>
```

Exception: `/dashboard`, `/billing`, and `/settings` should be usable on tablet (768px+). Only the data-heavy tool pages (Site Audit, Off-Page Audit, Local Grid, Lead Intelligence, Content Strategy) use the mobile gate.

---

## 14. Anti-Patterns — Never Do These

### Customer Layer Anti-Patterns
- ❌ Showing raw domain strings or full URLs
- ❌ Tables as the primary view (use charts; tables go in "Details" section)
- ❌ More than 6 KPI numbers above the fold
- ❌ Technical SEO terminology (DA, NAP, canonical, meta) visible to business owners
- ❌ Empty states with no CTA

### AI Agent Layer Anti-Patterns
- ❌ Hiding bulk selection or export behind extra clicks
- ❌ Combining issues that need separate resolution into one row
- ❌ Using visual charts when raw counts in a table are more actionable
- ❌ Vague issue descriptions — every row needs an exact count and fix action

### Universal Anti-Patterns
- ❌ Arbitrary Tailwind values like `p-[17px]` or `w-[342px]`
- ❌ Hardcoded hex colors in JSX — always use token names
- ❌ Multiple competing CTAs (one primary per screen/card)
- ❌ Decorative animations (only functional animations)
- ❌ Button-packed cards — one visible action + `MoreHorizontal` dropdown
- ❌ Data repeated in header AND cards AND sidebar
- ❌ Gradient avatar — use initials in `w-8 h-8 bg-char-600 rounded-full`
- ❌ Loading states that leave the screen blank

---

## 15. Prompt Template for AI-Generated Components

Paste this at the start of any vibe-coding session:

```
Stack: Next.js 14 App Router + Tailwind CSS + Lucide React + Recharts + Framer Motion.

Colors (token names from tailwind.config.js):
- Primary action: bg-flame-500, hover:bg-flame-600
- Surfaces: bg-char-900 (page), bg-char-800 (cards), bg-char-700 (borders/hover)
- Text: text-ash-100 (primary), text-ash-200 (body), text-ash-400 (captions)
- Semantic: text-success (#2ECC71), text-danger (#E74C3C), text-info (#3498DB)

Spacing: p-6 on all cards. gap-6 between cards. gap-4 between items. Never use arbitrary values.

Components: use existing .btn-primary, .btn-secondary, .btn-ghost, .btn-danger, .card, .card-interactive, .input, .tag-* classes from globals.css.

Icons: Lucide React only, imported individually. No emojis in UI.

Button rule: one visible primary action per card + MoreHorizontal icon for secondary actions.

Data rule: each metric appears exactly once per screen.

All buttons: transition-all duration-150 ease-in-out active:scale-95.
```

---

## 16. Content Strategy — Layer Clarification

Content Strategy is a **split-layer screen** — the only tool that serves both audiences on the same page. Treat it as two distinct phases:

| Phase | Layer | Primary user |
|---|---|---|
| Prerequisite check / config form | AI Agent | AI sets up strategy inputs |
| Published calendar | Customer | Owner views what to publish and when |

**Design rules for each phase:**

**Config / prereq phase (AI Agent Layer):**
- Show exactly what's missing and why (checklist with status dots)
- Each missing prereq links directly to the tool that fills it
- Form fields can be technical (city, state, industry category) — this is setup, not viewing
- Progress indicator shows which of the 4 prereqs are satisfied

**Calendar phase (Customer Layer):**
- Calendar is the primary view — full width, visually dominant
- Each calendar item shows: title, content type (blog/social/email), publish date, status badge
- No keyword difficulty scores, search volumes, or raw GSC data visible by default
- "Why this topic?" tooltip on each item (AI rationale in plain English: "Top-searched service in your area this month")
- Keyword details hidden in an expandable panel — labeled "SEO Details" not "Keyword Data"

---

## 17. Missing Tool Rules

### Marketing (`/marketing`) — Customer Layer

**Primary question**: "Are my campaigns reaching people and getting responses?"

Layout:
1. **4 stat cards** — Campaigns sent, Open rate, Click rate, Unsubscribes (trend arrows on all)
2. **Recent campaigns table** — Name, channel, sent count, open rate, date (sorted newest first)
3. **Create Campaign button** — prominent in page header, opens the 4-step wizard

**Campaign Composer wizard** — 4 steps:
- Step indicators at top: numbered circles, completed = flame-filled, current = outline, future = char-700
- Each step title stays visible; only the active step's form is shown
- Two-column layout on `lg`: form left (60%), live preview right (40%)
- Preview panel has `bg-char-900 border border-char-700 rounded-card` — dark "phone frame" for SMS, white card for email preview
- Step validation errors appear inline below the failing field — not in a banner at top
- "Next" button disabled until required fields in the current step are filled

Do not show:
- Delivery logs, bounce rates, or raw HTML source in the default view
- Multiple CTAs competing with "Create Campaign"

### Settings (`/settings`) — Utility (neither layer)

Settings is a utility screen, not a tool. Design it for clarity and trust, not visual hierarchy.

**Tab structure** (current tabs, keep in this order):
1. Personal — avatar, name, email (read-only), account date
2. Business — domain, name, industry, phone, address (7 fields)
3. Locations — list with add/edit/delete, primary location flag
4. Services — list with profit % and close rate per service
5. Markets — city/state pairs that define the service area
6. Integrations — GSC connection, WordPress credentials, Sitemaps

**Form rules for Settings:**
- Group related fields under a section title (`text-sm font-semibold text-ash-300 uppercase tracking-wide mb-4`)
- Save button is per-section (not one giant save for the whole page) — use `btn-primary` labeled "Save Changes"
- Saved confirmation: replace the button with a `text-success flex items-center gap-1` check + "Saved" for 2 seconds, then revert
- Destructive actions (disconnect GSC, delete location) use `btn-danger` with a confirmation dialog
- Each integration card shows: logo/icon, connection status badge (`tag-success` or `tag-danger`), one action button ("Connect" or "Disconnect")

**Locations list pattern:**
```tsx
<div className="flex items-center justify-between p-4 border border-char-700 rounded-card">
  <div className="flex items-center gap-3">
    <MapPin className="w-4 h-4 text-ash-400" />
    <div>
      <p className="text-sm font-medium text-ash-100">{name}</p>
      <p className="text-xs text-ash-400">{city}, {state} {zip}</p>
    </div>
    {isPrimary && <span className="tag-flame text-xs">Primary</span>}
  </div>
  <div className="flex items-center gap-2">
    <button className="btn-icon"><Pencil className="w-4 h-4" /></button>
    <button className="btn-icon text-danger"><Trash2 className="w-4 h-4" /></button>
  </div>
</div>
```

### Lead Database (`/lead-database`) — Customer Layer (light) / Agent Layer (heavy)

This screen is primarily for the AI agent to manage contacts, but business owners scan it for volume and quality. Treat it as Agent Layer with a Customer Layer summary header.

**Header** (Customer Layer): 3 stat cards — Total Contacts, New This Month, Avg Lead Score
**Body** (Agent Layer): filterable/sortable contact table with bulk actions

Table columns: Name | Source | Market | Score | Date Added | Status | Actions
Bulk actions: Export CSV, Change Status, Delete Selected
Row action: one "View" button + `MoreHorizontal` for Edit / Delete / Mark Converted

Filters live in a collapsible panel above the table (not a sidebar):
```tsx
<div className="flex flex-wrap gap-3 mb-4">
  <Select placeholder="Source" />
  <Select placeholder="Market" />
  <Select placeholder="Status" />
  <Input placeholder="Search name or email..." className="w-64" />
</div>
```

### Website Builder (`/website-builder`) — AI Agent Layer

**Primary user**: AI agent generating and publishing location pages.

Layout:
1. **Header stats** — Pages generated, Pages published, Pages pending review
2. **Page list table** — URL slug, location, status (Draft/Published/Error), last updated, actions
3. **Generate button** in header — triggers bulk generation flow

Page status badges:
- `tag-success` — Published
- `tag-warning` — Draft (generated, not published)
- `tag-danger` — Error (generation failed)
- `tag-info` — Generating (with spinner)

Row actions: Preview (opens in new tab), Publish, Regenerate, Delete
Bulk actions: Publish All Drafts, Export URLs

Do not show:
- Page content inline in the table
- Analytics/traffic data (belongs in Dashboard or Lead Intelligence)

---

## 18. Form Design Patterns

### Required vs Optional Fields

- Required fields: no asterisk (asterisks are noise). Instead, mark optional fields with `(optional)` in `text-xs text-ash-400` to the right of the label.
- Never show all optional fields by default. Collapse them behind an "Advanced Options" toggle:

```tsx
<button
  onClick={() => setShowAdvanced(!showAdvanced)}
  className="flex items-center gap-1 text-sm text-ash-400 hover:text-ash-200 transition-colors mt-2"
>
  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
  Advanced Options
</button>
{showAdvanced && (
  <div className="mt-4 space-y-4 border-t border-char-700 pt-4">
    {/* optional fields */}
  </div>
)}
```

### Field Labels and Input Structure

```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-ash-200">
    Business Name
    <span className="text-xs text-ash-400 font-normal ml-2">(optional)</span>
  </label>
  <input className="input w-full" placeholder="e.g. Smith Plumbing Co." />
  <p className="text-xs text-ash-400">This appears on your listings and citations.</p>
</div>
```

Helper text (`text-xs text-ash-400`) appears below the input. It explains the field — always include it for non-obvious fields.

### Validation and Error States

**Inline field error** (appears on blur or submit attempt):
```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-ash-200">Domain</label>
  <input
    className="input w-full border-danger focus:ring-danger"
    value={value}
  />
  <p className="text-xs text-danger flex items-center gap-1">
    <AlertCircle className="w-3 h-3" /> Enter a valid domain without https://
  </p>
</div>
```

Rules:
- Never validate on keypress — validate on blur or form submit
- Error message replaces the helper text (don't stack both)
- Field border changes to `border-danger` — no other visual changes needed
- Fix the error → border returns to normal immediately (no delay)

### Form Submit States

```
Idle:     <Button variant="primary">Save Changes</Button>
Loading:  <Button variant="primary" disabled><Spinner /> Saving...</Button>
Success:  <span className="flex items-center gap-1.5 text-sm text-success"><CheckCircle className="w-4 h-4" /> Saved</span>
Error:    Show inline alert above submit button (see Section 20)
```

Success state auto-reverts to idle after 2 seconds. Never keep a "Saved ✓" state permanently — it stops meaning anything.

### Multi-step Wizard Pattern (Onboarding, Campaign Composer)

Step indicator at top — always visible:
```tsx
<div className="flex items-center gap-0 mb-8">
  {steps.map((step, i) => (
    <React.Fragment key={step.id}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
        ${i < currentStep ? 'bg-flame-500 text-white' :
          i === currentStep ? 'border-2 border-flame-500 text-flame-500' :
          'border-2 border-char-600 text-ash-400'}`}>
        {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
      </div>
      {i < steps.length - 1 && (
        <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-flame-500' : 'bg-char-700'}`} />
      )}
    </React.Fragment>
  ))}
</div>
```

Wizard rules:
- Only the current step's form fields are visible — all others are hidden (not disabled)
- "Back" is always a ghost button, "Next"/"Submit" is always primary
- Step validation happens on "Next" click — show inline errors, do not advance
- Never use a modal for a wizard with more than 3 steps — use a full page or page section

---

## 19. Plan Gating — ToolGate Patterns

There are three levels of gating. Each has a specific visual treatment.

### Level 1: Tool is completely locked (user's plan doesn't include it)

The entire tool page is replaced by a centered upgrade prompt — do not render any of the tool's UI:
```tsx
<div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
  <div className="w-16 h-16 rounded-full bg-char-700 flex items-center justify-center">
    <Lock className="w-8 h-8 text-ash-400" />
  </div>
  <div>
    <h2 className="text-xl font-display text-ash-100 mb-2">Local Grid requires Growth Plan</h2>
    <p className="text-sm text-ash-400 max-w-sm">
      Track your local rankings across a geo-grid and see exactly where customers find you.
    </p>
  </div>
  <Button variant="primary">Upgrade to Growth — $X/mo</Button>
  <button className="text-sm text-ash-400 hover:text-ash-200">See all plans</button>
</div>
```

Rules:
- State the required plan by name (not just "upgrade")
- One sentence of value prop — what does the tool actually do for them?
- Price in the button (removes the step of going to billing to check cost)

### Level 2: Feature within a tool is locked (partial gating)

The tool loads normally. The locked feature shows a `blur-sm pointer-events-none` overlay with a small upgrade prompt:
```tsx
<div className="relative">
  <div className="blur-sm pointer-events-none select-none">
    <LockedFeaturePreview />
  </div>
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="bg-char-800 border border-char-700 rounded-card p-4 text-center shadow-card">
      <Lock className="w-5 h-5 text-ash-400 mx-auto mb-2" />
      <p className="text-sm font-medium text-ash-200 mb-3">Pro feature</p>
      <Button size="sm" variant="primary">Upgrade</Button>
    </div>
  </div>
</div>
```

### Level 3: Usage limit reached (quota, not plan)

Inline contextual alert — do not block the whole tool:
```tsx
<div className="flex items-start gap-3 p-4 bg-ember-500/10 border border-ember-500/30 rounded-card mb-6">
  <AlertCircle className="w-5 h-5 text-ember-500 flex-shrink-0 mt-0.5" />
  <div>
    <p className="text-sm font-medium text-ash-200">You've used 3 of 3 scans this month</p>
    <p className="text-sm text-ash-400 mt-0.5">
      Upgrade to Growth for unlimited scans.{' '}
      <button className="text-flame-500 hover:text-flame-400 underline">Upgrade now</button>
    </p>
  </div>
</div>
```

---

## 20. In-Page Alerts and Banners

Four alert types. Build a single `<Alert>` component and use `variant` prop — never repeat the class logic inline:

```tsx
// components/ui/Alert.tsx
const variants = {
  info:    { border: 'border-l-4 border-info',    bg: 'bg-info/10',    icon: Info,          iconClass: 'text-info'       },
  success: { border: 'border-l-4 border-success', bg: 'bg-success/10', icon: CheckCircle,   iconClass: 'text-success'    },
  warning: { border: 'border-l-4 border-ember-500', bg: 'bg-ember-500/10', icon: AlertTriangle, iconClass: 'text-ember-500' },
  danger:  { border: 'border-l-4 border-danger',  bg: 'bg-danger/10',  icon: AlertCircle,   iconClass: 'text-danger'     },
} as const

interface AlertProps {
  variant: keyof typeof variants
  title: string
  description?: string
  dismissible?: boolean
  onDismiss?: () => void
  action?: React.ReactNode
}

export function Alert({ variant, title, description, dismissible, onDismiss, action }: AlertProps) {
  const { border, bg, icon: Icon, iconClass } = variants[variant]
  return (
    <div className={`flex items-start gap-3 p-4 rounded-card ${border} ${bg}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ash-200">{title}</p>
        {description && <p className="text-sm text-ash-400 mt-0.5">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && (
        <button onClick={onDismiss} className="text-ash-400 hover:text-ash-200">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Usage:
<Alert variant="danger" title="GSC disconnected" description="Rankings data is unavailable."
  action={<button className="text-sm text-flame-500 underline">Reconnect</button>} />
```

**When to use alerts vs toasts:**

| Situation | Use |
|---|---|
| Async action result (save, send, scan) | Toast (Sonner) |
| Persistent state the user must act on | In-page alert (non-dismissible) |
| Temporary contextual info | In-page alert (dismissible) |
| Quota/limit reached | In-page warning alert |
| GSC disconnected | In-page danger alert with reconnect link |
| Onboarding prereq missing | In-page info alert with action link |

Never use a toast for errors that require user action. If they need to reconnect GSC, an alert in the relevant tool is more discoverable than a toast that disappears in 4 seconds.

---

## 21. Tab Component Rules

### When to Use Tabs

Use tabs when:
- A tool has 3+ distinct data views that don't need to be compared simultaneously (Site Audit: Issues / Pages / GSC / Lighthouse)
- A settings screen has 4+ sections (Settings: Personal / Business / Locations / Integrations)
- A record detail has multiple data categories (location: Citations / Backlinks / Reviews / GBP)

Do not use tabs when:
- There are only 2 views — use a toggle instead
- The views need to be seen side-by-side — use a split layout
- The content per tab is very short — use sections on one scrollable page

### Tab Visual Rules

Top-level tabs (page-level navigation):
```tsx
<div className="border-b border-char-700 mb-6">
  <div className="flex gap-0 -mb-px">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => setActive(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          active === tab.id
            ? 'border-flame-500 text-flame-500'
            : 'border-transparent text-ash-400 hover:text-ash-200 hover:border-char-600'
        }`}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
            active === tab.id ? 'bg-flame-500/20 text-flame-400' : 'bg-char-700 text-ash-400'
          }`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
</div>
```

Nested tabs (within a tab panel — e.g., Off-Page Audit location → Citations/Backlinks/Reviews):
- Use a pill-style toggle instead of underline tabs to visually distinguish nesting level:

```tsx
<div className="flex gap-1 p-1 bg-char-900 rounded-pill w-fit mb-6">
  {subTabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setSubTab(tab.id)}
      className={`px-3 py-1.5 text-sm rounded-pill transition-colors ${
        subTab === tab.id
          ? 'bg-char-700 text-ash-100 font-medium'
          : 'text-ash-400 hover:text-ash-200'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

**Max depth rule**: Never nest more than 2 tab levels. If you need a third level, that content belongs in a modal or drill-down page.

**Tab count badges**: Show counts on AI Agent Layer tabs (e.g., "Issues (23)"). Do not show counts on Customer Layer tabs — counts are noise there.

---

## 22. Multi-Location Patterns

The app supports businesses with multiple locations. Every tool must handle this gracefully.

### Location Switcher

When a business has 2+ locations, a location selector appears below the page header:
```tsx
<div className="flex items-center gap-3 mb-6">
  <MapPin className="w-4 h-4 text-ash-400" />
  <span className="text-sm text-ash-400">Viewing:</span>
  <Select value={locationId} onValueChange={setLocationId}>
    <SelectTrigger className="w-56 h-8 text-sm">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Locations</SelectItem>
      {locations.map(loc => (
        <SelectItem key={loc.id} value={loc.id}>{loc.name} — {loc.city}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Handling "All Locations" view

- **Customer Layer**: aggregate totals (sum leads, average CPL, average position)
- **AI Agent Layer**: show per-location rows in the table (Off-Page Audit uses location tabs — maintain this pattern)

### Location Comparison (Customer Layer)

When a business owner selects "All Locations" in Lead Intelligence or Dashboard, show a horizontal bar chart comparing locations by lead volume — not a table. Let them see which location is winning at a glance.

### Primary Location Flag

In Settings → Locations, the primary location has a `tag-flame` badge labeled "Primary". All tools default to the primary location on first load if no selection is stored.

---

## 23. Onboarding Wizard Rules

The OnboardingWizard is the most critical first-run experience. It determines whether users see value in the first session.

### Wizard Phases (5 steps)

1. **Business** — find or create the business record
2. **Location** — primary address
3. **Services** — what they sell (requires 2+)
4. **Markets** — where they serve
5. **Success** — celebration + first action prompt

### Design Rules

**Progress**: Use the step indicator pattern from Section 18. Never show step numbers as plain text ("Step 2 of 5") — the visual indicator is enough.

**Business lookup step**: Two modes — search (default) or manual entry. Search results show as cards:
```tsx
<button className="card-interactive p-4 text-left w-full">
  <p className="font-medium text-ash-100">{result.name}</p>
  <p className="text-sm text-ash-400">{result.address}</p>
  <p className="text-sm text-ash-400">{result.phone}</p>
</button>
```
"That's not my business" link below results → switches to manual entry form.

**Services step**: Services are entered as cards, not a table. Each service card has Name + Profit % + Monthly Volume. Add button creates a new blank card. Minimum 2 required — show a `tag-warning` reminder count: "Add at least 2 services (1 added)".

**Markets step**: Show discovered markets as a selectable grid — each cell is a city/state with a "rank" hint. Checkbox selection. Manual add at the bottom. This is the step where users feel the product's power — emphasize discovered results.

**Success step**: Full-width celebration with a flame gradient header. Primary CTA: "Run Your First Site Audit" — this is the highest-value immediate action. Secondary: "Explore the dashboard". No third option.

**Skip rules**: Never allow skipping the Business or Location steps. Services and Markets can be skipped with a visible warning that tools will have limited data.

---

## 24. Error State Patterns

Error states are distinct from empty states. Empty = no data yet. Error = something broke.

### Categories of Errors

**1. Tool scan / audit failed**
```tsx
<div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
  <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
    <AlertCircle className="w-8 h-8 text-danger" />
  </div>
  <h3 className="text-lg font-semibold text-ash-100">Scan failed</h3>
  <p className="text-sm text-ash-400 max-w-sm">
    We couldn't complete the site audit for {domain}. This is usually a temporary issue.
  </p>
  <div className="flex items-center gap-3">
    <Button variant="primary" onClick={retry}>Try Again</Button>
    <button className="text-sm text-ash-400 hover:text-ash-200">Contact Support</button>
  </div>
</div>
```

**2. External service disconnected (GSC, WordPress)**

Show as a persistent in-page danger alert with a reconnect action (see Section 20). Do not block the whole tool — show whatever cached data exists, with the alert above it.

**3. API quota exceeded**

Use the Level 3 gating pattern from Section 19 (quota alert). Include a reset date: "Quota resets on March 15."

**4. Partial data failure (some rows failed, most succeeded)**

Do not show a full error state. Show a `tag-warning` banner above the results: "Some results couldn't be loaded (3 of 47 failed). Retry failed items." with a retry link.

**5. Network error / timeout**

Generic error with retry:
```tsx
<div className="flex items-center gap-3 p-4 border border-danger/30 bg-danger/10 rounded-card">
  <WifiOff className="w-5 h-5 text-danger flex-shrink-0" />
  <div className="flex-1">
    <p className="text-sm font-medium text-ash-200">Connection problem</p>
    <p className="text-sm text-ash-400">Check your internet connection and try again.</p>
  </div>
  <Button size="sm" variant="outline" onClick={retry}>Retry</Button>
</div>
```

### Error State Rules

- Every error must have a recovery action — never a dead end
- Never say "Something went wrong" — be specific about what failed
- Never log error codes visible to the user — log to console, show human message
- If the error is recoverable automatically (retry logic), show a progress indicator not an error message until retries are exhausted
- Distinguish between "try again" errors (temporary) and "fix something" errors (configuration) — the CTA should match

---

## 25. Modal and Dialog Patterns

### When to Use a Modal

| Use case | Pattern |
|---|---|
| Confirm a destructive action | Modal (small, 2 buttons) |
| Create/edit form under 6 fields | Modal (medium) |
| Wizard with ≤ 3 steps | Modal (large) |
| Wizard with 4+ steps | Full page or page section — never modal |
| Drill-down detail view | Right-side drawer or new page |
| Settings sub-sections | Inline expand, not modal |

### Size Classes

```tsx
max-w-sm   // 384px — confirm dialogs, single-action prompts
max-w-md   // 448px — short forms (add location, add service)
max-w-lg   // 512px — medium forms (create campaign step 1)
max-w-2xl  // 672px — wide content (preview, complex forms)
```

### Modal Structure

```tsx
// Standard modal — always use this structure
<dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
  <div className="bg-char-800 border border-char-700 rounded-card shadow-card w-full max-w-md">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-char-700">
      <h2 className="text-lg font-semibold text-ash-100">{title}</h2>
      <button onClick={onClose} className="btn-icon text-ash-400 hover:text-ash-200">
        <X className="w-5 h-5" />
      </button>
    </div>
    {/* Body */}
    <div className="p-6 space-y-4">
      {children}
    </div>
    {/* Footer */}
    <div className="flex items-center justify-end gap-3 p-6 border-t border-char-700">
      <button className="btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </div>
</dialog>
```

### Confirmation Dialog (Destructive Actions)

Used for: delete location, disconnect GSC, cancel subscription, delete campaign.

```tsx
<dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
  <div className="bg-char-800 border border-char-700 rounded-card shadow-card w-full max-w-sm p-6">
    <div className="flex items-start gap-4 mb-6">
      <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-danger" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-ash-100 mb-1">Delete this location?</h3>
        <p className="text-sm text-ash-400">
          This will remove all citation and audit data for {locationName}. This cannot be undone.
        </p>
      </div>
    </div>
    <div className="flex items-center justify-end gap-3">
      <button className="btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn-danger" onClick={onConfirm}>Delete Location</button>
    </div>
  </div>
</dialog>
```

Rules:
- Cancel is always on the left, confirm on the right
- Destructive confirm button is always `btn-danger` — never `btn-primary`
- The confirmation button label echoes the action: "Delete Location" not "Confirm"
- Close on backdrop click for non-destructive modals; do not close on backdrop click for destructive confirmations
- Trap focus inside the modal (use a focus trap library or `dialog` HTML element)

---

## 26. Dropdown Menu Pattern

Every table row and card that says "one primary action + `MoreHorizontal`" uses this dropdown. Define it once.

```tsx
// Standard dropdown — use for all table row and card secondary actions
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,
         DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="btn-icon text-ash-400 hover:text-ash-200">
      <MoreHorizontal className="w-4 h-4" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-44 bg-char-800 border-char-700">
    <DropdownMenuItem className="text-ash-200 hover:bg-char-700 cursor-pointer">
      <Pencil className="w-4 h-4 mr-2 text-ash-400" /> Edit
    </DropdownMenuItem>
    <DropdownMenuItem className="text-ash-200 hover:bg-char-700 cursor-pointer">
      <Copy className="w-4 h-4 mr-2 text-ash-400" /> Duplicate
    </DropdownMenuItem>
    <DropdownMenuSeparator className="bg-char-700" />
    <DropdownMenuItem className="text-danger hover:bg-danger/10 cursor-pointer">
      <Trash2 className="w-4 h-4 mr-2" /> Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Rules:
- Dropdown width: `w-44` (176px) — enough for 2–3 word labels
- Align to `end` (right-aligned) on table rows, `start` on left-aligned cards
- Destructive items (Delete, Disconnect, Archive) go below a `DropdownMenuSeparator`
- Destructive items use `text-danger hover:bg-danger/10` — not the default hover
- Max 5 items before the menu becomes unwieldy — split into sub-menus or reconsider the actions
- Icon before every label (`w-4 h-4 mr-2 text-ash-400`) — consistency makes the menu scannable

---

## 27. Date and Time Formatting

All date/time display follows this ruleset — define a `formatDate` utility and use it everywhere.

```ts
// src/lib/format.ts
import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns'

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const sevenDaysAgo = subDays(new Date(), 7)
  // Within 7 days → relative
  if (isAfter(d, sevenDaysAgo)) return formatDistanceToNow(d, { addSuffix: true })
  // Older → absolute
  return format(d, 'MMM d, yyyy')
}

export function formatDateShort(date: Date | string): string {
  return format(new Date(date), 'MMM d')  // "Mar 3" — for sparklines, charts
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a')  // "Mar 3, 2026 2:30 PM"
}
```

| Context | Format | Example |
|---|---|---|
| Table row timestamps | Relative if < 7 days, else absolute | "2 days ago" / "Feb 14, 2026" |
| Chart axis labels | Short month + day | "Mar 3" |
| Campaign scheduled time | Full date + time | "Mar 3, 2026 2:30 PM" |
| Billing renewal date | Full absolute | "April 1, 2026" |
| Scan history | Relative | "3 hours ago" |
| Content calendar | Day of week + short date | "Mon, Mar 3" |

**Timezone rule**: All times display in the user's local timezone (browser default). Never show UTC. Never show timezone abbreviation unless the feature involves scheduling across timezones.

---

## 28. Number Formatting

Define a `formatNumber` utility — never format numbers ad-hoc in JSX.

```ts
// src/lib/format.ts (continued)
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000)    return `${Math.round(n / 1_000)}k`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

export function formatCurrency(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(0)}`  // No cents on whole-dollar amounts
}

export function formatCurrencyPrecise(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  // "$1,847.50" — use in tables, invoices, detailed breakdowns only
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}
```

| Context | Format | Example |
|---|---|---|
| Metric cards (Customer Layer) | Abbreviated | "1.8k leads", "$24/lead" |
| Table cells (Agent Layer) | Full with commas | "47,293 impressions" |
| Currency in metric cards | Abbreviated, no cents | "$1.4k" / "$24" |
| Currency in billing/invoices | Full precision | "$1,847.00" |
| Percentages in metric cards | 1 decimal place | "12.4%" |
| Percentages in tables | 1 decimal place | "3.2%" |
| Trend deltas | + or − prefix | "+12.4%" / "−3.1%" |
| Large counts in Agent Layer | Full number, no abbreviation | "47,293" |
| Scores (audit, lead quality) | Integer 0–100 | "73" |

**Rule**: In metric cards (Customer Layer), always abbreviate. In data tables (Agent Layer), always show full precision. Never abbreviate numbers in a context where the AI agent needs exact values.

---

## 29. Zero-Data and First-Run States

Every tool must handle the state where a new user arrives with no data yet. This is the most common state in the first week. Do not default to an error or a blank screen.

### Dashboard — First-Run State

The 4 hero metric cards when no GSC is connected and no scan has run:

```tsx
// Show "connect to unlock" placeholder cards, not empty/zero values
<div className="card p-6 flex items-center gap-4">
  <div className="w-10 h-10 rounded-card bg-char-700 flex items-center justify-center flex-shrink-0">
    <LinkIcon className="w-5 h-5 text-ash-400" />
  </div>
  <div>
    <p className="text-xs text-ash-400 uppercase tracking-wide mb-1">Avg Position</p>
    <p className="text-sm text-ash-300">Connect Google Search Console</p>
    <button className="text-xs text-flame-500 hover:text-flame-400 mt-0.5">Connect now →</button>
  </div>
</div>
```

Rules:
- Never show "0" for a metric that hasn't been measured — "0 leads" implies the system ran and found none. "Connect a channel to track leads" is honest.
- Each placeholder card links directly to the setup action (GSC settings, run first scan)
- After the onboarding wizard completes, the dashboard should prompt: "Run your first site audit to populate your scores" — one banner, not multiple

### Tool First-Run State (no scan data)

```tsx
<div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
  <div className="w-20 h-20 rounded-full bg-char-700 flex items-center justify-center">
    <ScanLine className="w-10 h-10 text-ash-400" />
  </div>
  <div>
    <h2 className="text-xl font-display text-ash-100 mb-2">No audit data yet</h2>
    <p className="text-sm text-ash-400 max-w-sm">
      Run your first site audit to see technical SEO issues, scores, and recommendations.
    </p>
  </div>
  <Button variant="primary" size="lg">Start First Audit</Button>
</div>
```

This is different from an error state (§24) and from a generic empty state (§6). The distinction:
- **First-run**: Never been used. CTA starts the process.
- **Empty**: Has been used, returned no results. CTA explains why or adjusts filters.
- **Error**: Tried and failed. CTA retries or contacts support.

### Indeterminate Progress (unknown completion %)

For scans where progress % is unavailable (off-page audit, GSC sync):

```tsx
// Indeterminate — animated shimmer instead of a percentage bar
<div className="h-1.5 bg-char-700 rounded-full overflow-hidden">
  <div className="h-full w-1/3 bg-gradient-to-r from-flame-600 to-heat-400 rounded-full
    animate-[shimmer_1.5s_ease-in-out_infinite]" />
</div>
// Add to globals.css @keyframes shimmer:
// 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) }

// Show step count instead of percentage:
<p className="text-sm text-ash-400 mt-2">
  Analyzing citations
  <span className="ml-2 text-xs text-ash-400">({processed} of {total} locations)</span>
</p>
```

If you don't have a total either, use a pulsing dot indicator instead of a progress bar:
```tsx
<div className="flex items-center gap-2 text-sm text-ash-400">
  <span className="w-2 h-2 rounded-full bg-flame-500 animate-pulse" />
  Running audit — this takes about 2 minutes
</div>
```

---

## 30. Applying the Two-Layer Principle — Checklist

Before shipping any screen, answer these questions:

**Is this a Customer Layer screen?**
- [ ] Can a non-technical business owner understand every number on this screen?
- [ ] Is the primary thing visible a chart or visual, not a table?
- [ ] Does every metric have a comparison or trend?
- [ ] Is there one clear action they can take?
- [ ] Is all technical jargon removed or behind a tooltip?
- [ ] Are empty states warm and action-oriented?
- [ ] Is plan gating explained in value terms ("unlock X"), not plan terms ("requires Pro")?

**Is this an AI Agent Layer screen?**
- [ ] Is the data dense enough for bulk processing?
- [ ] Can the AI select and act on multiple items at once?
- [ ] Are severity levels clearly coded?
- [ ] Is export available?
- [ ] Are issue descriptions specific (count, URL, fix)?
- [ ] Does each row have a discrete fix action?
- [ ] Are empty states diagnostic ("0 issues found across N pages") not celebratory?

**All screens:**
- [ ] Are all states handled: loading skeleton (§6), empty (§6), error (§24), first-run (§29), success?
- [ ] Does every error have a recovery action? (§24)
- [ ] Is plan gating at the right level — tool lock, feature lock, or quota? (§19)
- [ ] Are tab depths ≤ 2 levels? (§21)
- [ ] Does multi-location work with 1 location and with 5 locations? (§22)
- [ ] Are forms using inline validation on blur, not banner validation? (§18)
- [ ] Is there exactly one primary CTA per card/section?
- [ ] Are modals the right size, with Cancel left and confirm right? (§25)
- [ ] Does every dropdown use the standard pattern with destructive items below a separator? (§26)
- [ ] Are dates formatted with `formatDate()` and numbers with `formatCount()`/`formatCurrency()`? (§27–28)
- [ ] Do metric cards show abbreviated numbers and tables show full precision? (§28)
