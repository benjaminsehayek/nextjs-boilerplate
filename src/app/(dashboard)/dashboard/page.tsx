'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useAuth } from '@/lib/context/AuthContext';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ActionItems } from '@/components/dashboard/ActionItems';
import { QuickStats } from '@/components/dashboard/QuickStats';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBusiness, createLocation, createServices, createMarkets } from '@/app/actions/onboarding';
import { dfsCall } from '@/lib/dataforseo';
import { detectInputType, parseGoogleMapsUrl } from '@/components/tools/LocalGrid/utils';

const tools = [
  { href: '/site-audit', icon: '🔍', name: 'Site Audit', desc: '52-point technical SEO check' },
  { href: '/content-strategy', icon: '📝', name: 'Content Strategy', desc: 'ROI-based keyword research' },
  { href: '/local-grid', icon: '📍', name: 'Local Grid', desc: 'Maps ranking heat map' },
  { href: '/off-page-audit', icon: '🔗', name: 'Off-Page Audit', desc: 'Backlinks, reviews, citations' },
  { href: '/lead-intelligence', icon: '📡', name: 'Lead Intelligence', desc: 'Multi-channel marketing dashboard' },
  { href: '/lead-database', icon: '👥', name: 'Lead Database', desc: 'CRM with lead scoring' },
];

// ─── Domain Normalizer ────────────────────────────────────────────────────────

function normalizeDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    // If no protocol, add one so URL() can parse it
    const withProtocol = /^[a-z]+:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const { hostname } = new URL(withProtocol);
    // Strip leading www. (or www2., wwww., etc.)
    return hostname.replace(/^www\d*\./, '');
  } catch {
    // URL() failed (e.g. bare "localhost" or garbage) — do best-effort string strip
    return trimmed
      .replace(/^[a-z]+:\/\//i, '')  // strip protocol
      .replace(/^www\d*\./i, '')      // strip www.
      .split('/')[0]                  // strip path
      .split('?')[0]                  // strip query string
      .split('#')[0];                 // strip fragment
  }
}

// ─── Onboarding Wizard ────────────────────────────────────────────────────────

type OnboardingStep = 'business' | 'location' | 'services' | 'markets' | 'complete';

interface LocationForm {
  location_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  cid?: string;
}

interface ServiceForm {
  name: string;
  profit_per_job: string;
  close_rate: string;
}

interface MarketForm {
  name: string;
  cities: string;
  area_codes: string;
}

function OnboardingWizard() {
  const wizardRef = useRef<HTMLDivElement>(null);
  const { refreshBusiness } = useAuth();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Scroll wizard into view whenever step changes
  useEffect(() => {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

  // When onboarding completes, refresh business data so the dashboard renders.
  // Fallback: if refreshBusiness doesn't resolve within 5s, force a page reload.
  // Both timers are cleaned up if the component unmounts (business loaded → dashboard shows).
  useEffect(() => {
    if (currentStep !== 'complete') return;

    const refreshTimer = setTimeout(() => {
      refreshBusiness();
    }, 1500);

    const fallbackTimer = setTimeout(() => {
      window.location.reload();
    }, 5000);

    return () => {
      clearTimeout(refreshTimer);
      clearTimeout(fallbackTimer);
    };
  }, [currentStep, refreshBusiness]);

  const [businessData, setBusinessData] = useState({
    name: '',
    domain: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    industry: '',
    latitude: 0,
    longitude: 0,
    place_id: '',
    cid: '',
  });

  // Smart lookup state
  const [lookupInput, setLookupInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupDone, setLookupDone] = useState(false);

  const [locationData, setLocationData] = useState<LocationForm>({
    location_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
  });

  const [services, setServices] = useState<ServiceForm[]>([
    { name: '', profit_per_job: '', close_rate: '30' },
  ]);

  const [markets, setMarkets] = useState<MarketForm[]>([
    { name: 'Primary Market', cities: '', area_codes: '' },
  ]);

  const handleSmartLookup = useCallback(async () => {
    const trimmed = lookupInput.trim();
    if (!trimmed) return;

    setLookupLoading(true);
    setError(null);
    setLookupResults([]);

    try {
      const inputType = detectInputType(trimmed);

      if (inputType === 'mapsUrl') {
        // Parse URL client-side for identifiers + coords
        const parsed = parseGoogleMapsUrl(trimmed);
        const keyword = parsed.name || trimmed;
        const locParam = parsed.lat && parsed.lng ? `${parsed.lat},${parsed.lng},1000` : undefined;

        const result = await dfsCall<any>('serp/google/maps/live/advanced', [
          { keyword, ...(locParam ? { location_coordinate: locParam } : {}), language_code: 'en', depth: 5 },
        ]);

        const items = (result.tasks?.[0]?.result?.[0]?.items || []).filter((i: any) => i.type === 'maps_search');
        if (items.length > 0) {
          const results = items.slice(0, 5).map((item: any) => mapItemToBusinessData(item, parsed));
          // Auto-match by CID/placeId if available
          if (parsed.cid || parsed.placeId) {
            const match = results.find((r: any) =>
              (parsed.cid && r.cid === parsed.cid) || (parsed.placeId && r.place_id === parsed.placeId)
            );
            if (match) { applyLookupResult(match); return; }
          }
          if (results.length === 1) { applyLookupResult(results[0]); return; }
          setLookupResults(results);
        } else if (parsed.lat && parsed.lng) {
          // Fallback: use parsed coords directly
          setBusinessData((prev) => ({ ...prev, latitude: parsed.lat!, longitude: parsed.lng!, place_id: parsed.placeId || '', cid: parsed.cid || '' }));
          setLookupDone(true);
        } else {
          setError('Could not find business from this Maps URL');
        }
      } else if (inputType === 'website') {
        const cleanDomain = trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

        // Try exact domain match in business listings first
        const result = await dfsCall<any>('business_data/business_listings/search/live', [
          { categories: [], filters: ['domain', '=', cleanDomain], language_code: 'en', limit: 5 },
        ]);
        const items = result.tasks?.[0]?.result?.[0]?.items || [];

        if (items.length > 0) {
          const results = items.map((item: any) => listingToBusinessData(item));
          if (results.length === 1) { applyLookupResult(results[0]); return; }
          setLookupResults(results);
        } else {
          // Fallback: search Google Maps with the domain as keyword
          const mapsResult = await dfsCall<any>('serp/google/maps/live/advanced', [
            { keyword: cleanDomain, language_code: 'en', depth: 5 },
          ]);
          const mapsItems = (mapsResult.tasks?.[0]?.result?.[0]?.items || []).filter((i: any) => i.type === 'maps_search');
          if (mapsItems.length === 0) throw new Error(`No business found for "${cleanDomain}". Try searching by business name instead.`);
          const results = mapsItems.slice(0, 5).map((item: any) => mapItemToBusinessData(item));
          if (results.length === 1) { applyLookupResult(results[0]); return; }
          setLookupResults(results);
        }
      } else if (inputType === 'phone') {
        const digits = trimmed.replace(/\D/g, '');
        const result = await dfsCall<any>('business_data/business_listings/search/live', [
          { categories: [], filters: ['phone', 'like', `%${digits.slice(-10)}%`], language_code: 'en', limit: 5 },
        ]);
        const items = result.tasks?.[0]?.result?.[0]?.items || [];
        if (items.length === 0) throw new Error(`No business found for this phone number. Try searching by business name instead.`);
        const results = items.map((item: any) => listingToBusinessData(item));
        if (results.length === 1) { applyLookupResult(results[0]); return; }
        setLookupResults(results);
      } else {
        // Name search
        const result = await dfsCall<any>('business_data/business_listings/search/live', [
          { categories: [], filters: ['title', 'like', `%${trimmed}%`], language_code: 'en', limit: 5 },
        ]);
        const items = result.tasks?.[0]?.result?.[0]?.items || [];
        if (items.length === 0) throw new Error(`No business found for "${trimmed}". Try a different search or enter manually.`);
        const results = items.map((item: any) => listingToBusinessData(item));
        if (results.length === 1) { applyLookupResult(results[0]); return; }
        setLookupResults(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Fill in the form manually.');
    } finally {
      setLookupLoading(false);
    }
  }, [lookupInput]);

  const applyLookupResult = (result: any) => {
    setBusinessData({
      name: result.name || '',
      domain: result.domain || '',
      phone: result.phone || '',
      address: result.address || '',
      city: result.city || '',
      state: result.state || '',
      zip: result.zip || '',
      industry: result.category || '',
      latitude: result.latitude || 0,
      longitude: result.longitude || 0,
      place_id: result.place_id || '',
      cid: result.cid || '',
    });
    setLookupResults([]);
    setLookupDone(true);
    setError(null);
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { businessId: id, error } = await createBusiness(businessData);
      if (error) throw new Error(error);
      if (!id) throw new Error('Business not found after insert');

      setBusinessId(id);
      setLocationData({
        location_name: businessData.name + ' - Main',
        address: businessData.address,
        city: businessData.city,
        state: businessData.state,
        zip: businessData.zip,
        phone: businessData.phone,
        latitude: businessData.latitude || undefined,
        longitude: businessData.longitude || undefined,
        place_id: businessData.place_id || undefined,
        cid: businessData.cid || undefined,
      });
      setCurrentStep('location');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!businessId) throw new Error('Business not found');

      const { error } = await createLocation({ business_id: businessId, ...locationData });
      if (error) throw new Error(error);

      setCurrentStep('services');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setLoading(false);
    }
  };

  const handleServicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!businessId) throw new Error('Business not found');

      const validServices = services.filter((s) => s.name.trim());
      if (validServices.length === 0) throw new Error('Please add at least one service');

      const { error } = await createServices(
        businessId,
        validServices.map((service, index) => ({
          name: service.name,
          profit_per_job: parseFloat(service.profit_per_job) || 0,
          close_rate: parseFloat(service.close_rate) / 100 || 0.3,
          sort_order: index,
        }))
      );
      if (error) throw new Error(error);

      setCurrentStep('markets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create services');
    } finally {
      setLoading(false);
    }
  };

  const handleMarketsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!businessId) throw new Error('Business not found');

      const validMarkets = markets.filter((m) => m.name.trim() && m.cities.trim());
      if (validMarkets.length === 0) throw new Error('Please add at least one market');

      const { error } = await createMarkets(
        businessId,
        validMarkets.map((market, index) => ({
          name: market.name,
          cities: market.cities.split(',').map((c) => c.trim()).filter(Boolean),
          area_codes: market.area_codes.split(',').map((a) => a.trim()).filter(Boolean),
          is_primary: index === 0,
        }))
      );
      if (error) throw new Error(error);

      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create markets');
    } finally {
      setLoading(false);
    }
  };

  const addService = () =>
    setServices([...services, { name: '', profit_per_job: '', close_rate: '30' }]);
  const removeService = (index: number) =>
    setServices(services.filter((_, i) => i !== index));
  const updateService = (index: number, field: keyof ServiceForm, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const addMarket = () =>
    setMarkets([...markets, { name: '', cities: '', area_codes: '' }]);
  const removeMarket = (index: number) =>
    setMarkets(markets.filter((_, i) => i !== index));
  const updateMarket = (index: number, field: keyof MarketForm, value: string) => {
    const updated = [...markets];
    updated[index] = { ...updated[index], [field]: value };
    setMarkets(updated);
  };

  const steps = [
    { id: 'business', name: 'Business', icon: '🏢' },
    { id: 'location', name: 'Location', icon: '📍' },
    { id: 'services', name: 'Services', icon: '🛠️' },
    { id: 'markets', name: 'Markets', icon: '🗺️' },
  ];
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  if (currentStep === 'complete') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card p-12">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl font-display mb-4">
            <span className="text-flame-500">You are All Set!</span>
          </h1>
          <p className="text-xl text-ash-300 mb-8">Your ScorchLocal account is ready. Loading your dashboard...</p>
          <div className="flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-flame-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={wizardRef} className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-display mb-8 text-center">
        <span className="text-flame-500">Welcome to ScorchLocal!</span>
      </h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 ${
                    index <= currentStepIndex ? 'bg-flame-500 text-white' : 'bg-char-800 text-ash-400'
                  }`}
                >
                  {step.icon}
                </div>
                <div
                  className={`text-sm font-medium ${
                    index <= currentStepIndex ? 'text-flame-500' : 'text-ash-400'
                  }`}
                >
                  {step.name}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index < currentStepIndex ? 'bg-flame-500' : 'bg-char-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Step 1: Business Info */}
      {currentStep === 'business' && (
        <div className="card p-8">
          <h2 className="text-2xl font-display mb-2 text-center">Business Information</h2>
          <p className="text-ash-400 text-center mb-6">Search for your business to auto-fill details</p>

          {/* Smart Lookup */}
          {!lookupDone && (
            <div className="mb-6">
              <label className="input-label">Find your business</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Business name, website, phone, or Google Maps URL"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSmartLookup())}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSmartLookup}
                  disabled={lookupLoading || !lookupInput.trim()}
                >
                  {lookupLoading ? 'Searching...' : 'Lookup'}
                </button>
              </div>
              {lookupInput.trim().length > 2 && (
                <p className="text-xs text-ash-400 mt-1">
                  {detectInputType(lookupInput) === 'mapsUrl' ? 'Google Maps URL detected' :
                   detectInputType(lookupInput) === 'website' ? 'Website URL detected' :
                   detectInputType(lookupInput) === 'phone' ? 'Phone number detected' : 'Business name'}
                </p>
              )}

              {/* Multi-result picker */}
              {lookupResults.length > 1 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-ash-300">Multiple results found. Select your business:</p>
                  {lookupResults.map((result: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyLookupResult(result)}
                      className="w-full text-left p-3 rounded-lg border border-ash-700 hover:border-flame-500 hover:bg-flame-500/5 transition-colors"
                    >
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-ash-400">
                        {result.address}{result.city ? `, ${result.city}` : ''}{result.state ? `, ${result.state}` : ''}
                      </div>
                      {result.phone && <div className="text-xs text-ash-400">{result.phone}</div>}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="text-sm text-ash-400 hover:text-ash-200 mt-3"
                onClick={() => setLookupDone(true)}
              >
                Or enter manually
              </button>
            </div>
          )}

          {/* Business Form (shown after lookup or manual entry) */}
          {lookupDone && (
            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              {businessData.name && (
                <button
                  type="button"
                  className="text-sm text-ash-400 hover:text-ash-200 mb-2"
                  onClick={() => { setLookupDone(false); setLookupResults([]); }}
                >
                  Search for a different business
                </button>
              )}

              <div>
                <label className="input-label">Business Name *</label>
                <input
                  type="text"
                  value={businessData.name}
                  onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                  className="input"
                  placeholder="Smith Plumbing &amp; Heating"
                  required
                />
              </div>

              <div>
                <label className="input-label">Website Domain *</label>
                <input
                  type="text"
                  value={businessData.domain}
                  onChange={(e) => setBusinessData({ ...businessData, domain: e.target.value })}
                  onBlur={(e) => {
                    const clean = normalizeDomain(e.target.value);
                    if (clean !== businessData.domain) {
                      setBusinessData({ ...businessData, domain: clean });
                    }
                  }}
                  className="input"
                  placeholder="smithplumbing.com"
                  required
                />
                <p className="text-xs text-ash-400 mt-1">Paste any URL — we will extract the domain automatically</p>
              </div>

              <div>
                <label className="input-label">Industry</label>
                <input
                  type="text"
                  value={businessData.industry}
                  onChange={(e) => setBusinessData({ ...businessData, industry: e.target.value })}
                  className="input"
                  placeholder="Plumbing, HVAC, Roofing, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    type="tel"
                    value={businessData.phone}
                    onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                    className="input"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="input-label">Street Address</label>
                  <input
                    type="text"
                    value={businessData.address}
                    onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                    className="input"
                    placeholder="123 Main St"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">City</label>
                  <input
                    type="text"
                    value={businessData.city}
                    onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                    className="input"
                    placeholder="Portland"
                  />
                </div>
                <div>
                  <label className="input-label">State</label>
                  <input
                    type="text"
                    value={businessData.state}
                    onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                    className="input"
                    placeholder="OR"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="input-label">ZIP</label>
                  <input
                    type="text"
                    value={businessData.zip}
                    onChange={(e) => setBusinessData({ ...businessData, zip: e.target.value })}
                    className="input"
                    placeholder="97201"
                    maxLength={10}
                  />
                </div>
              </div>

              {businessData.latitude !== 0 && businessData.longitude !== 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
                  Coordinates found: {businessData.latitude.toFixed(6)}, {businessData.longitude.toFixed(6)}
                  {businessData.place_id && <span className="ml-2">| Place ID linked</span>}
                  {businessData.cid && <span className="ml-2">| CID linked</span>}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Step 2: Primary Location */}
      {currentStep === 'location' && (
        <div className="card p-8">
          <h2 className="text-2xl font-display mb-2 text-center">Primary Location</h2>
          <p className="text-ash-400 text-center mb-6">Add your main business location</p>

          <form onSubmit={handleLocationSubmit} className="space-y-4">
            <div>
              <label className="input-label">Location Name *</label>
              <input
                type="text"
                value={locationData.location_name}
                onChange={(e) => setLocationData({ ...locationData, location_name: e.target.value })}
                className="input"
                placeholder="Main Office, Downtown, etc."
                required
              />
            </div>

            <div>
              <label className="input-label">Address</label>
              <input
                type="text"
                value={locationData.address}
                onChange={(e) => setLocationData({ ...locationData, address: e.target.value })}
                className="input"
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="input-label">City *</label>
                <input
                  type="text"
                  value={locationData.city}
                  onChange={(e) => setLocationData({ ...locationData, city: e.target.value })}
                  className="input"
                  placeholder="Portland"
                  required
                />
              </div>
              <div>
                <label className="input-label">State *</label>
                <input
                  type="text"
                  value={locationData.state}
                  onChange={(e) => setLocationData({ ...locationData, state: e.target.value })}
                  className="input"
                  placeholder="OR"
                  maxLength={2}
                  required
                />
              </div>
              <div>
                <label className="input-label">ZIP</label>
                <input
                  type="text"
                  value={locationData.zip}
                  onChange={(e) => setLocationData({ ...locationData, zip: e.target.value })}
                  className="input"
                  placeholder="97201"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Phone</label>
              <input
                type="tel"
                value={locationData.phone}
                onChange={(e) => setLocationData({ ...locationData, phone: e.target.value })}
                className="input"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep('business')}
                className="btn-ghost"
                disabled={loading}
              >
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Services */}
      {currentStep === 'services' && (
        <div className="card p-8">
          <h2 className="text-2xl font-display mb-2 text-center">Services &amp; Pricing</h2>
          <p className="text-ash-400 text-center mb-6">
            What services do you offer? (Used for lead value calculations)
          </p>

          <form onSubmit={handleServicesSubmit} className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="card-interactive p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="input-label text-xs">Service Name *</label>
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        className="input"
                        placeholder="e.g., Drain Cleaning, AC Repair"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label text-xs">Avg Profit per Job ($)</label>
                        <input
                          type="number"
                          value={service.profit_per_job}
                          onChange={(e) => updateService(index, 'profit_per_job', e.target.value)}
                          className="input"
                          placeholder="450"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="input-label text-xs">Close Rate (%)</label>
                        <input
                          type="number"
                          value={service.close_rate}
                          onChange={(e) => updateService(index, 'close_rate', e.target.value)}
                          className="input"
                          placeholder="30"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="btn-ghost text-danger px-3"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="button" onClick={addService} className="btn-secondary w-full">
              + Add Another Service
            </button>

            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep('location')}
                className="btn-ghost"
                disabled={loading}
              >
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Markets */}
      {currentStep === 'markets' && (
        <div className="card p-8">
          <h2 className="text-2xl font-display mb-2 text-center">Service Areas</h2>
          <p className="text-ash-400 text-center mb-6">
            Define your service area markets (for lead attribution)
          </p>

          <form onSubmit={handleMarketsSubmit} className="space-y-4">
            {markets.map((market, index) => (
              <div key={index} className="card-interactive p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="input-label text-xs">Market Name *</label>
                      <input
                        type="text"
                        value={market.name}
                        onChange={(e) => updateMarket(index, 'name', e.target.value)}
                        className="input"
                        placeholder="e.g., Portland Metro, SW Washington"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label text-xs">Cities (comma-separated) *</label>
                      <input
                        type="text"
                        value={market.cities}
                        onChange={(e) => updateMarket(index, 'cities', e.target.value)}
                        className="input"
                        placeholder="Portland, Beaverton, Hillsboro"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label text-xs">Area Codes (comma-separated)</label>
                      <input
                        type="text"
                        value={market.area_codes}
                        onChange={(e) => updateMarket(index, 'area_codes', e.target.value)}
                        className="input"
                        placeholder="503, 971"
                      />
                    </div>
                  </div>
                  {markets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMarket(index)}
                      className="btn-ghost text-danger px-3"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="button" onClick={addMarket} className="btn-secondary w-full">
              + Add Another Market
            </button>

            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep('services')}
                className="btn-ghost"
                disabled={loading}
              >
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                Complete Setup
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="text-xs text-ash-400 text-center mt-6">
        You can update all this information anytime in Settings
      </p>
    </div>
  );
}

// ─── Lookup Helpers ──────────────────────────────────────────────────────────

function mapItemToBusinessData(item: any, parsed?: { placeId?: string; cid?: string }) {
  const addressParts = (item.address || '').split(',').map((s: string) => s.trim());
  return {
    name: item.title || '',
    domain: item.domain || '',
    phone: item.phone || '',
    address: addressParts[0] || item.address || '',
    city: addressParts[1] || '',
    state: addressParts[2]?.split(' ')[0] || '',
    zip: addressParts[2]?.split(' ')[1] || '',
    category: item.category || '',
    latitude: item.gps_coordinates?.latitude || item.latitude || 0,
    longitude: item.gps_coordinates?.longitude || item.longitude || 0,
    place_id: item.place_id || parsed?.placeId || '',
    cid: item.cid || parsed?.cid || '',
  };
}

function listingToBusinessData(item: any) {
  return {
    name: item.title || '',
    domain: item.domain || '',
    phone: item.phone || '',
    address: item.address || '',
    city: item.address_info?.city || '',
    state: item.address_info?.region || '',
    zip: item.address_info?.zip || '',
    category: item.category || '',
    latitude: item.latitude || 0,
    longitude: item.longitude || 0,
    place_id: item.place_id || '',
    cid: item.cid || '',
  };
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile, loading } = useUser();
  const { business } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-char-700 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-char-700 animate-pulse rounded-btn" />
          ))}
        </div>
        <div className="h-48 bg-char-700 animate-pulse rounded-btn" />
      </div>
    );
  }

  if (!user) return null;

  // Show onboarding wizard if no business yet
  if (!business) {
    return <OnboardingWizard />;
  }

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display mb-2">
          Welcome back, <span className="text-flame-500">{firstName}</span>
        </h1>
        <p className="text-ash-300">Here is what is happening with your business</p>
      </div>

      {/* Overview Stats */}
      <DashboardStats business={business} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <RecentActivity business={business} />
          <ActionItems business={business} />
        </div>
        <div className="lg:col-span-1">
          <QuickStats profile={profile} />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="mb-4">
        <h2 className="text-xl font-display mb-4">Tools</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="card-interactive p-6">
            <div className="text-4xl mb-3">{tool.icon}</div>
            <h3 className="font-display text-lg mb-1 text-flame-500">{tool.name}</h3>
            <p className="text-sm text-ash-400">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
