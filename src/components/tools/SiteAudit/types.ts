// Site Audit Tool Types

export type SeverityLevel = 'critical' | 'warning' | 'notice';
export type Severity = SeverityLevel; // Alias for compatibility
export type Category = 'meta' | 'content' | 'links' | 'images' | 'performance' | 'schema' | 'security' | 'mobile';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type Impact = ImpactLevel; // Alias for compatibility
export type EffortLevel = 'easy' | 'medium' | 'hard';
export type Effort = EffortLevel; // Alias for compatibility
export type ScanState = 'idle' | 'scanning' | 'complete' | 'error';
export type TabId = 'overview' | 'issues' | 'pages';

export interface AuditCheck {
  id: string;
  category: Category | string;
  severity: SeverityLevel;
  passed: boolean;
  title?: string;
  name?: string;
  description: string;
  fix?: string;
  affectedPages?: string[];
}

export interface Issue {
  id: string;
  type: string;
  severity: SeverityLevel;
  category: Category;
  title: string;
  description: string;
  affectedPages: string[];
  fix: string;
  impact: ImpactLevel;
  effort: EffortLevel;
}

export interface PageData {
  url: string;
  title: string | null;
  description?: string | null;
  meta_description?: string | null;
  h1: string | null;
  statusCode?: number;
  status_code?: number;
  loadTime?: number;
  load_time?: number;
  wordCount?: number;
  word_count?: number;
  images?: number;
  links_internal?: number;
  links_external?: number;
  size?: number;
  issues?: Issue[];
  score: number;
}

export interface QuickWin {
  id: string;
  title: string;
  description?: string;
  estimatedTime: string;
  impactScore: number;
  affectedPages: number;
  fix: string;
  category?: Category;
  completed?: boolean;
}

export interface CategoryScoreData {
  score: number;
  issueCount: number;
}

export interface CategoryScore {
  category: Category;
  score: number;
  checks: number;
  passed: number;
  failed: number;
}

export interface SiteAuditResults {
  auditId: string;
  domain: string;
  overallScore: number;
  categoryScores: Record<string, CategoryScoreData>;
  pageCount: number;
  issuesCritical: number;
  issuesWarning: number;
  issuesNotice: number;
  lighthouseScores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  } | null;
  pages: PageData[];
  issues: Issue[];
  quickWins: QuickWin[];
  crawlData?: unknown;
  apiCost: number;
  startedAt: string;
  completedAt: string;
}

export interface ScanProgress {
  completed: number;
  total: number;
  tasks: string[];
}

// Component Props

export interface ScanInputProps {
  onStartScan: (domain: string) => void;
  isLoading: boolean;
  scansRemaining: number;
  defaultDomain?: string;
}

export interface ProgressTrackerProps {
  progress: ScanProgress;
  domain: string;
}

export interface DashboardProps {
  results: SiteAuditResults;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export interface ScoreOverviewProps {
  overallScore: number;
  categoryScores: Record<string, CategoryScoreData>;
  lighthouseScores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  } | null;
}

export interface IssuesTabProps {
  issues: Issue[];
}

export interface PagesTabProps {
  pages: PageData[];
}

export interface QuickWinsProps {
  quickWins: QuickWin[];
  onToggleComplete: (id: string) => void;
}
