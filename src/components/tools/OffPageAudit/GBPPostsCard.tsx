'use client';

import type { GbpPost } from './types';

interface GBPPostsCardProps {
  posts?: GbpPost[];
}

function formatPostDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(dateStr?: string): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function truncate(text?: string, max = 100): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function GBPPostsCard({ posts }: GBPPostsCardProps) {
  const recent = posts ? posts.slice(0, 3) : [];

  // Find the most recent post date across all posts
  const mostRecentPost = posts && posts.length > 0
    ? posts.reduce<GbpPost | null>((latest, p) => {
        const pDate = p.create_time || p.update_time;
        if (!latest) return p;
        const latestDate = latest.create_time || latest.update_time;
        if (!pDate) return latest;
        if (!latestDate) return p;
        return new Date(pDate) > new Date(latestDate) ? p : latest;
      }, null)
    : null;

  const daysSinceLastPost = mostRecentPost
    ? daysAgo(mostRecentPost.create_time || mostRecentPost.update_time)
    : 999;

  const showCadenceWarning = daysSinceLastPost > 7;

  return (
    <div className="space-y-4">
      {recent.length === 0 ? (
        <p className="text-ash-500 text-sm">
          No recent posts. Posting weekly improves local ranking.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {recent.map((post, i) => {
              const postDate = formatPostDate(post.create_time || post.update_time);
              const ctaType = post.callToAction?.actionType;
              const badgeLabel = ctaType
                ? ctaType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                : 'UPDATE';
              const displayText = truncate(post.summary || post.title, 100);

              return (
                <div key={i} className="p-4 bg-char-900/30 rounded-lg">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    {postDate && (
                      <span className="text-xs text-ash-500 flex-shrink-0">{postDate}</span>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-sky-400/10 text-sky-400 border border-sky-400/20 font-medium flex-shrink-0">
                      {badgeLabel}
                    </span>
                  </div>
                  {displayText && (
                    <p className="text-sm text-ash-300 leading-relaxed">{displayText}</p>
                  )}
                </div>
              );
            })}
          </div>

          {showCadenceWarning && (
            <div className="flex items-center gap-2 p-3 rounded-btn bg-amber-500/10 border border-amber-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-amber-400 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-amber-300">
                Post more frequently — last post was {daysSinceLastPost} day
                {daysSinceLastPost !== 1 ? 's' : ''} ago. Google rewards weekly GBP activity.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
