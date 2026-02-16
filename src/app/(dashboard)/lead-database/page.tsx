'use client';

import { useState, useEffect } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
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

export default function LeadDatabasePage() {
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
  const [loading, setLoading] = useState(true);

  // Load contacts from Supabase or localStorage
  useEffect(() => {
    loadContacts();
  }, []);

  // Apply filters whenever they change
  useEffect(() => {
    const filtered = filterContacts(contacts, filters);
    setFilteredContacts(filtered);
    updateSegmentCounts(contacts);
  }, [contacts, filters]);

  const loadContacts = async () => {
    try {
      // In production, this would fetch from Supabase
      // For now, use localStorage as demo storage
      const stored = localStorage.getItem('lead-database-contacts');
      if (stored) {
        const parsed = JSON.parse(stored);
        setContacts(parsed);
      } else {
        // Load demo data
        setContacts(getDemoContacts());
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveContacts = (newContacts: Contact[]) => {
    setContacts(newContacts);
    // Save to localStorage (in production, save to Supabase)
    localStorage.setItem('lead-database-contacts', JSON.stringify(newContacts));
  };

  const handleAddContact = (contactData: Partial<Contact>) => {
    const newContact: Contact = {
      id: crypto.randomUUID(),
      firstName: contactData.firstName || '',
      lastName: contactData.lastName || '',
      email: contactData.email,
      phone: contactData.phone,
      company: contactData.company,
      address: contactData.address,
      city: contactData.city,
      state: contactData.state,
      zip: contactData.zip,
      source: contactData.source || 'direct',
      leadType: contactData.leadType,
      urgency: contactData.urgency,
      marketId: contactData.marketId,
      marketName: contactData.marketName,
      elv: contactData.elv || 0,
      elvFactors: contactData.elvFactors,
      emailOptIn: contactData.emailOptIn || false,
      smsOptIn: contactData.smsOptIn || false,
      tags: contactData.tags || [],
      lists: contactData.lists || [],
      notes: contactData.notes,
      createdAt: contactData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      campaignName: contactData.campaignName,
      adGroup: contactData.adGroup,
      keyword: contactData.keyword,
      geoTarget: contactData.geoTarget,
    };

    saveContacts([...contacts, newContact]);
    setShowAddContact(false);
  };

  const handleEditContact = (contactData: Partial<Contact>) => {
    if (!editingContact) return;

    const updated = contacts.map((c) =>
      c.id === editingContact.id
        ? { ...c, ...contactData, updatedAt: new Date().toISOString() }
        : c
    );
    saveContacts(updated);
    setEditingContact(null);
  };

  const handleDeleteContact = (contactId: string) => {
    saveContacts(contacts.filter((c) => c.id !== contactId));
  };

  const handleImport = (importedContacts: Partial<Contact>[]) => {
    const newContacts: Contact[] = importedContacts.map((c) => ({
      id: crypto.randomUUID(),
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      email: c.email,
      phone: c.phone,
      company: c.company,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      source: c.source || 'other',
      leadType: c.leadType,
      urgency: c.urgency,
      marketId: c.marketId,
      marketName: c.marketName,
      elv: c.elv || 0,
      elvFactors: c.elvFactors,
      emailOptIn: c.emailOptIn || false,
      smsOptIn: c.smsOptIn || false,
      tags: c.tags || [],
      lists: c.lists || [],
      notes: c.notes,
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      campaignName: c.campaignName,
      adGroup: c.adGroup,
      keyword: c.keyword,
      geoTarget: c.geoTarget,
    }));

    saveContacts([...contacts, ...newContacts]);
    setShowImport(false);
  };

  const handleBulkAction = (action: BulkAction, contactIds: string[]) => {
    if (action.type === 'delete') {
      saveContacts(contacts.filter((c) => !contactIds.includes(c.id)));
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
    const name = prompt('Enter list name:');
    if (!name) return;

    const newList: ContactList = {
      id: crypto.randomUUID(),
      name,
      contactCount: 0,
      createdAt: new Date().toISOString(),
      color: '#FF5C1A',
    };

    setLists([...lists, newList]);
  };

  const getDemoContacts = (): Contact[] => {
    return [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '5035551234',
        company: 'Smith Plumbing',
        city: 'Portland',
        state: 'OR',
        zip: '97209',
        source: 'google_ads',
        leadType: 'emergency',
        urgency: 'urgent',
        marketName: 'portland_metro',
        elv: 850,
        emailOptIn: true,
        smsOptIn: true,
        tags: ['hot', 'qualified'],
        lists: [],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        keyword: 'emergency plumber portland',
        campaignName: 'Portland Emergency Services',
      },
      {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@example.com',
        phone: '3605554567',
        city: 'Vancouver',
        state: 'WA',
        source: 'organic_search',
        leadType: 'quote_request',
        urgency: 'flexible',
        marketName: 'sw_washington',
        elv: 425,
        emailOptIn: true,
        smsOptIn: false,
        tags: [],
        lists: [],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        firstName: 'Mike',
        lastName: 'Davis',
        phone: '5415552890',
        city: 'Bend',
        state: 'OR',
        source: 'referral',
        leadType: 'new_customer',
        urgency: 'soon',
        marketName: 'bend',
        elv: 675,
        emailOptIn: false,
        smsOptIn: true,
        tags: ['referral'],
        lists: [],
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  };

  if (loading) {
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

  return (
    <ToolGate tool="lead-database">
      <ToolPageShell
        icon="👥"
        name="Lead Database"
        description="CRM with Estimated Lead Value scoring"
      >
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

            {/* Table */}
            <div className="flex-1 overflow-hidden">
              <ContactTable
                contacts={filteredContacts}
                onContactClick={setSelectedContact}
                onBulkAction={handleBulkAction}
              />
            </div>
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
          />
        )}

        {showMarketManager && (
          <MarketManager onClose={() => setShowMarketManager(false)} />
        )}
      </ToolPageShell>
    </ToolGate>
  );
}
