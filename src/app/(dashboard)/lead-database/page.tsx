'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { useAuth } from '@/lib/context/AuthContext';
import { useLocations } from '@/lib/hooks/useLocations';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ContactTable from '@/components/tools/LeadDatabase/ContactTable';
import ContactDetail from '@/components/tools/LeadDatabase/ContactDetail';
import AddContact from '@/components/tools/LeadDatabase/AddContact';
import ImportModal from '@/components/tools/LeadDatabase/ImportModal';
import MarketManager from '@/components/tools/LeadDatabase/MarketManager';
import Sidebar from '@/components/tools/LeadDatabase/Sidebar';
import type {
  Contact,
  ContactFilters,
  Segment,
  ContactList,
  BulkAction,
} from '@/components/tools/LeadDatabase/types';
import { DEFAULT_SEGMENTS } from '@/components/tools/LeadDatabase/types';
import { filterContacts, exportToCSV, daysSinceActivity, isReachable } from '@/components/tools/LeadDatabase/utils';

// ---------------------------------------------------------------------------
// ELV multipliers by status
// ---------------------------------------------------------------------------
const ELV_MULTIPLIERS: Record<string, number> = {
  customer: 3.0,
  prospect: 1.5,
  lead: 1.0,
  inactive: 0.3,
};

function getElvMultiplier(status: string): number {
  return ELV_MULTIPLIERS[status] ?? 1.0;
}

// ---------------------------------------------------------------------------
// DB ↔ UI mapping helpers
// ---------------------------------------------------------------------------
function fromDbRow(row: any): Contact {
  const estimatedValue = row.elv_score ?? 0; // DB column is elv_score, not estimated_value
  const status = row.status ?? 'lead';
  const elv = estimatedValue * getElvMultiplier(status);

  return {
    id: row.id,
    // businessId lives only in DB; not on the UI Contact type
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    zip: row.zip ?? undefined,
    marketId: row.market_id ?? undefined,
    source: row.source ?? 'other',
    status: (status as Contact['status']) ?? 'lead',
    // DB has no leadType / urgency / marketName — leave undefined
    tags: row.tags ?? [],
    lists: [],
    notes: row.notes ?? undefined,
    notesHistory: row.notes_history ?? [],
    elv,
    emailOptIn: row.opted_email ?? true,
    smsOptIn: row.opted_sms ?? false,
    unsubscribedEmail: row.unsub_email ?? false,
    unsubscribedSMS: row.unsub_sms ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toDbInsert(contact: Partial<Contact>, businessId: string) {
  return {
    business_id: businessId,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    address: contact.address,
    city: contact.city,
    state: contact.state,
    zip: contact.zip,
    market_id: contact.marketId,
    source: contact.source ?? 'manual',
    status: 'lead',
    tags: contact.tags ?? [],
    notes: contact.notes,
    elv_score: contact.elv ?? 0, // DB column is elv_score
    opted_email: contact.emailOptIn ?? true,
    opted_sms: contact.smsOptIn ?? false,
    unsub_email: contact.unsubscribedEmail ?? false,
    unsub_sms: contact.unsubscribedSMS ?? false,
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function LeadDatabasePage() {
  const { user, business, loading: authLoading } = useAuth();
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);
  const { toast } = useToast();
  const supabase = createClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [filters, setFilters] = useState<ContactFilters>({});
  const [segments, setSegments] = useState<Segment[]>(DEFAULT_SEGMENTS);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showMarketManager, setShowMarketManager] = useState(false);
  const [activeView, setActiveView] = useState<'all' | 'segment' | 'list'>('all');
  const [dataLoading, setDataLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // B9-08: Pipeline Kanban view
  const [pipelineView, setPipelineView] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // B5-08: Duplicate detection state
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Contact[][]>([]);
  const [mergingGroupIndex, setMergingGroupIndex] = useState<number | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contacts when auth is ready and business is available
  useEffect(() => {
    if (!authLoading && business?.id) {
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, business?.id]);

  // Apply filters whenever contacts or filters change
  useEffect(() => {
    const filtered = filterContacts(contacts, filters);
    setFilteredContacts(filtered);
    updateSegmentCounts(contacts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, filters]);

  const loadContacts = async () => {
    if (!business?.id) return;
    setDataLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('contacts')
        .select('*')
        .eq('business_id', business.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setContacts((data ?? []).map(fromDbRow));
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
      setError('Failed to load contacts. Please refresh and try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddContact = async (contactData: Partial<Contact>) => {
    if (!business?.id) return;
    try {
      const { data, error: dbError } = await supabase
        .from('contacts')
        .insert(toDbInsert(contactData, business.id))
        .select()
        .single();

      if (dbError) throw dbError;
      setContacts((prev) => [fromDbRow(data), ...prev]);
      setShowAddContact(false);
      toast.success('Contact saved');
    } catch (err: any) {
      console.error('Failed to add contact:', err);
      toast.error('Failed to save contact');
    }
  };

  const handleEditContact = async (contactData: Partial<Contact>) => {
    if (!editingContact || !business?.id) return;
    try {
      // Build updated notes_history: prepend new entry if notes changed
      const prevNotes = editingContact.notes ?? '';
      const newNotes = contactData.notes ?? '';
      const existingHistory: Array<{ timestamp: string; content: string }> = editingContact.notesHistory ?? [];
      const updatedHistory =
        newNotes.trim() && newNotes !== prevNotes
          ? [{ timestamp: new Date().toISOString(), content: newNotes }, ...existingHistory]
          : existingHistory;

      const { data, error: dbError } = await supabase
        .from('contacts')
        .update({
          first_name: contactData.firstName,
          last_name: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          company: contactData.company,
          address: contactData.address,
          city: contactData.city,
          state: contactData.state,
          zip: contactData.zip,
          market_id: contactData.marketId,
          source: contactData.source,
          tags: contactData.tags,
          notes: contactData.notes,
          notes_history: updatedHistory,
          elv_score: contactData.elv, // DB column is elv_score
          opted_email: contactData.emailOptIn,
          opted_sms: contactData.smsOptIn,
          unsub_email: contactData.unsubscribedEmail,
          unsub_sms: contactData.unsubscribedSMS,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingContact.id)
        .select()
        .single();

      if (dbError) throw dbError;
      setContacts((prev) =>
        prev.map((c) => (c.id === editingContact.id ? fromDbRow(data) : c))
      );
      setEditingContact(null);
      toast.success('Contact saved');
    } catch (err: any) {
      console.error('Failed to update contact:', err);
      toast.error('Failed to save contact');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!business?.id) return;
    try {
      const { error: dbError } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', contactId)
        .eq('business_id', business.id);

      if (dbError) throw dbError;
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      if (selectedContact?.id === contactId) setSelectedContact(null);
      toast.success('Contact deleted');
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
      toast.error('Failed to delete contact');
    }
  };

  const handleImport = async (importedContacts: Partial<Contact>[]) => {
    if (!business?.id) return;
    setError(null);
    setImportLoading(true);

    // Build set of existing emails and phones to skip duplicates
    const existingEmails = new Set(
      contacts.map((c) => c.email?.toLowerCase().trim()).filter(Boolean)
    );
    const existingPhones = new Set(
      contacts.map((c) => c.phone?.replace(/\D/g, '')).filter(Boolean)
    );

    const newRows = importedContacts
      .filter((c) => {
        const emailKey = c.email?.toLowerCase().trim();
        const phoneKey = c.phone?.replace(/\D/g, '');
        if (emailKey && existingEmails.has(emailKey)) return false;
        if (phoneKey && phoneKey.length >= 7 && existingPhones.has(phoneKey)) return false;
        return true;
      })
      .map((c) => toDbInsert(c, business.id));

    if (newRows.length === 0) {
      toast.info('All contacts in this file already exist — no new contacts were imported.');
      setImportLoading(false);
      setShowImport(false);
      return;
    }

    // B14-14: Enforce per-business contact limit
    const CONTACT_LIMIT = 50_000;
    const { count: currentCount } = await (supabase as any)
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .is('deleted_at', null);
    if (typeof currentCount === 'number' && currentCount + newRows.length > CONTACT_LIMIT) {
      const available = Math.max(0, CONTACT_LIMIT - currentCount);
      toast.error(`Import would exceed the ${CONTACT_LIMIT.toLocaleString()} contact limit. You have room for ${available.toLocaleString()} more contacts.`);
      setImportLoading(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('contacts')
        .insert(newRows)
        .select();

      if (dbError) throw dbError;
      const inserted = (data ?? []).map(fromDbRow);
      setContacts((prev) => [...inserted, ...prev]);
      toast.success(`${inserted.length} contact${inserted.length !== 1 ? 's' : ''} imported successfully`);
      setShowImport(false);
    } catch (err: any) {
      console.error('Failed to import contacts:', err);
      setError('Failed to import contacts. Please try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleBulkAction = async (action: BulkAction, contactIds: string[]) => {
    if (action.type === 'delete') {
      if (!business?.id) return;
      try {
        const now = new Date().toISOString();
        // Soft-delete each selected contact
        const { error: dbError } = await supabase
          .from('contacts')
          .update({ deleted_at: now })
          .in('id', contactIds)
          .eq('business_id', business.id);

        if (dbError) throw dbError;
        setContacts((prev) => prev.filter((c) => !contactIds.includes(c.id)));
        toast.success(`${contactIds.length} contact${contactIds.length !== 1 ? 's' : ''} deleted`);
      } catch (err: any) {
        console.error('Failed to bulk delete contacts:', err);
        toast.error('Failed to delete contacts');
      }
    } else if (action.type === 'export') {
      const selected = contacts.filter((c) => contactIds.includes(c.id));
      exportToCSV(selected, `contacts-export-${Date.now()}.csv`);
    }
  };

  const updateSegmentCounts = (allContacts: Contact[]) => {
    const updated = segments.map((segment) => {
      let count = 0;

      switch (segment.id) {
        case 'email-opted':
          count = allContacts.filter((c) => c.emailOptIn).length;
          break;
        case 'sms-opted':
          count = allContacts.filter((c) => c.smsOptIn).length;
          break;
        case 'high-value':
          count = allContacts.filter((c) => c.elv > 500).length;
          break;
        case 'unreachable':
          count = allContacts.filter((c) => !isReachable(c)).length;
          break;
        case 'cold':
          count = allContacts.filter((c) => {
            const days = daysSinceActivity(c);
            return days === null || days > 30;
          }).length;
          break;
        case 'hot':
          count = allContacts.filter((c) => {
            const days = daysSinceActivity(c);
            return days !== null && days <= 7;
          }).length;
          break;
      }

      return { ...segment, count };
    });

    setSegments(updated);
  };

  const handleSegmentClick = (segment: Segment) => {
    setFilters(segment.filter);
    setActiveView('segment');
  };

  const handleListClick = (list: ContactList) => {
    setFilters({ lists: [list.id] });
    setActiveView('list');
  };

  const handleCreateList = () => {
    // Contact lists are not yet persisted to the database.
    // Replacing prompt() with a notice to avoid data loss on refresh.
    toast.info('Contact lists are not yet saved between sessions. Use tags for persistent grouping.');
  };

  // ---------------------------------------------------------------------------
  // B5-08: Duplicate detection + merge
  // ---------------------------------------------------------------------------

  const findDuplicates = useCallback(() => {
    // Group by normalized email (lowercase, trimmed)
    const emailGroups = new Map<string, Contact[]>();
    for (const c of contacts) {
      if (c.email) {
        const key = c.email.toLowerCase().trim();
        if (!emailGroups.has(key)) emailGroups.set(key, []);
        emailGroups.get(key)!.push(c);
      }
    }

    // Group by normalized phone (digits only, at least 7 digits)
    const phoneGroups = new Map<string, Contact[]>();
    for (const c of contacts) {
      if (c.phone) {
        const key = c.phone.replace(/\D/g, '');
        if (key.length >= 7) {
          if (!phoneGroups.has(key)) phoneGroups.set(key, []);
          phoneGroups.get(key)!.push(c);
        }
      }
    }

    // Collect groups with 2+ contacts; dedupe across email/phone groups by sorted id tuple
    const seenKeys = new Set<string>();
    const groups: Contact[][] = [];

    for (const group of [...emailGroups.values(), ...phoneGroups.values()]) {
      if (group.length < 2) continue;
      const key = group
        .map((c) => c.id)
        .sort()
        .join('|');
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      groups.push(group);
    }

    setDuplicateGroups(groups);
    setShowDuplicates(true);
    setMergingGroupIndex(null);
  }, [contacts]);

  const handleMerge = useCallback(
    async (groupIndex: number) => {
      const group = duplicateGroups[groupIndex];
      if (!group || group.length < 2) return;

      setMergeLoading(true);

      try {
        // Keep the most recently created contact; remove the rest
        const sorted = [...group].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const keeper = sorted[0];
        const toDelete = sorted.slice(1);
        const deleteIds = toDelete.map((c) => c.id);

        // Merge notes: combine all non-empty notes with separator
        const allNotes = group
          .map((c) => c.notes)
          .filter((n): n is string => Boolean(n));
        const mergedNotes = allNotes.length > 0 ? allNotes.join('\n---\n') : undefined;

        // Merge tags: union of all tag arrays
        const allTags = group.flatMap((c) => c.tags ?? []);
        const mergedTags = Array.from(new Set(allTags));

        const now = new Date().toISOString();

        // Update the keeper with merged notes + tags
        const { data: updatedRow, error: updateError } = await supabase
          .from('contacts')
          .update({
            notes: mergedNotes,
            tags: mergedTags,
            updated_at: now,
          })
          .eq('id', keeper.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Soft-delete the older duplicates
        const { error: deleteError } = await supabase
          .from('contacts')
          .update({ deleted_at: now })
          .in('id', deleteIds)
          .eq('business_id', business!.id);

        if (deleteError) throw deleteError;

        // Update local state
        setContacts((prev) =>
          prev
            .filter((c) => !deleteIds.includes(c.id))
            .map((c) => (c.id === keeper.id ? fromDbRow(updatedRow) : c))
        );

        // Remove this group from duplicate groups list
        setDuplicateGroups((prev) => prev.filter((_, i) => i !== groupIndex));
        setMergingGroupIndex(null);
        toast.success('Contacts merged');
      } catch (err: any) {
        console.error('Failed to merge contacts:', err);
        toast.error('Failed to merge contacts');
      } finally {
        setMergeLoading(false);
      }
    },
    [duplicateGroups, supabase]
  );

  // ---------------------------------------------------------------------------
  // Auth guard (follows project pattern)
  // ---------------------------------------------------------------------------

  if (authLoading) {
    return (
      <ToolGate tool="lead-database">
        <ToolPageShell
          icon="👥"
          name="Lead Database"
          description="CRM with Estimated Lead Value scoring"
        >
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
          </div>
        </ToolPageShell>
      </ToolGate>
    );
  }

  if (!user) return null;

  // ---------------------------------------------------------------------------
  // Duplicate panel view
  // ---------------------------------------------------------------------------

  if (showDuplicates) {
    return (
      <ToolGate tool="lead-database">
        <ToolPageShell
          icon="👥"
          name="Lead Database"
          description="CRM with Estimated Lead Value scoring"
        >
          <div className="flex flex-col gap-4">
            {error && (
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-btn">
                {error}
              </div>
            )}

            <div className="card p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display text-ash-200">Duplicate Contacts</h2>
                <p className="text-sm text-ash-400 mt-0.5">
                  {duplicateGroups.length === 0
                    ? 'No duplicates found'
                    : `${duplicateGroups.length} duplicate group${duplicateGroups.length !== 1 ? 's' : ''} found`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDuplicates(false);
                  setMergingGroupIndex(null);
                }}
                className="btn-secondary text-sm"
              >
                Done — Back to Contacts
              </button>
            </div>

            {duplicateGroups.length === 0 && (
              <div className="card p-8 text-center text-ash-400">
                All duplicates have been merged. No more duplicate groups.
              </div>
            )}

            {duplicateGroups.map((group, groupIndex) => {
              const isMerging = mergingGroupIndex === groupIndex;
              // Determine match reason
              const emailMatch =
                group[0].email &&
                group.every(
                  (c) => c.email?.toLowerCase().trim() === group[0].email?.toLowerCase().trim()
                );
              const matchReason = emailMatch ? 'same email' : 'same phone';
              const displayName = `${group[0].firstName} ${group[0].lastName}`.trim() || group[0].email || 'Unknown';

              return (
                <div key={groupIndex} className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-ash-200">{displayName}</span>
                      <span className="ml-2 text-sm text-ash-400">
                        — {group.length} contacts ({matchReason})
                      </span>
                    </div>
                    {!isMerging ? (
                      <button
                        onClick={() => setMergingGroupIndex(groupIndex)}
                        className="btn-ghost text-sm"
                      >
                        Merge
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ash-400">Keep newest, merge notes + tags, delete older?</span>
                        <button
                          onClick={() => handleMerge(groupIndex)}
                          disabled={mergeLoading}
                          className="btn-primary text-sm"
                        >
                          {mergeLoading ? 'Merging...' : 'Confirm Merge'}
                        </button>
                        <button
                          onClick={() => setMergingGroupIndex(null)}
                          className="btn-ghost text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {group.map((contact, contactIndex) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-3 rounded bg-char-800 border border-char-700 text-sm"
                      >
                        {contactIndex === 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-flame-500/15 text-flame-400 font-medium whitespace-nowrap">
                            Newest
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ash-700/30 text-ash-500 font-medium whitespace-nowrap">
                            Older
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-ash-200">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.email && (
                            <span className="ml-2 text-ash-400">{contact.email}</span>
                          )}
                          {contact.phone && (
                            <span className="ml-2 text-ash-400">{contact.phone}</span>
                          )}
                        </div>
                        <span className="text-ash-500 text-xs whitespace-nowrap">
                          Added {new Date(contact.createdAt).toLocaleDateString()}
                        </span>
                        {contact.notes && (
                          <span className="text-ash-500 text-xs">has notes</span>
                        )}
                        {(contact.tags?.length ?? 0) > 0 && (
                          <span className="text-ash-500 text-xs">
                            {contact.tags!.length} tag{contact.tags!.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ToolPageShell>
      </ToolGate>
    );
  }

  // ---------------------------------------------------------------------------
  // Main contact list view
  // ---------------------------------------------------------------------------

  return (
    <ToolGate tool="lead-database">
      <ToolPageShell
        icon="👥"
        name="Lead Database"
        description="CRM with Estimated Lead Value scoring"
      >
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={selectLocation}
          showAllOption={true}
        />

        {error && (
          <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-btn">
            {error}
          </div>
        )}

        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <Sidebar
            filters={filters}
            onFiltersChange={setFilters}
            segments={segments}
            lists={lists}
            onSegmentClick={handleSegmentClick}
            onListClick={handleListClick}
            onCreateList={handleCreateList}
            activeView={activeView}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Toolbar */}
            <div className="card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-display text-ash-200">
                    {activeView === 'all' && 'All Contacts'}
                    {activeView === 'segment' && 'Segment View'}
                    {activeView === 'list' && 'List View'}
                  </h2>
                  <span className="text-sm text-ash-500">
                    ({filteredContacts.length})
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* B9-08: Pipeline toggle */}
                  <button
                    onClick={() => setPipelineView((v) => !v)}
                    className={`btn-ghost text-sm ${pipelineView ? 'text-flame-500' : ''}`}
                  >
                    Pipeline
                  </button>
                  {/* B5-08: Find Duplicates button */}
                  <button
                    onClick={findDuplicates}
                    className="btn-ghost text-sm"
                  >
                    Find Duplicates
                  </button>
                  <button
                    onClick={() => setShowMarketManager(true)}
                    className="btn-ghost text-sm"
                  >
                    🗺️ Markets
                  </button>
                  <button
                    onClick={() => setShowImport(true)}
                    className="btn-secondary text-sm"
                  >
                    📥 Import CSV
                  </button>
                  <button
                    onClick={() => {
                      setEditingContact(null);
                      setShowAddContact(true);
                    }}
                    className="btn-primary text-sm"
                  >
                    + Add Contact
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="spinner" />
              </div>
            ) : contacts.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No contacts yet"
                description="Import a CSV or add contacts manually."
                ctaLabel="Add Contact"
                ctaOnClick={() => {
                  setEditingContact(null);
                  setShowAddContact(true);
                }}
              />
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="card p-4">
                    <div className="text-xs font-display uppercase text-ash-400 mb-1">
                      Total Contacts
                    </div>
                    <div className="text-2xl font-display text-flame-500">
                      {contacts.length}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs font-display uppercase text-ash-400 mb-1">
                      Total ELV
                    </div>
                    <div className="text-2xl font-display text-success">
                      ${contacts.reduce((sum, c) => sum + c.elv, 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs font-display uppercase text-ash-400 mb-1">
                      Email Opted In
                    </div>
                    <div className="text-2xl font-display text-info">
                      {contacts.filter((c) => c.emailOptIn).length}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs font-display uppercase text-ash-400 mb-1">
                      Avg ELV
                    </div>
                    <div className="text-2xl font-display text-ember-500">
                      $
                      {contacts.length > 0
                        ? Math.round(
                            contacts.reduce((sum, c) => sum + c.elv, 0) /
                              contacts.length
                          ).toLocaleString()
                        : 0}
                    </div>
                  </div>
                </div>

                {/* Pipeline Kanban or Table */}
                {pipelineView ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {(['lead', 'prospect', 'customer', 'inactive'] as const).map((col) => {
                      const colContacts = filteredContacts.filter((c) => (c.status ?? 'lead') === col);
                      const isDragOver = dragOverColumn === col;
                      return (
                        <div
                          key={col}
                          className={`flex-shrink-0 w-64 flex flex-col gap-2 rounded-btn p-3 border-2 transition-colors ${
                            isDragOver
                              ? 'border-dashed border-char-700 bg-char-800/60'
                              : 'border-transparent bg-char-800'
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col); }}
                          onDragLeave={() => setDragOverColumn(null)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setDragOverColumn(null);
                            if (!draggingId || !business?.id) return;
                            const oldContact = contacts.find((c) => c.id === draggingId);
                            if (!oldContact || oldContact.status === col) return;
                            const previousStatus = oldContact.status;
                            const draggedId = draggingId;
                            // Optimistic update
                            setContacts((prev) =>
                              prev.map((c) => c.id === draggedId ? { ...c, status: col } : c)
                            );
                            setDraggingId(null);
                            const { error: dragError } = await supabase
                              .from('contacts')
                              .update({ status: col })
                              .eq('id', draggedId)
                              .eq('business_id', business.id);
                            if (dragError) {
                              // Roll back optimistic update
                              setContacts((prev) =>
                                prev.map((c) => c.id === draggedId ? { ...c, status: previousStatus } : c)
                              );
                              toast.error('Failed to update contact status');
                            }
                          }}
                        >
                          {/* Column header */}
                          <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-sm font-display text-ash-200 capitalize">{col}</span>
                            <span className="text-xs bg-char-700 text-ash-400 rounded-full px-2 py-0.5">
                              {colContacts.length}
                            </span>
                          </div>
                          {/* Cards */}
                          {colContacts.map((contact) => (
                            <div
                              key={contact.id}
                              draggable
                              onDragStart={() => setDraggingId(contact.id)}
                              onDragEnd={() => setDraggingId(null)}
                              className="card p-3 cursor-grab active:cursor-grabbing space-y-1"
                            >
                              <div className="text-sm font-medium text-ash-100">
                                {contact.firstName} {contact.lastName}
                              </div>
                              {contact.company && (
                                <div className="text-xs text-ash-500">{contact.company}</div>
                              )}
                              <div className="text-xs text-flame-500 font-display">
                                ELV ${contact.elv.toLocaleString()}
                              </div>
                            </div>
                          ))}
                          {colContacts.length === 0 && (
                            <div className="text-xs text-ash-600 text-center py-4 border border-dashed border-char-700 rounded-btn">
                              Drop here
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden">
                    <ErrorBoundary fallbackLabel="Contacts table failed to render">
                      <ContactTable
                        contacts={filteredContacts}
                        onContactClick={setSelectedContact}
                        onBulkAction={handleBulkAction}
                      />
                    </ErrorBoundary>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {selectedContact && (
          <ContactDetail
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            onEdit={(contact) => {
              setSelectedContact(null);
              setEditingContact(contact);
            }}
            onDelete={handleDeleteContact}
          />
        )}

        {showAddContact && !editingContact && (
          <AddContact
            onSave={handleAddContact}
            onCancel={() => setShowAddContact(false)}
          />
        )}

        {editingContact && (
          <AddContact
            contact={editingContact}
            onSave={handleEditContact}
            onCancel={() => setEditingContact(null)}
          />
        )}

        {showImport && (
          <ImportModal
            onImport={handleImport}
            onCancel={() => setShowImport(false)}
            importLoading={importLoading}
          />
        )}

        {showMarketManager && (
          <MarketManager onClose={() => setShowMarketManager(false)} />
        )}
      </ToolPageShell>
    </ToolGate>
  );
}
