'use client';

import { useState } from 'react';
import type { BusinessInfo } from './types';

interface BusinessLookupProps {
  onBusinessFound: (business: BusinessInfo) => void;
  initialBusiness?: BusinessInfo;
}

export function BusinessLookup({ onBusinessFound, initialBusiness }: BusinessLookupProps) {
  const [lookupMethod, setLookupMethod] = useState<'manual' | 'maps' | 'website' | 'phone'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form fields
  const [formData, setFormData] = useState<Partial<BusinessInfo>>(initialBusiness || {});

  // Lookup input fields
  const [mapsUrl, setMapsUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.latitude || !formData.longitude) {
      setError('Please fill in all required fields');
      return;
    }

    onBusinessFound(formData as BusinessInfo);
  };

  const handleGeocode = async () => {
    if (!formData.address) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use Nominatim for geocoding (free alternative to Google Geocoding API)
      const query = encodeURIComponent(
        `${formData.address}${formData.city ? ', ' + formData.city : ''}${formData.state ? ', ' + formData.state : ''}`
      );
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
      );

      const data = await response.json();

      if (data.length === 0) {
        setError('Address not found. Please check and try again.');
        return;
      }

      setFormData({
        ...formData,
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      });

      setError(null);
    } catch (err) {
      setError('Failed to geocode address. Please enter coordinates manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    setLoading(true);
    setError(null);

    try {
      let lookupData: { url?: string; website?: string; phone?: string } = {};

      if (lookupMethod === 'maps') {
        lookupData.url = mapsUrl;
      } else if (lookupMethod === 'website') {
        lookupData.website = website;
      } else if (lookupMethod === 'phone') {
        lookupData.phone = phone;
      }

      // Call DataForSEO Business Data API through our proxy
      const response = await fetch('/api/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'business_data/google/my_business_info/task_post',
          data: [lookupData],
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Business lookup failed');
      }

      // Extract business data from DataForSEO response
      const businessData = result.tasks?.[0]?.result?.[0];

      if (!businessData) {
        throw new Error('No business data found');
      }

      const business: BusinessInfo = {
        name: businessData.title || '',
        address: businessData.address || '',
        city: businessData.address_info?.city || '',
        state: businessData.address_info?.region || '',
        zipCode: businessData.address_info?.zip || '',
        latitude: businessData.latitude || 0,
        longitude: businessData.longitude || 0,
        phone: businessData.phone || undefined,
        website: businessData.url || undefined,
      };

      setFormData(business);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Business lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-display mb-4">Business Information</h3>

      {/* Lookup Method Tabs */}
      <div className="tabs mb-6">
        <button
          className={`tab ${lookupMethod === 'manual' ? 'active' : ''}`}
          onClick={() => setLookupMethod('manual')}
        >
          Manual Entry
        </button>
        <button
          className={`tab ${lookupMethod === 'maps' ? 'active' : ''}`}
          onClick={() => setLookupMethod('maps')}
        >
          Google Maps
        </button>
        <button
          className={`tab ${lookupMethod === 'website' ? 'active' : ''}`}
          onClick={() => setLookupMethod('website')}
        >
          Website
        </button>
        <button
          className={`tab ${lookupMethod === 'phone' ? 'active' : ''}`}
          onClick={() => setLookupMethod('phone')}
        >
          Phone
        </button>
      </div>

      {/* Lookup Inputs */}
      {lookupMethod !== 'manual' && (
        <div className="mb-4">
          {lookupMethod === 'maps' && (
            <div>
              <label className="block text-sm mb-2">Google Maps URL</label>
              <input
                type="url"
                className="input mb-2"
                placeholder="https://maps.google.com/..."
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
              />
            </div>
          )}
          {lookupMethod === 'website' && (
            <div>
              <label className="block text-sm mb-2">Business Website</label>
              <input
                type="url"
                className="input mb-2"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          )}
          {lookupMethod === 'phone' && (
            <div>
              <label className="block text-sm mb-2">Phone Number</label>
              <input
                type="tel"
                className="input mb-2"
                placeholder="+1 555-123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}
          <button
            className="btn-primary"
            onClick={handleLookup}
            disabled={loading}
          >
            {loading ? 'Looking up...' : 'Lookup Business'}
          </button>
        </div>
      )}

      {/* Manual Form */}
      <form onSubmit={handleManualSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Business Name *</label>
            <input
              type="text"
              className="input"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Phone</label>
            <input
              type="tel"
              className="input"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2">Address *</label>
          <input
            type="text"
            className="input"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-2">City</label>
            <input
              type="text"
              className="input"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">State</label>
            <input
              type="text"
              className="input"
              value={formData.state || ''}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">ZIP Code</label>
            <input
              type="text"
              className="input"
              value={formData.zipCode || ''}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Latitude *</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                className="input flex-1"
                value={formData.latitude || ''}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                required
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGeocode}
                disabled={loading}
              >
                {loading ? '...' : 'Geocode'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2">Longitude *</label>
            <input
              type="number"
              step="any"
              className="input"
              value={formData.longitude || ''}
              onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2">Website</label>
          <input
            type="url"
            className="input"
            value={formData.website || ''}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full">
          Continue to Grid Setup
        </button>
      </form>
    </div>
  );
}
