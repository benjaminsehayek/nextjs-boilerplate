'use client';

import { useState, useEffect } from 'react';

interface ContentBriefModalProps {
  keyword: string;
  briefContent: string;
  onClose: () => void;
}

interface LinkSuggestion {
  path: string;
  reason: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function getInternalLinkSuggestions(keyword: string): LinkSuggestion[] {
  // Try to read site-audit pages from localStorage
  try {
    const raw = localStorage.getItem('site-audit-pages');
    if (raw) {
      const pages: Array<{ path?: string; title?: string; url?: string }> = JSON.parse(raw);
      const kwLower = keyword.toLowerCase();
      const kwWords = kwLower.split(/\s+/).filter((w) => w.length > 3);

      const matches: LinkSuggestion[] = [];
      for (const page of pages) {
        const pathStr = (page.path || page.url || '').toLowerCase();
        const titleStr = (page.title || '').toLowerCase();
        const combined = pathStr + ' ' + titleStr;
        const hasMatch = kwWords.some((w) => combined.includes(w));
        if (hasMatch && matches.length < 3) {
          matches.push({
            path: page.path || page.url || '/',
            reason: `Related page matching "${keyword}"`,
          });
        }
      }
      if (matches.length > 0) return matches;
    }
  } catch {
    // localStorage not available or parse error
  }

  // Fallback: generic suggestions
  const slug = slugify(keyword);
  return [
    { path: `/services/${slug}`, reason: 'Link from your main services page' },
    { path: '/about', reason: 'Link from About Us for brand authority' },
    { path: '/contact', reason: 'Add CTA link to Contact page in content' },
  ];
}

export default function ContentBriefModal({ keyword, briefContent, onClose }: ContentBriefModalProps) {
  const [copied, setCopied] = useState(false);
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([]);
  const [showLinkTooltip, setShowLinkTooltip] = useState(false);

  useEffect(() => {
    setLinkSuggestions(getInternalLinkSuggestions(keyword));
  }, [keyword]);

  function handleCopy() {
    navigator.clipboard.writeText(briefContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-char-800 border border-char-700 rounded-btn shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-modal-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-char-700 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-ash-100 text-lg truncate">
              Content Brief
            </h2>
            <p className="text-xs text-ash-500 truncate mt-0.5">{keyword}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-8 h-8 flex-shrink-0 ml-4"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <pre className="text-sm text-ash-300 whitespace-pre-wrap font-mono leading-relaxed bg-char-900 p-4 rounded-btn">
            {briefContent}
          </pre>

          {/* Internal Link Suggestions */}
          <div className="border border-char-700 rounded-btn p-4 bg-char-900/40">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-ash-200">Suggested Internal Links</h3>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowLinkTooltip(true)}
                  onMouseLeave={() => setShowLinkTooltip(false)}
                  className="w-4 h-4 rounded-full bg-char-600 text-ash-400 text-xs flex items-center justify-center hover:bg-char-500 transition-colors"
                  aria-label="About internal link suggestions"
                >
                  i
                </button>
                {showLinkTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-char-700 border border-char-600 rounded-btn px-3 py-2 text-xs text-ash-300 shadow-lg z-10 text-center">
                    Based on your most recent site audit
                  </div>
                )}
              </div>
            </div>
            <ul className="space-y-2">
              {linkSuggestions.map((s) => (
                <li key={s.path} className="flex items-start gap-2 text-sm">
                  <span className="text-ash-400 mt-0.5 flex-shrink-0">&#128206;</span>
                  <span>
                    <code className="text-flame-400 text-xs bg-char-800 px-1.5 py-0.5 rounded">{s.path}</code>
                    <span className="text-ash-400 ml-2">— {s.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-char-700 flex-shrink-0">
          <button onClick={onClose} className="btn-ghost text-sm">
            Close
          </button>
          <button onClick={handleCopy} className="btn-primary text-sm">
            {copied ? 'Copied!' : 'Copy Brief'}
          </button>
        </div>
      </div>
    </div>
  );
}
