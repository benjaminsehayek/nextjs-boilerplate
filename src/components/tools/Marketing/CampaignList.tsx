'use client';

import { useState, useMemo } from 'react';
import type { Campaign, CampaignStatus } from '@/lib/marketing/types';

interface CampaignListProps {
  campaigns: Campaign[];
  onView: (campaign: Campaign) => void;
  onDuplicate: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
}

type FilterTab = 'all' | CampaignStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'sent', label: 'Sent' },
  { key: 'failed', label: 'Failed' },
];

const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-ash-500/10', text: 'text-ash-400' },
  scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  sending: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  sent: { bg: 'bg-green-500/10', text: 'text-green-400' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400' },
  cancelled: { bg: 'bg-ash-500/10', text: 'text-ash-500' },
};

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  all: 'No campaigns yet. Create your first campaign to get started.',
  draft: 'No draft campaigns. Start composing a new campaign.',
  scheduled: 'No scheduled campaigns.',
  sending: 'No campaigns currently sending.',
  sent: 'No sent campaigns yet.',
  failed: 'No failed campaigns. Good news!',
  cancelled: 'No cancelled campaigns.',
};

function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '--';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CampaignList({
  campaigns,
  onView,
  onDuplicate,
  onDelete,
}: CampaignListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    if (activeTab === 'all') return campaigns;
    return campaigns.filter((c) => c.status === activeTab);
  }, [campaigns, activeTab]);

  const handleDeleteClick = (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(campaignId);
  };

  const handleConfirmDelete = (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(campaignId);
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const handleDuplicate = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(campaign);
  };

  // Count per status for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length };
    for (const c of campaigns) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [campaigns]);

  return (
    <div className="card">
      {/* Filter Tabs */}
      <div className="border-b border-char-700 px-4">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const count = statusCounts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-flame-500 text-flame-500'
                    : 'border-transparent text-ash-400 hover:text-ash-200'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key
                        ? 'bg-flame-500/10 text-flame-500'
                        : 'bg-char-700 text-ash-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {filteredCampaigns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-char-700 bg-char-800">
                <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                  Name
                </th>
                <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                  Channel
                </th>
                <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                  Status
                </th>
                <th className="p-3 text-right text-xs font-display uppercase text-ash-400">
                  Recipients
                </th>
                <th className="p-3 text-right text-xs font-display uppercase text-ash-400">
                  Sent
                </th>
                <th className="p-3 text-right text-xs font-display uppercase text-ash-400">
                  Opened
                </th>
                <th className="p-3 text-right text-xs font-display uppercase text-ash-400">
                  Clicked
                </th>
                <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                  Date
                </th>
                <th className="p-3 text-right text-xs font-display uppercase text-ash-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign) => {
                const styles = STATUS_STYLES[campaign.status];
                const isDeleting = confirmDeleteId === campaign.id;

                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-char-700 hover:bg-char-700/50 cursor-pointer transition-colors"
                    onClick={() => onView(campaign)}
                  >
                    {/* Name */}
                    <td className="p-3">
                      <div className="text-sm font-medium text-ash-100 truncate max-w-[200px]">
                        {campaign.name}
                      </div>
                      {campaign.subject && (
                        <div className="text-xs text-ash-500 truncate max-w-[200px]">
                          {campaign.subject}
                        </div>
                      )}
                    </td>

                    {/* Channel */}
                    <td className="p-3">
                      <span className="text-xs text-ash-300 uppercase tracking-wide">
                        {campaign.channel}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${styles.bg} ${styles.text}`}
                      >
                        {campaign.status === 'sending' && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                        )}
                        {campaign.status}
                      </span>
                    </td>

                    {/* Recipients */}
                    <td className="p-3 text-right">
                      <span className="text-sm text-ash-300 tabular-nums">
                        {campaign.recipient_count.toLocaleString()}
                      </span>
                    </td>

                    {/* Sent */}
                    <td className="p-3 text-right">
                      <span className="text-sm text-ash-300 tabular-nums">
                        {campaign.total_sent > 0
                          ? campaign.total_sent.toLocaleString()
                          : '--'}
                      </span>
                    </td>

                    {/* Opened */}
                    <td className="p-3 text-right">
                      {campaign.total_sent > 0 ? (
                        <div>
                          <span className="text-sm text-ash-300 tabular-nums">
                            {campaign.total_opened.toLocaleString()}
                          </span>
                          <span className="text-xs text-ash-500 ml-1">
                            ({formatRate(campaign.total_opened, campaign.total_sent)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-ash-500">--</span>
                      )}
                    </td>

                    {/* Clicked */}
                    <td className="p-3 text-right">
                      {campaign.total_sent > 0 ? (
                        <div>
                          <span className="text-sm text-ash-300 tabular-nums">
                            {campaign.total_clicked.toLocaleString()}
                          </span>
                          <span className="text-xs text-ash-500 ml-1">
                            ({formatRate(campaign.total_clicked, campaign.total_sent)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-ash-500">--</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-3">
                      <span className="text-sm text-ash-400">
                        {formatDate(campaign.sent_at || campaign.scheduled_at || campaign.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {isDeleting ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-red-400 mr-1">Delete?</span>
                          <button
                            onClick={(e) => handleConfirmDelete(campaign.id, e)}
                            className="px-2 py-1 text-xs rounded-btn bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={handleCancelDelete}
                            className="px-2 py-1 text-xs rounded-btn bg-char-700 text-ash-400 hover:text-ash-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDuplicate(campaign, e)}
                            className="btn-icon w-8 h-8"
                            title="Duplicate campaign"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(campaign.id, e)}
                            className="btn-icon w-8 h-8 hover:text-red-400 hover:border-red-500/50"
                            title="Delete campaign"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto mb-4 text-ash-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
            />
          </svg>
          <p className="text-ash-400 text-sm">
            {EMPTY_MESSAGES[activeTab] || 'No campaigns to show.'}
          </p>
        </div>
      )}

      {/* Footer */}
      {filteredCampaigns.length > 0 && (
        <div className="border-t border-char-700 px-4 py-3 text-sm text-ash-500 text-center">
          Showing {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
          {activeTab !== 'all' && ` (filtered by ${activeTab})`}
        </div>
      )}
    </div>
  );
}
