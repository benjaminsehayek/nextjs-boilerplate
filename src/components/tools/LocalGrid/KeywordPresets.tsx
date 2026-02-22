'use client';

import { INDUSTRY_PRESETS } from './utils';

interface KeywordPresetsProps {
  onSelectPreset: (keywords: string[]) => void;
}

export function KeywordPresets({ onSelectPreset }: KeywordPresetsProps) {
  return (
    <div>
      <div className="text-sm text-ash-400 mb-2">Industry Presets</div>
      <div className="flex flex-wrap gap-2">
        {INDUSTRY_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset.keywords)}
            className="px-3 py-1.5 rounded-lg bg-char-900/50 hover:bg-char-800 border border-char-700 hover:border-flame-500/30 transition-all text-sm"
          >
            <span className="mr-1.5">{preset.icon}</span>
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
