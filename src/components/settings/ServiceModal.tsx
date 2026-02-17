import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any | null;
  businessId: string;
  onSave: () => void;
}

export function ServiceModal({ isOpen, onClose, service, businessId, onSave }: ServiceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    profit_per_job: '',
    close_rate: '30',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        profit_per_job: service.profit_per_job?.toString() || '',
        close_rate: service.close_rate?.toString() || '30',
      });
    } else {
      setFormData({
        name: '',
        profit_per_job: '',
        close_rate: '30',
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Service name is required');
      }

      const serviceData = {
        business_id: businessId,
        name: formData.name.trim(),
        profit_per_job: parseFloat(formData.profit_per_job) || null,
        close_rate: parseFloat(formData.close_rate) || 30,
      };

      if (service) {
        // Update existing service
        const { error: updateError } = await (supabase as any)
          .from('services')
          .update(serviceData)
          .eq('id', service.id);

        if (updateError) throw updateError;
      } else {
        // Create new service
        const { error: insertError } = await (supabase as any)
          .from('services')
          .insert(serviceData);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-md">
        <h2 className="font-display text-xl mb-4">
          {service ? 'Edit Service' : 'Add Service'}
        </h2>

        {error && (
          <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-btn mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Service Name */}
            <div>
              <label className="input-label">Service Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., Water Heater Replacement"
                required
              />
            </div>

            {/* Profit Per Job */}
            <div>
              <label className="input-label">Profit Per Job ($)</label>
              <input
                type="number"
                value={formData.profit_per_job}
                onChange={(e) => setFormData({ ...formData, profit_per_job: e.target.value })}
                className="input"
                placeholder="e.g., 1500"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-ash-500 mt-1">
                Average profit margin for this service
              </p>
            </div>

            {/* Close Rate */}
            <div>
              <label className="input-label">Close Rate (%)</label>
              <input
                type="number"
                value={formData.close_rate}
                onChange={(e) => setFormData({ ...formData, close_rate: e.target.value })}
                className="input"
                placeholder="e.g., 30"
                min="0"
                max="100"
                step="1"
              />
              <p className="text-xs text-ash-500 mt-1">
                Percentage of leads that convert to customers
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
              {saving ? 'Saving...' : service ? 'Update' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
