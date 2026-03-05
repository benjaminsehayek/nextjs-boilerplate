'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Load CodeMirror only on the client
const CodeMirrorEditor = dynamic(() => import('./CodeMirrorEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-char-900 rounded-btn flex items-center justify-center text-ash-500 text-sm">
      Loading editor…
    </div>
  ),
});

type EditorTab = 'html' | 'css' | 'js';

interface PageEditorProps {
  html: string;
  css: string;
  js: string;
  onHtmlChange: (v: string) => void;
  onCssChange: (v: string) => void;
  onJsChange: (v: string) => void;
  className?: string;
}

export default function PageEditor({
  html,
  css,
  js,
  onHtmlChange,
  onCssChange,
  onJsChange,
  className = '',
}: PageEditorProps) {
  const [tab, setTab] = useState<EditorTab>('html');

  const tabs: { id: EditorTab; label: string; hasContent: boolean }[] = [
    { id: 'html', label: 'HTML', hasContent: html.trim().length > 0 },
    { id: 'css', label: 'CSS', hasContent: css.trim().length > 0 },
    { id: 'js', label: 'JS', hasContent: js.trim().length > 0 },
  ];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Tab bar */}
      <div className="flex gap-1 px-3 pt-2 bg-char-900 border-b border-char-700 rounded-t-btn">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-t transition-colors
              ${tab === t.id
                ? 'bg-char-800 text-ash-100 border-b-2 border-flame-500'
                : 'text-ash-400 hover:text-ash-200'
              }
            `}
          >
            {t.label}
            {t.hasContent && tab !== t.id && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-flame-500/60" />
            )}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="flex-1 min-h-0 rounded-b-btn overflow-hidden">
        {tab === 'html' && (
          <CodeMirrorEditor
            key="html"
            value={html}
            onChange={onHtmlChange}
            language="html"
            className="h-full"
          />
        )}
        {tab === 'css' && (
          <CodeMirrorEditor
            key="css"
            value={css}
            onChange={onCssChange}
            language="css"
            className="h-full"
          />
        )}
        {tab === 'js' && (
          <CodeMirrorEditor
            key="js"
            value={js}
            onChange={onJsChange}
            language="javascript"
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
