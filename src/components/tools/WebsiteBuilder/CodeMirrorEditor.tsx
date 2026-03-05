'use client';

import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

const langMap = {
  html: html(),
  css: css(),
  javascript: javascript(),
} as const;

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: keyof typeof langMap;
  className?: string;
}

const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" },
  '.cm-content': { padding: '8px 0' },
});

export default function CodeMirrorEditor({ value, onChange, language, className = '' }: CodeMirrorEditorProps) {
  return (
    <div className={`h-full ${className}`}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[langMap[language], baseTheme]}
        theme={oneDark}
        height="100%"
        style={{ height: '100%' }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          autocompletion: true,
          closeBrackets: true,
        }}
      />
    </div>
  );
}
