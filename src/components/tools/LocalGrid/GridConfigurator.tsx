'use client';

import { useState } from 'react';
import type { GridSize, GridConfig, Keyword, BusinessInfo } from './types';
import { KeywordPresets } from './KeywordPresets';

interface GridConfiguratorProps {
  business: BusinessInfo;
  onStartScan: (config: GridConfig) => void;
  onBack: () => void;
}

const GRID_SIZES: { size: GridSize; points: number; description: string }[] = [
  { size: 3, points: 9, description: 'Quick overview - 9 data points' },
  { size: 5, points: 25, description: 'Balanced - 25 data points' },
  { size: 7, points: 49, description: 'Detailed - 49 data points' },
  { size: 9, points: 81, description: 'Comprehensive - 81 data points' },
];

export function GridConfigurator({ business, onStartScan, onBack }: GridConfiguratorProps) {
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [radius, setRadius] = useState(2); // miles
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const RADIUS_CHIPS = [0.5, 1, 2, 3, 5, 10];
  const selectedGrid = GRID_SIZES.find((g) => g.size === gridSize)!;
  const activeKeywords = keywords.filter((k) => k.active && k.text.trim());
  const totalChecks = selectedGrid.points * activeKeywords.length;
  const estimatedCost = (totalChecks * 0.002).toFixed(2);
  const spacing = gridSize > 1 ? (radius * 2) / (gridSize - 1) : radius * 2;
  const spacingDisplay = spacing < 0.1
    ? `${(spacing * 5280).toFixed(0)} ft`
    : `${spacing.toFixed(2)} mi`;

  const addKeyword = () => {
    if (!keywordInput.trim()) return;

    const newKeyword: Keyword = {
      id: Date.now().toString(),
      text: keywordInput.trim(),
      active: true,
    };

    setKeywords([...keywords, newKeyword]);
    setKeywordInput('');
  };

  const removeKeyword = (id: string) => {
    setKeywords(keywords.filter((k) => k.id !== id));
  };

  const toggleKeyword = (id: string) => {
    setKeywords(
      keywords.map((k) => (k.id === id ? { ...k, active: !k.active } : k))
    );
  };

  const handleStartScan = () => {
    const activeKeywords = keywords.filter((k) => k.active && k.text.trim());

    if (activeKeywords.length === 0) {
      alert('Please add at least one keyword');
      return;
    }

    const config: GridConfig = {
      size: gridSize,
      radius,
      keywords: activeKeywords,
    };

    onStartScan(config);
  };

  return (
    <div className="space-y-6">
      {/* Business Summary */}
      <div className="card p-6 bg-char-900/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg mb-1">{business.name}</h3>
            <p className="text-sm text-ash-300">
              {business.address}, {business.city}, {business.state} {business.zipCode}
            </p>
            <p className="text-xs text-ash-400 mt-1">
              {business.latitude.toFixed(6)}, {business.longitude.toFixed(6)}
            </p>
          </div>
          <button onClick={onBack} className="btn-secondary text-sm">
            Change Business
          </button>
        </div>
      </div>

      {/* Grid Size Selection */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4">Grid Configuration</h3>

        <label className="block text-sm mb-3">Grid Size</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {GRID_SIZES.map((grid) => (
            <button
              key={grid.size}
              className={`card-interactive p-4 text-center ${
                gridSize === grid.size ? 'border-flame-500' : ''
              }`}
              onClick={() => setGridSize(grid.size)}
            >
              <div className="text-2xl font-display mb-1">{grid.size}×{grid.size}</div>
              <div className="text-xs text-ash-300 mb-1">{grid.points} points</div>
              <div className="text-xs text-ash-400">{grid.description}</div>
            </button>
          ))}
        </div>

        <label className="block text-sm mb-2">Coverage Radius (miles)</label>
        <div className="flex items-center gap-4 mb-2">
          <input
            type="number"
            min="0.25"
            max="25"
            step="0.25"
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value) || 0.25)}
            className="input w-24 text-center"
          />
          <span className="text-sm text-ash-300">miles</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {RADIUS_CHIPS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                radius === r
                  ? 'border-flame-500 bg-flame-500/10 text-flame-400'
                  : 'border-char-700 hover:border-ash-500'
              }`}
            >
              {r} mi
            </button>
          ))}
        </div>
        <p className="text-xs text-ash-400">
          Grid will cover {(radius * 2).toFixed(1)} mi × {(radius * 2).toFixed(1)} mi area · Points {spacingDisplay} apart
        </p>
      </div>

      {/* Keyword Management */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4">Search Keywords</h3>

        <div className="mb-4">
          <KeywordPresets
            onSelectPreset={(presetKeywords) => {
              setKeywords(
                presetKeywords.map((text, i) => ({
                  id: `preset-${Date.now()}-${i}`,
                  text,
                  active: true,
                }))
              );
            }}
          />
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="input flex-1"
            placeholder="Enter keyword (e.g., 'plumber near me')"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
          />
          <button onClick={addKeyword} className="btn-primary">
            Add
          </button>
        </div>

        {keywords.length === 0 ? (
          <div className="text-center py-8 text-ash-400">
            No keywords added yet. Add at least one keyword to continue.
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map((keyword) => (
              <div
                key={keyword.id}
                className="flex items-center gap-3 p-3 bg-char-900/30 rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={keyword.active}
                  onChange={() => toggleKeyword(keyword.id)}
                  className="w-4 h-4"
                />
                <span className={keyword.active ? '' : 'text-ash-400 line-through'}>
                  {keyword.text}
                </span>
                <button
                  onClick={() => removeKeyword(keyword.id)}
                  className="ml-auto text-ash-400 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost Estimation */}
      <div className="card p-6 bg-heat-500/10 border border-heat-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display">Scan Summary</h3>
          <div className="text-2xl font-display text-heat-400">${estimatedCost}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-display text-ash-100">{gridSize}×{gridSize}</div>
            <div className="text-xs text-ash-400">Grid Size</div>
          </div>
          <div>
            <div className="text-2xl font-display text-ash-100">{selectedGrid.points}</div>
            <div className="text-xs text-ash-400">Map Points</div>
          </div>
          <div>
            <div className="text-2xl font-display text-ash-100">
              {activeKeywords.length}
            </div>
            <div className="text-xs text-ash-400">Keywords</div>
          </div>
          <div>
            <div className="text-2xl font-display text-ash-100">{totalChecks}</div>
            <div className="text-xs text-ash-400">Total Checks</div>
          </div>
        </div>

        <p className="text-xs text-ash-400 mt-4 text-center">
          {selectedGrid.points} pts × {activeKeywords.length} kw = {totalChecks} checks · ${estimatedCost} estimated
        </p>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStartScan}
        className="btn-primary w-full text-lg py-4"
        disabled={activeKeywords.length === 0}
      >
        Start Grid Scan
      </button>
    </div>
  );
}
