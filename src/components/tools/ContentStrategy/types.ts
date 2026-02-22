// Content Strategy Tool Types

export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';
export type ClusterIntent = 'informational' | 'navigational' | 'transactional' | 'commercial';
export type Priority = 'high' | 'medium' | 'low';
export type ContentType = 'blog' | 'landing-page' | 'guide' | 'video' | 'infographic' | 'case-study';

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  difficulty: number;
  trend: number[];
  currentRank?: number;
}

export interface KeywordCluster {
  id: string;
  name: string;
  intent: ClusterIntent;
  keywords: KeywordData[];
  totalVolume: number;
  avgDifficulty: number;
  opportunityScore: number;
  existingContent?: string; // URL of existing page targeting this cluster
}

export interface ContentOpportunity {
  cluster: KeywordCluster;
  priority: Priority;
  estimatedTraffic: number;
  estimatedValue: number;
  competitorGaps: string[];
  recommendedType: ContentType;
}

export interface ContentCalendarItem {
  id: string;
  title: string;
  cluster: KeywordCluster;
  targetKeywords: string[];
  contentType: ContentType;
  priority: Priority;
  estimatedTraffic: number;
  estimatedValue: number;
  publishDate: string;
  status: 'planned' | 'in-progress' | 'published';
  assignedTo?: string;
}

export interface CannibalizationIssue {
  id: string;
  keyword: string;
  searchVolume: number;
  competingPages: Array<{
    url: string;
    rank?: number;
    traffic?: number;
  }>;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface EconomicsConfig {
  averageOrderValue?: number;
  conversionRate?: number;
  leadValue?: number;
  monthlyBudget?: number;
}

export interface ContentStrategyConfig {
  domain: string;
  industry?: string;
  economics: EconomicsConfig;
  targetLocation?: string;
}

export interface AnalysisProgress {
  completed: number;
  total: number;
  currentTask: string;
  tasks: string[];
}

export interface ContentStrategyResults {
  strategyId: string;
  domain: string;
  clusters: KeywordCluster[];
  opportunities: ContentOpportunity[];
  calendar: ContentCalendarItem[];
  cannibalization: CannibalizationIssue[];
  totalKeywords: number;
  totalSearchVolume: number;
  estimatedMonthlyTraffic: number;
  estimatedMonthlyValue: number;
  apiCost: number;
  analyzedAt: string;
}

export interface ConfigFormProps {
  onStartAnalysis: (config: ContentStrategyConfig) => void;
  isLoading: boolean;
  scansRemaining: number;
  defaultDomain?: string;
  defaultIndustry?: string;
}

export interface ProgressTrackerProps {
  progress: AnalysisProgress;
  domain: string;
}

export interface KeywordClustersProps {
  clusters: KeywordCluster[];
  onClusterSelect?: (cluster: KeywordCluster) => void;
}

export interface ContentCalendarProps {
  items: ContentCalendarItem[];
  onItemUpdate?: (id: string, updates: Partial<ContentCalendarItem>) => void;
  onExport?: () => void;
}

export interface CannibalizationProps {
  issues: CannibalizationIssue[];
  onResolve?: (id: string) => void;
}

export interface DashboardProps {
  results: ContentStrategyResults;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export type TabId = 'overview' | 'clusters' | 'calendar' | 'cannibalization';

export interface TabDefinition {
  id: TabId;
  name: string;
  badge?: number;
}

// ── Enhanced Types (new) ──────────────────────────────────────────

// Service with economics
export interface Service {
  name: string;
  profit: number;  // profit per job ($)
  close: number;   // close rate (%)
  enabled: boolean;
}

// Crawled page from DataForSEO on_page
export interface CrawledPage {
  url: string;
  path: string;
  title: string;
  h1: string;
  desc: string;
  wordCount: number;
  internalLinks: number;
  type: 'homepage' | 'blog' | 'service' | 'location' | 'other';
}

// Enhanced keyword with ROI
export interface EnhancedKeyword extends KeywordData {
  funnel: 'bottom' | 'middle' | 'top';
  pageType: 'service' | 'location' | 'blog';
  cluster: number;
  status: 'existing' | 'gap' | 'cannibalized';
  serviceName: string;
  convMultiplier: number;
  profitPerJob: number;
  closeRate: number;
  monthlyVisitors: number;
  monthlyLeads: number;
  monthlyClosed: number;
  roi: number;
  assignedPage: string | null;
  sources: string[];
}

// Content map item
export interface ContentMapItem {
  type: 'service' | 'location' | 'blog';
  status: 'existing' | 'gap' | 'cannibalized';
  url: string;
  path: string;
  title: string;
  keywords: string[];
  primaryKeyword: string;
  totalVolume: number;
  totalRoi: number;
  wordCount: number;
  clusterId: number;
}

// Calendar phases
export type CalendarPhase = 'Foundation' | 'Geographic' | 'Authority' | 'Ongoing';
export type CalendarPriority = 'high' | 'medium' | 'ongoing';

export interface EnhancedCalendarItem {
  id: string;
  week: number;
  phase: CalendarPhase;
  calendarPriority: CalendarPriority;
  pageType: 'service' | 'location' | 'blog' | 'gbp';
  title: string;
  primaryKeyword: string;
  keywords: string[];
  url: string;
  totalVolume: number;
  totalRoi: number;
  status: 'planned' | 'in-progress' | 'published';
  clusterId: number;
}

// Enhanced config with services + locations
export interface EnhancedConfig extends ContentStrategyConfig {
  services: Service[];
  locations: string[];
  country: number;  // location code
  language: string;
  brand: string;
}

// Enhanced results
export interface EnhancedStrategyResults extends ContentStrategyResults {
  services?: Service[];
  locations?: string[];
  crawledPages?: CrawledPage[];
  enhancedKeywords?: EnhancedKeyword[];
  contentMap?: ContentMapItem[];
  enhancedCalendar?: EnhancedCalendarItem[];
  totalRoi?: number;
  totalLeads?: number;
  contentGaps?: number;
}

// Updated tab IDs
export type EnhancedTabId = 'overview' | 'keywords' | 'content-map' | 'calendar' | 'generate' | 'cannibalization';

// Enhanced component props
export interface EnhancedConfigFormProps {
  onStartAnalysis: (config: EnhancedConfig) => void;
  isLoading: boolean;
  scansRemaining: number;
  defaultDomain?: string;
  defaultIndustry?: string;
}

export interface EnhancedDashboardProps {
  results: EnhancedStrategyResults;
  activeTab: EnhancedTabId;
  onTabChange: (tab: EnhancedTabId) => void;
}

export interface KeywordTableProps {
  keywords: EnhancedKeyword[];
}

export interface ContentMapProps {
  items: ContentMapItem[];
  onSelectItem?: (item: ContentMapItem) => void;
}

export interface ContentGeneratorProps {
  items: ContentMapItem[];
  domain: string;
  industry?: string;
}

export interface EnhancedCalendarProps {
  items: EnhancedCalendarItem[];
  onItemUpdate?: (id: string, updates: Partial<EnhancedCalendarItem>) => void;
}

// DataForSEO API response types
export interface DFSKeywordData {
  keyword: string;
  location_code?: number;
  language_code?: string;
  search_partners?: boolean;
  competition?: number;
  competition_level?: string;
  cpc?: number;
  search_volume?: number;
  low_top_of_page_bid?: number;
  high_top_of_page_bid?: number;
  categories?: number[];
  monthly_searches?: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;
  keyword_annotations?: {
    concepts?: Array<{
      name: string;
      concept_group?: {
        name: string;
        type: string;
      };
    }>;
  };
}

export interface DFSKeywordsResponse {
  status_code: number;
  status_message: string;
  cost: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    cost: number;
    result: Array<{
      keyword: string;
      location_code: number;
      language_code: string;
      search_partners: boolean;
      competition: number;
      competition_level: string;
      cpc: number;
      search_volume: number;
      categories: number[];
      monthly_searches: Array<{
        year: number;
        month: number;
        search_volume: number;
      }>;
    }>;
  }>;
}
