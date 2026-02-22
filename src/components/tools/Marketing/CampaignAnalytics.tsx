'use client';

import type { Campaign, CampaignStatus, Channel } from '@/lib/marketing/types';

interface Recipient {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

interface LinkClick {
  url: string;
  count: number;
}

interface CampaignAnalyticsProps {
  campaign: Campaign;
  recipients?: Recipient[];
  linkClicks?: LinkClick[];
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

const RECIPIENT_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending:      { bg: 'bg-ash-500/15',    text: 'text-ash-400' },
  sent:         { bg: 'bg-blue-500/15',   text: 'text-blue-400' },
  delivered:    { bg: 'bg-green-500/15',  text: 'text-green-400' },
  opened:       { bg: 'bg-amber-500/15',  text: 'text-amber-400' },
  clicked:      { bg: 'bg-flame-500/15',  text: 'text-flame-500' },
  bounced:      { bg: 'bg-red-500/15',    text: 'text-red-400' },
  failed:       { bg: 'bg-red-500/15',    text: 'text-red-400' },
  unsubscribed: { bg: 'bg-ash-500/15',    text: 'text-ash-500' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + '...';
}

export default function CampaignAnalytics({
  campaign,
  recipients,
  linkClicks,
}: CampaignAnalyticsProps) {
  const {
    total_sent,
    total_delivered,
    total_opened,
    total_clicked,
    total_bounced,
    total_unsubscribed,
    total_failed,
  } = campaign;

  const deliveryRate  = safeRate(total_delivered, total_sent);
  const openRate      = safeRate(total_opened, total_sent);
  const clickRate     = safeRate(total_clicked, total_sent);
  const bounceRate    = safeRate(total_bounced, total_sent);
  const unsubRate     = safeRate(total_unsubscribed, total_sent);

  const statusStyle  = STATUS_STYLES[campaign.status];
  const channelStyle = CHANNEL_STYLES[campaign.channel];

  // Funnel data: each step is a subset of the previous
  const funnelSteps = [
    { label: 'Sent',      value: total_sent,      color: 'bg-blue-500',  pct: 100 },
    { label: 'Delivered',  value: total_delivered,  color: 'bg-green-500', pct: safeRate(total_delivered, total_sent) },
    { label: 'Opened',    value: total_opened,     color: 'bg-amber-500', pct: safeRate(total_opened, total_sent) },
    { label: 'Clicked',   value: total_clicked,    color: 'bg-flame-500', pct: safeRate(total_clicked, total_sent) },
  ];

  // Metrics cards with conditional coloring
  const metricCards: Array<{
    label: string;
    value: string;
    colorClass: string;
  }> = [
    {
      label: 'Delivery Rate',
      value: `${deliveryRate.toFixed(1)}%`,
      colorClass: deliveryRate >= 95 ? 'text-green-400' : deliveryRate >= 90 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Open Rate',
      value: `${openRate.toFixed(1)}%`,
      colorClass: openRate >= 20 ? 'text-green-400' : openRate >= 10 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Click Rate',
      value: `${clickRate.toFixed(1)}%`,
      colorClass: clickRate >= 3 ? 'text-green-400' : clickRate >= 1 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Bounce Rate',
      value: `${bounceRate.toFixed(1)}%`,
      colorClass: bounceRate <= 2 ? 'text-green-400' : bounceRate <= 5 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Unsubscribe Rate',
      value: `${unsubRate.toFixed(1)}%`,
      colorClass: unsubRate <= 0.5 ? 'text-green-400' : unsubRate <= 1 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Failed',
      value: total_failed.toLocaleString(),
      colorClass: total_failed === 0 ? 'text-green-400' : 'text-red-400',
    },
  ];

  const sortedLinkClicks = linkClicks
    ? [...linkClicks].sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="space-y-6">
      {/* Campaign Info Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-display text-ash-100">{campaign.name}</h2>
            {campaign.subject && (
              <p className="text-sm text-ash-400">Subject: {campaign.subject}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${channelStyle.bg} ${channelStyle.text}`}>
                {channelStyle.label}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
              {campaign.sent_at && (
                <span className="text-xs text-ash-500">
                  Sent {formatDate(campaign.sent_at)}
                </span>
              )}
              {!campaign.sent_at && campaign.scheduled_at && (
                <span className="text-xs text-ash-500">
                  Scheduled for {formatDate(campaign.scheduled_at)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-ash-500 mb-1">Recipients</p>
            <p className="text-2xl font-display text-ash-200">
              {campaign.recipient_count.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Funnel */}
      {total_sent > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-display text-ash-200 mb-4">Delivery Funnel</h3>
          <div className="space-y-3">
            {funnelSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-4">
                <div className="w-20 text-sm font-display text-ash-300 text-right shrink-0">
                  {step.label}
                </div>
                <div className="flex-1 h-8 bg-char-900 rounded overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded transition-all duration-500 flex items-center px-3`}
                    style={{ width: `${Math.max(step.pct, 1)}%` }}
                  >
                    {step.pct >= 15 && (
                      <span className="text-xs font-medium text-white whitespace-nowrap">
                        {step.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-24 text-sm text-ash-400 shrink-0">
                  {step.value.toLocaleString()} ({step.pct.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map((metric) => (
          <div key={metric.label} className="card p-4">
            <p className="text-xs text-ash-500 mb-2">{metric.label}</p>
            <p className={`text-2xl font-display ${metric.colorClass}`}>
              {total_sent > 0 ? metric.value : '--'}
            </p>
          </div>
        ))}
      </div>

      {/* Link Clicks Table */}
      {sortedLinkClicks.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-char-700">
            <h3 className="text-lg font-display text-ash-200">Link Clicks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-char-700 bg-char-800">
                  <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                    URL
                  </th>
                  <th className="p-3 text-right text-xs font-display uppercase text-ash-400">
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLinkClicks.map((link) => (
                  <tr
                    key={link.url}
                    className="border-b border-char-700 hover:bg-char-700/50 transition-colors"
                  >
                    <td className="p-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-flame-500 hover:text-flame-400 transition-colors"
                        title={link.url}
                      >
                        {truncateUrl(link.url)}
                      </a>
                    </td>
                    <td className="p-3 text-right text-sm font-display text-ash-200">
                      {link.count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recipient List */}
      {recipients && recipients.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-char-700 flex items-center justify-between">
            <h3 className="text-lg font-display text-ash-200">Recipients</h3>
            <span className="text-sm text-ash-500">
              {recipients.length.toLocaleString()} recipient{recipients.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-char-700 bg-char-800">
                  <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                    Name
                  </th>
                  <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                    Email
                  </th>
                  <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                    Status
                  </th>
                  <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                    Sent At
                  </th>
                  <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                    Opened At
                  </th>
                  <th className="p-3 text-left text-xs font-display uppercase text-ash-400">
                    Clicked At
                  </th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((recipient) => {
                  const recipientStyle = RECIPIENT_STATUS_STYLES[recipient.status] ?? {
                    bg: 'bg-ash-500/15',
                    text: 'text-ash-400',
                  };

                  return (
                    <tr
                      key={recipient.id}
                      className="border-b border-char-700 hover:bg-char-700/50 transition-colors"
                    >
                      <td className="p-3">
                        <span className="text-sm font-medium text-ash-100">
                          {recipient.contact_name}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-ash-300 truncate max-w-[200px] block">
                          {recipient.contact_email}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${recipientStyle.bg} ${recipientStyle.text}`}>
                          {recipient.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-ash-400">
                        {formatDateTime(recipient.sent_at)}
                      </td>
                      <td className="p-3 text-sm text-ash-400">
                        {formatDateTime(recipient.opened_at)}
                      </td>
                      <td className="p-3 text-sm text-ash-400">
                        {formatDateTime(recipient.clicked_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
