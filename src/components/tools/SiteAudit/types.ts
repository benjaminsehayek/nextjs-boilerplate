// Site Audit Tool Types — Full Crawl Engine

// ─── Enums & Literals ───────────────────────────────────────────────

export type SeverityLevel = 'critical' | 'warning' | 'notice';
export type Severity = SeverityLevel;
export type ImpactLevel = 1 | 2 | 3 | 4 | 5;
export type EffortLevel = 'easy' | 'medium' | 'hard';
export type Effort = EffortLevel;

export type ScanState = 'idle' | 'scanning' | 'complete' | 'error';
export type CrawlPhase = 'submitting' | 'crawling' | 'fetching' | 'analyzing' | 'keywords' | 'complete';

export type ScoreCategoryId =
  | 'meta' | 'content' | 'links' | 'resources'
  | 'performance' | 'accessibility' | 'technical'
  | 'seo' | 'social' | 'security';

export type TabId =
  | 'overview' | 'issues' | 'meta' | 'content'
  | 'links' | 'resources' | 'technical' | 'pages'
  | 'pagespeed' | 'social' | 'localrankings'
  | 'pagehealth' | 'structure' | 'cannibalization';

export type UrlType =
  | 'homepage' | 'service' | 'blog' | 'location'
  | 'about' | 'contact' | 'gallery' | 'testimonials'
  | 'faq' | 'other';

export type KeywordIntent =
  | 'local-commercial' | 'commercial'
  | 'informational' | 'branded' | 'navigational';

export type KeywordType =
  | 'service' | 'near_me' | 'local' | 'modifier'
  | 'question' | 'branded';

export type SurfaceComparison =
  | 'both-ranking' | 'organic-only' | 'maps-only' | 'neither';

// ─── Score Types ────────────────────────────────────────────────────

export interface CategoryScore {
  score: number;
  label: string;
  issues: number;
}

export type CategoryScores = Record<ScoreCategoryId, CategoryScore> & {
  _overall: number;
};

export const SCORE_WEIGHTS: Record<ScoreCategoryId, number> = {
  meta: 1.0,
  content: 1.2,
  links: 1.3,
  resources: 0.8,
  performance: 1.1,
  accessibility: 0.8,
  technical: 1.2,
  seo: 1.1,
  social: 0.6,
  security: 1.3,
};

// ─── Crawl Data Types (DataForSEO API shapes) ──────────────────────

/** Crawled HTML page from on_page/pages */
export interface CrawledPage {
  url: string;
  status_code: number;
  size: number;
  total_dom_size?: number;
  encoded_size?: number;
  content_encoding?: string;
  media_type?: string;
  onpage_score?: number;
  click_depth?: number;
  cache_control?: { cachable?: boolean; [k: string]: unknown };
  page_timing?: {
    duration_time?: number;
    time_to_interactive?: number;
    dom_complete?: number;
    waiting_time?: number;
    download_time?: number;
    connection_time?: number;
  };
  meta?: {
    title?: string;
    description?: string;
    canonical?: string;
    htags?: Record<string, string[]>; // h1, h2, h3...
    content?: {
      plain_text_word_count?: number;
      plain_text_size?: number;
      automated_readability_index?: number;
    };
    internal_links_count?: number;
    external_links_count?: number;
    images_count?: number;
    images_size?: number;
    scripts_count?: number;
    scripts_size?: number;
    stylesheets_count?: number;
    stylesheets_size?: number;
    render_blocking_scripts_count?: number;
    render_blocking_stylesheets_count?: number;
    social_media_tags?: Record<string, string>;
    favicon?: string;
  };
  checks?: Record<string, boolean | undefined>;
  resource_errors?: { errors: number; warnings: number };
}

/** Resource from on_page/resources */
export interface CrawledResource {
  url: string;
  resource_type: 'image' | 'script' | 'stylesheet' | 'other';
  status_code: number;
  size: number;
  encoded_size?: number;
  total_count?: number;
  media_type?: string;
}

/** Link from on_page/links */
export interface CrawledLink {
  url?: string;
  link_from?: string;
  link_to?: string;
  page_from?: string;
  type?: 'internal' | 'external';
  direction?: string;
  status_code: number;
  anchor?: string;
  dofollow?: boolean;
  is_broken?: boolean;
}

/** Duplicate tag entry from on_page/duplicate_tags */
export interface DuplicateTag {
  type: 'title' | 'description';
  title?: string;
  tag?: string;
  value?: string;
  total_count?: number;
  count?: number;
  pages?: string[];
}

/** Duplicate content entry from on_page/duplicate_content */
export interface DuplicateContent {
  url?: string;
  page?: string;
  page1?: string;
  page2?: string;
  similarity?: number;
  total_count?: number;
  count?: number;
}

/** Non-indexable page from on_page/non_indexable */
export interface NonIndexablePage {
  url: string;
  reason?: string;
  status_code?: number;
  meta_robots?: string;
}

/** Redirect chain from on_page/redirect_chains */
export interface RedirectChain {
  url?: string;
  is_redirect?: boolean;
  chain?: Array<{ url: string; status_code?: number }>;
}

// ─── Crawl Summary (from on_page/summary) ──────────────────────────

export interface CrawlSummary {
  crawl_progress?: string; // 'in_progress' | 'finished'
  crawl_status?: {
    pages_crawled?: number;
    pages_in_queue?: number;
    max_crawl_pages?: number;
  };
  domain_info?: {
    name?: string;
    server?: string;
    cms?: string;
    ip?: string;
    ssl_info?: { valid_certificate?: boolean };
    total_pages?: number;
    checks?: Record<string, unknown>;
  };
}

// ─── Lighthouse ─────────────────────────────────────────────────────

export interface LighthouseCategory {
  score: number | null;
  title?: string;
}

export interface LighthouseData {
  categories?: {
    performance?: LighthouseCategory;
    accessibility?: LighthouseCategory;
    'best-practices'?: LighthouseCategory;
    seo?: LighthouseCategory;
  };
  audits?: Record<string, {
    score?: number | null;
    numericValue?: number;
    displayValue?: string;
  }>;
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

// ─── Issues ─────────────────────────────────────────────────────────

export interface IssueUrl {
  url: string;
  from?: string;
  status?: number | string;
}

export interface DetailedIssue {
  severity: SeverityLevel;
  category: string;
  title: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  count: number;
  timeMin: number;
  why: string;
  fix: string;
  urls: IssueUrl[];
}

// Legacy Issue interface — kept for backward compat with QuickWins
export interface Issue {
  id: string;
  type: string;
  severity: SeverityLevel;
  category: string;
  title: string;
  description: string;
  affectedPages: string[];
  fix: string;
  impact: number;
  effort: EffortLevel;
}

export interface QuickWin {
  id: string;
  title: string;
  description?: string;
  estimatedTime: string;
  impactScore: number;
  affectedPages: number;
  fix: string;
  category?: string;
  completed?: boolean;
  scoreProjection?: number;
}

// ─── Business Detection ─────────────────────────────────────────────

export interface DetectedBusiness {
  name: string;
  coords: { lat: number; lng: number } | null;
  address: string;
  city: string;
  region: string;
  country: string;
  categories: string[];
  categoryNames: string;
  placeId: string | null;
  phone: string;
  rating: number | null;
  reviewCount: number;
  url: string;
}

// ─── Market / Keyword Types ─────────────────────────────────────────

export interface DiscoveredMarket {
  city: string;
  location: string;   // "City,State,Country" for DataForSEO
  source: 'url' | 'gbp' | 'content';
  page?: string;
}

export interface ExtractedKeyword {
  keyword: string;
  score: number;
  type: KeywordType;
}

export interface SerpMatch {
  url: string;
  path: string;
  position: number;
  title: string;
  description?: string;
}

export interface MapsRankingData {
  rank: number | 'NF';
  url: string;
  title?: string;
  rating?: number;
  reviews?: number;
}

export interface MarketKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info?: {
      search_volume: number;
      cpc: number;
      competition_level: string;
    };
  };
  ranked_serp_element: {
    serp_item: {
      rank_group: number;
      rank_absolute: number;
      url: string;
      relative_url: string;
      etv: number;
      estimated_paid_traffic_cost: number;
      type: string;
    };
  };
  rank_changes?: Record<string, unknown>;
  serp_item_types?: string[];
  _serpMatches?: SerpMatch[];
  _isCannibalized?: boolean;
  _localSerp?: {
    hasLocalPack: boolean;
    hasAiOverview: boolean;
    topCompetitors: Array<{ domain: string; position: number; title: string }>;
    notRanking: boolean;
  };
  _locallyValidated?: boolean;
  _mapsData?: MapsRankingData | null;
  _mapsRank?: number | 'NF' | null;
  _mapsUrl?: string;
  _surfaceComparison?: SurfaceComparison | null;
}

export interface MarketMetrics {
  organic?: {
    count: number;
    etv: number;
    estimated_paid_traffic_cost: number;
    pos_1: number;
    pos_2_3: number;
    pos_4_10: number;
    pos_11_20: number;
    is_new: number;
    is_lost: number;
  };
  maps?: {
    checked: number;
    ranking: number;
    notFound: number;
  };
}

export interface MarketData {
  items: MarketKeywordItem[];
  totalCount: number;
  metrics?: MarketMetrics;
}

// ─── Cannibalization ────────────────────────────────────────────────

export interface CannibalizationConflict {
  keyword: string;
  volume: number;
  cpc: number;
  market: string;
  primary: {
    url: string;
    path: string;
    position: number;
    title: string;
    pageType: UrlType;
  };
  competitors: Array<{
    url: string;
    path: string;
    position: number;
    title: string;
    pageType: UrlType;
  }>;
  positionGap: number;
  allMatches: SerpMatch[];
  severity: 'critical' | 'high' | 'medium';
  intent: KeywordIntent;
  conflictType: string;
  conflictIcon: string;
  conflictDescription: string;
  conflictFix: string;
  primaryType: UrlType;
  competitorType: UrlType;
  wrongPageWinning: boolean;
}

// ─── Merged Keyword Entry (from getKeywordData) ─────────────────────

export interface MergedKeywordEntry {
  keyword: string;
  volume: number;
  cpc: number;
  competition: string;
  difficulty: number;
  position: number;
  url: string;
  relUrl: string;
  etv: number;
  paidCost: number;
  type: string;
  isNew: boolean;
  isUp: boolean;
  isDown: boolean;
  isLost: boolean;
  serpTypes: string[];
  hasAiOverview: boolean;
  serpMatches: SerpMatch[];
  isCannibalized: boolean;
  isSecondaryMatch?: boolean;
  market: string;
  markets: string[];
  mapsRank: number | 'NF' | null;
  mapsUrl: string;
  mapsData: MapsRankingData | null;
  surfaceComparison: SurfaceComparison | null;
}

export interface KeywordData {
  items: MergedKeywordEntry[];
  pageMap: Record<string, MergedKeywordEntry[]>;
  totalRanking: number;
  locations: string[];
  locationLabel: string;
  aggregate: {
    etv: number;
    paidValue: number;
    pos1: number;
    pos2_3: number;
    pos4_10: number;
    pos11_20: number;
    isNew: number;
    isLost: number;
  };
  aggregateByMarket: Record<string, MarketMetrics['organic']>;
  cannibalizationByMarket: Record<string, CannibalizationConflict[]>;
  rawMarkets: Record<string, MarketData>;
  isMultiMarket: boolean;
}

// ─── Crawl Progress ─────────────────────────────────────────────────

export interface CrawlProgress {
  phase: CrawlPhase;
  completed: number;
  total: number;
  tasks: string[];
  pagesCrawled: number;
  pagesInQueue: number;
  elapsedSeconds: number;
  log: LogEntry[];
}

export interface LogEntry {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

// Legacy ScanProgress — kept for backward compat
export interface ScanProgress {
  completed: number;
  total: number;
  tasks: string[];
}

// ─── Domain Rank Overview (from dataforseo_labs/google/domain_rank_overview/live) ──

export interface DomainRankOverview {
  target: string;
  organic?: {
    pos_1: number;
    pos_2_3: number;
    pos_4_10: number;
    pos_11_20: number;
    pos_21_30: number;
    pos_31_40: number;
    pos_41_50: number;
    pos_51_60: number;
    pos_61_70: number;
    pos_71_80: number;
    pos_81_90: number;
    pos_91_100: number;
    etv: number;
    estimated_paid_traffic_cost: number;
    count: number;
    is_new: number;
    is_up: number;
    is_down: number;
    is_lost: number;
  };
  paid?: {
    count: number;
    etv: number;
    estimated_paid_traffic_cost: number;
  };
}

// ─── Google PageSpeed Insights (CrUX + Lab data) ────────────────────

export interface PSIMetric {
  percentile: number;        // p75 value
  category: 'FAST' | 'AVERAGE' | 'SLOW';
  distributions?: Array<{ min: number; max: number; proportion: number }>;
}

export interface PagespeedInsights {
  url: string;
  strategy: 'mobile' | 'desktop';
  /** CrUX field data — real user metrics from Chrome UX Report */
  fieldData?: {
    overall_category: 'FAST' | 'AVERAGE' | 'SLOW' | 'NONE';
    FIRST_CONTENTFUL_PAINT_MS?: PSIMetric;
    LARGEST_CONTENTFUL_PAINT_MS?: PSIMetric;
    CUMULATIVE_LAYOUT_SHIFT_SCORE?: PSIMetric;
    INTERACTION_TO_NEXT_PAINT?: PSIMetric;
    EXPERIMENTAL_TIME_TO_FIRST_BYTE?: PSIMetric;
    FIRST_INPUT_DELAY_MS?: PSIMetric;
  };
  /** Origin-level CrUX (more data, entire domain not just page) */
  originFieldData?: {
    overall_category: 'FAST' | 'AVERAGE' | 'SLOW' | 'NONE';
    LARGEST_CONTENTFUL_PAINT_MS?: PSIMetric;
    CUMULATIVE_LAYOUT_SHIFT_SCORE?: PSIMetric;
    INTERACTION_TO_NEXT_PAINT?: PSIMetric;
    EXPERIMENTAL_TIME_TO_FIRST_BYTE?: PSIMetric;
  };
  /** Lighthouse lab scores (0–100) */
  scores?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  /** Key Lighthouse audit display values */
  audits?: {
    'first-contentful-paint'?: string;
    'largest-contentful-paint'?: string;
    'total-blocking-time'?: string;
    'cumulative-layout-shift'?: string;
    'speed-index'?: string;
    'interactive'?: string;
    'server-response-time'?: string;
    'render-blocking-resources'?: string;
    'uses-optimized-images'?: string;
    'uses-webp-images'?: string;
    'uses-text-compression'?: string;
    'uses-long-cache-ttl'?: string;
    'efficient-animated-content'?: string;
  };
}

// ─── Full Crawl Data (stored in Supabase JSONB) ─────────────────────

export interface CrawlData {
  summary?: CrawlSummary;
  pages?: { items: CrawledPage[]; totalCount: number };
  resources?: { items: CrawledResource[]; totalCount: number };
  links?: { items: CrawledLink[]; totalCount: number };
  duplicateTags?: { items: DuplicateTag[]; totalCount: number };
  duplicateContent?: { items: DuplicateContent[]; totalCount: number };
  nonIndexable?: { items: NonIndexablePage[]; totalCount: number };
  redirectChains?: { items: RedirectChain[]; totalCount: number };
  lighthouse?: LighthouseData | null;
  /** Google PageSpeed Insights — mobile + desktop CrUX field data */
  pagespeedInsights?: { mobile?: PagespeedInsights; desktop?: PagespeedInsights } | null;
  /** DataForSEO Labs domain rank overview — organic keyword count + ETV */
  domainRankOverview?: DomainRankOverview | null;
  business?: DetectedBusiness | null;
  markets?: string[];
  keywords?: {
    markets: Record<string, MarketData>;
    locations: string[];
    mapsData?: Record<string, Record<string, MapsRankingData>>;
  } | null;
  keywordDebug?: string[];
}

// ─── Site Audit Results (full shape) ────────────────────────────────

export interface SiteAuditResults {
  auditId: string;
  domain: string;
  overallScore: number;
  categoryScores: CategoryScores;
  pageCount: number;
  issuesCritical: number;
  issuesWarning: number;
  issuesNotice: number;
  lighthouseScores: LighthouseScores | null;
  crawlData: CrawlData;
  issues: DetailedIssue[];
  quickWins: QuickWin[];
  keywordData: KeywordData | null;
  apiCost: number;
  startedAt: string;
  completedAt: string;
}

// ─── Component Props ────────────────────────────────────────────────

export interface ScanInputProps {
  onStartScan: (domain: string, maxPages?: number) => void;
  isLoading: boolean;
  scansRemaining: number;
  defaultDomain?: string;
}

export interface ProgressTrackerProps {
  progress: CrawlProgress;
  domain: string;
}

export interface DashboardProps {
  results: SiteAuditResults;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export interface ScoreOverviewProps {
  overallScore: number;
  categoryScores: CategoryScores;
  lighthouseScores: LighthouseScores | null;
  onCategoryClick?: (category: ScoreCategoryId) => void;
}

export interface IssuesTabProps {
  issues: DetailedIssue[];
  quickWins: QuickWin[];
  onToggleComplete?: (id: string) => void;
}

export interface PagesTabProps {
  pages: CrawledPage[];
  domain: string;
}

export interface QuickWinsProps {
  quickWins: QuickWin[];
  onToggleComplete: (id: string) => void;
}

// Tab component props (shared pattern)
export interface TabProps {
  results: SiteAuditResults;
}

// ─── Shared Component Props ─────────────────────────────────────────

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchable?: boolean;
  searchKeys?: string[];
  pageSize?: number;
  emptyMessage?: string;
}

export interface StatBoxData {
  value: string | number;
  label: string;
  sublabel?: string;
  isWarning?: boolean;
}

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
}

// ─── Classifier Constants ───────────────────────────────────────────

export const PAGE_TYPE_LABELS: Record<UrlType, { label: string; icon: string; color: string }> = {
  homepage: { label: 'Homepage', icon: '🏠', color: '#8b5cf6' },
  service: { label: 'Service Page', icon: '🔧', color: '#3b82f6' },
  blog: { label: 'Blog / Article', icon: '📝', color: '#f59e0b' },
  location: { label: 'City / Location', icon: '📍', color: '#10b981' },
  about: { label: 'About Page', icon: 'ℹ️', color: '#6b7280' },
  contact: { label: 'Contact Page', icon: '📞', color: '#6b7280' },
  gallery: { label: 'Gallery', icon: '🖼️', color: '#6b7280' },
  testimonials: { label: 'Reviews / Testimonials', icon: '⭐', color: '#6b7280' },
  faq: { label: 'FAQ', icon: '❓', color: '#6b7280' },
  other: { label: 'Other', icon: '📄', color: '#6b7280' },
};

export const INTENT_LABELS: Record<KeywordIntent, { label: string; icon: string; color: string; description: string }> = {
  'local-commercial': { label: 'Local Commercial', icon: '📍💰', color: '#ef4444', description: 'Ready to hire + location-specific' },
  commercial: { label: 'Commercial', icon: '💰', color: '#f59e0b', description: 'Research / buying intent' },
  informational: { label: 'Informational', icon: '📚', color: '#3b82f6', description: 'Learning / research' },
  branded: { label: 'Branded', icon: '🏢', color: '#8b5cf6', description: 'Brand search' },
  navigational: { label: 'Navigational', icon: '🧭', color: '#6b7280', description: 'Finding a specific page' },
};

// ─── Task Names (for progress tracking) ─────────────────────────────

export const CRAWL_TASKS = [
  'Submitting crawl task',
  'Submitting Lighthouse task',
  'Detecting business',
  'Crawling pages',
  'Fetching pages data',
  'Fetching resources',
  'Fetching links',
  'Fetching duplicate tags',
  'Fetching duplicate content',
  'Fetching non-indexable pages',
  'Fetching redirect chains',
  'Fetching Lighthouse results',
  'Discovering markets',
  'Extracting keywords',
  'Checking local SERPs',
  'Checking Maps rankings',
  'Computing scores',
  'Generating issues',
] as const;

export type CrawlTaskName = (typeof CRAWL_TASKS)[number];
