'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', shortcut: '1' },
  { label: 'Site Audit', href: '/site-audit', icon: '🔍', shortcut: '2' },
  { label: 'Off-Page Audit', href: '/off-page-audit', icon: '🔗', shortcut: '3' },
  { label: 'Local Grid', href: '/local-grid', icon: '📍', shortcut: '4' },
  { label: 'Content Strategy', href: '/content-strategy', icon: '✍️', shortcut: '5' },
  { label: 'Lead Database', href: '/lead-database', icon: '👥', shortcut: '6' },
  { label: 'Lead Intelligence', href: '/lead-intelligence', icon: '📊', shortcut: '7' },
  { label: 'Marketing', href: '/marketing', icon: '📧', shortcut: '8' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
  { label: 'Billing', href: '/billing', icon: '💳' },
] as const;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Focus input after animation frame so the element is visible
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Clamp activeIndex when filtered list changes
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(0, filteredItems.length - 1)));
  }, [filteredItems.length]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  // Keyboard navigation inside palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        const item = filteredItems[activeIndex];
        if (item) navigate(item.href);
        return;
      }
    },
    [filteredItems, activeIndex, navigate, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="animate-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-modal-card w-full max-w-lg bg-char-800 border border-char-700 rounded-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-char-700">
          <span className="text-ash-500 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-ash-100 placeholder-ash-500 text-sm outline-none"
          />
          <kbd className="text-xs text-ash-500 bg-char-700 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Items list */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-ash-500 text-sm">No results</div>
          ) : (
            filteredItems.map((item, idx) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex items-center gap-3 px-4 py-2 rounded-md w-full text-left transition-colors ${
                  idx === activeIndex
                    ? 'bg-char-700 text-ash-100'
                    : 'text-ash-200 hover:bg-char-700'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="flex-1 text-sm">{item.label}</span>
                {'shortcut' in item && item.shortcut && (
                  <span className="text-ash-500 text-xs ml-auto">
                    <kbd className="bg-char-900 px-1 py-0.5 rounded text-[10px]">
                      ⌘{item.shortcut}
                    </kbd>
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
