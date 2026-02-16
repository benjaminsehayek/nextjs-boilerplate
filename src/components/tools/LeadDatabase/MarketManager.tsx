'use client';

import { useState } from 'react';
import type { Market } from './types';
import { MARKETS } from './types';

interface MarketManagerProps {
  onClose: () => void;
}

export default function MarketManager({ onClose }: MarketManagerProps) {
  const [markets, setMarkets] = useState<Market[]>(MARKETS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = () => {
    // In a real app, this would save to backend/localStorage
    alert('Market settings saved!');
    onClose();
  };

  const handleEditMarket = (marketId: string) => {
    setEditingId(marketId);
  };

  const handleUpdateMarket = (
    marketId: string,
    field: keyof Market,
    value: any
  ) => {
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId ? { ...m, [field]: value } : m
      )
    );
  };

  const handleAddCity = (marketId: string, city: string) => {
    if (!city.trim()) return;
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId && !m.cities.includes(city.trim())
          ? { ...m, cities: [...m.cities, city.trim()] }
          : m
      )
    );
  };

  const handleRemoveCity = (marketId: string, city: string) => {
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId
          ? { ...m, cities: m.cities.filter((c) => c !== city) }
          : m
      )
    );
  };

  const handleAddAreaCode = (marketId: string, areaCode: string) => {
    const cleaned = areaCode.replace(/\D/g, '');
    if (cleaned.length !== 3) return;
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId && !m.areaCodes.includes(cleaned)
          ? { ...m, areaCodes: [...m.areaCodes, cleaned] }
          : m
      )
    );
  };

  const handleRemoveAreaCode = (marketId: string, areaCode: string) => {
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId
          ? { ...m, areaCodes: m.areaCodes.filter((a) => a !== areaCode) }
          : m
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-char-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display text-gradient-flame">
                Market Manager
              </h2>
              <p className="text-sm text-ash-400 mt-1">
                Define service areas for market attribution
              </p>
            </div>
            <button onClick={onClose} className="btn-icon">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {markets.map((market) => (
              <div
                key={market.id}
                className="card p-4 border"
                style={{ borderColor: market.color + '40' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: market.color }}
                    />
                    <div>
                      <h3 className="font-display text-lg text-ash-200">
                        {market.displayName}
                      </h3>
                      <p className="text-xs text-ash-500">ID: {market.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditMarket(market.id)}
                    className="btn-ghost text-xs px-3 py-1"
                  >
                    {editingId === market.id ? 'Done' : 'Edit'}
                  </button>
                </div>

                {/* Cities */}
                <div className="mb-4">
                  <label className="input-label mb-2">Cities</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {market.cities.map((city) => (
                      <span
                        key={city}
                        className="tag tag-flame flex items-center gap-1"
                      >
                        {city}
                        {editingId === market.id && market.id !== 'other' && (
                          <button
                            onClick={() => handleRemoveCity(market.id, city)}
                            className="hover:text-danger"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {editingId === market.id && market.id !== 'other' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add city..."
                        className="input text-sm flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCity(
                              market.id,
                              (e.target as HTMLInputElement).value
                            );
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Area Codes */}
                <div>
                  <label className="input-label mb-2">Area Codes</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {market.areaCodes.map((code) => (
                      <span
                        key={code}
                        className="tag tag-info flex items-center gap-1"
                      >
                        {code}
                        {editingId === market.id && market.id !== 'other' && (
                          <button
                            onClick={() =>
                              handleRemoveAreaCode(market.id, code)
                            }
                            className="hover:text-danger"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {editingId === market.id && market.id !== 'other' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add area code (3 digits)..."
                        className="input text-sm flex-1"
                        maxLength={3}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddAreaCode(
                              market.id,
                              (e.target as HTMLInputElement).value
                            );
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Detection Priority */}
                {market.id !== 'other' && (
                  <div className="mt-4 p-3 bg-char-700 rounded text-xs text-ash-400">
                    <strong className="text-ash-300">Detection Priority:</strong>
                    <br />
                    1. API geoTarget → 2. City match → 3. Phone area code → 4.
                    Campaign name
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded">
            <h4 className="text-sm font-display text-info mb-2">
              How Market Attribution Works
            </h4>
            <ul className="text-xs text-ash-400 space-y-1">
              <li>
                • Markets are automatically detected when contacts are added
              </li>
              <li>
                • Detection uses city, area code, and campaign data in priority
                order
              </li>
              <li>
                • Contacts that don't match any market are assigned to "Other"
              </li>
              <li>• Markets help segment leads by geographic service area</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-char-700 p-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Markets
          </button>
        </div>
      </div>
    </div>
  );
}
