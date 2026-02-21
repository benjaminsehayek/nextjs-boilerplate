'use client';

import { useState, useCallback } from 'react';
import { dfsCall } from '@/lib/dataforseo';
import { detectInputType, parseGoogleMapsUrl } from './utils';
import type { InputType } from './utils';
import type { BusinessInfo } from './types';

interface BusinessLookupProps {
  onBusinessFound: (business: BusinessInfo) => void;
  initialBusiness?: BusinessInfo;
}

interface LookupResult {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  placeId?: string;
  cid?: string;
  featureId?: string;
  domain?: string;
  category?: string;
}

const INPUT_TYPE_LABELS: Record<InputType, string> = {
  mapsUrl: 'Google Maps URL detected',
  website: 'Website URL detected',
  phone: 'Phone number detected',
  name: 'Business name',
};

export function BusinessLookup({ onBusinessFound, initialBusiness }: BusinessLookupProps) {
  const [input, setInput] = useState('');
  const [detectedType, setDetectedType] = useState<InputType>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LookupResult[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [formData, setFormData] = useState<Partial<BusinessInfo>>(initialBusiness || {});

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    if (value.trim().length > 2) {
      setDetectedType(detectInputType(value));
    }
    setError(null);
    setResults([]);
  }, []);

  const handleLookup = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please enter a business name, website, phone, or Google Maps URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const inputType = detectInputType(trimmed);

      if (inputType === 'mapsUrl') {
        await lookupFromMapsUrl(trimmed);
      } else if (inputType === 'website') {
        await lookupByDomain(trimmed);
      } else if (inputType === 'phone') {
        await lookupByPhone(trimmed);
      } else {
        await lookupByName(trimmed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Try manual entry.');
    } finally {
      setLoading(false);
    }
  };

  const lookupFromMapsUrl = async (url: string) => {
    // Parse URL client-side to extract identifiers
    const parsed = parseGoogleMapsUrl(url);

    // Try to resolve business via DataForSEO using extracted info
    if (parsed.name) {
      // Use the business name extracted from URL + coordinates if available
      const keyword = decodeURIComponent(parsed.name);
      const locationParam = parsed.lat && parsed.lng
        ? `${parsed.lat},${parsed.lng},1000`
        : undefined;

      const result = await dfsCall<any>('serp/google/maps/live/advanced', [
        {
          keyword,
          ...(locationParam ? { location_coordinate: locationParam } : {}),
          language_code: 'en',
          depth: 5,
        },
      ]);

      const items = result.tasks?.[0]?.result?.[0]?.items || [];
      const mapItems = items.filter((i: any) => i.type === 'maps_search');

      if (mapItems.length > 0) {
        const lookupResults = mapItems.slice(0, 5).map((item: any) => mapItemToResult(item, parsed));

        // If we have CID or placeId from URL, try to auto-match
        if (parsed.cid || parsed.placeId) {
          const match = lookupResults.find((r: LookupResult) =>
            (parsed.cid && r.cid === parsed.cid) ||
            (parsed.placeId && r.placeId === parsed.placeId)
          );
          if (match) {
            selectResult(match);
            return;
          }
        }

        if (lookupResults.length === 1) {
          selectResult(lookupResults[0]);
        } else {
          setResults(lookupResults);
        }
        return;
      }
    }

    // Fallback: use parsed coordinates + identifiers directly
    if (parsed.lat && parsed.lng) {
      const business: LookupResult = {
        name: parsed.name || 'Unknown Business',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: parsed.lat,
        longitude: parsed.lng,
        placeId: parsed.placeId,
        cid: parsed.cid,
        featureId: parsed.featureId,
      };
      setFormData(business);
      setShowManual(true);
      setError('Partial info extracted from URL. Please fill in the remaining fields.');
      return;
    }

    throw new Error('Could not extract business info from this Maps URL');
  };

  const lookupByDomain = async (domain: string) => {
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    const result = await dfsCall<any>('business_data/business_listings/search/live', [
      {
        categories: [],
        filters: ['domain', '=', cleanDomain],
        language_code: 'en',
        limit: 5,
      },
    ]);

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    if (items.length === 0) {
      throw new Error(`No business found for domain "${cleanDomain}"`);
    }

    const lookupResults = items.map((item: any) => listingToResult(item));
    if (lookupResults.length === 1) {
      selectResult(lookupResults[0]);
    } else {
      setResults(lookupResults);
    }
  };

  const lookupByPhone = async (phoneInput: string) => {
    const digits = phoneInput.replace(/\D/g, '');
    const formatted = digits.length === 10 ? `+1${digits}` : digits.length === 11 ? `+${digits}` : phoneInput;

    const result = await dfsCall<any>('business_data/business_listings/search/live', [
      {
        categories: [],
        filters: ['phone', 'like', `%${digits.slice(-10)}%`],
        language_code: 'en',
        limit: 5,
      },
    ]);

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    if (items.length === 0) {
      throw new Error(`No business found for phone "${formatted}"`);
    }

    const lookupResults = items.map((item: any) => listingToResult(item));
    if (lookupResults.length === 1) {
      selectResult(lookupResults[0]);
    } else {
      setResults(lookupResults);
    }
  };

  const lookupByName = async (name: string) => {
    const result = await dfsCall<any>('business_data/business_listings/search/live', [
      {
        categories: [],
        filters: ['title', 'like', `%${name}%`],
        language_code: 'en',
        limit: 5,
      },
    ]);

    const items = result.tasks?.[0]?.result?.[0]?.items || [];
    if (items.length === 0) {
      throw new Error(`No business found for "${name}". Try a different search or use manual entry.`);
    }

    const lookupResults = items.map((item: any) => listingToResult(item));
    if (lookupResults.length === 1) {
      selectResult(lookupResults[0]);
    } else {
      setResults(lookupResults);
    }
  };

  const selectResult = (result: LookupResult) => {
    setFormData(result);
    setResults([]);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.latitude || !formData.longitude) {
      setError('Business name and coordinates are required');
      return;
    }

    onBusinessFound({
      name: formData.name,
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zipCode: formData.zipCode || '',
      latitude: formData.latitude,
      longitude: formData.longitude,
      phone: formData.phone,
      website: formData.website,
      placeId: formData.placeId,
      cid: formData.cid,
      featureId: formData.featureId,
      domain: formData.domain,
      category: formData.category,
    });
  };

  const handleGeocode = async () => {
    if (!formData.address) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
    } catch {
      setError('Failed to geocode address. Please enter coordinates manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-display mb-4">Business Information</h3>

      {/* Smart Input */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Search for your business</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Business name, website, phone, or Google Maps URL"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <button
            className="btn-primary"
            onClick={handleLookup}
            disabled={loading || !input.trim()}
          >
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </div>
        {input.trim().length > 2 && (
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {INPUT_TYPE_LABELS[detectedType]}
          </p>
        )}
      </div>

      {/* Multi-result selection */}
      {results.length > 1 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">
            Multiple results found. Select your business:
          </p>
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => selectResult(result)}
              className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
            >
              <div className="font-medium">{result.name}</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {result.address}{result.city ? `, ${result.city}` : ''}{result.state ? `, ${result.state}` : ''}
              </div>
              {result.phone && (
                <div className="text-xs text-[var(--text-secondary)]">{result.phone}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected Business Preview */}
      {formData.name && !results.length && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display">{formData.name}</div>
                {formData.address && (
                  <div className="text-sm text-[var(--text-secondary)]">
                    {formData.address}{formData.city ? `, ${formData.city}` : ''}{formData.state ? `, ${formData.state}` : ''} {formData.zipCode}
                  </div>
                )}
                {formData.phone && (
                  <div className="text-sm text-[var(--text-secondary)]">{formData.phone}</div>
                )}
                {formData.website && (
                  <div className="text-sm text-[var(--text-secondary)]">{formData.website}</div>
                )}
                {formData.latitude && formData.longitude && (
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    {formData.cid && <span className="ml-2">CID: {formData.cid}</span>}
                    {formData.placeId && <span className="ml-2">Place ID: {formData.placeId.slice(0, 12)}...</span>}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => { setFormData({}); setResults([]); }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Advanced / Manual Edit */}
          <button
            type="button"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={() => setShowManual(!showManual)}
          >
            {showManual ? 'Hide details' : 'Edit details'}
          </button>

          {showManual && (
            <div className="space-y-4 pt-2">
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
                <label className="block text-sm mb-2">Address</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Place ID</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.placeId || ''}
                    onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                    placeholder="ChIJ..."
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">CID</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.cid || ''}
                    onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
                    placeholder="Numeric ID"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            Continue to Grid Setup
          </button>
        </form>
      )}

      {/* Initial state — no business selected yet, no results */}
      {!formData.name && !results.length && (
        <div className="mt-4">
          <button
            type="button"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={() => setShowManual(!showManual)}
          >
            {showManual ? 'Hide manual entry' : 'Or enter manually'}
          </button>

          {showManual && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Place ID</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.placeId || ''}
                    onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                    placeholder="ChIJ..."
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">CID</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.cid || ''}
                    onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
                    placeholder="Numeric ID"
                  />
                </div>
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
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper: convert Maps SERP item to LookupResult ──────────────────

function mapItemToResult(item: any, parsed?: { placeId?: string; cid?: string; featureId?: string }): LookupResult {
  const addressParts = (item.address || '').split(',').map((s: string) => s.trim());

  return {
    name: item.title || '',
    address: addressParts[0] || item.address || '',
    city: addressParts[1] || '',
    state: addressParts[2]?.split(' ')[0] || '',
    zipCode: addressParts[2]?.split(' ')[1] || '',
    latitude: item.gps_coordinates?.latitude || item.latitude || 0,
    longitude: item.gps_coordinates?.longitude || item.longitude || 0,
    phone: item.phone || undefined,
    website: item.url || undefined,
    placeId: item.place_id || parsed?.placeId || undefined,
    cid: item.cid || parsed?.cid || undefined,
    featureId: item.feature_id || parsed?.featureId || undefined,
    domain: item.domain || undefined,
    category: item.category || undefined,
  };
}

// ── Helper: convert Business Listings item to LookupResult ──────────

function listingToResult(item: any): LookupResult {
  return {
    name: item.title || '',
    address: item.address || '',
    city: item.address_info?.city || '',
    state: item.address_info?.region || '',
    zipCode: item.address_info?.zip || '',
    latitude: item.latitude || 0,
    longitude: item.longitude || 0,
    phone: item.phone || undefined,
    website: item.url || item.domain ? `https://${item.domain}` : undefined,
    placeId: item.place_id || undefined,
    cid: item.cid || undefined,
    featureId: item.feature_id || undefined,
    domain: item.domain || undefined,
    category: item.category || undefined,
  };
}
