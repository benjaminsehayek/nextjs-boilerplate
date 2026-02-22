'use client';

import { useState, useMemo } from 'react';
import type { Channel, AudienceType } from '@/lib/marketing/types';
import type { Contact, Segment } from '@/components/tools/LeadDatabase/types';
import { filterEligibleContacts } from '@/lib/marketing/compliance';

interface AudienceSelectorProps {
  channel: Channel;
  contacts: Contact[];
  segments: Segment[];
  lists: string[];
  tags: string[];
  selectedType: AudienceType;
  selectedValue: string;
  onTypeChange: (type: AudienceType) => void;
  onValueChange: (value: string) => void;
}

interface AudienceOption {
  type: AudienceType;
  label: string;
  description: string;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { type: 'all', label: 'All Contacts', description: 'Send to every eligible contact' },
  { type: 'segment', label: 'By Segment', description: 'Target a saved segment' },
  { type: 'list', label: 'By List', description: 'Send to a specific list' },
  { type: 'tag', label: 'By Tag', description: 'Send to contacts with a tag' },
  { type: 'manual', label: 'Manual Selection', description: 'Pick contacts individually' },
];

export default function AudienceSelector({
  channel,
  contacts,
  segments,
  lists,
  tags,
  selectedType,
  selectedValue,
  onTypeChange,
  onValueChange,
}: AudienceSelectorProps) {
  const [manualSearch, setManualSearch] = useState('');

  // Parse manual selection as comma-separated contact IDs
  const manualSelectedIds = useMemo(() => {
    if (selectedType !== 'manual' || !selectedValue) return new Set<string>();
    return new Set(selectedValue.split(',').filter(Boolean));
  }, [selectedType, selectedValue]);

  // Resolve which contacts belong to the selected audience
  const audienceContacts = useMemo((): Contact[] => {
    switch (selectedType) {
      case 'all':
        return contacts;
      case 'segment': {
        const seg = segments.find((s) => s.id === selectedValue);
        if (!seg) return [];
        // Apply segment filters client-side
        return contacts.filter((c) => {
          const f = seg.filter;
          if (f.emailOptIn !== undefined && c.emailOptIn !== f.emailOptIn) return false;
          if (f.smsOptIn !== undefined && c.smsOptIn !== f.smsOptIn) return false;
          if (f.minElv !== undefined && c.elv < f.minElv) return false;
          if (f.maxElv !== undefined && c.elv > f.maxElv) return false;
          if (f.source && f.source.length > 0 && !f.source.includes(c.source)) return false;
          if (f.market && f.market.length > 0 && c.marketName && !f.market.includes(c.marketName)) return false;
          if (f.tags && f.tags.length > 0 && !f.tags.some((t) => c.tags.includes(t))) return false;
          if (f.lists && f.lists.length > 0 && !f.lists.some((l) => c.lists.includes(l))) return false;
          return true;
        });
      }
      case 'list':
        return selectedValue
          ? contacts.filter((c) => c.lists.includes(selectedValue))
          : [];
      case 'tag':
        return selectedValue
          ? contacts.filter((c) => c.tags.includes(selectedValue))
          : [];
      case 'manual':
        return contacts.filter((c) => manualSelectedIds.has(c.id));
      default:
        return [];
    }
  }, [selectedType, selectedValue, contacts, segments, manualSelectedIds]);

  // Run compliance filter on the resolved audience
  const { eligible, filtered, reasons } = useMemo(
    () => filterEligibleContacts(audienceContacts, channel),
    [audienceContacts, channel],
  );

  // Filtered contacts for manual search
  const filteredManualContacts = useMemo(() => {
    if (!manualSearch.trim()) return contacts;
    const q = manualSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)),
    );
  }, [contacts, manualSearch]);

  const handleManualToggle = (contactId: string) => {
    const next = new Set(manualSelectedIds);
    if (next.has(contactId)) {
      next.delete(contactId);
    } else {
      next.add(contactId);
    }
    onValueChange(Array.from(next).join(','));
  };

  return (
    <div className="space-y-6">
      {/* Radio Group */}
      <div>
        <label className="input-label">Audience</label>
        <div className="space-y-2">
          {AUDIENCE_OPTIONS.map((opt) => (
            <label
              key={opt.type}
              className={`flex items-start gap-3 p-3 rounded-btn border cursor-pointer transition-colors ${
                selectedType === opt.type
                  ? 'border-flame-500 bg-flame-500/5'
                  : 'border-char-700 bg-char-900 hover:border-char-600'
              }`}
            >
              <input
                type="radio"
                name="audience-type"
                value={opt.type}
                checked={selectedType === opt.type}
                onChange={() => {
                  onTypeChange(opt.type);
                  onValueChange('');
                }}
                className="mt-0.5 accent-flame-500"
              />
              <div>
                <div className="text-sm font-medium text-ash-100">{opt.label}</div>
                <div className="text-xs text-ash-500">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Value Selector: Segment */}
      {selectedType === 'segment' && (
        <div>
          <label className="input-label">Select Segment</label>
          <select
            value={selectedValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="input"
          >
            <option value="">-- Choose a segment --</option>
            {segments.map((seg) => (
              <option key={seg.id} value={seg.id}>
                {seg.icon} {seg.name} ({seg.count} contacts)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Value Selector: List */}
      {selectedType === 'list' && (
        <div>
          <label className="input-label">Select List</label>
          <select
            value={selectedValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="input"
          >
            <option value="">-- Choose a list --</option>
            {lists.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {lists.length === 0 && (
            <p className="text-xs text-ash-500 mt-1">No lists available. Create a list in your Lead Database first.</p>
          )}
        </div>
      )}

      {/* Value Selector: Tag */}
      {selectedType === 'tag' && (
        <div>
          <label className="input-label">Select Tag</label>
          <select
            value={selectedValue}
            onChange={(e) => onValueChange(e.target.value)}
            className="input"
          >
            <option value="">-- Choose a tag --</option>
            {tags.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {tags.length === 0 && (
            <p className="text-xs text-ash-500 mt-1">No tags found. Tag contacts in your Lead Database first.</p>
          )}
        </div>
      )}

      {/* Value Selector: Manual */}
      {selectedType === 'manual' && (
        <div>
          <label className="input-label">
            Select Contacts ({manualSelectedIds.size} selected)
          </label>
          <input
            type="text"
            placeholder="Search contacts..."
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
            className="input mb-3"
          />
          <div className="max-h-64 overflow-y-auto border border-char-700 rounded-btn bg-char-900">
            {filteredManualContacts.length === 0 ? (
              <div className="p-4 text-center text-sm text-ash-500">
                No contacts match your search
              </div>
            ) : (
              filteredManualContacts.map((contact) => (
                <label
                  key={contact.id}
                  className={`flex items-center gap-3 px-3 py-2 border-b border-char-700 last:border-b-0 cursor-pointer transition-colors ${
                    manualSelectedIds.has(contact.id)
                      ? 'bg-flame-500/5'
                      : 'hover:bg-char-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={manualSelectedIds.has(contact.id)}
                    onChange={() => handleManualToggle(contact.id)}
                    className="accent-flame-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ash-100 truncate">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="text-xs text-ash-500 truncate">
                      {channel === 'email' ? contact.email || 'No email' : contact.phone || 'No phone'}
                      {contact.company ? ` - ${contact.company}` : ''}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Recipient Count Preview */}
      <div className="rounded-btn border border-char-700 bg-char-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ash-300">Eligible recipients</span>
          <span className="text-lg font-display text-flame-500">
            {eligible.length}
          </span>
        </div>

        {audienceContacts.length > 0 && (
          <div className="h-2 rounded-full bg-char-700 overflow-hidden">
            <div
              className="h-full bg-flame-500 rounded-full transition-all duration-300"
              style={{
                width: `${audienceContacts.length > 0 ? (eligible.length / audienceContacts.length) * 100 : 0}%`,
              }}
            />
          </div>
        )}

        <div className="text-xs text-ash-500">
          {audienceContacts.length} in audience, {eligible.length} eligible for{' '}
          {channel === 'email' ? 'email' : 'SMS'}
        </div>

        {/* Filter Warnings */}
        {filtered > 0 && (
          <div className="rounded-btn border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {filtered} contact{filtered !== 1 ? 's' : ''} excluded
            </div>
            <ul className="space-y-0.5">
              {Object.entries(reasons).map(([reason, count]) => (
                <li key={reason} className="text-xs text-ash-400 pl-6">
                  {reason}: {count}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
