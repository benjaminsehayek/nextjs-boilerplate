'use client';

import type { Campaign, DashboardStats, CampaignStatus, Channel } from '@/lib/marketing/types';

interface MarketingDashboardProps {
  stats: DashboardStats;
  recentCampaigns: Campaign[];
  onNewEmailCampaign: () => void;
  onNewSMSCampaign: () => void;
  onViewCampaign: (campaign: Campaign) => void;
  onViewAllCampaigns: () => void;
}

const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; label: string }> = {
  draft:     { bg: 'bg-ash-500/15',    text: 'text-ash-400',    label: 'Draft' },
  scheduled: { bg: 'bg-blue-500/15',   text: 'text-blue-400',   label: 'Scheduled' },
  sending:   { bg: 'bg-amber-500/15',  text: 'text-amber-400',  label: 'Sending' },
  sent:      { bg: 'bg-green-500/15',  text: 'text-green-400',  label: 'Sent' },
  failed:    { bg: 'bg-red-500/15',    text: 'text-red-400',    label: 'Failed' },
  cancelled: { bg: 'bg-ash-500/15',    text: 'text-ash-500',    label: 'Cancelled' },
};

const CHANNEL_STYLES: Record<Channel, { bg: string; text: string; label: string }> = {
  email: { bg: 'bg-blue-500/15',  text: 'text-blue-400',  label: 'Email' },
  sms:   { bg: 'bg-green-500/15', text: 'text-green-400', label: 'SMS' },
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function computeRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '0.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

export default function MarketingDashboard({
  stats,
  recentCampaigns,
  onNewEmailCampaign,
  onNewSMSCampaign,
  onViewCampaign,
  onViewAllCampaigns,
}: MarketingDashboardProps) {
  const hasNoCampaigns = recentCampaigns.length === 0 && stats.total_campaigns === 0;

  if (hasNoCampaigns) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-2xl font-display text-gradient-flame mb-1">Marketing Automation</h2>
          <p className="text-sm text-ash-400">Send targeted email and SMS campaigns to your contacts</p>
        </div>

        <div className="card p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-flame-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-flame-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h3 className="text-xl font-display text-ash-100 mb-2">Welcome to Marketing</h3>
            <p className="text-sm text-ash-400 mb-6">
              Create your first campaign to start engaging your audience. Send personalized emails
              or SMS messages to your contacts with just a few clicks.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={onNewEmailCampaign} className="btn-primary">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  New Email Campaign
                </span>
              </button>
              <button onClick={onNewSMSCampaign} className="btn-ghost">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  New SMS Campaign
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display text-gradient-flame mb-1">Marketing Automation</h2>
            <p className="text-sm text-ash-400">
              {stats.total_campaigns} campaign{stats.total_campaigns !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onNewEmailCampaign} className="btn-primary">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                New Email Campaign
              </span>
            </button>
            <button onClick={onNewSMSCampaign} className="btn-ghost">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                New SMS Campaign
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Total Sent</p>
          <p className="text-3xl font-display text-ash-200 mb-1">
            {formatNumber(stats.total_sent)}
          </p>
          <p className="text-xs text-ash-500">Messages delivered</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Avg Open Rate</p>
          <p className={`text-3xl font-display mb-1 ${stats.avg_open_rate >= 20 ? 'text-green-400' : 'text-amber-400'}`}>
            {stats.avg_open_rate.toFixed(1)}%
          </p>
          <p className="text-xs text-ash-500">Across all campaigns</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Avg Click Rate</p>
          <p className={`text-3xl font-display mb-1 ${stats.avg_click_rate >= 3 ? 'text-green-400' : 'text-amber-400'}`}>
            {stats.avg_click_rate.toFixed(1)}%
          </p>
          <p className="text-xs text-ash-500">Click-through rate</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-ash-500 mb-2">Templates</p>
          <p className="text-3xl font-display text-ash-200 mb-1">
            {stats.total_templates}
          </p>
          <p className="text-xs text-ash-500">Reusable templates</p>
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-char-700 flex items-center justify-between">
          <h3 className="text-lg font-display text-ash-200">Recent Campaigns</h3>
          <button
            onClick={onViewAllCampaigns}
            className="text-sm text-flame-500 hover:text-flame-400 transition-colors font-display"
          >
            View All
          </button>
        </div>

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
                  Open Rate
                </th>
                <th className="p-3 text-right text-xs font-display uppercase text-ash-400">
                  Click Rate
                </th>
                <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentCampaigns.slice(0, 10).map((campaign) => {
                const statusStyle = STATUS_STYLES[campaign.status];
                const channelStyle = CHANNEL_STYLES[campaign.channel];
                const openRate = computeRate(campaign.total_opened, campaign.total_sent);
                const clickRate = computeRate(campaign.total_clicked, campaign.total_sent);
                const displayDate = campaign.sent_at || campaign.scheduled_at || campaign.created_at;

                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-char-700 hover:bg-char-700/50 cursor-pointer transition-colors"
                    onClick={() => onViewCampaign(campaign)}
                  >
                    <td className="p-3">
                      <div className="font-medium text-ash-100 truncate max-w-[240px]">
                        {campaign.name}
                      </div>
                      {campaign.subject && (
                        <div className="text-xs text-ash-500 truncate max-w-[240px]">
                          {campaign.subject}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${channelStyle.bg} ${channelStyle.text}`}>
                        {channelStyle.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="p-3 text-right text-sm text-ash-300">
                      {campaign.recipient_count.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-sm text-ash-300">
                      {campaign.total_sent > 0 ? `${openRate}%` : '--'}
                    </td>
                    <td className="p-3 text-right text-sm text-ash-300">
                      {campaign.total_sent > 0 ? `${clickRate}%` : '--'}
                    </td>
                    <td className="p-3 text-sm text-ash-400">
                      {formatDate(displayDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {recentCampaigns.length > 0 && (
          <div className="border-t border-char-700 px-4 py-3 text-sm text-ash-500 text-center">
            Showing {Math.min(recentCampaigns.length, 10)} of {recentCampaigns.length} recent campaign{recentCampaigns.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
