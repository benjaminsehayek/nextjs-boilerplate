// Supabase Integration for Lead Database
// This file provides functions to interact with Supabase for contact storage

import { createClient } from '@/lib/supabase/client';
import type { Contact } from './types';

/**
 * Suggested Supabase Schema:
 *
 * CREATE TABLE contacts (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *
 *   -- Basic Info
 *   first_name TEXT,
 *   last_name TEXT,
 *   email TEXT,
 *   phone TEXT,
 *   company TEXT,
 *
 *   -- Address
 *   address TEXT,
 *   city TEXT,
 *   state TEXT,
 *   zip TEXT,
 *
 *   -- Lead Details
 *   source TEXT NOT NULL,
 *   lead_type TEXT,
 *   urgency TEXT,
 *   market_id TEXT,
 *   market_name TEXT,
 *
 *   -- ELV
 *   elv INTEGER DEFAULT 0,
 *   elv_factors JSONB,
 *
 *   -- Engagement
 *   email_opt_in BOOLEAN DEFAULT false,
 *   sms_opt_in BOOLEAN DEFAULT false,
 *   unsubscribed_email BOOLEAN DEFAULT false,
 *   unsubscribed_sms BOOLEAN DEFAULT false,
 *   last_contacted TIMESTAMPTZ,
 *
 *   -- Organization
 *   tags TEXT[] DEFAULT '{}',
 *   lists TEXT[] DEFAULT '{}',
 *   notes TEXT,
 *
 *   -- Attribution
 *   campaign_name TEXT,
 *   ad_group TEXT,
 *   keyword TEXT,
 *   geo_target TEXT,
 *
 *   -- Custom Fields
 *   custom_fields JSONB DEFAULT '{}',
 *
 *   -- Timestamps
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   last_activity TIMESTAMPTZ
 * );
 *
 * -- Indexes
 * CREATE INDEX idx_contacts_user_id ON contacts(user_id);
 * CREATE INDEX idx_contacts_email ON contacts(email);
 * CREATE INDEX idx_contacts_phone ON contacts(phone);
 * CREATE INDEX idx_contacts_source ON contacts(source);
 * CREATE INDEX idx_contacts_market_name ON contacts(market_name);
 * CREATE INDEX idx_contacts_elv ON contacts(elv);
 * CREATE INDEX idx_contacts_created_at ON contacts(created_at);
 *
 * -- RLS Policies
 * ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can view their own contacts"
 *   ON contacts FOR SELECT
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can insert their own contacts"
 *   ON contacts FOR INSERT
 *   WITH CHECK (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can update their own contacts"
 *   ON contacts FOR UPDATE
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can delete their own contacts"
 *   ON contacts FOR DELETE
 *   USING (auth.uid() = user_id);
 */

// Convert Contact type to database format
function toDbFormat(contact: Partial<Contact>): any {
  return {
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    address: contact.address,
    city: contact.city,
    state: contact.state,
    zip: contact.zip,
    source: contact.source,
    lead_type: contact.leadType,
    urgency: contact.urgency,
    market_id: contact.marketId,
    market_name: contact.marketName,
    elv: contact.elv,
    elv_factors: contact.elvFactors,
    email_opt_in: contact.emailOptIn,
    sms_opt_in: contact.smsOptIn,
    unsubscribed_email: contact.unsubscribedEmail,
    unsubscribed_sms: contact.unsubscribedSMS,
    last_contacted: contact.lastContacted,
    tags: contact.tags,
    lists: contact.lists,
    notes: contact.notes,
    campaign_name: contact.campaignName,
    ad_group: contact.adGroup,
    keyword: contact.keyword,
    geo_target: contact.geoTarget,
    custom_fields: contact.customFields,
    last_activity: contact.lastActivity,
    updated_at: new Date().toISOString(),
  };
}

// Convert database format to Contact type
function fromDbFormat(row: any): Contact {
  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email,
    phone: row.phone,
    company: row.company,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    source: row.source,
    leadType: row.lead_type,
    urgency: row.urgency,
    marketId: row.market_id,
    marketName: row.market_name,
    elv: row.elv || 0,
    elvFactors: row.elv_factors,
    emailOptIn: row.email_opt_in || false,
    smsOptIn: row.sms_opt_in || false,
    unsubscribedEmail: row.unsubscribed_email,
    unsubscribedSMS: row.unsubscribed_sms,
    lastContacted: row.last_contacted,
    tags: row.tags || [],
    lists: row.lists || [],
    notes: row.notes,
    campaignName: row.campaign_name,
    adGroup: row.ad_group,
    keyword: row.keyword,
    geoTarget: row.geo_target,
    customFields: row.custom_fields,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivity: row.last_activity,
  };
}

/**
 * Fetch all contacts for the current user
 */
export async function fetchContacts(): Promise<Contact[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }

  return data.map(fromDbFormat);
}

/**
 * Create a new contact
 */
export async function createContact(contact: Partial<Contact>): Promise<Contact> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const dbData = {
    ...toDbFormat(contact),
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('contacts')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    throw error;
  }

  return fromDbFormat(data);
}

/**
 * Update an existing contact
 */
export async function updateContact(
  id: string,
  updates: Partial<Contact>
): Promise<Contact> {
  const supabase = createClient();

  const dbData = toDbFormat(updates);

  const { data, error } = await supabase
    .from('contacts')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact:', error);
    throw error;
  }

  return fromDbFormat(data);
}

/**
 * Delete a contact
 */
export async function deleteContact(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
}

/**
 * Bulk create contacts (for imports)
 */
export async function bulkCreateContacts(
  contacts: Partial<Contact>[]
): Promise<Contact[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const dbData = contacts.map((contact) => ({
    ...toDbFormat(contact),
    user_id: user.id,
  }));

  const { data, error } = await supabase
    .from('contacts')
    .insert(dbData)
    .select();

  if (error) {
    console.error('Error bulk creating contacts:', error);
    throw error;
  }

  return data.map(fromDbFormat);
}

/**
 * Bulk delete contacts
 */
export async function bulkDeleteContacts(ids: string[]): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('contacts')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error bulk deleting contacts:', error);
    throw error;
  }
}

/**
 * Search contacts
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,company.ilike.%${query}%`
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching contacts:', error);
    throw error;
  }

  return data.map(fromDbFormat);
}

/**
 * Get contact statistics
 */
export async function getContactStats(): Promise<{
  totalContacts: number;
  totalElv: number;
  avgElv: number;
  emailOptedIn: number;
  smsOptedIn: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contacts')
    .select('elv, email_opt_in, sms_opt_in');

  if (error) {
    console.error('Error fetching contact stats:', error);
    throw error;
  }

  const totalElv = data.reduce((sum, c) => sum + (c.elv || 0), 0);
  const emailOptedIn = data.filter((c) => c.email_opt_in).length;
  const smsOptedIn = data.filter((c) => c.sms_opt_in).length;

  return {
    totalContacts: data.length,
    totalElv,
    avgElv: data.length > 0 ? Math.round(totalElv / data.length) : 0,
    emailOptedIn,
    smsOptedIn,
  };
}
