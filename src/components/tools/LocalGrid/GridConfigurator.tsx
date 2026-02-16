'use client';

import { useState } from 'react';
import type { GridSize, GridConfig, Keyword, BusinessInfo } from './types';

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
  const [radius, setRadius] = useState(10); // km
  const [keywords, setKeywords] = useState<Keyword[]>([
    { id: '1', text: '', active: true },
  ]);
  const [keywordInput, setKeywordInput] = useState('');

  const selectedGrid = GRID_SIZES.find((g) => g.size === gridSize)!;
  const totalChecks = selectedGrid.points * keywords.filter((k) => k.active).length;
  const estimatedCost = (totalChecks * 0.003).toFixed(2); // $0.003 per check

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

        <label className="block text-sm mb-2">Coverage Radius (km)</label>
        <div className="flex items-center gap-4 mb-2">
          <input
            type="range"
            min="1"
            max="50"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            min="1"
            max="50"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="input w-20 text-center"
          />
          <span className="text-sm text-ash-300">km</span>
        </div>
        <p className="text-xs text-ash-400">
          Grid will cover {radius * 2}km × {radius * 2}km area around your business
        </p>
      </div>

      {/* Keyword Management */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4">Search Keywords</h3>

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
              {keywords.filter((k) => k.active).length}
            </div>
            <div className="text-xs text-ash-400">Keywords</div>
          </div>
          <div>
            <div className="text-2xl font-display text-ash-100">{totalChecks}</div>
            <div className="text-xs text-ash-400">Total Checks</div>
          </div>
        </div>

        <p className="text-xs text-ash-400 mt-4 text-center">
          Estimated DataForSEO API cost: ${estimatedCost} ({totalChecks} checks × $0.003)
        </p>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStartScan}
        className="btn-primary w-full text-lg py-4"
        disabled={keywords.filter((k) => k.active).length === 0}
      >
        Start Grid Scan
      </button>
    </div>
  );
}
