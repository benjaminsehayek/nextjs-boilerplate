'use client';

import type { FilterChip } from '../types';

interface FilterChipsProps {
  chips: FilterChip[];
  onToggle: (id: string) => void;
}

export function FilterChips({ chips, onToggle }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onToggle(chip.id)}
          className={
            'px-3 py-1.5 rounded-full text-xs font-display transition-colors ' +
            (chip.active
              ? 'bg-flame-500/20 text-flame-400 border border-flame-500/30'
              : 'bg-char-800 text-ash-400 border border-char-700 hover:border-ash-500')
          }
        >
          {chip.label}
          {chip.count != null && (
            <span className="ml-1.5 opacity-70">({chip.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
