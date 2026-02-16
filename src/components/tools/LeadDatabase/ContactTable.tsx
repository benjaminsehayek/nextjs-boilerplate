'use client';

import { useState } from 'react';
import type { Contact, ContactSource, MarketName, BulkAction } from './types';
import { SOURCE_COLORS, MARKETS } from './types';
import {
  formatPhone,
  getContactName,
  getContactInitials,
  formatSourceName,
  exportToCSV,
} from './utils';

interface ContactTableProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  onBulkAction?: (action: BulkAction, contactIds: string[]) => void;
}

export default function ContactTable({
  contacts,
  onContactClick,
  onBulkAction,
}: ContactTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Contact>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSort = (field: keyof Contact) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleBulkExport = () => {
    const selected = contacts.filter((c) => selectedIds.has(c.id));
    exportToCSV(selected, `contacts-export-${Date.now()}.csv`);
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getMarketColor = (marketName?: MarketName) => {
    if (!marketName) return '#BFB5AC';
    const market = MARKETS.find((m) => m.name === marketName);
    return market?.color || '#BFB5AC';
  };

  return (
    <div className="card">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-char-700 border-b border-char-600 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-ash-300">
            {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''}{' '}
            selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkExport}
              className="btn-ghost text-xs px-3 py-1"
            >
              Export
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    `Delete ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}?`
                  )
                ) {
                  onBulkAction?.(
                    { type: 'delete' },
                    Array.from(selectedIds)
                  );
                  setSelectedIds(new Set());
                }
              }}
              className="btn-ghost text-xs px-3 py-1 text-danger hover:bg-danger/10"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-char-700 bg-char-800">
              <th className="p-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === contacts.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th
                className="p-3 text-left text-xs font-display uppercase text-ash-400 cursor-pointer hover:text-flame-500"
                onClick={() => handleSort('firstName')}
              >
                Contact {sortField === 'firstName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="p-3 text-left text-xs font-display uppercase text-ash-400 cursor-pointer hover:text-flame-500"
                onClick={() => handleSort('source')}
              >
                Source {sortField === 'source' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="p-3 text-left text-xs font-display uppercase text-ash-400 cursor-pointer hover:text-flame-500"
                onClick={() => handleSort('marketName')}
              >
                Market {sortField === 'marketName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="p-3 text-left text-xs font-display uppercase text-ash-400 cursor-pointer hover:text-flame-500"
                onClick={() => handleSort('elv')}
              >
                ELV {sortField === 'elv' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                Contact Info
              </th>
              <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                Opt-Ins
              </th>
              <th
                className="p-3 text-left text-xs font-display uppercase text-ash-400 cursor-pointer hover:text-flame-500"
                onClick={() => handleSort('createdAt')}
              >
                Created {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedContacts.map((contact) => (
              <tr
                key={contact.id}
                className="border-b border-char-700 hover:bg-char-700/50 cursor-pointer transition-colors"
                onClick={() => onContactClick(contact)}
              >
                <td
                  className="p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => handleSelectOne(contact.id)}
                    className="rounded"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full bg-flame-500/20 flex items-center justify-center text-xs font-display text-flame-500"
                    >
                      {getContactInitials(contact)}
                    </div>
                    <div>
                      <div className="font-medium text-ash-100">
                        {getContactName(contact)}
                      </div>
                      {contact.company && (
                        <div className="text-xs text-ash-500">
                          {contact.company}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${SOURCE_COLORS[contact.source]}20`,
                      color: SOURCE_COLORS[contact.source],
                    }}
                  >
                    {formatSourceName(contact.source)}
                  </span>
                </td>
                <td className="p-3">
                  {contact.marketName && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${getMarketColor(contact.marketName)}20`,
                        color: getMarketColor(contact.marketName),
                      }}
                    >
                      {MARKETS.find((m) => m.name === contact.marketName)
                        ?.displayName || contact.marketName}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className="font-display text-flame-500">
                    ${contact.elv.toLocaleString()}
                  </span>
                </td>
                <td className="p-3">
                  <div className="text-sm space-y-1">
                    {contact.email && (
                      <div className="text-ash-300 flex items-center gap-1">
                        <span className="text-xs">📧</span>
                        <span className="truncate max-w-[200px]">
                          {contact.email}
                        </span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="text-ash-300 flex items-center gap-1">
                        <span className="text-xs">📱</span>
                        {formatPhone(contact.phone)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {contact.emailOptIn && (
                      <span className="text-xs" title="Email Opted In">
                        📧
                      </span>
                    )}
                    {contact.smsOptIn && (
                      <span className="text-xs" title="SMS Opted In">
                        💬
                      </span>
                    )}
                    {!contact.emailOptIn && !contact.smsOptIn && (
                      <span className="text-ash-500 text-xs">—</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-sm text-ash-400">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {contacts.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-ash-400">No contacts found</p>
        </div>
      )}

      {/* Footer */}
      {contacts.length > 0 && (
        <div className="border-t border-char-700 px-4 py-3 text-sm text-ash-500 text-center">
          Showing {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
