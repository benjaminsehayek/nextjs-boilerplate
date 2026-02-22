'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import type {
  MessageTemplate,
  CreateTemplateInput,
  Channel,
  TemplateCategory,
} from '@/lib/marketing/types';
import { AVAILABLE_TAGS, previewTemplate } from '@/lib/marketing/merge-tags';
import {
  validateEmailCompliance,
  validateSMSCompliance,
} from '@/lib/marketing/compliance';
import type { ComplianceResult } from '@/lib/marketing/compliance';

interface TemplateEditorProps {
  template?: MessageTemplate;
  onSave: (input: CreateTemplateInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'follow-up', label: 'Follow-Up' },
  { value: 'welcome', label: 'Welcome' },
  { value: 're-engagement', label: 'Re-Engagement' },
];

function getSmsSegmentInfo(length: number): { display: string; segments: number } {
  if (length <= 160) {
    return { display: `${length}/160`, segments: 1 };
  }
  const segments = Math.ceil(length / 160);
  const max = segments * 160;
  return { display: `${length}/${max} (${segments} messages)`, segments };
}

export default function TemplateEditor({
  template,
  onSave,
  onCancel,
  isSaving = false,
}: TemplateEditorProps) {
  const isEditing = !!template;

  const [channel, setChannel] = useState<Channel>(template?.channel ?? 'email');
  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState<TemplateCategory>(
    template?.category ?? 'general'
  );
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [htmlBody, setHtmlBody] = useState(template?.html_body ?? '');
  const [textBody, setTextBody] = useState(template?.text_body ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(
    null
  );

  const subjectRef = useRef<HTMLInputElement>(null);
  const htmlBodyRef = useRef<HTMLTextAreaElement>(null);
  const textBodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleFocus = useCallback(
    (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) => {
      lastFocusedRef.current = ref.current;
    },
    []
  );

  const insertTag = useCallback((tag: string) => {
    const target = lastFocusedRef.current;
    if (!target) return;

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const before = target.value.substring(0, start);
    const after = target.value.substring(end);
    const newValue = before + tag + after;

    // Determine which state setter to call
    if (target === subjectRef.current) {
      setSubject(newValue);
    } else if (target === htmlBodyRef.current) {
      setHtmlBody(newValue);
    } else if (target === textBodyRef.current) {
      setTextBody(newValue);
    }

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      const newPos = start + tag.length;
      target.focus();
      target.setSelectionRange(newPos, newPos);
    });
  }, []);

  const previewContent = useMemo(() => {
    if (channel === 'email') {
      return {
        subject: previewTemplate(subject),
        html: previewTemplate(htmlBody),
        text: previewTemplate(textBody),
      };
    }
    return {
      subject: '',
      html: '',
      text: previewTemplate(textBody),
    };
  }, [channel, subject, htmlBody, textBody]);

  const smsInfo = useMemo(() => getSmsSegmentInfo(textBody.length), [textBody]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Run compliance checks
    let result: ComplianceResult;
    if (channel === 'email') {
      result = validateEmailCompliance(htmlBody, textBody, null, null);
    } else {
      result = validateSMSCompliance(textBody);
    }

    setComplianceResult(result);

    if (!result.valid) {
      return;
    }

    const input: CreateTemplateInput = {
      name: name.trim(),
      channel,
      text_body: textBody,
      category,
      ...(channel === 'email'
        ? { subject: subject.trim(), html_body: htmlBody }
        : {}),
    };

    onSave(input);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-char-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display text-gradient-flame">
              {isEditing ? 'Edit Template' : 'New Template'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="btn-icon"
              aria-label="Close"
            >
              &#10005;
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Channel Toggle */}
            <div>
              <label className="input-label">Channel</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`flex-1 py-2 px-4 rounded-btn text-sm font-semibold transition-colors ${
                    channel === 'email'
                      ? 'bg-info/20 text-info border border-info'
                      : 'bg-char-900 border border-char-700 text-ash-400 hover:border-char-600'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`flex-1 py-2 px-4 rounded-btn text-sm font-semibold transition-colors ${
                    channel === 'sms'
                      ? 'bg-success/20 text-success border border-success'
                      : 'bg-char-900 border border-char-700 text-ash-400 hover:border-char-600'
                  }`}
                >
                  SMS
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="template-name" className="input-label">
                Template Name <span className="text-danger">*</span>
              </label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g., Welcome Email, Appointment Reminder"
                required
                disabled={isSaving}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="template-category" className="input-label">
                Category
              </label>
              <select
                id="template-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className="input"
                disabled={isSaving}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Merge Tag Toolbar */}
            <div>
              <label className="input-label">Insert Merge Tag</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((mergeTag) => (
                  <button
                    key={mergeTag.tag}
                    type="button"
                    onClick={() => insertTag(mergeTag.tag)}
                    className="px-2 py-1 text-xs bg-char-900 border border-char-700 rounded-btn text-ash-300 hover:border-flame-500 hover:text-flame-500 transition-colors"
                    title={`${mergeTag.label} - e.g. ${mergeTag.example}`}
                    disabled={isSaving}
                  >
                    {mergeTag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Fields */}
            {channel === 'email' && (
              <>
                <div>
                  <label htmlFor="template-subject" className="input-label">
                    Subject Line <span className="text-danger">*</span>
                  </label>
                  <input
                    id="template-subject"
                    ref={subjectRef}
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onFocus={() => handleFocus(subjectRef)}
                    className="input"
                    placeholder="e.g., {{first_name}}, your appointment is confirmed"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label htmlFor="template-html" className="input-label">
                    HTML Body
                  </label>
                  <textarea
                    id="template-html"
                    ref={htmlBodyRef}
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    onFocus={() => handleFocus(htmlBodyRef)}
                    className="input min-h-[180px] font-mono text-sm"
                    placeholder="<html>&#10;  <body>&#10;    <h1>Hello {{first_name}}</h1>&#10;  </body>&#10;</html>"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label htmlFor="template-text-fallback" className="input-label">
                    Plain Text Fallback <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="template-text-fallback"
                    ref={textBodyRef}
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    onFocus={() => handleFocus(textBodyRef)}
                    className="input min-h-[120px]"
                    placeholder="Hello {{first_name}}, ..."
                    required
                    disabled={isSaving}
                  />
                </div>
              </>
            )}

            {/* SMS Fields */}
            {channel === 'sms' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="template-sms-body" className="input-label mb-0">
                    Message Body <span className="text-danger">*</span>
                  </label>
                  <span
                    className={`text-xs font-mono ${
                      smsInfo.segments > 2 ? 'text-danger' : 'text-ash-400'
                    }`}
                  >
                    {smsInfo.display}
                  </span>
                </div>
                <textarea
                  id="template-sms-body"
                  ref={textBodyRef}
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  onFocus={() => handleFocus(textBodyRef)}
                  className="input min-h-[120px]"
                  placeholder="Hi {{first_name}}, this is {{business_name}}. ..."
                  required
                  disabled={isSaving}
                />
                {smsInfo.segments > 2 && (
                  <p className="text-xs text-danger mt-1">
                    Long messages cost more. Consider keeping under 320 characters (2
                    segments).
                  </p>
                )}
              </div>
            )}

            {/* Compliance Result */}
            {complianceResult && !complianceResult.valid && (
              <div className="bg-danger/10 border border-danger/30 rounded-btn p-4">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-danger shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-danger mb-1">
                      Compliance Errors
                    </p>
                    <ul className="space-y-1">
                      {complianceResult.errors.map((err, i) => (
                        <li key={i} className="text-sm text-danger">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {complianceResult &&
              complianceResult.valid &&
              complianceResult.warnings.length > 0 && (
                <div className="bg-ember-500/10 border border-ember-500/30 rounded-btn p-4">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-ember-500 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-ember-500 mb-1">
                        Warnings
                      </p>
                      <ul className="space-y-1">
                        {complianceResult.warnings.map((warn, i) => (
                          <li key={i} className="text-sm text-ember-500">
                            {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            {/* Live Preview Toggle */}
            <div className="border-t border-char-700 pt-6">
              <button
                type="button"
                onClick={() => setShowPreview((prev) => !prev)}
                className="flex items-center gap-2 text-sm text-ash-300 hover:text-flame-500 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showPreview ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
                Live Preview
              </button>

              {showPreview && (
                <div className="mt-4 bg-char-900 border border-char-700 rounded-btn p-4">
                  <h4 className="text-xs font-display uppercase text-ash-400 mb-3">
                    Preview with Sample Data
                  </h4>

                  {channel === 'email' && previewContent.subject && (
                    <div className="mb-3">
                      <span className="text-xs text-ash-500">Subject:</span>
                      <p className="text-sm text-ash-100 font-medium">
                        {previewContent.subject}
                      </p>
                    </div>
                  )}

                  {channel === 'email' && previewContent.html && (
                    <div className="mb-3">
                      <span className="text-xs text-ash-500">HTML Body:</span>
                      <div
                        className="mt-1 p-3 bg-white rounded text-char-900 text-sm overflow-auto max-h-[200px]"
                        dangerouslySetInnerHTML={{ __html: previewContent.html }}
                      />
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-ash-500">
                      {channel === 'email' ? 'Plain Text:' : 'Message:'}
                    </span>
                    <p className="mt-1 text-sm text-ash-200 whitespace-pre-wrap">
                      {previewContent.text || (
                        <span className="text-ash-500 italic">
                          No content yet
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-char-700 p-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isSaving || !name.trim() || !textBody.trim()}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="spinner-sm" />
                Saving...
              </span>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Create Template'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
