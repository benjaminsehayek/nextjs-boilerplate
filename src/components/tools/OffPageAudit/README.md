# Off-Page SEO Audit Tool

A comprehensive backlink analysis tool for ScorchLocal that analyzes backlinks, referring domains, anchor text distribution, and competitor comparisons using the DataForSEO Backlinks API.

## Components Created

### 1. `types.ts`
TypeScript interfaces and type definitions for the entire Off-Page Audit tool:
- `BacklinkMetrics` - Core metrics (total backlinks, referring domains, domain rating, toxicity, etc.)
- `ReferringDomain` - Individual domain data with authority scores
- `AnchorTextData` - Anchor text distribution with types (exact, partial, branded, naked, generic)
- `CompetitorData` - Competitor backlink profile data
- `OffPageAuditResults` - Complete audit results structure

### 2. `DomainInput.tsx`
Domain input form component with:
- Target domain input with validation
- Optional competitor comparison (up to 3 competitors)
- Scans remaining display
- Feature highlights
- Form validation with domain regex

### 3. `ProgressTracker.tsx`
Real-time scan progress tracker showing:
- Overall progress percentage
- 5 analysis tasks:
  1. Backlink Summary
  2. Referring Domains
  3. Anchor Text Analysis
  4. Quality Assessment
  5. Competitor Analysis (if applicable)
- Estimated time remaining
- Visual task status indicators

### 4. `BacklinkOverview.tsx`
Overview dashboard displaying:
- **Primary Metrics:**
  - Domain Rating (0-100 score ring)
  - Quality Score (calculated from multiple factors)
  - Toxicity Score (lower is better)
- **Backlink Stats:**
  - Total backlinks
  - Referring domains
  - Follow vs NoFollow links
  - Link growth/loss trends (30 days)
- **Health Assessment:**
  - Link ratio evaluation
  - Toxicity level assessment
  - Growth trend analysis

### 5. `ReferringDomains.tsx`
Referring domains list with:
- Summary stats (clean/suspicious/toxic counts)
- Search and filter capabilities
- Sorting options (by backlinks, domain rank, toxicity)
- Domain cards showing:
  - Domain name with toxicity badge
  - Backlink count
  - Domain rank (0-100)
  - Follow/NoFollow distribution
  - First seen date
  - Toxic domain warnings
- Domain rank visualization (circular progress)

### 6. `AnchorText.tsx`
Anchor text analysis showing:
- **Distribution Overview:**
  - Exact match (warning if >30%)
  - Partial match
  - Branded (ideal 40-50%)
  - Naked URLs
  - Generic anchors
- Visual percentage bars for each type
- Health assessment of anchor profile
- Search and filter by anchor type
- Detailed anchor list with usage counts
- **Optimization Recommendations:**
  - Natural mix targets
  - Over-optimization warnings
  - Quality focus guidance

### 7. `CompetitorCompare.tsx`
Competitive analysis dashboard featuring:
- **Summary Cards:**
  - Your ranking position
  - Percentage vs top competitor
  - Authority comparison
- **Detailed Comparison Table:**
  - Side-by-side metrics for all domains
  - Visual progress bars for each metric
  - Backlinks, referring domains, domain rating, toxic score
- **Competitive Insights:**
  - Backlink gap analysis
  - Domain authority gap
  - Link quality comparison
- **Action Items:**
  - Actionable recommendations
  - Strategic guidance

### 8. `Dashboard.tsx`
Main results dashboard with:
- Tabbed interface:
  - Overview
  - Referring Domains
  - Anchor Text
  - Competitors (conditional)
- Quick stats bar
- Export options (PDF, JSON)
- Domain and timestamp display
- Dynamic component loading
- API cost tracking

### 9. Main Page: `src/app/(dashboard)/off-page-audit/page.tsx`
Complete page implementation with:
- **State Management:**
  - Audit status tracking
  - Real-time progress updates
  - Error handling
  - Result caching
- **Supabase Integration:**
  - Real-time audit updates
  - Progress tracking
  - Result persistence
- **DataForSEO API Integration:**
  - `v3/backlinks/summary/live` - Overall backlink metrics
  - `v3/backlinks/referring_domains/live` - Domain list
  - `v3/backlinks/anchors/live` - Anchor text data
- **Features:**
  - Resume incomplete audits on page load
  - Competitor analysis (up to 3)
  - Quality score calculation
  - Domain rating algorithm
  - Anchor type classification

## Database Schema

Updated `supabase-schema.sql` with the `off_page_audits` table:

```sql
CREATE TABLE public.off_page_audits (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  status TEXT CHECK (status IN ('pending', 'analyzing', 'complete', 'failed')),
  target_domain TEXT NOT NULL,
  competitor_domains TEXT[],

  -- Aggregated metrics
  metrics JSONB,

  -- Detailed data
  backlink_data JSONB,
  referring_domains JSONB,
  anchor_data JSONB,
  competitor_data JSONB,

  -- Progress tracking
  completed_tasks TEXT[],

  -- Billing and timestamps
  api_cost DECIMAL(10, 4),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## DataForSEO API Endpoints Used

1. **Backlinks Summary** (`v3/backlinks/summary/live`)
   - Total backlinks
   - Referring domains count
   - Follow/NoFollow counts
   - New/lost backlinks (30 days)

2. **Referring Domains** (`v3/backlinks/referring_domains/live`)
   - Domain list with authority scores
   - Backlink counts per domain
   - Domain rank and page rank
   - First/last seen dates
   - Follow/NoFollow per domain

3. **Anchor Text** (`v3/backlinks/anchors/live`)
   - Anchor text distribution
   - Usage counts
   - Follow/NoFollow per anchor

## Calculations

### Domain Rating (DR)
```typescript
DR = min(100, round(
  (log10(max(1, referringDomains)) * 20) +
  (log10(max(1, totalBacklinks)) * 10)
))
```

### Quality Score
```typescript
followRatio = followLinks / totalBacklinks
diversityScore = min(100, (referringDomains / totalBacklinks) * 100)
qualityScore = round(
  (followRatio * 40) +
  (diversityScore * 0.3) +
  (domainRating * 0.3)
)
```

### Anchor Type Classification
- **Naked**: URLs (http://, https://)
- **Generic**: "click here", "read more", "learn more", etc.
- **Exact**: Exact match keywords (requires keyword comparison)
- **Partial**: Partial match keywords
- **Branded**: Brand name anchors

## Styling

All components use ScorchLocal's design system:
- **Colors**: Flame/heat/ember gradients, ash tones
- **Components**: Card, ScoreRing, buttons, inputs
- **Typography**: Display font for headings, proper hierarchy
- **Responsiveness**: Mobile-first grid layouts
- **Animations**: Smooth transitions, progress animations

## Features

### Core Features
- ✅ Domain backlink analysis
- ✅ Referring domain breakdown with authority scores
- ✅ Anchor text distribution analysis
- ✅ Competitor comparison (up to 3)
- ✅ Domain rating calculation
- ✅ Quality score assessment
- ✅ Toxicity detection
- ✅ Link growth/loss tracking

### User Experience
- ✅ Real-time progress tracking
- ✅ Resume incomplete audits
- ✅ Search and filter capabilities
- ✅ Sort options (backlinks, domain rank, toxicity)
- ✅ Export to PDF/JSON
- ✅ Mobile responsive design
- ✅ Error handling and validation

### Technical Features
- ✅ TypeScript with strict types
- ✅ Dynamic component loading
- ✅ Supabase real-time subscriptions
- ✅ Row-level security (RLS)
- ✅ API cost tracking
- ✅ Progress persistence

## Usage

1. Navigate to `/off-page-audit`
2. Enter target domain
3. Optionally add up to 3 competitor domains
4. Click "Start Off-Page Audit"
5. Monitor real-time progress
6. Review results across 4 tabs:
   - Overview: Metrics and health summary
   - Domains: Referring domain analysis
   - Anchors: Anchor text distribution
   - Competitors: Competitive comparison

## Future Enhancements

- Historical tracking (compare audits over time)
- Link velocity charts
- Toxic backlink disavow file export
- Automated competitor discovery
- Link opportunity identification
- Custom anchor text keyword mapping
- Email alerts for toxic backlinks
- Integration with Google Search Console for disavow

## Notes

- Toxicity scoring is currently a placeholder (random values)
- In production, integrate actual spam/toxicity data from DataForSEO
- Anchor type classification is simplified - enhance with keyword matching
- Consider adding pagination for large domain lists (>100)
- API costs are estimates - update with actual DataForSEO pricing
