'use client';

import type { SitePage } from '@/types';

interface PageListProps {
  pages: SitePage[];
  selectedId: string | null;
  onSelect: (page: SitePage) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const TYPE_ICON: Record<string, string> = {
  location_service: '📍',
  city_landing: '🏙️',
  blog_post: '✍️',
  foundation: '🏛️',
  website_addition: '📄',
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-char-700 text-ash-400',
  published: 'bg-success/15 text-success',
  scheduled: 'bg-ember-500/15 text-ember-500',
  archived: 'bg-char-800 text-ash-600',
};

export default function PageList({ pages, selectedId, onSelect, onDelete, loading }: PageListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-char-700 rounded-btn animate-pulse" />
        ))}
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="text-center py-8 text-ash-500 text-sm">
        No pages yet — generate or create one to get started
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {pages.map((page) => (
        <div
          key={page.id}
          onClick={() => onSelect(page)}
          className={`
            group flex items-center gap-3 px-3 py-2.5 rounded-btn cursor-pointer
            transition-all duration-150 border
            ${selectedId === page.id
              ? 'bg-flame-500/10 border-flame-500/30 text-ash-100'
              : 'bg-char-800 border-char-700 text-ash-300 hover:bg-char-700 hover:text-ash-100'
            }
          `}
        >
          <span className="text-base flex-shrink-0">{TYPE_ICON[page.type] ?? '📄'}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{page.title || page.slug}</div>
            <div className="text-xs text-ash-500 truncate">/{page.slug}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLE[page.status] ?? STATUS_STYLE.draft}`}>
              {page.status}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(page.id); }}
              className="opacity-0 group-hover:opacity-100 btn-icon w-6 h-6 text-xs text-danger/60 hover:text-danger transition-opacity"
              title="Delete page"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
