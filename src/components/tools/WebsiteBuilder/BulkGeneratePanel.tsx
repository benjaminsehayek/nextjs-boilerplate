'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import type { Market, SimilarityIssue } from '@/types';

interface BulkGenerateResult {
  generated: number;
  drafts: { id: string; slug: string; title: string }[];
  errors?: { slug: string; error: string }[];
  similarityIssues?: SimilarityIssue[];
}

interface BulkGeneratePanelProps {
  markets: Market[];
  onComplete?: (result: BulkGenerateResult) => void;
}

export default function BulkGeneratePanel({ markets, onComplete }: BulkGeneratePanelProps) {
  const { business } = useAuth();
  const [selectedMarketId, setSelectedMarketId] = useState<string>('all');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<BulkGenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!business) return;
    setGenerating(true);
    setProgress('Starting bulk generation...');
    setResult(null);
    setError(null);

    try {
      const body: Record<string, string> = { businessId: business.id };
      if (selectedMarketId !== 'all') {
        body.marketId = selectedMarketId;
      }

      setProgress('Generating pages (this may take a few minutes)...');

      const res = await fetch('/api/website-builder/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }

      const data: BulkGenerateResult = await res.json();
      setResult(data);
      setProgress('');
      onComplete?.(data);
    } catch (err: any) {
      setError(err?.message ?? 'Bulk generation failed');
      setProgress('');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (slug: string) => {
    // Regeneration of individual pages would use a separate single-page endpoint.
    // For now, surface the slug to the parent so the page editor can handle it.
    console.log('Regenerate requested for:', slug);
  };

  return (
    <div className="bulk-generate-panel">
      <h3 className="text-lg font-semibold text-ash-100 mb-4">
        Bulk Page Generation
      </h3>

      <div className="flex items-end gap-4 mb-6">
        {/* Market selector */}
        <div className="flex-1">
          <label
            htmlFor="market-select"
            className="block text-sm text-ash-300 mb-1"
          >
            Market
          </label>
          <select
            id="market-select"
            value={selectedMarketId}
            onChange={(e) => setSelectedMarketId(e.target.value)}
            disabled={generating}
            className="w-full bg-char-800 border border-char-600 rounded-lg px-3 py-2 text-ash-100 focus:outline-none focus:border-flame-500"
          >
            <option value="all">All Markets</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !business}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          {generating ? (
            <>
              <span className="bulk-generate-spinner" />
              Generating...
            </>
          ) : (
            'Generate All Pages'
          )}
        </button>
      </div>

      {/* Progress indicator */}
      {progress && (
        <div className="bg-char-800 border border-char-600 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="bulk-generate-spinner" />
            <span className="text-ash-200">{progress}</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-char-800 border border-char-600 rounded-lg p-4">
            <p className="text-ash-100">
              Generated{' '}
              <span className="font-semibold text-flame-500">
                {result.generated}
              </span>{' '}
              draft pages
            </p>
          </div>

          {/* Similarity issues */}
          {result.similarityIssues && result.similarityIssues.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
              <h4 className="text-amber-400 font-semibold mb-3">
                Similarity Issues Found
              </h4>
              <p className="text-amber-200 text-sm mb-3">
                The following page pairs have high content overlap. Consider
                regenerating to add more unique local context.
              </p>
              <div className="space-y-2">
                {result.similarityIssues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      issue.level === 'block'
                        ? 'bg-red-900/30 border border-red-700'
                        : 'bg-amber-900/20 border border-amber-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ash-100 truncate">
                        <span className="font-mono">{issue.slugA}</span>
                        {' <-> '}
                        <span className="font-mono">{issue.slugB}</span>
                      </p>
                      <p className="text-xs mt-0.5">
                        <span
                          className={
                            issue.level === 'block'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }
                        >
                          {Math.round(issue.similarity * 100)}% similar
                          {issue.level === 'block'
                            ? ' — blocks publish'
                            : ' — warning'}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleRegenerate(issue.slugA)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Regenerate A
                      </button>
                      <button
                        onClick={() => handleRegenerate(issue.slugB)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Regenerate B
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft list */}
          {result.drafts.length > 0 && (
            <div className="bg-char-800 border border-char-600 rounded-lg p-4">
              <h4 className="text-ash-100 font-semibold mb-3">
                Generated Drafts
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {result.drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-char-700 rounded"
                  >
                    <span className="text-sm text-ash-200 truncate">
                      {draft.title}
                    </span>
                    <span className="text-xs text-ash-400 font-mono ml-2 shrink-0">
                      /{draft.slug}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-2">
                {result.errors.length} page(s) failed
              </h4>
              <div className="space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-300">
                    <span className="font-mono">{err.slug}</span>: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
