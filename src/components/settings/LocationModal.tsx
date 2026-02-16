'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BusinessLocation } from '@/types';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: BusinessLocation | null;
  businessId: string;
  onSave: () => void;
}

export function LocationModal({ isOpen, onClose, location, businessId, onSave }: LocationModalProps) {
  const [formData, setFormData] = useState({
    location_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    is_primary: false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const supabase = createClient();

  const isEditMode = !!location;

  // Initialize form data when location changes
  useEffect(() => {
    if (location) {
      setFormData({
        location_name: location.location_name || '',
        address: location.address || '',
        city: location.city || '',
        state: location.state || '',
        zip: location.zip || '',
        phone: location.phone || '',
        is_primary: location.is_primary || false,
      });
    } else {
      setFormData({
        location_name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        is_primary: false,
      });
    }
  }, [location]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.location_name.trim()) {
      newErrors.location_name = 'Location name is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (formData.state.length > 2) {
      newErrors.state = 'State must be 2 characters';
    }
    if (formData.zip && formData.zip.length > 10) {
      newErrors.zip = 'ZIP code must be 10 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      // Prepare data
      const locationData = {
        business_id: businessId,
        location_name: formData.location_name,
        address: formData.address || null,
        city: formData.city,
        state: formData.state.toUpperCase(),
        zip: formData.zip || null,
        phone: formData.phone || null,
        is_primary: formData.is_primary,
      };

      if (isEditMode && location) {
        // Update existing location
        const { error } = await (supabase as any)
          .from('business_locations')
          .update(locationData)
          .eq('id', location.id);

        if (error) throw error;

        // If marking as primary, unset other primary locations
        if (formData.is_primary) {
          await (supabase as any)
            .from('business_locations')
            .update({ is_primary: false })
            .eq('business_id', businessId)
            .neq('id', location.id);
        }
      } else {
        // Create new location
        const { error } = await (supabase as any)
          .from('business_locations')
          .insert(locationData);

        if (error) throw error;

        // If marking as primary, unset other primary locations
        if (formData.is_primary) {
          await (supabase as any)
            .from('business_locations')
            .update({ is_primary: false })
            .eq('business_id', businessId);
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving location:', error);
      alert(error.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-char-800 rounded-btn w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-char-700 flex items-center justify-between">
          <h2 className="font-display text-2xl">
            {isEditMode ? 'Edit Location' : 'Add Location'}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Location Details */}
            <div>
              <h3 className="font-display text-lg mb-4">Location Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="input-label">
                    Location Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location_name}
                    onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                    className={`input ${errors.location_name ? 'border-danger' : ''}`}
                    placeholder="e.g., Main Office, Downtown Branch"
                    disabled={saving}
                    required
                  />
                  {errors.location_name && (
                    <p className="text-sm text-danger mt-1">{errors.location_name}</p>
                  )}
                </div>

                <div>
                  <label className="input-label">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input"
                    placeholder="e.g., 123 Main Street"
                    disabled={saving}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">
                      City <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`input ${errors.city ? 'border-danger' : ''}`}
                      placeholder="e.g., Portland"
                      disabled={saving}
                      required
                    />
                    {errors.city && (
                      <p className="text-sm text-danger mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="input-label">
                      State <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className={`input ${errors.state ? 'border-danger' : ''}`}
                      placeholder="e.g., OR"
                      maxLength={2}
                      disabled={saving}
                      required
                    />
                    {errors.state && (
                      <p className="text-sm text-danger mt-1">{errors.state}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">ZIP Code</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className={`input ${errors.zip ? 'border-danger' : ''}`}
                      placeholder="e.g., 97201"
                      maxLength={10}
                      disabled={saving}
                    />
                    {errors.zip && (
                      <p className="text-sm text-danger mt-1">{errors.zip}</p>
                    )}
                  </div>

                  <div>
                    <label className="input-label">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input"
                      placeholder="e.g., (555) 123-4567"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Location Toggle */}
            <div className="p-4 bg-char-700 rounded-btn">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  className="mt-1"
                  disabled={saving}
                />
                <div className="flex-1">
                  <div className="font-semibold text-ash-100">Mark as Primary Location</div>
                  <p className="text-sm text-ash-400 mt-1">
                    Primary location is used as the default for scans and reports. Only one location can be primary.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-char-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEditMode ? 'Update Location' : 'Add Location')}
          </button>
        </div>
      </div>
    </div>
  );
}
