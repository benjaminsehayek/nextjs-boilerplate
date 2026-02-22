// Off-Page SEO Audit Tool Types

export type AuditStatus = 'idle' | 'scanning' | 'complete' | 'error';
export type BacklinkType = 'follow' | 'nofollow' | 'redirect' | 'canonical';
export type ToxicityLevel = 'toxic' | 'suspicious' | 'clean';

export interface DomainInputProps {
  onStartScan: (domain: string, competitors?: string[]) => void;
  isLoading: boolean;
  scansRemaining: number;
  defaultDomain?: string;
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


// ═══ Enhanced Types ═══

// Extended audit status with discovery phase
export type EnhancedAuditStatus = 'idle' | 'discovering' | 'configuring' | 'scanning' | 'complete' | 'error';

// GBP Discovery
export interface DiscoveredLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  domain: string;
  placeId?: string;
  cid?: string;
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  source: 'listings' | 'manual';
  selected: boolean;
}

// Enhanced domain metrics (5 categories)
export interface DomainCategoryScores {
  authority: number;
  citations: number;
  quality: number;
  localLinks: number;
  anchors: number;
  overall: number;
}

// Citation tracking
export interface CitationResult {
  domain: string;
  name: string;
  tier: 'critical' | 'high' | 'medium' | 'low';
  found: boolean;
}

// Link velocity
export interface LinkVelocityMonth {
  date: string;
  newBacklinks: number;
  lostBacklinks: number;
  newDomains: number;
  lostDomains: number;
}

export interface LinkVelocityData {
  months: LinkVelocityMonth[];
  trend: 'growing' | 'stable' | 'declining';
  netChange: number;
}

// Link gap
export interface LinkGapOpportunity {
  domain: string;
  domainRank: number;
  competitorCount: number;
  tier: 'high' | 'medium' | 'low';
}

// Toxic link (improved detection)
export interface ToxicLink {
  domain: string;
  reason: 'pbn' | 'spam_tld' | 'random_domain';
  backlinks: number;
  rank: number;
}

// Social presence
export interface SocialPresenceItem {
  platform: string;
  icon: string;
  found: boolean;
  domain: string;
}

// Top backlink
export interface TopBacklink {
  domain: string;
  url: string;
  anchor: string;
  rank: number;
  dofollow: boolean;
}

// ═══ Location-Level Types ═══

export interface ReviewItem {
  author: string;
  rating: number;
  text: string;
  date: string;
  ownerResponse?: string;
}

export interface ReviewData {
  rating: number;
  totalCount: number;
  distribution: { stars: number; count: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  velocity: { last30: number; last90: number; last180: number; avgPerMonth: number };
  responseRate: number;
  recentReviews: ReviewItem[];
}

export interface NAPData {
  score: number;
  canonical: { name: string; address: string; phone: string };
  mismatches: { field: string; expected: string; found: string }[];
}

export interface GBPItem {
  label: string;
  points: number;
  maxPoints: number;
  status: 'complete' | 'partial' | 'missing';
}

export interface GBPData {
  score: number;
  items: GBPItem[];
}

export interface BrandMention {
  url: string;
  title: string;
  snippet: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
}

export interface LocationAuditData {
  locationId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  placeId?: string;
  cid?: string;
  overallScore: number;
  reviewsScore: number;
  napScore: number;
  gbpScore: number;
  reviews: ReviewData;
  nap: NAPData;
  gbp: GBPData;
  brandMentions: BrandMention[];
  recommendations: Recommendation[];
}

// ═══ Enhanced Results (extends existing for backward compat) ═══

export interface EnhancedOffPageResults extends OffPageAuditResults {
  categoryScores?: DomainCategoryScores;
  citations?: CitationResult[];
  linkVelocity?: LinkVelocityData;
  linkGaps?: LinkGapOpportunity[];
  toxicLinks?: ToxicLink[];
  socialPresence?: SocialPresenceItem[];
  topBacklinks?: TopBacklink[];
  locations?: LocationAuditData[];
  recommendations?: Recommendation[];
}

// Updated tab IDs (string allows dynamic location-{id} tabs)
export type EnhancedTabId = 'overview' | 'domain' | 'anchors' | 'competitors' | string;

// Enhanced scan progress
export interface EnhancedScanProgress {
  phase: 'domain' | 'locations';
  completed: number;
  total: number;
  tasks: string[];
  currentTask?: string;
}

// ═══ Enhanced Component Props ═══

export interface GBPDiscoveryProps {
  locations: DiscoveredLocation[];
  onLocationsChange: (locations: DiscoveredLocation[]) => void;
  onContinue: (selected: DiscoveredLocation[]) => void;
  onDomainOnly: () => void;
  domain: string;
}

export interface EnhancedProgressTrackerProps {
  progress: EnhancedScanProgress;
  domain: string;
  locationCount: number;
}

export interface EnhancedDashboardProps {
  results: EnhancedOffPageResults;
  activeTab: EnhancedTabId;
  onTabChange: (tab: EnhancedTabId) => void;
}

export interface DomainTabProps {
  results: EnhancedOffPageResults;
  onNavigateTab: (tab: EnhancedTabId) => void;
}

export interface LocationTabProps {
  location: LocationAuditData;
  domainScore: number;
  businessName: string;
  businessCategories: string[];
  onNavigateTab: (tab: EnhancedTabId) => void;
}

export interface CitationsGridProps {
  citations: CitationResult[];
}

export interface LinkVelocityProps {
  data: LinkVelocityData;
}

export interface TopBacklinksProps {
  backlinks: TopBacklink[];
}

export interface SocialPresenceProps {
  platforms: SocialPresenceItem[];
}

export interface LinkGapsProps {
  gaps: LinkGapOpportunity[];
}

export interface ReviewsPanelProps {
  reviews: ReviewData;
  businessName: string;
  businessCategory: string;
  businessCity: string;
  businessPhone: string;
}

export interface NAPConsistencyProps {
  nap: NAPData;
}

export interface GBPCompletenessProps {
  gbp: GBPData;
}

export interface RecommendationsProps {
  recommendations: Recommendation[];
  title?: string;
}
