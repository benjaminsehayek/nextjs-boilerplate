'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';

type OnboardingStep = 'business' | 'location' | 'services' | 'markets' | 'complete';

interface LocationForm {
  location_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
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

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Step 1: Business Info
  const [businessData, setBusinessData] = useState({
    name: '',
    domain: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    industry: '',
  });

  // Step 2: Primary Location
  const [locationData, setLocationData] = useState<LocationForm>({
    location_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
  });

  // Step 3: Services (at least one)
  const [services, setServices] = useState<ServiceForm[]>([
    { name: '', profit_per_job: '', close_rate: '30' }
  ]);

  // Step 4: Markets (at least one)
  const [markets, setMarkets] = useState<MarketForm[]>([
    { name: 'Primary Market', cities: '', area_codes: '' }
  ]);

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('Starting business submission...', { user: !!user, businessData });

    try {
      if (!user) {
        throw new Error('Authentication session not found. Please refresh the page and try again.');
      }

      console.log('Creating business for user:', user.id);

      // Create business
      const { data: business, error: businessError } = await (supabase as any)
        .from('businesses')
        .insert({
          user_id: user.id,
          name: businessData.name,
          domain: businessData.domain,
          phone: businessData.phone || null,
          address: businessData.address || null,
          city: businessData.city || null,
          state: businessData.state || null,
          zip: businessData.zip || null,
          industry: businessData.industry || null,
        })
        .select()
        .single();

      console.log('Business insert result:', { business, businessError });

      if (businessError) {
        console.error('Business error:', businessError);

        if (businessError.message.includes('duplicate') || businessError.message.includes('unique')) {
          console.log('Business already exists, fetching...');
          // Business exists, fetch it
          const { data: existingBusiness, error: fetchError } = await (supabase as any)
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

          console.log('Existing business:', { existingBusiness, fetchError });

          if (fetchError) {
            throw new Error(`Failed to fetch existing business: ${fetchError.message}`);
          }

          if (existingBusiness) {
            setBusinessId(existingBusiness.id);
            setCurrentStep('location');
            console.log('Moving to location step with existing business:', existingBusiness.id);
          } else {
            throw new Error('Business exists but could not be fetched');
          }
        } else {
          throw new Error(`Database error: ${businessError.message}`);
        }
      } else if (business) {
        console.log('Business created successfully:', business.id);
        setBusinessId(business.id);
        // Pre-fill location with business data
        setLocationData({
          location_name: businessData.name + ' - Main',
          address: businessData.address,
          city: businessData.city,
          state: businessData.state,
          zip: businessData.zip,
          phone: businessData.phone,
        });
        setCurrentStep('location');
        console.log('Moving to location step');
      } else {
        throw new Error('No business data returned and no error');
      }
    } catch (err) {
      console.error('Business creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create business. Please try again.');
    } finally {
      setLoading(false);
      console.log('Business submission complete');
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!businessId) throw new Error('Business not found');

      // Create primary location
      const { error: locationError } = await (supabase as any)
        .from('business_locations')
        .insert({
          business_id: businessId,
          location_name: locationData.location_name,
          address: locationData.address || null,
          city: locationData.city,
          state: locationData.state,
          zip: locationData.zip || null,
          phone: locationData.phone || null,
          is_primary: true,
        });

      if (locationError) throw locationError;

      setCurrentStep('services');
    } catch (err) {
      console.error('Location creation error:', err);
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

      // Filter out empty services
      const validServices = services.filter(s => s.name.trim());

      if (validServices.length === 0) {
        throw new Error('Please add at least one service');
      }

      // Insert services
      const { error: servicesError } = await (supabase as any)
        .from('services')
        .insert(
          validServices.map((service, index) => ({
            business_id: businessId,
            name: service.name,
            profit_per_job: parseFloat(service.profit_per_job) || 0,
            close_rate: parseFloat(service.close_rate) / 100 || 0.30,
            sort_order: index,
          }))
        );

      if (servicesError) throw servicesError;

      setCurrentStep('markets');
    } catch (err) {
      console.error('Services creation error:', err);
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

      // Filter out empty markets
      const validMarkets = markets.filter(m => m.name.trim() && m.cities.trim());

      if (validMarkets.length === 0) {
        throw new Error('Please add at least one market');
      }

      // Insert markets
      const { error: marketsError } = await (supabase as any)
        .from('markets')
        .insert(
          validMarkets.map((market, index) => ({
            business_id: businessId,
            name: market.name,
            cities: market.cities.split(',').map(c => c.trim()).filter(Boolean),
            area_codes: market.area_codes.split(',').map(a => a.trim()).filter(Boolean),
            is_primary: index === 0,
          }))
        );

      if (marketsError) throw marketsError;

      setCurrentStep('complete');

      // Redirect after short delay
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error('Markets creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create markets');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setServices([...services, { name: '', profit_per_job: '', close_rate: '30' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: keyof ServiceForm, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const addMarket = () => {
    setMarkets([...markets, { name: '', cities: '', area_codes: '' }]);
  };

  const removeMarket = (index: number) => {
    setMarkets(markets.filter((_, i) => i !== index));
  };

  const updateMarket = (index: number, field: keyof MarketForm, value: string) => {
    const updated = [...markets];
    updated[index] = { ...updated[index], [field]: value };
    setMarkets(updated);
  };

  // Progress indicator
  const steps = [
    { id: 'business', name: 'Business', icon: '🏢' },
    { id: 'location', name: 'Location', icon: '📍' },
    { id: 'services', name: 'Services', icon: '🛠️' },
    { id: 'markets', name: 'Markets', icon: '🗺️' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  if (currentStep === 'complete') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card p-12">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl font-display mb-4">
            <span className="text-flame-500">You're All Set!</span>
          </h1>
          <p className="text-xl text-ash-300 mb-8">
            Your ScorchLocal account is ready. Redirecting to dashboard...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-flame-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-display mb-8 text-center">
        <span className="text-flame-500">Welcome to ScorchLocal!</span>
      </h1>

      {/* Auth Status Debug */}
      {!user && !userLoading && (
        <div className="mb-6 p-4 bg-ember-500/10 border border-ember-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ember-500">⚠️ Session Not Detected</p>
              <p className="text-sm text-ash-400 mt-1">
                Your session may have expired. Please refresh the page.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 ${
                    index <= currentStepIndex
                      ? 'bg-flame-500 text-white'
                      : 'bg-char-800 text-ash-400'
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
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium mb-2">{error}</p>
              {error.includes('Authentication') && (
                <button
                  onClick={() => {
                    setError(null);
                    window.location.reload();
                  }}
                  className="btn-secondary text-sm"
                >
                  🔄 Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Business Info */}
      {currentStep === 'business' && (
        <div className="card p-8">
          <h2 className="text-2xl font-display mb-2 text-center">Business Information</h2>
          <p className="text-ash-400 text-center mb-6">
            Tell us about your business
          </p>

          <form onSubmit={handleBusinessSubmit} className="space-y-4">
            <div>
              <label className="input-label">Business Name *</label>
              <input
                type="text"
                value={businessData.name}
                onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                className="input"
                placeholder="Smith Plumbing & Heating"
                required
              />
            </div>

            <div>
              <label className="input-label">Website Domain *</label>
              <input
                type="text"
                value={businessData.domain}
                onChange={(e) => setBusinessData({ ...businessData, domain: e.target.value })}
                className="input"
                placeholder="smithplumbing.com"
                required
              />
              <p className="text-xs text-ash-400 mt-1">Don't include https:// or www.</p>
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

            <div className="flex justify-end gap-3 pt-4">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Primary Location */}
      {currentStep === 'location' && (
        <div className="card p-8">
          <h2 className="text-2xl font-display mb-2 text-center">Primary Location</h2>
          <p className="text-ash-400 text-center mb-6">
            Add your main business location
          </p>

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
          <h2 className="text-2xl font-display mb-2 text-center">Services & Pricing</h2>
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

            <button
              type="button"
              onClick={addService}
              className="btn-secondary w-full"
            >
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

            <button
              type="button"
              onClick={addMarket}
              className="btn-secondary w-full"
            >
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
                {loading ? 'Complete Setup' : 'Complete Setup'}
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
