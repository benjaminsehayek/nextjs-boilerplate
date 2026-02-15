// Site Audit Tool - Type Definitions

export type ScanState = 'idle' | 'scanning' | 'complete' | 'error';
export type TabId = 'overview' | 'issues' | 'pages';
export type Severity = 'critical' | 'warning' | 'notice';
export type Impact = 'high' | 'medium' | 'low';
export type Effort = 'easy' | 'medium' | 'hard';

export interface ScanProgress {
  completed: number;
  total: number;
  tasks: string[];
  currentTask?: string;
}

export interface AuditCheck {
  id: string;
  category: string;
  name: string;
  description: string;
  passed: boolean;
  severity: Severity;
  value?: string | number;
  expected?: string | number;
}

export interface Issue {
  id: string;
  type: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  affectedPages: string[];
  fix: string;
  impact: Impact;
  effort: Effort;
}

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  impactScore: number;
  affectedPages: number;
  fix: string;
  completed?: boolean;
}

export interface PageData {
  url: string;
  status_code: number;
  score: number;
  title?: string;
  meta_description?: string;
  h1?: string;
  word_count?: number;
  images?: number;
  links_internal?: number;
  links_external?: number;
  load_time?: number;
  size?: number;
  issues: Issue[];
}

export interface CategoryScore {
  name: string;
  score: number;
  checks: AuditCheck[];
  issueCount: number;
}

export interface SiteAuditResults {
  auditId: string;
  domain: string;
  overallScore: number;
  categoryScores: Record<string, CategoryScore>;
  pages: PageData[];
  issues: Issue[];
  quickWins: QuickWin[];
  pageCount: number;
  issuesCritical: number;
  issuesWarning: number;
  issuesNotice: number;
  lighthouseScores?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  crawlData?: unknown;
  apiCost: number;
  startedAt: string;
  completedAt: string;
}

export interface ScanInputProps {
  onStartScan: (domain: string) => void;
  isLoading: boolean;
  scansRemaining: number;
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
  categoryScores: Record<string, CategoryScore>;
  lighthouseScores?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
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
