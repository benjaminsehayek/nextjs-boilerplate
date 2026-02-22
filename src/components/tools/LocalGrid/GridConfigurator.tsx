'use client';

import { useState } from 'react';
import type { GridSize, GridConfig, Keyword, BusinessInfo } from './types';
import { MapCenterPicker } from './MapCenterPicker';

interface GridConfiguratorProps {
  business: BusinessInfo;
  scanCenter: { lat: number; lng: number };
  onCenterChange: (lat: number, lng: number) => void;
  onStartScan: (config: GridConfig) => void;
  onBack: () => void;
}

const GRID_SIZES: { size: GridSize; points: number; description: string }[] = [
  { size: 3, points: 9, description: 'Quick overview - 9 data points' },
  { size: 5, points: 25, description: 'Balanced - 25 data points' },
  { size: 7, points: 49, description: 'Detailed - 49 data points' },
  { size: 9, points: 81, description: 'Comprehensive - 81 data points' },
];

const MAX_KEYWORDS = 5;
const RADIUS_CHIPS = [0.5, 1, 2, 3, 5, 10];

export function GridConfigurator({ business, scanCenter, onCenterChange, onStartScan, onBack }: GridConfiguratorProps) {
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [radius, setRadius] = useState(2);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const selectedGrid = GRID_SIZES.find((g) => g.size === gridSize)!;
  const activeKeywords = keywords.filter((k) => k.active && k.text.trim());
  const totalChecks = selectedGrid.points * activeKeywords.length;
  const estimatedCost = (totalChecks * 0.002).toFixed(2);
  const spacing = gridSize > 1 ? (radius * 2) / (gridSize - 1) : radius * 2;
  const spacingDisplay = spacing < 0.1
    ? `${(spacing * 5280).toFixed(0)} ft`
    : `${spacing.toFixed(2)} mi`;

  const addKeyword = () => {
    const text = keywordInput.trim();
    if (!text || keywords.length >= MAX_KEYWORDS) return;

    setKeywords([...keywords, {
      id: Date.now().toString(),
      text,
      active: true,
    }]);
    setKeywordInput('');
  };

  const removeKeyword = (id: string) => {
    setKeywords(keywords.filter((k) => k.id !== id));
  };

  const handleStartScan = () => {
    const active = keywords.filter((k) => k.active && k.text.trim());
    if (active.length === 0) {
      alert('Please add at least one keyword');
      return;
    }
    onStartScan({ size: gridSize, radius, keywords: active });
  };

  return (
    <div className="space-y-6">
      {/* Back to location */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost text-sm">
          ← Change Location
        </button>
        <div className="text-sm text-ash-300">
          <span className="font-medium text-ash-100">{business.name}</span>
          {' · '}
          {business.city}, {business.state}
        </div>
      </div>

      {/* Scan Center Map */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-1">Scan Center</h3>
        <p className="text-sm text-ash-400 mb-4">
          Drag the pin to set the exact center of your grid scan.
        </p>
        <MapCenterPicker
          center={scanCenter}
          radiusMiles={radius}
          onCenterChange={onCenterChange}
        />
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
          Grid covers {(radius * 2).toFixed(1)} mi × {(radius * 2).toFixed(1)} mi · Points {spacingDisplay} apart
        </p>
      </div>

      {/* Keywords */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display">Keywords</h3>
          <span className={`text-sm ${keywords.length >= MAX_KEYWORDS ? 'text-amber-400' : 'text-ash-400'}`}>
            {keywords.length}/{MAX_KEYWORDS}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="input flex-1"
            placeholder={keywords.length >= MAX_KEYWORDS ? 'Max 5 keywords reached' : 'e.g. plumber near me'}
            value={keywordInput}
            disabled={keywords.length >= MAX_KEYWORDS}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
          />
          <button
            onClick={addKeyword}
            className="btn-primary"
            disabled={keywords.length >= MAX_KEYWORDS || !keywordInput.trim()}
          >
            Add
          </button>
        </div>

        {keywords.length === 0 ? (
          <div className="text-center py-6 text-ash-400 text-sm">
            Add up to 5 keywords to scan for.
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map((keyword) => (
              <div
                key={keyword.id}
                className="flex items-center gap-3 p-3 bg-char-900/30 rounded-lg"
              >
                <span className="flex-1">{keyword.text}</span>
                <button
                  onClick={() => removeKeyword(keyword.id)}
                  className="text-ash-400 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan Summary */}
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
            <div className="text-2xl font-display text-ash-100">{activeKeywords.length}</div>
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
