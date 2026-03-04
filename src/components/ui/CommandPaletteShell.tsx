'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CommandPalette } from './CommandPalette';

// Shortcut map: digit → path
const SHORTCUT_MAP: Record<string, string> = {
  '1': '/dashboard',
  '2': '/site-audit',
  '3': '/off-page-audit',
  '4': '/local-grid',
  '5': '/content-strategy',
  '6': '/lead-database',
  '7': '/lead-intelligence',
  '8': '/marketing',
};

export function CommandPaletteShell() {
  const [showPalette, setShowPalette] = useState(false);
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Cmd/Ctrl+K — open palette
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setShowPalette((prev) => !prev);
        return;
      }

      // Cmd/Ctrl+1-8 — direct navigation
      if (SHORTCUT_MAP[e.key]) {
        e.preventDefault();
        router.push(SHORTCUT_MAP[e.key]);
        setShowPalette(false);
        return;
      }
    },
    [router]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <CommandPalette
      isOpen={showPalette}
      onClose={() => setShowPalette(false)}
    />
  );
}
