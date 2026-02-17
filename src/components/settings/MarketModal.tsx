import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: any | null;
  businessId: string;
  onSave: () => void;
}

export function MarketModal({ isOpen, onClose, market, businessId, onSave }: MarketModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    cities: '',
    area_codes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (market) {
      setFormData({
        name: market.name || '',
        cities: market.cities || '',
        area_codes: market.area_codes || '',
      });
    } else {
      setFormData({
        name: '',
        cities: '',
        area_codes: '',
      });
    }
  }, [market]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Market name is required');
      }

      const marketData = {
        business_id: businessId,
        name: formData.name.trim(),
        cities: formData.cities.trim() || null,
        area_codes: formData.area_codes.trim() || null,
      };

      if (market) {
        // Update existing market
        const { error: updateError } = await (supabase as any)
          .from('markets')
          .update(marketData)
          .eq('id', market.id);

        if (updateError) throw updateError;
      } else {
        // Create new market
        const { error: insertError } = await (supabase as any)
          .from('markets')
          .insert(marketData);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save market');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-md">
        <h2 className="font-display text-xl mb-4">
          {market ? 'Edit Market' : 'Add Market'}
        </h2>

        {error && (
          <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-btn mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Market Name */}
            <div>
              <label className="input-label">Market Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., Primary Market, Portland Metro"
                required
              />
            </div>

            {/* Cities */}
            <div>
              <label className="input-label">Cities</label>
              <textarea
                value={formData.cities}
                onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                className="input"
                placeholder="e.g., Portland, Beaverton, Hillsboro"
                rows={3}
              />
              <p className="text-xs text-ash-500 mt-1">
                Comma-separated list of cities you serve
              </p>
            </div>

            {/* Area Codes */}
            <div>
              <label className="input-label">Area Codes</label>
              <input
                type="text"
                value={formData.area_codes}
                onChange={(e) => setFormData({ ...formData, area_codes: e.target.value })}
                className="input"
                placeholder="e.g., 503, 971"
              />
              <p className="text-xs text-ash-500 mt-1">
                Comma-separated area codes for this market
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving ? 'Saving...' : market ? 'Update' : 'Add Market'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
