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
