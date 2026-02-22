'use client';

import { useState, useMemo } from 'react';
import type { ContentGeneratorProps, ContentMapItem } from './types';
import { fmtN } from '@/lib/dataforseo';

export default function ContentGenerator({ items, domain, industry }: ContentGeneratorProps) {
  const [selectedItem, setSelectedItem] = useState<ContentMapItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [contentTab, setContentTab] = useState<'preview' | 'html' | 'text'>('preview');
  const [error, setError] = useState<string | null>(null);

  const gapItems = useMemo(() => {
    return items
      .filter(i => i.status === 'gap' || i.status === 'cannibalized')
      .sort((a, b) => b.totalRoi - a.totalRoi);
  }, [items]);

  async function handleGenerate(item: ContentMapItem) {
    setSelectedItem(item);
    setGenerating(true);
    setError(null);
    setGeneratedContent('');

    const funnelPrompt = item.type === 'service'
      ? 'This is a bottom-funnel service page. Use urgency, trust signals (licensed, insured, years experience), customer testimonials placeholders, and a strong direct CTA (call now, schedule today). Include a FAQ section.'
      : item.type === 'location'
      ? 'This is a location-specific page. Mention the area by name throughout, reference local landmarks/neighborhoods, include local trust signals, and a direct CTA. Include a FAQ section.'
      : 'This is an educational blog post. Be informative and authoritative, include practical tips, explain when to call a professional, and use a soft CTA. Include a FAQ section.';

    const prompt = `Write a comprehensive, SEO-optimized page for a ${industry || 'local business'} website (${domain}).

Page title: "${item.title}"
Primary keyword: "${item.primaryKeyword}"
Related keywords: ${item.keywords.slice(0, 8).join(', ')}
Page type: ${item.type}

${funnelPrompt}

Requirements:
- Write 800-1200 words
- Use proper HTML headings (H1, H2, H3)
- Include a meta description at the top as an HTML comment
- Include a FAQ section with 3-5 questions
- Use [PHONE] as a placeholder for the business phone number
- Use [COMPANY] as a placeholder for the business name
- Write in a professional but approachable tone
- Naturally incorporate the related keywords
- Return ONLY the HTML content (no wrapping html/body tags)`;

    try {
      const res = await fetch('/api/claude/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 4096 }),
      });

      if (!res.ok) throw new Error('Failed to generate content');

      const data = await res.json();
      setGeneratedContent(data.content || data.text || '');
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  const typeIcon = (t: string) => t === 'service' ? '\uD83D\uDD27' : t === 'location' ? '\uD83D\uDCCD' : '\uD83D\uDCDD';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-display text-lg text-ash-200 mb-2">Content Queue</h3>
          <p className="text-xs text-ash-500 mb-4">
            {gapItems.length} gap{gapItems.length !== 1 ? 's' : ''} sorted by ROI potential
          </p>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {gapItems.map((item, i) => (
              <div
                key={i}
                className={`card p-4 cursor-pointer transition-colors ${
                  selectedItem === item ? 'border-flame-500' : 'hover:border-flame-500/30'
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span>{typeIcon(item.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm text-ash-200 truncate">{item.title}</div>
                    <div className="text-xs text-ash-500">{item.keywords.length} keywords</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-display text-sm text-success">${fmtN(item.totalRoi)}</div>
                    <div className="text-xs text-ash-500">/mo</div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerate(item); }}
                  disabled={generating}
                  className="btn-primary text-xs w-full py-1.5"
                >
                  {generating && selectedItem === item ? 'Generating...' : 'Generate'}
                </button>
              </div>
            ))}

            {gapItems.length === 0 && (
              <div className="card p-8 text-center">
                <div className="text-3xl mb-2">&#x2705;</div>
                <p className="text-sm text-ash-400">No content gaps found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Generated Content */}
        <div className="lg:col-span-2">
          {!selectedItem && !generatedContent && (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-4">&#x1F916;</div>
              <h3 className="font-display text-lg text-ash-300 mb-2">AI Content Generator</h3>
              <p className="text-ash-500">Select a content gap and click Generate to create SEO-optimized content</p>
            </div>
          )}

          {generating && (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center animate-pulse">
                <span className="text-3xl">&#x1F916;</span>
              </div>
              <h3 className="font-display text-lg text-ash-300 mb-2">Generating Content...</h3>
              <p className="text-ash-500">Creating optimized content for &quot;{selectedItem?.title}&quot;</p>
            </div>
          )}

          {error && (
            <div className="card p-6 bg-danger/10 border-danger">
              <h3 className="font-display text-danger mb-2">Generation Failed</h3>
              <p className="text-ash-300 text-sm">{error}</p>
              <button onClick={() => selectedItem && handleGenerate(selectedItem)} className="btn-ghost mt-3 text-sm">
                Try Again
              </button>
            </div>
          )}

          {!generating && generatedContent && selectedItem && (
            <div className="space-y-4">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-ash-200">{selectedItem.title}</h3>
                  <span className="text-xs text-ash-500">{stripHtml(generatedContent).split(/\s+/).length} words</span>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-1 border-b border-char-700 mb-4">
                  {(['preview', 'html', 'text'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setContentTab(tab)}
                      className={`px-4 py-2 text-sm font-display transition-colors ${
                        contentTab === tab ? 'border-b-2 border-flame-500 text-flame-500' : 'text-ash-400 hover:text-ash-200'
                      }`}
                    >
                      {tab === 'preview' ? 'Preview' : tab === 'html' ? 'HTML' : 'Plain Text'}
                    </button>
                  ))}
                </div>

                {contentTab === 'preview' && (
                  <div
                    className="prose prose-invert max-w-none text-ash-300 [&_h1]:text-ash-100 [&_h2]:text-ash-200 [&_h3]:text-ash-200"
                    dangerouslySetInnerHTML={{ __html: generatedContent }}
                  />
                )}

                {contentTab === 'html' && (
                  <div className="relative">
                    <button
                      onClick={() => copyToClipboard(generatedContent)}
                      className="absolute top-2 right-2 btn-ghost text-xs"
                    >
                      Copy
                    </button>
                    <pre className="bg-char-900 p-4 rounded-btn overflow-x-auto text-xs text-ash-300 max-h-[500px]">
                      {generatedContent}
                    </pre>
                  </div>
                )}

                {contentTab === 'text' && (
                  <div className="relative">
                    <button
                      onClick={() => copyToClipboard(stripHtml(generatedContent))}
                      className="absolute top-2 right-2 btn-ghost text-xs"
                    >
                      Copy
                    </button>
                    <pre className="bg-char-900 p-4 rounded-btn overflow-x-auto text-sm text-ash-300 whitespace-pre-wrap max-h-[500px]">
                      {stripHtml(generatedContent)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
