'use client';

import { useState } from 'react';
import type { ReviewsPanelProps } from './types';

export default function ReviewsPanel({
  reviews,
  businessName,
  businessCategory,
  businessCity,
  businessPhone,
}: ReviewsPanelProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());
  const [draftingReviewIndex, setDraftingReviewIndex] = useState<number | null>(null);
  const [draftLength, setDraftLength] = useState<'short' | 'standard' | 'detailed'>('standard');
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const maxDistribution = Math.max(...reviews.distribution.map((d) => d.count), 1);

  const toggleExpanded = (index: number) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDraftResponse = async (reviewIndex: number) => {
    const review = reviews.recentReviews[reviewIndex];
    if (!review) return;
    setIsDrafting(true);
    setGeneratedDraft('');
    try {
      const res = await fetch('/api/claude/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a professional review response writer for ${businessName}, a ${businessCategory} business in ${businessCity}. The business phone is ${businessPhone}. Write warm, genuine responses. Never be defensive. Thank reviewers and address specifics.`,
          messages: [
            {
              role: 'user',
              content: `Write a ${draftLength} response to this ${review.rating}-star review: "${review.text}"`,
            },
          ],
          max_tokens: 250,
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate response');
      const data = await res.json();
      setGeneratedDraft(data.content || data.text || '');
    } catch {
      setGeneratedDraft('Error generating response. Please try again.');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyDraft = async () => {
    if (generatedDraft) {
      await navigator.clipboard.writeText(generatedDraft);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-ember-500' : 'text-ash-500/30'}
          >
            ★
          </span>
        ))}
      </span>
    );
  };

  const sentimentTotal =
    reviews.sentiment.positive + reviews.sentiment.neutral + reviews.sentiment.negative || 1;
  const sentimentPct = {
    positive: Math.round((reviews.sentiment.positive / sentimentTotal) * 100),
    neutral: Math.round((reviews.sentiment.neutral / sentimentTotal) * 100),
    negative: Math.round((reviews.sentiment.negative / sentimentTotal) * 100),
  };

  const responseRateColor =
    reviews.responseRate >= 80
      ? 'text-success'
      : reviews.responseRate >= 50
        ? 'text-ember-500'
        : 'text-danger';

  return (
    <div className="space-y-6">
      {/* Rating Header */}
      <div className="card p-6">
        <div className="flex items-center gap-6">
          <div className="text-6xl font-display text-flame-500">
            {reviews.rating.toFixed(1)}
          </div>
          <div>
            <div className="text-2xl mb-1">{renderStars(Math.round(reviews.rating))}</div>
            <p className="text-sm text-ash-400">
              Based on {reviews.totalCount.toLocaleString()} reviews
            </p>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="card p-6">
        <h3 className="text-lg font-display text-ash-300 mb-4">Rating Distribution</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const dist = reviews.distribution.find((d) => d.stars === star);
            const count = dist?.count ?? 0;
            const pct = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm text-ash-400 w-8 text-right">{star}★</span>
                <div className="flex-1 h-4 bg-char-900 rounded-btn overflow-hidden">
                  <div
                    className="h-full bg-ember-500 rounded-btn transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-ash-400 w-12 text-right">
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Velocity Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <div className="text-3xl font-display text-flame-500 mb-1">{reviews.velocity.last30}</div>
          <div className="text-sm text-ash-400">Last 30 Days</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-3xl font-display text-heat-500 mb-1">{reviews.velocity.last90}</div>
          <div className="text-sm text-ash-400">Last 90 Days</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-3xl font-display text-ember-500 mb-1">{reviews.velocity.last180}</div>
          <div className="text-sm text-ash-400">Last 180 Days</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-3xl font-display text-ash-300 mb-1">{reviews.velocity.avgPerMonth.toFixed(1)}</div>
          <div className="text-sm text-ash-400">Avg / Month</div>
        </div>
      </div>

      {/* Response Rate */}
      <div className="card p-6">
        <h3 className="text-lg font-display text-ash-300 mb-2">Owner Response Rate</h3>
        <div className={`text-4xl font-display mb-2 ${responseRateColor}`}>
          {reviews.responseRate}%
        </div>
        <p className="text-sm text-ash-500">
          {reviews.responseRate >= 80
            ? 'Excellent response rate — keep it up!'
            : reviews.responseRate >= 50
              ? 'Decent response rate — try to respond to more reviews'
              : 'Low response rate — responding to reviews improves visibility'}
        </p>
      </div>

      {/* Sentiment Bar */}
      <div className="card p-6">
        <h3 className="text-lg font-display text-ash-300 mb-4">Review Sentiment</h3>
        <div className="h-6 rounded-btn overflow-hidden flex">
          {sentimentPct.positive > 0 && (
            <div className="bg-success h-full transition-all duration-300" style={{ width: `${sentimentPct.positive}%` }} />
          )}
          {sentimentPct.neutral > 0 && (
            <div className="bg-ember-500 h-full transition-all duration-300" style={{ width: `${sentimentPct.neutral}%` }} />
          )}
          {sentimentPct.negative > 0 && (
            <div className="bg-danger h-full transition-all duration-300" style={{ width: `${sentimentPct.negative}%` }} />
          )}
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-success">Positive {sentimentPct.positive}%</span>
          <span className="text-ember-500">Neutral {sentimentPct.neutral}%</span>
          <span className="text-danger">Negative {sentimentPct.negative}%</span>
        </div>
      </div>

      {/* Recent Reviews */}
      <div>
        <h3 className="text-lg font-display text-ash-300 mb-4">
          Recent Reviews ({Math.min(reviews.recentReviews.length, 10)})
        </h3>
        <div className="space-y-4">
          {reviews.recentReviews.slice(0, 10).map((review, idx) => {
            const isExpanded = expandedReviews.has(idx);
            const shouldTruncate = review.text.length > 200;
            const displayText =
              shouldTruncate && !isExpanded
                ? review.text.slice(0, 200) + '...'
                : review.text;
            const isDraftOpen = draftingReviewIndex === idx;

            return (
              <div key={idx} className="card p-5 space-y-3">
                {/* Review Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-ash-300">{review.author}</span>
                    <span>{renderStars(review.rating)}</span>
                  </div>
                  <span className="text-sm text-ash-500">{review.date}</span>
                </div>

                {/* Review Text */}
                <p className="text-sm text-ash-400 leading-relaxed">
                  {displayText}
                  {shouldTruncate && (
                    <button
                      onClick={() => toggleExpanded(idx)}
                      className="ml-1 text-flame-500 hover:text-flame-400 text-sm font-medium"
                    >
                      {isExpanded ? 'show less' : 'show more'}
                    </button>
                  )}
                </p>

                {/* Owner Response */}
                {review.ownerResponse && (
                  <div className="ml-4 pl-4 border-l-2 border-ash-500/20">
                    <p className="text-xs text-ash-500 mb-1 font-semibold">Owner Response</p>
                    <p className="text-sm text-ash-400">{review.ownerResponse}</p>
                  </div>
                )}

                {/* Draft Response Button */}
                {!review.ownerResponse && (
                  <div>
                    <button
                      onClick={() => {
                        if (isDraftOpen) {
                          setDraftingReviewIndex(null);
                          setGeneratedDraft('');
                        } else {
                          setDraftingReviewIndex(idx);
                          setGeneratedDraft('');
                        }
                      }}
                      className="btn-ghost text-sm px-3 py-1.5"
                    >
                      {isDraftOpen ? 'Cancel' : 'Draft Response'}
                    </button>
                  </div>
                )}

                {/* Draft Response Section */}
                {isDraftOpen && (
                  <div className="mt-3 p-4 bg-char-900/30 rounded-btn space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-ash-400">Length:</label>
                      <select
                        value={draftLength}
                        onChange={(e) =>
                          setDraftLength(e.target.value as 'short' | 'standard' | 'detailed')
                        }
                        className="input text-sm py-1 px-2 w-auto"
                      >
                        <option value="short">Short</option>
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                      </select>
                      <button
                        onClick={() => handleDraftResponse(idx)}
                        disabled={isDrafting}
                        className="btn-primary text-sm px-4 py-1.5"
                      >
                        {isDrafting ? (
                          <span className="inline-flex items-center gap-2">
                            <svg
                              className="animate-spin h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Generating...
                          </span>
                        ) : generatedDraft ? (
                          'Regenerate'
                        ) : (
                          'Generate'
                        )}
                      </button>
                    </div>

                    {/* Generated Draft */}
                    {generatedDraft && (
                      <div className="p-3 bg-flame-500/10 border border-flame-500/20 rounded-btn">
                        <p className="text-sm text-ash-300 leading-relaxed whitespace-pre-wrap">
                          {generatedDraft}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleCopyDraft}
                            className="btn-ghost text-sm px-3 py-1"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
