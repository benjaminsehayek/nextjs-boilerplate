'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  Channel,
  AudienceType,
  MessageTemplate,
  CreateCampaignInput,
} from '@/lib/marketing/types';
import type { Contact, Segment } from '@/components/tools/LeadDatabase/types';
import {
  validateEmailCompliance,
  validateSMSCompliance,
  filterEligibleContacts,
} from '@/lib/marketing/compliance';
import { AVAILABLE_TAGS, previewTemplate } from '@/lib/marketing/merge-tags';
import AudienceSelector from './AudienceSelector';

interface CampaignComposerProps {
  templates: MessageTemplate[];
  contacts: Contact[];
  segments: Segment[];
  lists: string[];
  tags: string[];
  onSave: (input: CreateCampaignInput) => void;
  onSend: (campaignId: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
  isSending?: boolean;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: 'Setup',
  2: 'Content',
  3: 'Audience',
  4: 'Review & Send',
};

export default function CampaignComposer({
  templates,
  contacts,
  segments,
  lists,
  tags,
  onSave,
  onSend,
  onCancel,
  isSaving = false,
  isSending = false,
}: CampaignComposerProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Setup
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);

  // Step 2: Content
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [textBody, setTextBody] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Step 3: Audience
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [audienceValue, setAudienceValue] = useState('');

  // Step 4: saved campaign id (returned from onSave)
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  // Filter templates by channel
  const channelTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel),
    [templates, channel],
  );

  // Apply template when selected
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        setSubject(tpl.subject || '');
        setHtmlBody(tpl.html_body || '');
        setTextBody(tpl.text_body);
      }
    },
    [templates],
  );

  // Clear content when switching to "from scratch"
  const handleToggleTemplate = (use: boolean) => {
    setUseTemplate(use);
    if (!use) {
      setSelectedTemplateId('');
    }
  };

  // Reset content fields when channel changes
  const handleChannelChange = (ch: Channel) => {
    setChannel(ch);
    setSelectedTemplateId('');
    setSubject('');
    setHtmlBody('');
    setTextBody('');
    setSenderName('');
    setSenderEmail('');
    setSenderPhone('');
  };

  // Insert merge tag at cursor (simplified: append to body)
  const insertMergeTag = (tag: string) => {
    setTextBody((prev) => prev + tag);
    if (channel === 'email') {
      setHtmlBody((prev) => prev + tag);
    }
  };

  // Compliance check for review step
  const complianceResult = useMemo(() => {
    if (channel === 'email') {
      return validateEmailCompliance(htmlBody, textBody, senderName || null, senderEmail || null);
    }
    return validateSMSCompliance(textBody);
  }, [channel, htmlBody, textBody, senderName, senderEmail]);

  // Audience eligible count
  const audienceStats = useMemo(() => {
    // Resolve audience contacts
    let audienceContacts: Contact[];
    switch (audienceType) {
      case 'all':
        audienceContacts = contacts;
        break;
      case 'segment': {
        const seg = segments.find((s) => s.id === audienceValue);
        if (!seg) { audienceContacts = []; break; }
        audienceContacts = contacts.filter((c) => {
          const f = seg.filter;
          if (f.emailOptIn !== undefined && c.emailOptIn !== f.emailOptIn) return false;
          if (f.smsOptIn !== undefined && c.smsOptIn !== f.smsOptIn) return false;
          if (f.minElv !== undefined && c.elv < f.minElv) return false;
          if (f.maxElv !== undefined && c.elv > f.maxElv) return false;
          if (f.source && f.source.length > 0 && !f.source.includes(c.source)) return false;
          if (f.tags && f.tags.length > 0 && !f.tags.some((t) => c.tags.includes(t))) return false;
          if (f.lists && f.lists.length > 0 && !f.lists.some((l) => c.lists.includes(l))) return false;
          return true;
        });
        break;
      }
      case 'list':
        audienceContacts = audienceValue ? contacts.filter((c) => c.lists.includes(audienceValue)) : [];
        break;
      case 'tag':
        audienceContacts = audienceValue ? contacts.filter((c) => c.tags.includes(audienceValue)) : [];
        break;
      case 'manual': {
        const ids = new Set(audienceValue.split(',').filter(Boolean));
        audienceContacts = contacts.filter((c) => ids.has(c.id));
        break;
      }
      default:
        audienceContacts = [];
    }
    return filterEligibleContacts(audienceContacts, channel);
  }, [contacts, segments, audienceType, audienceValue, channel]);

  // Preview rendered content
  const previewContent = useMemo(
    () => previewTemplate(textBody),
    [textBody],
  );
  const previewSubject = useMemo(
    () => (subject ? previewTemplate(subject) : ''),
    [subject],
  );

  // SMS char counter
  const smsCharCount = textBody.length;
  const smsSegments = smsCharCount <= 160 ? 1 : Math.ceil(smsCharCount / 153);

  // Step validations
  const stepErrors = useMemo((): Record<Step, string[]> => {
    const errors: Record<Step, string[]> = { 1: [], 2: [], 3: [], 4: [] };

    // Step 1
    if (!name.trim()) errors[1].push('Campaign name is required');

    // Step 2
    if (channel === 'email') {
      if (!subject.trim()) errors[2].push('Subject line is required');
      if (!textBody.trim()) errors[2].push('Email body is required');
    } else {
      if (!textBody.trim()) errors[2].push('SMS body is required');
    }

    // Step 3
    if (audienceType === 'segment' && !audienceValue) errors[3].push('Select a segment');
    if (audienceType === 'list' && !audienceValue) errors[3].push('Select a list');
    if (audienceType === 'tag' && !audienceValue) errors[3].push('Select a tag');
    if (audienceType === 'manual' && !audienceValue) errors[3].push('Select at least one contact');
    if (audienceStats.eligible.length === 0) errors[3].push('No eligible recipients for this channel');

    // Step 4 = compliance
    errors[4] = [...complianceResult.errors];

    return errors;
  }, [name, channel, subject, textBody, audienceType, audienceValue, audienceStats, complianceResult]);

  const canAdvance = (step: Step): boolean => stepErrors[step].length === 0;

  const goNext = () => {
    if (currentStep < 4 && canAdvance(currentStep)) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };
  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSave = () => {
    const input: CreateCampaignInput = {
      name,
      channel,
      template_id: selectedTemplateId || undefined,
      subject: channel === 'email' ? subject : undefined,
      html_body: channel === 'email' ? htmlBody : undefined,
      text_body: textBody,
      sender_name: senderName || undefined,
      sender_email: channel === 'email' ? senderEmail || undefined : undefined,
      sender_phone: channel === 'sms' ? senderPhone || undefined : undefined,
      audience_type: audienceType,
      audience_value: audienceValue || undefined,
    };
    onSave(input);
  };

  const handleSend = () => {
    if (savedCampaignId) {
      onSend(savedCampaignId);
    } else {
      // Save first, then the parent should set savedCampaignId via a callback
      handleSave();
    }
  };

  // Get audience label for review
  const audienceLabel = useMemo(() => {
    switch (audienceType) {
      case 'all':
        return 'All Contacts';
      case 'segment': {
        const seg = segments.find((s) => s.id === audienceValue);
        return seg ? `Segment: ${seg.name}` : 'Segment (not selected)';
      }
      case 'list':
        return audienceValue ? `List: ${audienceValue}` : 'List (not selected)';
      case 'tag':
        return audienceValue ? `Tag: ${audienceValue}` : 'Tag (not selected)';
      case 'manual': {
        const count = audienceValue ? audienceValue.split(',').filter(Boolean).length : 0;
        return `${count} manually selected contact${count !== 1 ? 's' : ''}`;
      }
      default:
        return '';
    }
  }, [audienceType, audienceValue, segments]);

  return (
    <div className="card">
      {/* Header */}
      <div className="border-b border-char-700 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-display text-ash-100">New Campaign</h2>
        <button onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>

      {/* Step Indicators */}
      <div className="border-b border-char-700 px-6 py-3">
        <div className="flex items-center gap-2">
          {([1, 2, 3, 4] as Step[]).map((step) => (
            <div key={step} className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Only allow going back to visited steps
                  if (step < currentStep) setCurrentStep(step);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                  step === currentStep
                    ? 'bg-flame-500/10 text-flame-500'
                    : step < currentStep
                      ? 'text-ash-300 hover:text-ash-100 cursor-pointer'
                      : 'text-ash-500 cursor-default'
                }`}
                disabled={step > currentStep}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-display ${
                    step === currentStep
                      ? 'bg-flame-500 text-white'
                      : step < currentStep
                        ? 'bg-char-600 text-ash-300'
                        : 'bg-char-700 text-ash-500'
                  }`}
                >
                  {step < currentStep ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </span>
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </button>
              {step < 4 && (
                <div className={`w-8 h-px ${step < currentStep ? 'bg-flame-500' : 'bg-char-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {/* ─── Step 1: Setup ─── */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-xl">
            {/* Campaign Name */}
            <div>
              <label className="input-label">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Promo 2026"
                className="input"
              />
            </div>

            {/* Channel */}
            <div>
              <label className="input-label">Channel</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChannelChange('email')}
                  className={`flex-1 p-4 rounded-btn border text-center transition-colors ${
                    channel === 'email'
                      ? 'border-flame-500 bg-flame-500/5 text-ash-100'
                      : 'border-char-700 bg-char-900 text-ash-400 hover:border-char-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <div className="text-sm font-medium">Email</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelChange('sms')}
                  className={`flex-1 p-4 rounded-btn border text-center transition-colors ${
                    channel === 'sms'
                      ? 'border-flame-500 bg-flame-500/5 text-ash-100'
                      : 'border-char-700 bg-char-900 text-ash-400 hover:border-char-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  <div className="text-sm font-medium">SMS</div>
                </button>
              </div>
            </div>

            {/* Template or Scratch */}
            <div>
              <label className="input-label">Starting Point</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleTemplate(true)}
                  className={`flex-1 p-3 rounded-btn border text-sm transition-colors ${
                    useTemplate
                      ? 'border-flame-500 bg-flame-500/5 text-ash-100'
                      : 'border-char-700 bg-char-900 text-ash-400 hover:border-char-600'
                  }`}
                >
                  Use a template
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTemplate(false)}
                  className={`flex-1 p-3 rounded-btn border text-sm transition-colors ${
                    !useTemplate
                      ? 'border-flame-500 bg-flame-500/5 text-ash-100'
                      : 'border-char-700 bg-char-900 text-ash-400 hover:border-char-600'
                  }`}
                >
                  Start from scratch
                </button>
              </div>
            </div>

            {/* Template Picker */}
            {useTemplate && (
              <div>
                <label className="input-label">Select Template</label>
                {channelTemplates.length === 0 ? (
                  <p className="text-sm text-ash-500 bg-char-900 border border-char-700 rounded-btn p-4 text-center">
                    No {channel} templates available. Create one in Templates first, or start from scratch.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {channelTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleTemplateSelect(tpl.id)}
                        className={`w-full text-left p-3 rounded-btn border transition-colors ${
                          selectedTemplateId === tpl.id
                            ? 'border-flame-500 bg-flame-500/5'
                            : 'border-char-700 bg-char-900 hover:border-char-600'
                        }`}
                      >
                        <div className="text-sm font-medium text-ash-100">{tpl.name}</div>
                        <div className="text-xs text-ash-500 mt-0.5">
                          {tpl.category} &middot; {tpl.subject || 'No subject'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Content ─── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor Side */}
              <div className="space-y-4">
                {/* Sender Info (Email) */}
                {channel === 'email' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="input-label">Sender Name</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Your Business Name"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="input-label">Sender Email</label>
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="hello@yourbusiness.com"
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {/* Sender Info (SMS) */}
                {channel === 'sms' && (
                  <div>
                    <label className="input-label">Sender Phone</label>
                    <input
                      type="tel"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="(503) 555-0100"
                      className="input"
                    />
                  </div>
                )}

                {/* Subject (Email only) */}
                {channel === 'email' && (
                  <div>
                    <label className="input-label">Subject Line</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Don't miss our spring special!"
                      className="input"
                    />
                  </div>
                )}

                {/* Merge Tag Buttons */}
                <div>
                  <label className="input-label">Insert Merge Tag</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TAGS.map((mt) => (
                      <button
                        key={mt.tag}
                        type="button"
                        onClick={() => insertMergeTag(mt.tag)}
                        className="px-2 py-1 text-xs rounded-btn bg-char-700 border border-char-600 text-ash-300 hover:border-flame-500 hover:text-flame-500 transition-colors"
                        title={`Inserts ${mt.tag} (e.g. "${mt.example}")`}
                      >
                        {mt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Editor */}
                <div>
                  <label className="input-label">
                    {channel === 'email' ? 'Email Body' : 'SMS Body'}
                  </label>
                  <textarea
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    placeholder={
                      channel === 'email'
                        ? 'Write your email content here...\n\nDon\'t forget to include {{unsubscribe_url}} for compliance.'
                        : 'Write your SMS here...\n\nRemember to include opt-out instructions.'
                    }
                    rows={channel === 'email' ? 10 : 5}
                    className="input font-mono text-sm resize-y"
                  />

                  {/* SMS Character Counter */}
                  {channel === 'sms' && (
                    <div className="flex justify-between mt-1.5">
                      <span
                        className={`text-xs ${
                          smsCharCount > 320
                            ? 'text-red-400'
                            : smsCharCount > 160
                              ? 'text-amber-400'
                              : 'text-ash-500'
                        }`}
                      >
                        {smsCharCount} / 160 characters
                      </span>
                      <span className="text-xs text-ash-500">
                        {smsSegments} SMS segment{smsSegments !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* HTML Body (Email only, separate field) */}
                {channel === 'email' && (
                  <div>
                    <label className="input-label">HTML Body (Optional)</label>
                    <textarea
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      placeholder="Paste HTML for rich email formatting, or leave blank to use plain text."
                      rows={6}
                      className="input font-mono text-xs resize-y"
                    />
                  </div>
                )}
              </div>

              {/* Preview Side */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="input-label mb-0">Live Preview</label>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-flame-500 hover:underline lg:hidden"
                  >
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>
                <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
                  <div className="rounded-btn border border-char-700 bg-char-900 overflow-hidden">
                    {channel === 'email' && previewSubject && (
                      <div className="px-4 py-2 border-b border-char-700 text-sm">
                        <span className="text-ash-500">Subject:</span>{' '}
                        <span className="text-ash-100">{previewSubject}</span>
                      </div>
                    )}
                    <div className="p-4">
                      {previewContent ? (
                        <div className="text-sm text-ash-300 whitespace-pre-wrap break-words">
                          {previewContent}
                        </div>
                      ) : (
                        <div className="text-sm text-ash-500 text-center py-8">
                          Start typing to see a preview
                        </div>
                      )}
                    </div>
                    {channel === 'email' && (
                      <div className="px-4 py-2 border-t border-char-700 text-xs text-ash-500">
                        Preview uses sample data: John Smith, Acme Corp
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: Audience ─── */}
        {currentStep === 3 && (
          <div className="max-w-xl">
            <AudienceSelector
              channel={channel}
              contacts={contacts}
              segments={segments}
              lists={lists}
              tags={tags}
              selectedType={audienceType}
              selectedValue={audienceValue}
              onTypeChange={setAudienceType}
              onValueChange={setAudienceValue}
            />
          </div>
        )}

        {/* ─── Step 4: Review & Send ─── */}
        {currentStep === 4 && (
          <div className="max-w-xl space-y-6">
            {/* Campaign Summary */}
            <div className="rounded-btn border border-char-700 bg-char-900 divide-y divide-char-700">
              <SummaryRow label="Campaign" value={name} />
              <SummaryRow label="Channel" value={channel === 'email' ? 'Email' : 'SMS'} />
              {channel === 'email' && <SummaryRow label="Subject" value={subject || '(none)'} />}
              {channel === 'email' && <SummaryRow label="Sender" value={senderName && senderEmail ? `${senderName} <${senderEmail}>` : '(not set)'} />}
              {channel === 'sms' && <SummaryRow label="Sender Phone" value={senderPhone || '(not set)'} />}
              <SummaryRow label="Audience" value={audienceLabel} />
              <SummaryRow
                label="Recipients"
                value={`${audienceStats.eligible.length} eligible`}
                highlight
              />
              {channel === 'sms' && (
                <SummaryRow
                  label="Message Size"
                  value={`${smsCharCount} chars (${smsSegments} segment${smsSegments !== 1 ? 's' : ''})`}
                />
              )}
            </div>

            {/* Compliance Banner */}
            {complianceResult.errors.length > 0 && (
              <div className="rounded-btn border border-red-500/30 bg-red-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Compliance Issues
                </div>
                <ul className="space-y-1">
                  {complianceResult.errors.map((err) => (
                    <li key={err} className="text-xs text-red-300 pl-7">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {complianceResult.warnings.length > 0 && (
              <div className="rounded-btn border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Warnings
                </div>
                <ul className="space-y-1">
                  {complianceResult.warnings.map((warn) => (
                    <li key={warn} className="text-xs text-amber-300 pl-7">
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* All Clear */}
            {complianceResult.valid && complianceResult.warnings.length === 0 && (
              <div className="rounded-btn border border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  All compliance checks passed
                </div>
              </div>
            )}

            {audienceStats.filtered > 0 && (
              <div className="rounded-btn border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-xs text-amber-400">
                  {audienceStats.filtered} contact{audienceStats.filtered !== 1 ? 's' : ''} will be excluded due to missing {channel === 'email' ? 'email' : 'phone'}, opt-in status, or unsubscribe status.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-char-700 px-6 py-4 flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <button type="button" onClick={goBack} className="btn-ghost text-sm">
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Validation errors hint */}
          {stepErrors[currentStep].length > 0 && currentStep < 4 && (
            <span className="text-xs text-red-400 max-w-xs truncate">
              {stepErrors[currentStep][0]}
            </span>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance(currentStep)}
              className="btn-primary text-sm"
            >
              Next
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-ghost text-sm"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner-sm" />
                    Saving...
                  </span>
                ) : (
                  'Save as Draft'
                )}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!complianceResult.valid || audienceStats.eligible.length === 0 || isSending}
                className="btn-primary text-sm"
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner-sm" />
                    Sending...
                  </span>
                ) : (
                  `Send to ${audienceStats.eligible.length} recipient${audienceStats.eligible.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Summary Row Sub-component ─── */

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-ash-400">{label}</span>
      <span
        className={`text-sm font-medium ${
          highlight ? 'text-flame-500' : 'text-ash-100'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
