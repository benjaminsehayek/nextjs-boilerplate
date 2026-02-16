// Off-Page SEO Audit Tool Types

export type AuditStatus = 'idle' | 'scanning' | 'complete' | 'error';
export type BacklinkType = 'follow' | 'nofollow' | 'redirect' | 'canonical';
export type ToxicityLevel = 'toxic' | 'suspicious' | 'clean';

export interface DomainInputProps {
  onStartScan: (domain: string, competitors?: string[]) => void;
  isLoading: boolean;
  scansRemaining: number;
}

export interface ProgressTrackerProps {
  progress: ScanProgress;
  domain: string;
}

export interface ScanProgress {
  completed: number;
  total: number;
  tasks: string[];
}

export interface BacklinkData {
  url: string;
  anchorText: string;
  type: BacklinkType;
  firstSeen: string;
  lastSeen: string;
  domainRank: number;
  pageRank: number;
  isSpam: boolean;
}

export interface ReferringDomain {
  domain: string;
  backlinks: number;
  domainRank: number;
  pageRank: number;
  firstSeen: string;
  lastSeen: string;
  toxicityScore: number;
  toxicityLevel: ToxicityLevel;
  follow: number;
  nofollow: number;
}

export interface AnchorTextData {
  text: string;
  count: number;
  percentage: number;
  type: 'exact' | 'partial' | 'branded' | 'naked' | 'generic';
  follow: number;
  nofollow: number;
}

export interface BacklinkMetrics {
  totalBacklinks: number;
  referringDomains: number;
  domainRating: number;
  toxicScore: number;
  followLinks: number;
  nofollowLinks: number;
  newBacklinks: number;
  lostBacklinks: number;
  qualityScore: number;
}

export interface BacklinkOverviewProps {
  metrics: BacklinkMetrics;
}

export interface ReferringDomainsProps {
  domains: ReferringDomain[];
  sortBy: 'backlinks' | 'domainRank' | 'toxicity';
  onSortChange: (sortBy: 'backlinks' | 'domainRank' | 'toxicity') => void;
}

export interface AnchorTextProps {
  anchors: AnchorTextData[];
  totalBacklinks: number;
}

export interface CompetitorData {
  domain: string;
  backlinks: number;
  referringDomains: number;
  domainRating: number;
  toxicScore: number;
}

export interface CompetitorCompareProps {
  yourDomain: string;
  yourMetrics: BacklinkMetrics;
  competitors: CompetitorData[];
}

export interface OffPageAuditResults {
  auditId: string;
  domain: string;
  metrics: BacklinkMetrics;
  referringDomains: ReferringDomain[];
  anchors: AnchorTextData[];
  competitors: CompetitorData[];
  backlinks: BacklinkData[];
  apiCost: number;
  startedAt: string;
  completedAt: string;
}

export type TabId = 'overview' | 'domains' | 'anchors' | 'competitors';

export interface DashboardProps {
  results: OffPageAuditResults;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}
