// Lead Database Utility Functions

import type {
  Contact,
  Market,
  ELVFactors,
  ContactSource,
  LeadType,
  Urgency,
  MarketName,
} from './types';
import {
  MARKETS,
  CHANNEL_CLOSE_RATES,
  LEAD_TYPE_MULTIPLIERS,
  URGENCY_MULTIPLIERS,
} from './types';

/**
 * Detect market based on priority:
 * 1. API geoTarget
 * 2. City match
 * 3. Phone area code
 * 4. Campaign name
 */
export function detectMarket(contact: Partial<Contact>): Market {
  // Priority 1: API geoTarget
  if (contact.geoTarget) {
    const market = MARKETS.find((m) =>
      m.cities.some((city) =>
        contact.geoTarget?.toLowerCase().includes(city.toLowerCase())
      )
    );
    if (market) return market;
  }

  // Priority 2: City match
  if (contact.city) {
    const market = MARKETS.find((m) =>
      m.cities.some(
        (city) => city.toLowerCase() === contact.city?.toLowerCase()
      )
    );
    if (market) return market;
  }

  // Priority 3: Phone area code
  if (contact.phone) {
    const areaCode = contact.phone.replace(/\D/g, '').slice(0, 3);
    const market = MARKETS.find((m) => m.areaCodes.includes(areaCode));
    if (market) return market;
  }

  // Priority 4: Campaign name
  if (contact.campaignName) {
    const market = MARKETS.find((m) =>
      contact.campaignName?.toLowerCase().includes(m.displayName.toLowerCase())
    );
    if (market) return market;
  }

  // Default to "Other"
  return MARKETS.find((m) => m.name === 'other')!;
}

/**
 * Calculate Expected Lead Value (ELV)
 * Formula: Channel close rate × Lead type × Urgency × Keyword intent × Job value × Behavioral
 */
export function calculateELV(
  contact: Partial<Contact>,
  customFactors?: Partial<ELVFactors>
): { elv: number; factors: ELVFactors } {
  // Channel close rate
  const channelCloseRate = contact.source
    ? CHANNEL_CLOSE_RATES[contact.source as ContactSource]
    : 0.2;

  // Lead type multiplier
  const leadTypeMultiplier = contact.leadType
    ? LEAD_TYPE_MULTIPLIERS[contact.leadType as LeadType]
    : 1.0;

  // Urgency multiplier
  const urgencyMultiplier = contact.urgency
    ? URGENCY_MULTIPLIERS[contact.urgency as Urgency]
    : 1.0;

  // Keyword intent (0-1) - based on keyword quality
  let keywordIntent = 0.5;
  if (contact.keyword) {
    const highIntentKeywords = [
      'emergency',
      'repair',
      'service',
      'fix',
      'now',
      'today',
    ];
    const hasHighIntent = highIntentKeywords.some((kw) =>
      contact.keyword?.toLowerCase().includes(kw)
    );
    keywordIntent = hasHighIntent ? 0.9 : 0.5;
  }

  // Job value estimate (default $1000 for service business)
  const jobValue = customFactors?.jobValue || 1000;

  // Behavioral score (0-1) - engagement indicators
  let behavioralScore = 0.5;
  if (contact.emailOptIn) behavioralScore += 0.2;
  if (contact.smsOptIn) behavioralScore += 0.2;
  if (contact.lastActivity) {
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(contact.lastActivity).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceActivity < 7) behavioralScore += 0.1;
  }
  behavioralScore = Math.min(behavioralScore, 1);

  const factors: ELVFactors = {
    channelCloseRate: customFactors?.channelCloseRate || channelCloseRate,
    leadTypeMultiplier:
      customFactors?.leadTypeMultiplier || leadTypeMultiplier,
    urgencyMultiplier: customFactors?.urgencyMultiplier || urgencyMultiplier,
    keywordIntent: customFactors?.keywordIntent || keywordIntent,
    jobValue,
    behavioralScore: customFactors?.behavioralScore || behavioralScore,
  };

  // Calculate ELV
  const elv =
    factors.channelCloseRate *
    factors.leadTypeMultiplier *
    factors.urgencyMultiplier *
    factors.keywordIntent *
    factors.jobValue *
    factors.behavioralScore;

  return { elv: Math.round(elv), factors };
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Get contact display name
 */
export function getContactName(contact: Contact): string {
  if (contact.firstName || contact.lastName) {
    return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  }
  if (contact.company) {
    return contact.company;
  }
  if (contact.email) {
    return contact.email.split('@')[0];
  }
  return 'Unnamed Contact';
}

/**
 * Get contact initials for avatar
 */
export function getContactInitials(contact: Contact): string {
  if (contact.firstName && contact.lastName) {
    return `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
  }
  if (contact.company) {
    return contact.company.slice(0, 2).toUpperCase();
  }
  if (contact.email) {
    return contact.email.slice(0, 2).toUpperCase();
  }
  return '??';
}

/**
 * Check if contact is reachable
 */
export function isReachable(contact: Contact): boolean {
  return !!(contact.email || contact.phone);
}

/**
 * Calculate days since last activity
 */
export function daysSinceActivity(contact: Contact): number | null {
  if (!contact.lastActivity) return null;
  return Math.floor(
    (Date.now() - new Date(contact.lastActivity).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

/**
 * Format source name for display
 */
export function formatSourceName(source: ContactSource): string {
  return source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Export contacts to CSV
 */
export function exportToCSV(contacts: Contact[], filename: string): void {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'City',
    'State',
    'Source',
    'Market',
    'ELV',
    'Email Opt-In',
    'SMS Opt-In',
    'Tags',
    'Created At',
  ];

  const rows = contacts.map((contact) => [
    contact.firstName || '',
    contact.lastName || '',
    contact.email || '',
    contact.phone || '',
    contact.company || '',
    contact.city || '',
    contact.state || '',
    formatSourceName(contact.source),
    contact.marketName || '',
    contact.elv.toString(),
    contact.emailOptIn ? 'Yes' : 'No',
    contact.smsOptIn ? 'Yes' : 'No',
    contact.tags.join('; '),
    new Date(contact.createdAt).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV file
 */
export function parseCSV(content: string): string[][] {
  const lines = content.split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current.trim());
    result.push(row);
  }

  return result;
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10;
}

/**
 * Get market by name
 */
export function getMarketByName(name: MarketName): Market | undefined {
  return MARKETS.find((m) => m.name === name);
}

/**
 * Filter contacts based on criteria
 */
export function filterContacts(
  contacts: Contact[],
  filters: {
    search?: string;
    source?: ContactSource[];
    market?: MarketName[];
    emailOptIn?: boolean;
    smsOptIn?: boolean;
    minElv?: number;
    maxElv?: number;
    tags?: string[];
    lists?: string[];
  }
): Contact[] {
  return contacts.filter((contact) => {
    // Search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchable = [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.company,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(searchLower)) return false;
    }

    // Source
    if (filters.source && filters.source.length > 0) {
      if (!filters.source.includes(contact.source)) return false;
    }

    // Market
    if (filters.market && filters.market.length > 0) {
      if (!contact.marketName || !filters.market.includes(contact.marketName))
        return false;
    }

    // Email opt-in
    if (filters.emailOptIn !== undefined) {
      if (contact.emailOptIn !== filters.emailOptIn) return false;
    }

    // SMS opt-in
    if (filters.smsOptIn !== undefined) {
      if (contact.smsOptIn !== filters.smsOptIn) return false;
    }

    // ELV range
    if (filters.minElv !== undefined && contact.elv < filters.minElv)
      return false;
    if (filters.maxElv !== undefined && contact.elv > filters.maxElv)
      return false;

    // Tags
    if (filters.tags && filters.tags.length > 0) {
      if (!filters.tags.some((tag) => contact.tags.includes(tag))) return false;
    }

    // Lists
    if (filters.lists && filters.lists.length > 0) {
      if (!filters.lists.some((list) => contact.lists.includes(list)))
        return false;
    }

    return true;
  });
}
