'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dfsCall } from '@/lib/dataforseo';

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: any | null;
  businessId: string;
  businessName: string;
  businessDomain?: string;
  onSave: () => void;
}

interface GBPResult {
  title: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  place_id: string;
  cid: string;
  latitude: number;
  longitude: number;
  rating?: number;
  review_count?: number;
  category?: string;
}

function deriveAreaCodes(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return [digits.slice(0, 3)];
  if (digits.length === 11 && digits[0] === '1') return [digits.slice(1, 4)];
  return [];
}

export function MarketModal({
  isOpen,
  onClose,
  market,
  businessId,
  businessName,
  businessDomain,
  onSave,
}: MarketModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GBPResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GBPResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchInput('');
      setSearchResults([]);
      setSelectedResult(null);
      setSearchError('');
      setSaveError('');
      setEditName(market?.name || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, market]);

  const handleSearch = async () => {
    const query = searchInput.trim();
    if (!query) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSelectedResult(null);

    try {
      const keyword = businessName ? `${businessName} ${query}` : query;
      const result = await dfsCall<any>('serp/google/maps/live/advanced', [
        { keyword, language_code: 'en', depth: 10 },
      ]);

      const items = (result.tasks?.[0]?.result?.[0]?.items || []).filter(
        (i: any) => i.type === 'maps_search'
      );

      const results: GBPResult[] = items.slice(0, 5).map((item: any) => {
        const addrParts = (item.address || '').split(',').map((s: string) => s.trim());
        return {
          title: item.title || '',
          address: item.address || '',
          city: item.address_info?.city || addrParts[1] || '',
          state: item.address_info?.region || addrParts[2]?.split(' ')[0] || '',
          phone: item.phone || '',
          place_id: item.place_id || '',
          cid: item.cid || '',
          latitude: item.gps_coordinates?.latitude || item.latitude || 0,
          longitude: item.gps_coordinates?.longitude || item.longitude || 0,
          rating: item.rating?.value || undefined,
          review_count: item.rating?.votes_count || item.reviews_count || undefined,
          category: item.category || undefined,
        };
      });

      if (results.length === 0) {
        setSearchError(`No GBP results found for "${query}". Try a different search.`);
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Search failed. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);

    try {
      if (market) {
        // Edit mode — just update the name
        const name = editName.trim();
        if (!name) throw new Error('Market name is required');
        const { error } = await (supabase as any)
          .from('markets')
          .update({ name })
          .eq('id', market.id);
        if (error) throw error;
      } else {
        // Add mode — save selected GBP result as a market
        if (!selectedResult) throw new Error('Select a location first');
        const { city, state, address, phone, place_id, cid, latitude, longitude } = selectedResult;
        const { error } = await (supabase as any)
          .from('markets')
          .insert({
            business_id: businessId,
            name: `${city}, ${state}`,
            cities: city ? [city] : [],
            area_codes: phone ? deriveAreaCodes(phone) : [],
            is_primary: false,
            place_id: place_id || null,
            cid: cid || null,
            latitude: latitude || null,
            longitude: longitude || null,
            address: address || null,
            phone: phone || null,
            state: state || null,
          });
        if (error) throw error;
      }
      onSave();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save market');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-xl mb-1">
          {market ? 'Edit Market' : 'Add Target Market'}
        </h2>
        <p className="text-ash-500 text-sm mb-5">
          {market ? 'Rename this market' : 'Search for a location to pull GBP data'}
        </p>

        {/* ── Edit mode ── */}
        {market && (
          <div className="space-y-4">
            <div>
              <label className="input-label">Market Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input"
                placeholder="e.g., Portland, OR"
                autoFocus
              />
            </div>

            {/* Existing GBP data (read-only info) */}
            {(market.address || market.phone || market.place_id) && (
              <div className="bg-char-800 rounded-btn p-3 space-y-1 text-sm">
                {market.address && <p className="text-ash-400">{market.address}</p>}
                {market.phone && <p className="text-ash-400">{market.phone}</p>}
                {market.place_id && (
                  <p className="text-ash-600 text-xs font-mono truncate">ID: {market.place_id}</p>
                )}
              </div>
            )}

            {saveError && <p className="text-danger text-sm">{saveError}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={saving}>
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        )}

        {/* ── Add mode ── */}
        {!market && (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input flex-1"
                placeholder="e.g., Beaverton OR, Portland metro"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="btn-primary px-4 flex-shrink-0"
                disabled={searching || !searchInput.trim()}
              >
                {searching ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'Search'
                )}
              </button>
            </div>

            {searchError && <p className="text-danger text-sm">{searchError}</p>}

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((r, i) => {
                  const isSelected = selectedResult === r;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedResult(r)}
                      className={`p-3 rounded-btn border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-flame-500/50 bg-flame-500/5'
                          : 'border-char-700 hover:border-char-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-flame-500 bg-flame-500' : 'border-ash-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{r.title}</p>
                          {r.address && <p className="text-ash-400 text-xs mt-0.5">{r.address}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {r.phone && <span className="text-ash-500 text-xs">{r.phone}</span>}
                            {r.rating && (
                              <span className="text-ash-500 text-xs">
                                ★ {r.rating.toFixed(1)}
                                {r.review_count ? ` (${r.review_count})` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {saveError && <p className="text-danger text-sm">{saveError}</p>}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary flex-1"
                disabled={saving || !selectedResult}
              >
                {saving ? 'Saving...' : 'Add Market'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
