'use client';

import { useState } from 'react';
import type { CalendarItemV2, CalendarItemType } from '@/types';
import ContentBriefModal from './ContentBriefModal';

interface CalendarItemCardProps {
  item: CalendarItemV2;
  businessName: string;
  domain: string;
  industry: string;
  city?: string;
  state?: string;
  onStatusChange: (id: string, status: 'scheduled' | 'done' | 'skipped') => void;
  onContentGenerated?: (id: string, content: string) => void;
}

const TYPE_META: Record<CalendarItemType, { label: string; color: string; bg: string; icon: string }> = {
  gbp_post:          { label: 'GBP Post',    color: 'text-sky-400',     bg: 'bg-sky-400/10 border-sky-400/20',     icon: '📍' },
  blog_post:         { label: 'Blog Post',   color: 'text-violet-400',  bg: 'bg-violet-400/10 border-violet-400/20', icon: '✍️' },
  offpage_post:      { label: 'Off-Page',    color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: '🔗' },
  website_addition:  { label: 'New Page',    color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',   icon: '📄' },
  website_change:    { label: 'Fix Page',    color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/20',  icon: '🔧' },
};

const STATUS_CYCLE: Record<string, 'scheduled' | 'done' | 'skipped'> = {
  scheduled: 'done',
  done: 'skipped',
  skipped: 'scheduled',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  done: 'Done',
  skipped: 'Skipped',
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-char-700 text-ash-400',
  done: 'bg-success/15 text-success',
  skipped: 'bg-char-800 text-ash-600 line-through',
};

function buildPrompt(item: CalendarItemV2, businessName: string, domain: string, industry: string, city: string) {
  switch (item.type) {
    case 'gbp_post':
      return `Write a Google Business Profile post for ${businessName || '[COMPANY]'}, a ${industry || 'local'} business${city ? ` in ${city}` : ''}. Target keyword: "${item.primaryKeyword}". 150–200 words. Include a specific service highlight, a trust signal (licensed, insured, years of experience), and a direct CTA (call or book). Professional but friendly tone. Do NOT use hashtags.`;

    case 'offpage_post':
      return `Write a professional business directory listing description for ${businessName || '[COMPANY]'}, a ${industry || 'local'} business${city ? ` in ${city}` : ''}. Target keyword: "${item.primaryKeyword || item.targetPlatform}". 100–150 words. Describe what they do, their service area, and why customers choose them. No promotional language. Use [PHONE] and [ADDRESS] as placeholders for contact info.`;

    case 'website_addition':
      return `Write a comprehensive, SEO-optimized service page for ${businessName || '[COMPANY]'}, a ${industry || 'local'} business at ${domain}. Page targeting: "${item.primaryKeyword}". Requirements:\n- 800–1,200 words\n- Proper HTML headings (H1, H2, H3)\n- Meta description in an HTML comment at the top\n- FAQ section with 3–5 questions\n- Use [PHONE] and [COMPANY] as placeholders\n- Professional but approachable tone\n- Direct CTA in conclusion\nReturn ONLY the HTML body content (no <html>/<body> tags).`;

    case 'blog_post':
      return `Write an SEO-optimized blog post for ${businessName || '[COMPANY]'}, a ${industry || 'local'} business${city ? ` in ${city}` : ''}. Target keyword: "${item.primaryKeyword}". Requirements:\n- 800–1,200 words\n- H1 matching the keyword intent\n- 3–4 H2 sections covering related subtopics\n- FAQ section with 3–5 questions and concise answers\n- At least one internal link suggestion to a relevant service page (use [LINK TO SERVICE PAGE] as placeholder)\n- Authoritative but approachable tone\n- Conclude with a soft CTA mentioning ${businessName || '[COMPANY]'}\nReturn the blog post in plain text with markdown headings.`;

    case 'website_change':
      return `You are an SEO specialist for ${domain} (${industry || 'local business'}). Provide specific, copy-paste-ready fixes for each issue listed below. For meta titles stay under 60 characters; for meta descriptions stay under 160 characters. Output a numbered list matching the issues — give exact replacement text, not just advice.\n\n${item.action}`;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function CalendarItemCard({
  item, businessName, domain, industry, city = '', state = '', onStatusChange, onContentGenerated,
}: CalendarItemCardProps) {
  const meta = TYPE_META[item.type];
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState(item.generatedContent ?? '');
  const [genError, setGenError] = useState('');
  const [copied, setCopied] = useState(false);

  // Brief generation state
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefContent, setBriefContent] = useState('');
  const [briefError, setBriefError] = useState('');
  const [showBriefModal, setShowBriefModal] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setGenError('');
    try {
      const prompt = buildPrompt(item, businessName, domain, industry, city);
      const res = await fetch('/api/claude/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 2048 }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const generated = data.text || data.content?.[0]?.text || '';
      setContent(generated);
      setExpanded(true);
      onContentGenerated?.(item.id, generated);
    } catch (err: any) {
      setGenError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateBrief() {
    setGeneratingBrief(true);
    setBriefError('');
    setBriefContent('');

    const location = [city, state].filter(Boolean).join(', ');
    const secondaryKeywords = item.keywords.filter(k => k !== item.primaryKeyword).slice(0, 5);
    // Estimate word count based on type
    const wordCount = item.type === 'blog_post' ? 1200 : item.type === 'website_addition' ? 900 : 600;

    const prompt = `Generate a structured content brief for a local SEO blog post.
Business: ${businessName || '[COMPANY]'} in ${location || '[CITY, STATE]'}
Service: ${item.type === 'website_addition' || item.type === 'blog_post' ? (item.primaryKeyword || item.title) : item.title}
Target Keyword: ${item.primaryKeyword}
Secondary Keywords: ${secondaryKeywords.join(', ') || 'none'}

Provide exactly:
- Meta Title (55-60 chars, include keyword)
- Meta Description (150-160 chars)
- Suggested H2 Headings (5-7, include secondary keywords naturally)
- Estimated Word Count: ${wordCount}
- Internal Link Opportunities: 3 suggestions based on service
- Call to Action: localized CTA

Format as clean structured text, no markdown beyond headers.`;

    const delays = [0, 2000, 4000];
    let lastError = '';

    for (let attempt = 0; attempt < 3; attempt++) {
      if (delays[attempt] > 0) await sleep(delays[attempt]);
      try {
        const res = await fetch('/api/claude/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, maxTokens: 1024 }),
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        const generated = data.text || data.content?.[0]?.text || '';
        if (generated) {
          setBriefContent(generated);
          setShowBriefModal(true);
          setGeneratingBrief(false);
          return;
        }
        lastError = 'Empty response from API';
      } catch (err: any) {
        lastError = err.message || 'Brief generation failed';
      }
    }

    setBriefError(lastError || 'Brief generation failed after 3 attempts');
    setGeneratingBrief(false);
  }

  function handleCopy() {
    const text = item.type === 'website_addition'
      ? content
      : content.replace(/<[^>]+>/g, '').trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isSkipped = item.status === 'skipped';

  return (
    <div className={`card p-4 transition-opacity ${isSkipped ? 'opacity-40' : ''}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} font-medium`}>
              {meta.icon} {meta.label}
            </span>
            {item.primaryKeyword && (
              <span className="text-xs bg-char-700 text-ash-400 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                {item.primaryKeyword}
              </span>
            )}
            {item.roiValue > 0 && (
              <span className="text-xs text-success font-display ml-auto">${item.roiValue.toLocaleString()}/mo</span>
            )}
          </div>
          <p className="font-display text-sm text-ash-200 leading-snug">{item.title}</p>
        </div>

        {/* Status toggle */}
        <button
          onClick={() => onStatusChange(item.id, STATUS_CYCLE[item.status])}
          className={`text-xs px-2 py-1 rounded-btn whitespace-nowrap flex-shrink-0 ${STATUS_STYLE[item.status]}`}
        >
          {STATUS_LABEL[item.status]}
        </button>
      </div>

      {/* Action + rationale toggle */}
      <button
        className="mt-2 text-xs text-ash-500 hover:text-ash-300 transition-colors flex items-center gap-1"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? '▲ Hide details' : '▼ Show details'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="text-xs text-ash-500 uppercase tracking-wide">Action</span>
            <p className="text-ash-300 mt-0.5">{item.action}</p>
          </div>
          <div>
            <span className="text-xs text-ash-500 uppercase tracking-wide">Why</span>
            <p className="text-ash-400 mt-0.5 text-xs">{item.rationale}</p>
          </div>
          {item.targetUrl && (
            <div>
              <span className="text-xs text-ash-500 uppercase tracking-wide">Target URL</span>
              <p className="text-flame-400 mt-0.5 text-xs font-mono">{item.targetUrl}</p>
            </div>
          )}
          {item.targetPlatform && (
            <div>
              <span className="text-xs text-ash-500 uppercase tracking-wide">Platform</span>
              <p className="text-ash-300 mt-0.5 text-xs">{item.targetPlatform}</p>
            </div>
          )}
        </div>
      )}

      {/* Generate buttons */}
      {!isSkipped && (
        <div className="mt-3 flex items-center flex-wrap gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-ghost text-xs py-1.5"
          >
            {generating ? 'Generating…' : content ? 'Regenerate Content' : 'Generate Content'}
          </button>
          {(item.type === 'blog_post' || item.type === 'website_addition') && (
            <button
              onClick={handleGenerateBrief}
              disabled={generatingBrief}
              className="btn-ghost text-xs py-1.5"
            >
              {generatingBrief ? 'Generating Brief…' : 'Generate Brief'}
            </button>
          )}
          {genError && <span className="text-xs text-danger">{genError}</span>}
          {briefError && <span className="text-xs text-danger">{briefError}</span>}
        </div>
      )}

      {/* Generated content */}
      {content && !isSkipped && (
        <div className="mt-3 border-t border-char-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ash-500 uppercase tracking-wide">Generated Content</span>
            <button onClick={handleCopy} className="btn-ghost text-xs py-1">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {item.type === 'website_addition' ? (
            <pre className="text-xs text-ash-300 bg-char-900 p-3 rounded-btn overflow-x-auto max-h-48 whitespace-pre-wrap">
              {content}
            </pre>
          ) : (
            <div className="text-sm text-ash-300 bg-char-900 p-3 rounded-btn max-h-48 overflow-y-auto whitespace-pre-wrap">
              {content.replace(/<[^>]+>/g, '')}
            </div>
          )}
        </div>
      )}

      {/* Content Brief Modal */}
      {showBriefModal && briefContent && (
        <ContentBriefModal
          keyword={item.primaryKeyword || item.title}
          briefContent={briefContent}
          onClose={() => setShowBriefModal(false)}
        />
      )}
    </div>
  );
}
