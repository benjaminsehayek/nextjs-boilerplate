'use client';

import { useState, useMemo } from 'react';
import type {
  MessageTemplate,
  Channel,
  TemplateCategory,
} from '@/lib/marketing/types';

interface TemplateListProps {
  templates: MessageTemplate[];
  onEdit: (template: MessageTemplate) => void;
  onDelete: (templateId: string) => void;
  onCreateNew: () => void;
}

type ChannelFilter = 'all' | Channel;

const CATEGORY_OPTIONS: { value: '' | TemplateCategory; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'follow-up', label: 'Follow-Up' },
  { value: 'welcome', label: 'Welcome' },
  { value: 're-engagement', label: 'Re-Engagement' },
];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: 'General',
  promotional: 'Promotional',
  transactional: 'Transactional',
  'follow-up': 'Follow-Up',
  welcome: 'Welcome',
  're-engagement': 'Re-Engagement',
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '...';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TemplateList({
  templates,
  onEdit,
  onDelete,
  onCreateNew,
}: TemplateListProps) {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'' | TemplateCategory>('');

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (channelFilter !== 'all' && t.channel !== channelFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      return true;
    });
  }, [templates, channelFilter, categoryFilter]);

  const channelTabs: { key: ChannelFilter; label: string; count: number }[] = useMemo(
    () => [
      { key: 'all', label: 'All', count: templates.length },
      {
        key: 'email',
        label: 'Email',
        count: templates.filter((t) => t.channel === 'email').length,
      },
      {
        key: 'sms',
        label: 'SMS',
        count: templates.filter((t) => t.channel === 'sms').length,
      },
    ],
    [templates]
  );

  const handleDeleteClick = (
    e: React.MouseEvent,
    templateId: string,
    templateName: string
  ) => {
    e.stopPropagation();
    if (confirm(`Delete template "${templateName}"? This cannot be undone.`)) {
      onDelete(templateId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display text-ash-100">Message Templates</h2>
          <p className="text-sm text-ash-400 mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" onClick={onCreateNew} className="btn-primary">
          + New Template
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Channel Tabs */}
        <div className="flex gap-1 bg-char-900 border border-char-700 rounded-btn p-1">
          {channelTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setChannelFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-btn transition-colors ${
                channelFilter === tab.key
                  ? 'bg-char-700 text-ash-100'
                  : 'text-ash-400 hover:text-ash-200'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-ash-500">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as '' | TemplateCategory)
          }
          className="input w-auto min-w-[160px]"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="card-interactive p-5 flex flex-col"
              onClick={() => onEdit(template)}
            >
              {/* Top Row: Name + Channel Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-ash-100 leading-tight line-clamp-2">
                  {template.name}
                </h3>
                <span
                  className={`shrink-0 tag ${
                    template.channel === 'email' ? 'tag-info' : 'tag-success'
                  }`}
                >
                  {template.channel === 'email' ? 'Email' : 'SMS'}
                </span>
              </div>

              {/* Category Tag */}
              <div className="mb-3">
                <span className="tag tag-flame">
                  {CATEGORY_LABELS[template.category]}
                </span>
              </div>

              {/* Preview Text */}
              <p className="text-xs text-ash-400 leading-relaxed flex-1 mb-4">
                {truncate(template.text_body, 100) || (
                  <span className="italic text-ash-500">No content</span>
                )}
              </p>

              {/* Footer: Date + Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-char-700">
                <span className="text-xs text-ash-500">
                  {formatDate(template.created_at)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(template);
                    }}
                    className="btn-icon"
                    aria-label={`Edit ${template.name}`}
                    title="Edit"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, template.id, template.name)}
                    className="btn-icon hover:!border-danger hover:!text-danger"
                    aria-label={`Delete ${template.name}`}
                    title="Delete"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-char-700 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-ash-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          {templates.length === 0 ? (
            <>
              <h3 className="text-lg font-display text-ash-200 mb-2">
                No templates yet
              </h3>
              <p className="text-sm text-ash-400 mb-6">
                Create your first message template to get started with marketing
                automation.
              </p>
              <button type="button" onClick={onCreateNew} className="btn-primary">
                + Create First Template
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-display text-ash-200 mb-2">
                No matching templates
              </h3>
              <p className="text-sm text-ash-400">
                Try adjusting your filters to see more results.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
