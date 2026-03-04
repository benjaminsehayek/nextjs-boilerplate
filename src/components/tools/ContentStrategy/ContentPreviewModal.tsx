'use client';

import { useEffect } from 'react';

interface ContentPreviewModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

export default function ContentPreviewModal({ title, content, onClose }: ContentPreviewModalProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleCopyHTML() {
    navigator.clipboard.writeText(content);
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-char-800 border border-char-700 rounded-card w-full max-w-4xl max-h-screen flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-char-700 flex-shrink-0">
          <h2 className="font-display text-sm text-ash-200 truncate min-w-0">{title}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopyHTML}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              Copy HTML
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-char-700 text-ash-400 hover:text-ash-200 transition-colors text-sm"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div
            className="prose prose-invert max-w-none text-ash-300 [&_h1]:text-ash-100 [&_h2]:text-ash-200 [&_h3]:text-ash-200 [&_a]:text-flame-400"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-char-700 flex-shrink-0">
          <button
            disabled
            title="Connect GBP in Settings"
            className="btn-primary text-sm opacity-40 cursor-not-allowed"
          >
            Publish to GBP
          </button>
        </div>
      </div>
    </div>
  );
}
