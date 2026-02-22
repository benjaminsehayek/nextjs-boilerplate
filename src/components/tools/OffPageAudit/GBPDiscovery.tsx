'use client';

import { useState } from 'react';
import type { GBPDiscoveryProps, DiscoveredLocation } from './types';

export default function GBPDiscovery({
  locations,
  onLocationsChange,
  onContinue,
  onDomainOnly,
  domain,
}: GBPDiscoveryProps) {
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  const selectedCount = locations.filter((l) => l.selected).length;

  function handleToggleLocation(id: string) {
    const updated = locations.map((l) =>
      l.id === id ? { ...l, selected: !l.selected } : l
    );
    onLocationsChange(updated);
  }

  function handleSelectAll() {
    const updated = locations.map((l) => ({ ...l, selected: true }));
    onLocationsChange(updated);
  }

  function handleDeselectAll() {
    const updated = locations.map((l) => ({ ...l, selected: false }));
    onLocationsChange(updated);
  }

  function handleAddManual() {
    if (!manualName.trim() || !manualCity.trim()) return;

    const newLocation: DiscoveredLocation = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: manualName.trim(),
      address: manualAddress.trim(),
      city: manualCity.trim(),
      state: manualState.trim(),
      phone: manualPhone.trim(),
      domain,
      source: 'manual',
      selected: true,
    };

    onLocationsChange([...locations, newLocation]);
    setManualName('');
    setManualAddress('');
    setManualCity('');
    setManualState('');
    setManualPhone('');
    setShowManualAdd(false);
  }

  function handleContinue() {
    const selected = locations.filter((l) => l.selected);
    if (selected.length > 0) {
      onContinue(selected);
    }
  }

  function renderStars(rating: number) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <span className="inline-flex items-center gap-0.5 text-ember-500">
        {'★'.repeat(fullStars)}
        {hasHalf && '½'}
        <span className="text-ash-500">{'★'.repeat(emptyStars)}</span>
      </span>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center">
            <span className="text-4xl">📍</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Select Locations to{' '}
            <span className="text-gradient-flame">Audit</span>
          </h2>
          <p className="text-ash-400">
            We found <strong>{locations.length}</strong> location
            {locations.length !== 1 ? 's' : ''} associated with{' '}
            <strong>{domain}</strong>. Select which ones to include in your
            audit.
          </p>
        </div>

        {/* Select All / Deselect All */}
        {locations.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-ash-400">
              {selectedCount} of {locations.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-sm px-3 py-1"
                onClick={handleSelectAll}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn-ghost text-sm px-3 py-1"
                onClick={handleDeselectAll}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Location Cards */}
        <div className="space-y-3 mb-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`card-interactive p-4 cursor-pointer transition-all ${
                location.selected
                  ? 'ring-2 ring-ember-500/50'
                  : 'opacity-70'
              }`}
              onClick={() => handleToggleLocation(location.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleLocation(location.id);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="pt-0.5">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      location.selected
                        ? 'bg-ember-500 border-ember-500 text-white'
                        : 'border-ash-500 bg-transparent'
                    }`}
                  >
                    {location.selected && (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white truncate">
                      {location.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        location.source === 'listings'
                          ? 'bg-ember-500/20 text-ember-500'
                          : 'bg-ash-500/20 text-ash-300'
                      }`}
                    >
                      {location.source === 'listings'
                        ? 'GBP Listings'
                        : 'Manual'}
                    </span>
                  </div>

                  <div className="text-sm text-ash-400 space-y-0.5">
                    {(location.address || location.city || location.state) && (
                      <p>
                        {[location.address, location.city, location.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {location.phone && <p>{location.phone}</p>}
                  </div>

                  {/* Rating and reviews */}
                  {location.rating != null && (
                    <div className="flex items-center gap-2 mt-1.5 text-sm">
                      {renderStars(location.rating)}
                      <span className="text-ash-300 font-medium">
                        {location.rating.toFixed(1)}
                      </span>
                      {location.reviewCount != null && (
                        <span className="text-ash-500">
                          ({location.reviewCount.toLocaleString()}{' '}
                          review{location.reviewCount !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Categories */}
                  {location.categories && location.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {location.categories.map((cat) => (
                        <span key={cat} className="tag-info text-xs">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Manual Add Section */}
        <div className="mb-8">
          {!showManualAdd ? (
            <button
              type="button"
              className="btn-ghost text-sm w-full py-3 border border-dashed border-ash-500 rounded-lg"
              onClick={() => setShowManualAdd(true)}
            >
              + Add Location Manually
            </button>
          ) : (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-sm text-white">
                  Add Location Manually
                </h3>
                <button
                  type="button"
                  className="btn-ghost text-xs px-2 py-1"
                  onClick={() => setShowManualAdd(false)}
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="input-label">
                  Business Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g., Joe's Auto Repair"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">
                    City <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g., Austin"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">State</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g., TX"
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Address</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g., 123 Main St"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Phone</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g., (512) 555-1234"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn-primary w-full"
                disabled={!manualName.trim() || !manualCity.trim()}
                onClick={handleAddManual}
              >
                Add Location
              </button>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="btn-primary flex-1 py-3"
            disabled={selectedCount === 0}
            onClick={handleContinue}
          >
            Continue with {selectedCount} Selected
          </button>
          <button
            type="button"
            className="btn-ghost flex-1 py-3"
            onClick={onDomainOnly}
          >
            Domain Only (Skip Locations)
          </button>
        </div>
      </div>
    </div>
  );
}
