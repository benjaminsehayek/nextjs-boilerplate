'use client';

import { useState } from 'react';
import type { ChecklistResult } from '@/types';

interface MetaSidebarProps {
  metaTitle: string;
  metaDescription: string;
  schemaJson: string;
  status: string;
  checklist: ChecklistResult | null;
  saving?: boolean;
  publishing?: boolean;
  onMetaTitleChange: (v: string) => void;
  onMetaDescriptionChange: (v: string) => void;
  onSchemaJsonChange: (v: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onGenerateSchema: () => void;
  generatingSchema?: boolean;
}

export default function MetaSidebar({
  metaTitle,
  metaDescription,
  schemaJson,
  status,
  checklist,
  saving,
  publishing,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onSchemaJsonChange,
  onSave,
  onPublish,
  onUnpublish,
  onGenerateSchema,
  generatingSchema,
}: MetaSidebarProps) {
  const [schemaExpanded, setSchemaExpanded] = useState(false);

  const titleLen = metaTitle.length;
  const descLen = metaDescription.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Publish actions */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ash-100 text-sm">Publish</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            status === 'published' ? 'bg-success/15 text-success' : 'bg-char-700 text-ash-400'
          }`}>
            {status}
          </span>
        </div>

        {checklist && !checklist.passed && (
          <div className="space-y-1.5">
            {checklist.blocking.map((item) => (
              <div key={item.label} className="flex items-start gap-2 text-xs text-danger">
                <span className="mt-0.5 flex-shrink-0">✗</span>
                <span>{item.label}{item.detail ? `: ${item.detail}` : ''}</span>
              </div>
            ))}
          </div>
        )}

        {checklist?.warnings && checklist.warnings.length > 0 && (
          <div className="space-y-1.5">
            {checklist.warnings.map((item) => (
              <div key={item.label} className="flex items-start gap-2 text-xs text-ember-400">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{item.label}{item.detail ? `: ${item.detail}` : ''}</span>
              </div>
            ))}
          </div>
        )}

        {checklist?.passed && (
          <div className="flex items-center gap-2 text-xs text-success">
            <span>✓</span>
            <span>All checks passed</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="btn-ghost flex-1 text-sm"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          {status === 'published' ? (
            <button
              onClick={onUnpublish}
              disabled={publishing}
              className="btn-ghost flex-1 text-sm text-danger border-danger/30 hover:bg-danger/10"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={onPublish}
              disabled={publishing || (checklist !== null && !checklist.passed)}
              className="btn-primary flex-1 text-sm"
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {/* SEO meta */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-ash-100 text-sm">SEO Meta</h3>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-ash-400">Meta Title</label>
            <span className={`text-xs ${titleLen > 60 ? 'text-danger' : titleLen > 50 ? 'text-ember-400' : 'text-ash-500'}`}>
              {titleLen}/60
            </span>
          </div>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            maxLength={70}
            placeholder="60 chars max"
            className="input w-full text-sm"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-ash-400">Meta Description</label>
            <span className={`text-xs ${descLen > 160 ? 'text-danger' : descLen > 140 ? 'text-ember-400' : 'text-ash-500'}`}>
              {descLen}/160
            </span>
          </div>
          <textarea
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            maxLength={180}
            rows={3}
            placeholder="160 chars max — include a CTA"
            className="input w-full text-sm resize-none"
          />
        </div>
      </div>

      {/* Schema.org */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ash-100 text-sm">Schema.org</h3>
          <button
            onClick={() => setSchemaExpanded(!schemaExpanded)}
            className="btn-icon text-xs text-ash-500"
          >
            {schemaExpanded ? '▲' : '▼'}
          </button>
        </div>

        {schemaJson ? (
          <div className="flex items-center gap-2 text-xs text-success">
            <span>✓</span>
            <span>Schema configured</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-ember-400">
            <span>⚠</span>
            <span>No schema — required before publishing</span>
          </div>
        )}

        <button
          onClick={onGenerateSchema}
          disabled={generatingSchema}
          className="btn-ghost w-full text-sm"
        >
          {generatingSchema ? 'Generating…' : schemaJson ? 'Regenerate Schema' : 'Generate Schema (AI)'}
        </button>

        {schemaExpanded && (
          <textarea
            value={schemaJson}
            onChange={(e) => onSchemaJsonChange(e.target.value)}
            rows={8}
            placeholder='{"@context": "https://schema.org", ...}'
            className="input w-full text-xs font-mono resize-none"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
