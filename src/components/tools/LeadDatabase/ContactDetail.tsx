'use client';

import { useState } from 'react';
import type { Contact, ELVFactors } from './types';
import { SOURCE_COLORS, MARKETS } from './types';
import {
  formatPhone,
  getContactName,
  getContactInitials,
  formatSourceName,
  daysSinceActivity,
} from './utils';

interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

export default function ContactDetail({
  contact,
  onClose,
  onEdit,
  onDelete,
}: ContactDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'elv'>(
    'details'
  );

  const handleDelete = () => {
    if (confirm(`Delete ${getContactName(contact)}?`)) {
      onDelete(contact.id);
      onClose();
    }
  };

  const marketColor = MARKETS.find((m) => m.name === contact.marketName)?.color;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-char-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-flame-500/20 flex items-center justify-center text-xl font-display text-flame-500">
                {getContactInitials(contact)}
              </div>
              <div>
                <h2 className="text-2xl font-display text-ash-100">
                  {getContactName(contact)}
                </h2>
                {contact.company && (
                  <p className="text-ash-400">{contact.company}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${SOURCE_COLORS[contact.source]}20`,
                      color: SOURCE_COLORS[contact.source],
                    }}
                  >
                    {formatSourceName(contact.source)}
                  </span>
                  {contact.marketName && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${marketColor}20`,
                        color: marketColor,
                      }}
                    >
                      {MARKETS.find((m) => m.name === contact.marketName)
                        ?.displayName}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="btn-icon">
              ✕
            </button>
          </div>

          {/* ELV Score */}
          <div className="bg-char-700 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-display uppercase text-ash-400 mb-1">
                Expected Lead Value
              </div>
              <div className="text-3xl font-display text-gradient-flame">
                ${contact.elv.toLocaleString()}
              </div>
            </div>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="tag tag-flame"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-char-700">
          <div className="flex gap-1 px-6">
            {[
              { id: 'details', label: 'Details' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'elv', label: 'ELV Breakdown' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-display text-sm transition-all ${
                  activeTab === tab.id
                    ? 'border-b-2 border-flame-500 text-flame-500'
                    : 'text-ash-400 hover:text-ash-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {contact.email && (
                    <div>
                      <div className="text-xs text-ash-500 mb-1">Email</div>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-ash-200 hover:text-flame-500 flex items-center gap-2"
                      >
                        <span>📧</span>
                        {contact.email}
                      </a>
                      {contact.unsubscribedEmail && (
                        <span className="text-xs text-danger">
                          Unsubscribed
                        </span>
                      )}
                    </div>
                  )}
                  {contact.phone && (
                    <div>
                      <div className="text-xs text-ash-500 mb-1">Phone</div>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-ash-200 hover:text-flame-500 flex items-center gap-2"
                      >
                        <span>📱</span>
                        {formatPhone(contact.phone)}
                      </a>
                      {contact.unsubscribedSMS && (
                        <span className="text-xs text-danger">
                          Unsubscribed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {(contact.address || contact.city || contact.state || contact.zip) && (
                <div>
                  <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                    Address
                  </h3>
                  <div className="text-ash-200">
                    {contact.address && <div>{contact.address}</div>}
                    <div>
                      {contact.city && `${contact.city}, `}
                      {contact.state} {contact.zip}
                    </div>
                  </div>
                </div>
              )}

              {/* Lead Details */}
              <div>
                <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                  Lead Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {contact.leadType && (
                    <div>
                      <div className="text-xs text-ash-500 mb-1">
                        Lead Type
                      </div>
                      <div className="text-ash-200">
                        {contact.leadType.replace(/_/g, ' ')}
                      </div>
                    </div>
                  )}
                  {contact.urgency && (
                    <div>
                      <div className="text-xs text-ash-500 mb-1">Urgency</div>
                      <div className="text-ash-200 capitalize">
                        {contact.urgency}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign Attribution */}
              {(contact.campaignName || contact.adGroup || contact.keyword) && (
                <div>
                  <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                    Campaign Attribution
                  </h3>
                  <div className="space-y-2">
                    {contact.campaignName && (
                      <div>
                        <div className="text-xs text-ash-500 mb-1">
                          Campaign
                        </div>
                        <div className="text-ash-200">
                          {contact.campaignName}
                        </div>
                      </div>
                    )}
                    {contact.adGroup && (
                      <div>
                        <div className="text-xs text-ash-500 mb-1">
                          Ad Group
                        </div>
                        <div className="text-ash-200">{contact.adGroup}</div>
                      </div>
                    )}
                    {contact.keyword && (
                      <div>
                        <div className="text-xs text-ash-500 mb-1">
                          Keyword
                        </div>
                        <div className="text-ash-200">{contact.keyword}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Opt-Ins */}
              <div>
                <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                  Communication Preferences
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contact.emailOptIn}
                      readOnly
                      className="rounded"
                    />
                    <span className="text-ash-200">Email Opt-In</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contact.smsOptIn}
                      readOnly
                      className="rounded"
                    />
                    <span className="text-ash-200">SMS Opt-In</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              {contact.notes && (
                <div>
                  <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                    Notes
                  </h3>
                  <div className="text-ash-200 whitespace-pre-wrap">
                    {contact.notes}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-xs">
                  ✓
                </div>
                <div className="flex-1">
                  <div className="text-ash-200 font-medium">
                    Contact Created
                  </div>
                  <div className="text-sm text-ash-500">
                    {new Date(contact.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-ash-600 mt-1">
                    Added from {formatSourceName(contact.source)}
                  </div>
                </div>
              </div>

              {contact.lastActivity && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center text-xs">
                    📊
                  </div>
                  <div className="flex-1">
                    <div className="text-ash-200 font-medium">
                      Last Activity
                    </div>
                    <div className="text-sm text-ash-500">
                      {new Date(contact.lastActivity).toLocaleString()}
                    </div>
                    <div className="text-xs text-ash-600 mt-1">
                      {daysSinceActivity(contact)} days ago
                    </div>
                  </div>
                </div>
              )}

              {contact.lastContacted && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-flame-500/20 flex items-center justify-center text-xs">
                    💬
                  </div>
                  <div className="flex-1">
                    <div className="text-ash-200 font-medium">
                      Last Contacted
                    </div>
                    <div className="text-sm text-ash-500">
                      {new Date(contact.lastContacted).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {!contact.lastActivity && !contact.lastContacted && (
                <div className="text-center py-8 text-ash-500">
                  No activity recorded
                </div>
              )}
            </div>
          )}

          {activeTab === 'elv' && contact.elvFactors && (
            <div className="space-y-4">
              <p className="text-sm text-ash-400 mb-4">
                ELV Formula: Channel Close Rate × Lead Type × Urgency × Keyword
                Intent × Job Value × Behavioral
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-char-700 rounded">
                  <span className="text-ash-300">Channel Close Rate</span>
                  <span className="font-display text-flame-500">
                    {(contact.elvFactors.channelCloseRate * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-char-700 rounded">
                  <span className="text-ash-300">Lead Type Multiplier</span>
                  <span className="font-display text-flame-500">
                    {contact.elvFactors.leadTypeMultiplier.toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-char-700 rounded">
                  <span className="text-ash-300">Urgency Multiplier</span>
                  <span className="font-display text-flame-500">
                    {contact.elvFactors.urgencyMultiplier.toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-char-700 rounded">
                  <span className="text-ash-300">Keyword Intent Score</span>
                  <span className="font-display text-flame-500">
                    {(contact.elvFactors.keywordIntent * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-char-700 rounded">
                  <span className="text-ash-300">Estimated Job Value</span>
                  <span className="font-display text-flame-500">
                    ${contact.elvFactors.jobValue.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-char-700 rounded">
                  <span className="text-ash-300">Behavioral Score</span>
                  <span className="font-display text-flame-500">
                    {(contact.elvFactors.behavioralScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="border-t border-char-600 pt-4 mt-4">
                <div className="flex items-center justify-between p-4 bg-flame-500/10 rounded">
                  <span className="font-display text-lg text-ash-200">
                    Total ELV
                  </span>
                  <span className="font-display text-3xl text-gradient-flame">
                    ${contact.elv.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-char-700 p-4 flex justify-between">
          <button onClick={handleDelete} className="btn-ghost text-danger">
            Delete Contact
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">
              Close
            </button>
            <button onClick={() => onEdit(contact)} className="btn-primary">
              Edit Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
