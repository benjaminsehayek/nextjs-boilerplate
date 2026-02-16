'use client';

import { useState } from 'react';
import type { LeadAttributionProps, Lead, LeadSource } from './types';

const SOURCE_CONFIG: Record<LeadSource, { name: string; color: string; icon: string }> = {
  ppc: { name: 'Google Ads', color: 'text-success', icon: '🎯' },
  lsa: { name: 'LSA', color: 'text-ember-500', icon: '🛠️' },
  meta: { name: 'Meta', color: 'text-info', icon: '📘' },
  organic: { name: 'Organic', color: 'text-flame-500', icon: '🔍' },
  gbp: { name: 'GBP', color: 'text-danger', icon: '📍' },
  direct: { name: 'Direct', color: 'text-ash-400', icon: '🔗' },
  referral: { name: 'Referral', color: 'text-heat-500', icon: '↗️' },
};

const STATUS_CONFIG = {
  new: { label: 'New', color: 'text-info', bgColor: 'bg-info/10' },
  contacted: { label: 'Contacted', color: 'text-ember-500', bgColor: 'bg-ember-500/10' },
  qualified: { label: 'Qualified', color: 'text-flame-500', bgColor: 'bg-flame-500/10' },
  converted: { label: 'Converted', color: 'text-success', bgColor: 'bg-success/10' },
  lost: { label: 'Lost', color: 'text-ash-500', bgColor: 'bg-ash-500/10' },
};

const CONFIDENCE_CONFIG = {
  high: { icon: '🎯', color: 'text-success' },
  medium: { icon: '⚡', color: 'text-ember-500' },
  low: { icon: '❓', color: 'text-danger' },
};

export default function LeadAttribution({ leads, onLeadClick }: LeadAttributionProps) {
  const [filterSource, setFilterSource] = useState<LeadSource | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<Lead['status'] | 'all'>('all');

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (filterSource !== 'all' && lead.source !== filterSource) return false;
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
    return true;
  });

  // Sort by date descending
  const sortedLeads = [...filteredLeads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get unique sources from leads
  const uniqueSources = Array.from(new Set(leads.map(l => l.source)));

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display text-ash-200 mb-1">Lead Attribution</h2>
          <p className="text-sm text-ash-400">
            {filteredLeads.length} of {leads.length} leads
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-ash-500">Source:</label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as LeadSource | 'all')}
            className="input text-sm py-1.5 px-3 w-auto"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map((source) => (
              <option key={source} value={source}>
                {SOURCE_CONFIG[source].name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-ash-500">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Lead['status'] | 'all')}
            className="input text-sm py-1.5 px-3 w-auto"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="space-y-2">
        {sortedLeads.map((lead) => {
          const sourceConfig = SOURCE_CONFIG[lead.source];
          const statusConfig = STATUS_CONFIG[lead.status];
          const confidenceConfig = CONFIDENCE_CONFIG[lead.attributionConfidence];

          return (
            <div
              key={lead.id}
              className={`card p-4 ${onLeadClick ? 'cursor-pointer hover:border-flame-500 transition-all' : ''}`}
              onClick={() => onLeadClick?.(lead)}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left: Source & Date */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sourceConfig.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-display text-sm ${sourceConfig.color}`}>
                        {sourceConfig.name}
                      </span>
                      <span className={`text-xs ${confidenceConfig.color}`} title="Attribution Confidence">
                        {confidenceConfig.icon}
                      </span>
                    </div>
                    <p className="text-xs text-ash-500">
                      {new Date(lead.createdAt).toLocaleDateString()} at{' '}
                      {new Date(lead.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Middle: Campaign Info */}
                {lead.metadata && (
                  <div className="flex-1 min-w-[200px]">
                    {lead.metadata.campaign && (
                      <p className="text-xs text-ash-400 mb-1">
                        <span className="text-ash-500">Campaign:</span> {lead.metadata.campaign}
                      </p>
                    )}
                    {lead.metadata.keyword && (
                      <p className="text-xs text-ash-400">
                        <span className="text-ash-500">Keyword:</span> {lead.metadata.keyword}
                      </p>
                    )}
                  </div>
                )}

                {/* Right: Status & Value */}
                <div className="flex items-center gap-4">
                  {lead.value && (
                    <div className="text-right">
                      <p className="text-xs text-ash-500 mb-1">Value</p>
                      <p className="font-display text-sm text-ash-200">
                        {formatCurrency(lead.value)}
                      </p>
                    </div>
                  )}

                  {lead.revenue && (
                    <div className="text-right">
                      <p className="text-xs text-ash-500 mb-1">Revenue</p>
                      <p className="font-display text-sm text-success">
                        {formatCurrency(lead.revenue)}
                      </p>
                    </div>
                  )}

                  <span className={`tag ${statusConfig.color} ${statusConfig.bgColor} px-3 py-1`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedLeads.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-ash-400">No leads found</p>
          <p className="text-sm text-ash-500 mt-1">
            {filterSource !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Leads will appear here once your platforms are connected'}
          </p>
        </div>
      )}
    </div>
  );
}
