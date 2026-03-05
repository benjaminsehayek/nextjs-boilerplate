'use client';

import { useMemo } from 'react';

interface PagePreviewProps {
  html: string;
  css?: string | null;
  js?: string | null;
  className?: string;
}

export default function PagePreview({ html, css, js, className = '' }: PagePreviewProps) {
  const srcDoc = useMemo(() => {
    const baseStyles = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; background: #fff; padding: 1rem; }
        img { max-width: 100%; height: auto; }
        h1,h2,h3,h4 { line-height: 1.2; margin-bottom: 0.75rem; }
        p { margin-bottom: 1rem; }
        ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
        a { color: #e65a00; }
      </style>
    `.trim();

    const userCss = css ? `<style>${css}</style>` : '';
    const userJs = js ? `<script>${js}</script>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${baseStyles}
  ${userCss}
</head>
<body>
  ${html}
  ${userJs}
</body>
</html>`;
  }, [html, css, js]);

  if (!html.trim()) {
    return (
      <div className={`flex items-center justify-center bg-char-900 text-ash-500 text-sm rounded-btn ${className}`}>
        No content yet — generate or write HTML to preview
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcDoc}
      className={`w-full rounded-btn border border-char-700 bg-white ${className}`}
      sandbox="allow-scripts"
      title="Page preview"
    />
  );
}
