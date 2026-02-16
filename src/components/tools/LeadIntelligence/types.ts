// Lead Intelligence Tool Types

export type LeadSource = 'ppc' | 'lsa' | 'meta' | 'organic' | 'gbp' | 'direct' | 'referral';
export type Platform = 'google_ads' | 'lsa' | 'meta' | 'search_console' | 'gbp';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type TimeRange = '30' | '60' | '90';

export interface PlatformConnection {
  platform: Platform;
  connected: boolean;
  connectedAt?: string;
  accountName?: string;
  accountId?: string;
  lastSync?: string;
  error?: string;
}

export interface LeadMetric {
  source: LeadSource;
  leads: number;
  spend: number;
  revenue: number;
  costPerLead: number;
  closeRate: number;
  revenuePerLead: number;
  roi: number;
  confidence: ConfidenceLevel;
  trend: number; // percentage change from previous period
}

export interface Lead {
  id: string;
  source: LeadSource;
  createdAt: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  value?: number;
  revenue?: number;
  attributionConfidence: ConfidenceLevel;
  metadata?: {
    campaign?: string;
    adGroup?: string;
    keyword?: string;
    gclid?: string;
    fbclid?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

export interface ChannelPerformance {
  source: LeadSource;
  metrics: LeadMetric;
  topCampaigns?: CampaignMetric[];
  insights?: string[];
}

export interface CampaignMetric {
  name: string;
  leads: number;
  spend: number;
  revenue: number;
  roi: number;
}

export interface SpendBreakdown {
  platform: Platform;
  spend: number;
  percentage: number;
  leads: number;
  revenue: number;
  roi: number;
}

export interface TrendData {
  date: string;
  leads: number;
  spend: number;
  revenue: number;
}

export interface DashboardData {
  timeRange: TimeRange;
  totalLeads: number;
  totalSpend: number;
  totalRevenue: number;
  avgCostPerLead: number;
  avgCloseRate: number;
  overallROI: number;
  channelMetrics: LeadMetric[];
  trendData: TrendData[];
  topPerformingChannel: LeadSource;
  recommendations: string[];
}

export interface ConnectionManagerProps {
  connections: PlatformConnection[];
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
  onRefresh: (platform: Platform) => void;
}

export interface ChannelPerformanceProps {
  metrics: LeadMetric[];
  timeRange: TimeRange;
  onSourceClick?: (source: LeadSource) => void;
}

export interface LeadAttributionProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
}

export interface SpendAnalysisProps {
  spendBreakdown: SpendBreakdown[];
  totalSpend: number;
  timeRange: TimeRange;
}

export interface DashboardProps {
  data: DashboardData;
  connections: PlatformConnection[];
  onTimeRangeChange: (range: TimeRange) => void;
}
