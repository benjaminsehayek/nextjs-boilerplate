'use client';

import type { BusinessLocation } from '@/types';

interface LocationSelectorProps {
  locations: BusinessLocation[];
  selectedLocation: BusinessLocation | null;
  onSelectLocation: (locationId: string | null) => void;
  showAllOption?: boolean;
  disabled?: boolean;
}

export function LocationSelector({
  locations,
  selectedLocation,
  onSelectLocation,
  showAllOption = true,
  disabled = false
}: LocationSelectorProps) {
  // Don't show selector if no locations or only 1 location without "All" option
  if (locations.length === 0 || (locations.length === 1 && !showAllOption)) {
    return null;
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-4">
        <label className="input-label mb-0">Location:</label>
        <select
          value={selectedLocation?.id || ''}
          onChange={(e) => onSelectLocation(e.target.value || null)}
          disabled={disabled}
          className="input max-w-md"
        >
          {showAllOption && (
            <option value="">
              All Locations (Domain-level)
            </option>
          )}
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.location_name}
              {location.is_primary && ' (Primary)'}
              {' - '}
              {location.city}, {location.state}
            </option>
          ))}
        </select>

        {selectedLocation && (
          <div className="text-sm text-ash-400 ml-auto">
            {selectedLocation.address && (
              <span>{selectedLocation.address}, </span>
            )}
            {selectedLocation.city}, {selectedLocation.state}
            {selectedLocation.zip && ` ${selectedLocation.zip}`}
          </div>
        )}
      </div>
    </div>
  );
}
