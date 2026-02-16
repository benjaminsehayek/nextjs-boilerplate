// Lead Database - Public API
// Export all components and utilities for easy importing

// Components
export { default as ContactTable } from './ContactTable';
export { default as ContactDetail } from './ContactDetail';
export { default as AddContact } from './AddContact';
export { default as ImportModal } from './ImportModal';
export { default as Sidebar } from './Sidebar';
export { default as MarketManager } from './MarketManager';

// Types
export type {
  Contact,
  ContactSource,
  LeadType,
  Urgency,
  MarketName,
  Market,
  ELVFactors,
  ContactFilters,
  Segment,
  ContactList,
  ImportMapping,
  BulkAction,
} from './types';

export {
  MARKETS,
  SOURCE_COLORS,
  CHANNEL_CLOSE_RATES,
  LEAD_TYPE_MULTIPLIERS,
  URGENCY_MULTIPLIERS,
  DEFAULT_SEGMENTS,
} from './types';

// Utilities
export {
  detectMarket,
  calculateELV,
  formatPhone,
  getContactName,
  getContactInitials,
  isReachable,
  daysSinceActivity,
  formatSourceName,
  exportToCSV,
  parseCSV,
  isValidEmail,
  isValidPhone,
  getMarketByName,
  filterContacts,
} from './utils';

// Supabase integration (optional)
export {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
  bulkCreateContacts,
  bulkDeleteContacts,
  searchContacts,
  getContactStats,
} from './supabase';
