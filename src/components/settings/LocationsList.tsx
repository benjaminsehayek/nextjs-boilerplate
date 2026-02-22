'use client';

import type { BusinessLocation } from '@/types';

interface LocationsListProps {
  locations: BusinessLocation[];
  onEdit: (location: BusinessLocation) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

export function LocationsList({ locations, onEdit, onDelete, onSetPrimary }: LocationsListProps) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12 bg-char-700/50 rounded-btn">
        <div className="text-4xl mb-3">📍</div>
        <p className="text-ash-300 mb-1">No locations yet</p>
        <p className="text-sm text-ash-500">Add your first location to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {locations.map((location) => (
        <div key={location.id} className="card p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-lg flex-1">{location.location_name}</h3>
            {location.is_primary && (
              <span className="px-2 py-1 bg-flame-500 text-white text-xs rounded font-semibold">
                PRIMARY
              </span>
            )}
          </div>

          <div className="space-y-1 mb-4">
            {location.address && (
              <p className="text-sm text-ash-300">{location.address}</p>
            )}
            <p className="text-sm text-ash-300">
              {location.city}, {location.state} {location.zip}
            </p>
            {location.phone && (
              <p className="text-sm text-ash-300">{location.phone}</p>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t border-char-700">
            {!location.is_primary && (
              <button
                onClick={() => onSetPrimary(location.id)}
                className="btn-secondary text-sm flex-1"
                title="Make this the primary location"
              >
                Set as Primary
              </button>
            )}
            <button
              onClick={() => onEdit(location)}
              className="btn-secondary text-sm flex-1"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(location.id)}
              className={`btn-ghost text-sm flex-1 ${
                location.is_primary || locations.length === 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'text-danger hover:bg-danger/10'
              }`}
              disabled={location.is_primary || locations.length === 1}
              title={
                location.is_primary
                  ? 'Set another location as primary before deleting'
                  : locations.length === 1
                  ? 'Cannot delete the only location'
                  : 'Delete location'
              }
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
