// Lead Database Types

export type ContactSource =
  | 'organic_search'
  | 'google_ads'
  | 'facebook_ads'
  | 'referral'
  | 'direct'
  | 'email'
  | 'phone'
  | 'walk_in'
  | 'other';

export type LeadType =
  | 'new_customer'
  | 'repeat_customer'
  | 'quote_request'
  | 'emergency'
  | 'consultation';

export type Urgency = 'urgent' | 'soon' | 'flexible' | 'planning';

export type MarketName = 'portland_metro' | 'sw_washington' | 'salem' | 'bend' | 'other';

export interface Market {
  id: string;
  name: MarketName;
  displayName: string;
  cities: string[];
  areaCodes: string[];
  zipCodes?: string[];
  color: string;
}

export interface ELVFactors {
  channelCloseRate: number;  // 0-1
  leadTypeMultiplier: number; // 0-2
  urgencyMultiplier: number;  // 0.5-2
  keywordIntent: number;      // 0-1
  jobValue: number;           // Estimated $ value
  behavioralScore: number;    // 0-1
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Lead Information
  source: ContactSource;
  leadType?: LeadType;
  urgency?: Urgency;
  marketId?: string;
  marketName?: MarketName;

  // ELV Scoring
  elv: number;
  elvFactors?: ELVFactors;

  // Engagement
  emailOptIn: boolean;
  smsOptIn: boolean;
  unsubscribedEmail?: boolean;
  unsubscribedSMS?: boolean;
  lastContacted?: string;

  // Tags & Segments
  tags: string[];
  lists: string[];

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;

  // Campaign attribution
  campaignName?: string;
  adGroup?: string;
  keyword?: string;
  geoTarget?: string;

  // Custom fields
  customFields?: Record<string, any>;
}

export interface ContactFilters {
  search?: string;
  source?: ContactSource[];
  market?: MarketName[];
  emailOptIn?: boolean;
  smsOptIn?: boolean;
  minElv?: number;
  maxElv?: number;
  tags?: string[];
  lists?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ContactList {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  createdAt: string;
  color?: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  filter: ContactFilters;
  count: number;
  icon: string;
}

export interface ImportMapping {
  csvColumn: string;
  contactField: keyof Contact | 'skip';
}

export interface BulkAction {
  type: 'tag' | 'list' | 'export' | 'delete';
  value?: string;
}

// Market definitions
export const MARKETS: Market[] = [
  {
    id: 'portland-metro',
    name: 'portland_metro',
    displayName: 'Portland Metro',
    cities: ['Portland', 'Beaverton', 'Hillsboro', 'Gresham', 'Lake Oswego', 'Tigard', 'Tualatin'],
    areaCodes: ['503', '971'],
    color: '#FF5C1A',
  },
  {
    id: 'sw-washington',
    name: 'sw_washington',
    displayName: 'SW Washington',
    cities: ['Vancouver', 'Camas', 'Washougal', 'Battle Ground'],
    areaCodes: ['360', '564'],
    color: '#FF8419',
  },
  {
    id: 'salem',
    name: 'salem',
    displayName: 'Salem',
    cities: ['Salem', 'Keizer', 'Silverton', 'Woodburn'],
    areaCodes: ['503', '971'],
    color: '#FFC233',
  },
  {
    id: 'bend',
    name: 'bend',
    displayName: 'Bend',
    cities: ['Bend', 'Redmond', 'Sisters', 'Sunriver'],
    areaCodes: ['541'],
    color: '#3498DB',
  },
  {
    id: 'other',
    name: 'other',
    displayName: 'Other',
    cities: [],
    areaCodes: [],
    color: '#BFB5AC',
  },
];

// Source color mapping
export const SOURCE_COLORS: Record<ContactSource, string> = {
  organic_search: '#2ECC71',
  google_ads: '#3498DB',
  facebook_ads: '#4267B2',
  referral: '#9B59B6',
  direct: '#95A5A6',
  email: '#E67E22',
  phone: '#1ABC9C',
  walk_in: '#F39C12',
  other: '#7F8C8D',
};

// ELV calculation constants
export const CHANNEL_CLOSE_RATES: Record<ContactSource, number> = {
  organic_search: 0.35,
  google_ads: 0.28,
  facebook_ads: 0.18,
  referral: 0.45,
  direct: 0.40,
  email: 0.15,
  phone: 0.50,
  walk_in: 0.60,
  other: 0.20,
};

export const LEAD_TYPE_MULTIPLIERS: Record<LeadType, number> = {
  new_customer: 1.0,
  repeat_customer: 1.5,
  quote_request: 0.8,
  emergency: 1.8,
  consultation: 0.6,
};

export const URGENCY_MULTIPLIERS: Record<Urgency, number> = {
  urgent: 2.0,
  soon: 1.5,
  flexible: 1.0,
  planning: 0.5,
};

// Default segments
export const DEFAULT_SEGMENTS: Segment[] = [
  {
    id: 'email-opted',
    name: 'Email Opted In',
    description: 'Contacts who opted in for email',
    filter: { emailOptIn: true },
    count: 0,
    icon: '📧',
  },
  {
    id: 'sms-opted',
    name: 'SMS Opted In',
    description: 'Contacts who opted in for SMS',
    filter: { smsOptIn: true },
    count: 0,
    icon: '💬',
  },
  {
    id: 'high-value',
    name: 'High Value',
    description: 'Contacts with ELV > $500',
    filter: { minElv: 500 },
    count: 0,
    icon: '💎',
  },
  {
    id: 'unreachable',
    name: 'Unreachable',
    description: 'No email or phone',
    filter: {},
    count: 0,
    icon: '🚫',
  },
  {
    id: 'cold',
    name: 'Cold Leads',
    description: 'No activity in 30+ days',
    filter: {},
    count: 0,
    icon: '❄️',
  },
  {
    id: 'hot',
    name: 'Hot Leads',
    description: 'Activity in last 7 days',
    filter: {},
    count: 0,
    icon: '🔥',
  },
];
