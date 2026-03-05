'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { UpgradeCTA } from '@/components/settings/UpgradeCTA';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { LocationModal } from '@/components/settings/LocationModal';
import { LocationsList } from '@/components/settings/LocationsList';
import { ServiceModal } from '@/components/settings/ServiceModal';
import { ServicesList } from '@/components/settings/ServicesList';
import { MarketModal } from '@/components/settings/MarketModal';
import { MarketsList } from '@/components/settings/MarketsList';
import { profileUpdateSchema } from '@/lib/validations/profile';
import { useGSCConnection } from '@/lib/hooks/useGSCConnection';
import { z } from 'zod';
import type { BusinessLocation } from '@/types';

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshBusiness } = useAuth();
  const { user, profile, loading: userLoading, refreshProfile } = useUser();
  const { tier, scansRemaining, tokensRemaining } = useSubscription();
  const { business } = useBusiness();
  const { locations, loading: locationsLoading } = useLocations(business?.id);
  const { toast } = useToast();
  const supabase = createClient();
  const { connection: gscConnection, loading: gscLoading, connect: gscConnect, disconnect: gscDisconnect } = useGSCConnection(business?.id);

  // Tab state - get from URL or default to 'personal'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'personal');

  // Handle tab changes and update URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessData, setBusinessData] = useState({
    name: '',
    domain: '',
    industry: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  const [profileData, setProfileData] = useState({
    full_name: '',
    avatar_url: null as string | null,
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<BusinessLocation | null>(null);

  // Services state
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  // Markets state
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [editingMarket, setEditingMarket] = useState<any | null>(null);
  const [importingMarkets, setImportingMarkets] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // WordPress integration state
  const [wpUrl, setWpUrl] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [wpSaving, setWpSaving] = useState(false);
  const [wpSaved, setWpSaved] = useState(false);

  // GSC sitemaps state
  interface SitemapContent { type: string; submitted: number; indexed: number; }
  interface SitemapEntry { path: string; type: string; lastSubmitted: string | null; warnings: number; errors: number; contents: SitemapContent[]; }
  const [sitemaps, setSitemaps] = useState<SitemapEntry[]>([]);
  const [sitemapsLoading, setSitemapsLoading] = useState(false);
  const [sitemapsError, setSitemapsError] = useState<string | null>(null);
  const [sitemapsFetched, setSitemapsFetched] = useState(false);

  // Load WordPress URL from localStorage — password intentionally NOT persisted (security)
  useEffect(() => {
    if (!business?.id) return;
    try {
      const raw = localStorage.getItem(`wp_integration_${business.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setWpUrl(parsed.wpUrl ?? '');
        // wpAppPassword is never loaded from storage — user must re-enter each session
        setWpSaved(!!(parsed.wpUrl));
      }
    } catch {
      // ignore parse errors
    }
  }, [business?.id]);

  // Show toast after GSC OAuth redirect
  useEffect(() => {
    const gscParam = searchParams.get('gsc');
    if (gscParam === 'connected') toast.success('Google Search Console connected!');
    if (gscParam === 'error') toast.error('Failed to connect Google Search Console. Please try again.');
    if (gscParam === 'noproperty') toast.error('No Search Console property found. Make sure the site is verified in Google Search Console and try again.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch GSC sitemaps when connected and integrations tab is active
  useEffect(() => {
    if (!gscConnection?.connected || !business?.id || activeTab !== 'integrations' || sitemapsFetched) return;
    setSitemapsLoading(true);
    setSitemapsError(null);
    setSitemapsFetched(true);
    fetch('/api/gsc/sitemaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => { setSitemaps(data.sitemaps || []); })
      .catch((err) => { setSitemapsError(err.message); })
      .finally(() => { setSitemapsLoading(false); });
  }, [gscConnection?.connected, business?.id, activeTab, sitemapsFetched]);

  // Initialize business data when business loads
  useEffect(() => {
    if (business) {
      setBusinessData({
        name: business.name || '',
        domain: business.domain || '',
        industry: business.industry || '',
        phone: business.phone || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        zip: business.zip || '',
      });
    }
  }, [business]);

  // Initialize profile data when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url,
      });
    }
  }, [profile]);

  // Load services
  useEffect(() => {
    async function loadServices() {
      if (!business?.id) {
        setServicesLoading(false);
        return;
      }

      try {
        const { data } = await (supabase as any)
          .from('services')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: true });

        setServices(data || []);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setServicesLoading(false);
      }
    }

    loadServices();
  }, [business?.id]);

  // Load markets
  useEffect(() => {
    async function loadMarkets() {
      if (!business?.id) {
        setMarketsLoading(false);
        return;
      }

      try {
        const { data } = await (supabase as any)
          .from('markets')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: true });

        setMarkets(data || []);
      } catch (error) {
        console.error('Error loading markets:', error);
      } finally {
        setMarketsLoading(false);
      }
    }

    loadMarkets();
  }, [business?.id]);

  const handleBusinessUpdate = async () => {
    if (!business) return;

    if (!businessData.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!businessData.domain.trim()) {
      toast.error('Business domain is required');
      return;
    }

    // B15-08: Normalize and validate domain format
    const normalizedDomain = businessData.domain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(normalizedDomain)) {
      toast.error('Please enter a valid domain (e.g. example.com)');
      return;
    }
    if (businessData.domain !== normalizedDomain) {
      setBusinessData((prev) => ({ ...prev, domain: normalizedDomain }));
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('businesses')
        .update({
          name: businessData.name,
          domain: normalizedDomain,
          industry: businessData.industry || null,
          phone: businessData.phone || null,
          address: businessData.address || null,
          city: businessData.city || null,
          state: businessData.state || null,
          zip: businessData.zip || null,
        })
        .eq('id', business.id)
        .eq('user_id', user!.id); // B15-04: scope to current user to prevent cross-tenant business update

      if (error) throw error;

      setEditing(false);
      toast.success('Settings saved');
      await refreshBusiness();
    } catch (error) {
      console.error('Error updating business:', error);
      toast.error('Failed to update business information');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!profile || !user) return;

    setSavingProfile(true);
    try {
      // Validate data
      profileUpdateSchema.parse(profileData);

      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile data instead of page reload
      if (refreshProfile) {
        await refreshProfile();
      }
      setEditingProfile(false);
      toast.success('Settings saved');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // NOTE: Requires 'avatars' bucket in Supabase Storage with public access policy
  const handleAvatarUpload = async (url: string) => {
    setProfileData({ ...profileData, avatar_url: url });

    // Auto-save avatar to database
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: url || null })
        .eq('id', user!.id);

      if (error) throw error;

      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast.error('Failed to save avatar');
    }
  };

  // Save WordPress integration — stored in localStorage temporarily
  // TODO: migrate to business_integrations JSONB column on businesses table once column is added
  const handleWpSave = async () => {
    if (!business?.id) return;

    // B15-06: Validate WordPress URL before saving
    const trimmedUrl = wpUrl.trim();
    if (!trimmedUrl) { toast.error('WordPress URL is required'); return; }
    try {
      const parsed = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
      if (parsed.protocol !== 'https:') { toast.error('WordPress URL must use HTTPS'); return; }
    } catch {
      toast.error('Please enter a valid WordPress URL (e.g. https://yoursite.com)');
      return;
    }

    setWpSaving(true);
    try {
      // Only persist the WP URL — never persist the Application Password in localStorage
      localStorage.setItem(
        `wp_integration_${business.id}`,
        JSON.stringify({ wpUrl: trimmedUrl })
      );
      setWpSaved(!!(trimmedUrl && wpAppPassword));
    } finally {
      setWpSaving(false);
    }
  };

  const openAddLocationModal = () => {
    setEditingLocation(null);
    setShowLocationModal(true);
  };

  const openEditLocationModal = (location: BusinessLocation) => {
    setEditingLocation(location);
    setShowLocationModal(true);
  };

  const handleDeleteLocation = async (id: string) => {
    // Validation
    if (locations.length === 1) {
      toast.error('Cannot delete the only location. Add another location first.');
      return;
    }

    const locationToDelete = locations.find((l) => l.id === id);
    if (locationToDelete?.is_primary) {
      toast.error('Cannot delete primary location. Mark another location as primary first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await (supabase as any)
        .from('business_locations')
        .delete()
        .eq('id', id)
        .eq('business_id', business!.id);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    }
  };

  const handleSetPrimaryLocation = async (id: string) => {
    if (!business) return;
    try {
      // Set new primary FIRST so there is never a moment with zero primaries
      await (supabase as any)
        .from('business_locations')
        .update({ is_primary: true })
        .eq('id', id)
        .eq('business_id', business.id);
      // Clear all OTHER locations for this business (leave new primary untouched)
      await (supabase as any)
        .from('business_locations')
        .update({ is_primary: false })
        .eq('business_id', business.id)
        .neq('id', id);
      window.location.reload();
    } catch (error) {
      console.error('Error setting primary location:', error);
      toast.error('Failed to set primary location');
    }
  };

  // Service handlers
  const openAddServiceModal = () => {
    setEditingService(null);
    setShowServiceModal(true);
  };

  const openEditServiceModal = (service: any) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const { error } = await (supabase as any)
        .from('services')
        .delete()
        .eq('id', id)
        .eq('business_id', business!.id);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  // Market handlers
  const openAddMarketModal = () => {
    setEditingMarket(null);
    setShowMarketModal(true);
  };

  const openEditMarketModal = (market: any) => {
    setEditingMarket(market);
    setShowMarketModal(true);
  };

  const handleDeleteMarket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this market?')) return;

    try {
      const { error } = await (supabase as any)
        .from('markets')
        .delete()
        .eq('id', id)
        .eq('business_id', business!.id);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error deleting market:', error);
      toast.error('Failed to delete market');
    }
  };

  // Auto-populate markets from business locations using Nominatim county lookup
  const importMarketsFromLocations = async () => {
    if (!business?.id || locations.length === 0) return;
    setImportingMarkets(true);
    setImportStatus('Looking up counties…');

    try {
      const toInsert: Array<{ name: string; state: string; county: string; latitude: number; longitude: number }> = [];

      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        if (!loc.latitude || !loc.longitude) continue;

        setImportStatus(`Looking up county for ${loc.city || loc.location_name} (${i + 1}/${locations.length})…`);

        try {
          const res = await fetch(
            `/api/geocode?lat=${loc.latitude}&lon=${loc.longitude}`
          );
          if (!res.ok) continue;
          const geo = await res.json();

          // Nominatim returns county in address.county — strip trailing " County" suffix
          const rawCounty = geo.address?.county ?? '';
          const county = rawCounty.replace(/\s+county$/i, '').trim();
          const state = loc.state || geo.address?.ISO3166_2_lvl4?.split('-')[1] || geo.address?.state_code || '';

          if (!county || !state) continue;

          const marketName = `${county} County, ${state}`;

          // Skip if already in existing markets or already queued
          const alreadyExists = markets.some(m => m.name.toLowerCase() === marketName.toLowerCase());
          const alreadyQueued = toInsert.some(m => m.name.toLowerCase() === marketName.toLowerCase());
          if (alreadyExists || alreadyQueued) continue;

          toInsert.push({ name: marketName, state, county, latitude: loc.latitude, longitude: loc.longitude });
        } catch {
          // Non-fatal — skip this location if geocoding fails
        }

        // Keep 1s delay per Nominatim ToS (enforced server-side, but good practice client-side too)
        if (i < locations.length - 1) await new Promise(r => setTimeout(r, 1100));
      }

      if (toInsert.length === 0) {
        setImportStatus('All location counties are already in your markets list.');
        setTimeout(() => setImportStatus(''), 3000);
        return;
      }

      setImportStatus(`Adding ${toInsert.length} market${toInsert.length > 1 ? 's' : ''}…`);

      for (const m of toInsert) {
        const { error: insertErr } = await (supabase as any).from('markets').insert({
          business_id: business.id,
          name: m.name,
          cities: [],
          area_codes: [],
          is_primary: false,
          state: m.state,
          latitude: m.latitude,
          longitude: m.longitude,
        });
        if (insertErr) console.error('Market insert failed:', insertErr.message);
      }

      window.location.reload();
    } catch (error) {
      console.error('Error importing markets from locations:', error);
      setImportStatus('Failed to import markets. Try again.');
      setTimeout(() => setImportStatus(''), 4000);
    } finally {
      setImportingMarkets(false);
    }
  };

  const scansUsed = profile?.scan_credits_used || 0;
  const scansLimit = profile?.scan_credits_limit || 1;
  const tokensUsed = profile?.content_tokens_used || 0;
  const tokensLimit = profile?.content_tokens_limit || 0;
  const scansPercentage = Math.round((scansUsed / scansLimit) * 100);
  const tokensPercentage = tokensLimit > 0 ? Math.round((tokensUsed / tokensLimit) * 100) : 0;

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-char-700 animate-pulse rounded" />
        <div className="flex gap-2 border-b border-char-700 pb-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-28 bg-char-700 animate-pulse rounded-t" />
          ))}
        </div>
        <div className="card p-6">
          <div className="h-6 w-32 bg-char-700 animate-pulse rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-char-700 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display mb-2">
          <span className="text-flame-500">Settings</span>
        </h1>
        <p className="text-ash-300">Manage your account and business information</p>
      </div>

      {/* Tabs */}
      <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Personal Tab */}
      {activeTab === 'personal' && (
        <div className="space-y-6">
          {!user ? (
            <div className="card p-6 text-ash-400">Not signed in.</div>
          ) : (
            <>
              {/* Profile Information Card */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl">Profile</h2>
                  {!editingProfile ? (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="btn-secondary text-sm"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileData({
                            full_name: profile?.full_name || '',
                            avatar_url: profile?.avatar_url || null,
                          });
                        }}
                        className="btn-ghost text-sm"
                        disabled={savingProfile}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleProfileUpdate}
                        className="btn-primary text-sm"
                        disabled={savingProfile}
                      >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Avatar Upload */}
                  <div>
                    <div className="input-label mb-3">Profile Picture</div>
                    <AvatarUpload
                      userId={user.id}
                      currentAvatarUrl={profileData.avatar_url}
                      onUploadComplete={handleAvatarUpload}
                    />
                  </div>

                  {/* Full Name Field */}
                  <div>
                    <label className="input-label">Full Name</label>
                    {!editingProfile ? (
                      <div className="text-ash-100">{profile?.full_name || 'Not set'}</div>
                    ) : (
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                        className="input"
                        placeholder="Enter your full name"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information Card */}
              <div className="card p-6">
                <h2 className="font-display text-xl mb-4">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="input-label">Email</div>
                    <div className="text-ash-100">{user.email}</div>
                  </div>
                  <div>
                    <div className="input-label">Account Created</div>
                    <div className="text-ash-100">
                      {new Date(user.created_at!).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Business Tab */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          {!business ? (
            <div className="card p-6 text-ash-400">No business found. Please complete onboarding.</div>
          ) : (
          <>{/* Business Information Card */}
          <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Business Information</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary text-sm"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setBusinessData({
                      name: business?.name || '',
                      domain: business?.domain || '',
                      industry: business?.industry || '',
                      phone: business?.phone || '',
                      address: business?.address || '',
                      city: business?.city || '',
                      state: business?.state || '',
                      zip: business?.zip || '',
                    });
                  }}
                  className="btn-ghost text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBusinessUpdate}
                  className="btn-primary text-sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="input-label">Business Name</div>
                <div className="text-ash-100">{business.name || 'Not set'}</div>
              </div>
              <div>
                <div className="input-label">Website Domain</div>
                <div className="text-ash-100">{business.domain || 'Not set'}</div>
              </div>
              <div>
                <div className="input-label">Industry</div>
                <div className="text-ash-100">{business.industry || 'Not set'}</div>
              </div>
              <div>
                <div className="input-label">Phone</div>
                <div className="text-ash-100">{business.phone || 'Not set'}</div>
              </div>
              <div>
                <div className="input-label">Address</div>
                <div className="text-ash-100">{business.address || 'Not set'}</div>
              </div>
              <div>
                <div className="input-label">City</div>
                <div className="text-ash-100">{business.city || 'Not set'}</div>
              </div>
              <div>
                <div className="input-label">State</div>
                <div className="text-ash-100">{business.state || 'Not set'}</div>
              </div>
              <div>
                <div className="input-label">ZIP Code</div>
                <div className="text-ash-100">{business.zip || 'Not set'}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Business Name *</label>
                <input
                  type="text"
                  value={businessData.name}
                  onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                  className="input"
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
                  placeholder="e.g., example.com"
                  required
                />
              </div>
              <div>
                <label className="input-label">Industry</label>
                <input
                  type="text"
                  value={businessData.industry}
                  onChange={(e) => setBusinessData({ ...businessData, industry: e.target.value })}
                  className="input"
                  placeholder="e.g., Plumbing, HVAC"
                />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input
                  type="tel"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                  className="input"
                  placeholder="e.g., (555) 123-4567"
                />
              </div>
              <div>
                <label className="input-label">Address</label>
                <input
                  type="text"
                  value={businessData.address}
                  onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                  className="input"
                  placeholder="e.g., 123 Main St"
                />
              </div>
              <div>
                <label className="input-label">City</label>
                <input
                  type="text"
                  value={businessData.city}
                  onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                  className="input"
                  placeholder="e.g., Portland"
                />
              </div>
              <div>
                <label className="input-label">State</label>
                <input
                  type="text"
                  value={businessData.state}
                  onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                  className="input"
                  placeholder="e.g., OR"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="input-label">ZIP Code</label>
                <input
                  type="text"
                  value={businessData.zip}
                  onChange={(e) => setBusinessData({ ...businessData, zip: e.target.value })}
                  className="input"
                  placeholder="e.g., 97201"
                  maxLength={10}
                />
              </div>
            </div>
          )}
        </div>

          {/* Business Locations Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl">Business Locations</h2>
                <p className="text-sm text-ash-400">
                  {tier === 'free' && 'Upgrade to Growth for multi-location'}
                  {tier !== 'free' && 'Manage all your business locations'}
                </p>
              </div>
              <button
                onClick={openAddLocationModal}
                className="btn-primary text-sm"
                disabled={tier === 'free' && locations.length >= 1}
              >
                + Add Location
              </button>
            </div>

            {locationsLoading ? (
              <div className="h-32 bg-char-700 animate-pulse rounded-btn" />
            ) : (
              <>
                <LocationsList
                  locations={locations}
                  onEdit={openEditLocationModal}
                  onDelete={handleDeleteLocation}
                  onSetPrimary={handleSetPrimaryLocation}
                />
                {tier === 'free' && locations.length >= 1 && (
                  <div className="mt-6">
                    <UpgradeCTA
                      title="Unlock Multi-Location Management"
                      description="Manage multiple locations with Growth tier."
                      compact
                    />
                  </div>
                )}
              </>
            )}
          </div>
          </>
          )}
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && business && (
        <LocationModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          location={editingLocation}
          businessId={business.id}
          onSave={() => {
            setShowLocationModal(false);
            window.location.reload();
          }}
        />
      )}

      {/* Services & Markets Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {!business ? (
            <div className="card p-6 text-ash-400">No business found. Please complete onboarding.</div>
          ) : (
          <>
          {/* Services Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl">Services</h2>
                <p className="text-sm text-ash-400">Define the services you offer</p>
              </div>
              <button
                onClick={openAddServiceModal}
                className="btn-primary text-sm"
              >
                + Add Service
              </button>
            </div>

            {servicesLoading ? (
              <div className="h-32 bg-char-700 animate-pulse rounded-btn" />
            ) : (
              <ServicesList
                services={services}
                onEdit={openEditServiceModal}
                onDelete={handleDeleteService}
              />
            )}
          </div>

      {/* Service Modal */}
      {showServiceModal && business && (
        <ServiceModal
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          service={editingService}
          businessId={business.id}
          onSave={() => {
            setShowServiceModal(false);
            window.location.reload();
          }}
        />
      )}

          {/* Markets Card */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h2 className="font-display text-xl">Target Markets</h2>
                <p className="text-sm text-ash-400">Define the markets you serve</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {locations.length > 0 && (
                  <button
                    onClick={importMarketsFromLocations}
                    disabled={importingMarkets}
                    className="btn-secondary text-sm disabled:opacity-50"
                    title="Find county for each of your locations and add them as markets"
                  >
                    {importingMarkets ? (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 border-2 border-ash-400/40 border-t-ash-300 rounded-full animate-spin" />
                        Syncing…
                      </span>
                    ) : (
                      'Sync from Locations'
                    )}
                  </button>
                )}
                <button
                  onClick={openAddMarketModal}
                  className="btn-primary text-sm"
                >
                  + Add Market
                </button>
              </div>
            </div>

            {importStatus && (
              <div className="mb-4 text-xs text-ash-400 bg-char-800 border border-char-700 rounded-btn px-3 py-2">
                {importStatus}
              </div>
            )}

            {marketsLoading ? (
              <div className="h-32 bg-char-700 animate-pulse rounded-btn" />
            ) : (
              <MarketsList
                markets={markets}
                onEdit={openEditMarketModal}
                onDelete={handleDeleteMarket}
              />
            )}
          </div>
          </>
          )}
        </div>
      )}

      {/* Market Modal */}
      {showMarketModal && business && (
        <MarketModal
          isOpen={showMarketModal}
          onClose={() => setShowMarketModal(false)}
          market={editingMarket}
          businessId={business.id}
          businessName={business.name}
          businessDomain={business.domain}
          onSave={() => {
            setShowMarketModal(false);
            window.location.reload();
          }}
        />
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Google Search Console Integration Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-btn bg-heat-500/10 border border-heat-500/20 flex items-center justify-center text-sm">
                  🔍
                </div>
                <div>
                  <h2 className="font-display text-xl">Google Search Console</h2>
                  <p className="text-sm text-ash-400">Detect keyword cannibalization from real Google ranking data</p>
                </div>
              </div>
              {gscConnection?.connected && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
                  Connected
                </span>
              )}
            </div>

            {gscLoading ? (
              <div className="text-sm text-ash-500">Loading…</div>
            ) : gscConnection?.connected ? (
              <div className="space-y-3">
                <div className="bg-char-700 rounded-btn px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ash-400">Property</span>
                    <span className="text-ash-200 font-mono text-xs">{gscConnection.account_name || gscConnection.account_id}</span>
                  </div>
                  {gscConnection.last_sync && (
                    <div className="flex justify-between">
                      <span className="text-ash-400">Last sync</span>
                      <span className="text-ash-300 text-xs">{new Date(gscConnection.last_sync).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={gscConnect}
                    className="btn-secondary text-sm"
                  >
                    Change Property
                  </button>
                  <button
                    onClick={async () => { await gscDisconnect(); toast.success('Google Search Console disconnected.'); }}
                    className="btn-secondary text-sm text-danger border-danger/30 hover:bg-danger/10"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Sitemap Coverage */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ash-200">Sitemap Coverage</span>
                    {sitemapsFetched && !sitemapsLoading && (
                      <button
                        onClick={() => { setSitemapsFetched(false); setSitemaps([]); setSitemapsError(null); }}
                        className="text-xs text-ash-500 hover:text-ash-300 transition-colors"
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  {sitemapsLoading ? (
                    <div className="h-16 bg-char-700 animate-pulse rounded-btn" />
                  ) : sitemapsError ? (
                    <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-btn px-3 py-2">
                      {sitemapsError}
                    </div>
                  ) : sitemaps.length === 0 ? (
                    <div className="text-xs text-ash-500 bg-char-800 border border-char-700 rounded-btn px-3 py-2">
                      No sitemaps submitted to Google Search Console.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-ash-500 border-b border-char-700">
                            <th className="text-left pb-1.5 pr-3 font-medium">Sitemap</th>
                            <th className="text-right pb-1.5 px-3 font-medium">Submitted</th>
                            <th className="text-right pb-1.5 px-3 font-medium">Indexed</th>
                            <th className="text-right pb-1.5 pl-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-char-700">
                          {sitemaps.map((sm) => {
                            const totalSubmitted = sm.contents.reduce((acc, c) => acc + c.submitted, 0);
                            const totalIndexed = sm.contents.reduce((acc, c) => acc + c.indexed, 0);
                            const indexRatio = totalSubmitted > 0 ? totalIndexed / totalSubmitted : 1;
                            const lowCoverage = totalSubmitted > 0 && indexRatio < 0.8;
                            return (
                              <tr key={sm.path} className="hover:bg-char-800/40 transition-colors">
                                <td className="py-2 pr-3 text-ash-300 font-mono break-all max-w-[200px]">
                                  {sm.path.replace(/^https?:\/\/[^/]+/, '') || sm.path}
                                </td>
                                <td className="py-2 px-3 text-right text-ash-300">{totalSubmitted > 0 ? totalSubmitted.toLocaleString() : '—'}</td>
                                <td className="py-2 px-3 text-right">
                                  {totalSubmitted > 0 ? (
                                    <span className={lowCoverage ? 'text-warning font-semibold' : 'text-ash-300'}>
                                      {totalIndexed.toLocaleString()}
                                      {lowCoverage && (
                                        <span className="ml-1 text-warning/80">
                                          ({Math.round(indexRatio * 100)}%)
                                        </span>
                                      )}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="py-2 pl-3 text-right whitespace-nowrap">
                                  {sm.errors > 0 ? (
                                    <span className="text-danger">{sm.errors} error{sm.errors !== 1 ? 's' : ''}</span>
                                  ) : sm.warnings > 0 ? (
                                    <span className="text-warning">{sm.warnings} warning{sm.warnings !== 1 ? 's' : ''}</span>
                                  ) : (
                                    <span className="text-success">OK</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {sitemaps.some((sm) => {
                        const sub = sm.contents.reduce((a, c) => a + c.submitted, 0);
                        const idx = sm.contents.reduce((a, c) => a + c.indexed, 0);
                        return sub > 0 && idx / sub < 0.8;
                      }) && (
                        <p className="mt-2 text-xs text-warning/90">
                          Some sitemaps have low index coverage — Google may not be seeing all your local pages.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ash-400">
                  Connect your Google Search Console to see which pages compete for the same search queries — the most accurate cannibalization signal available.
                </p>
                <button
                  onClick={gscConnect}
                  className="btn-primary text-sm"
                >
                  Connect Google Search Console
                </button>
              </div>
            )}
          </div>

          {/* WordPress Integration Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-btn bg-[#21759b]/20 border border-[#21759b]/30 flex items-center justify-center text-sm">
                  W
                </div>
                <div>
                  <h2 className="font-display text-xl">WordPress</h2>
                  <p className="text-sm text-ash-400">Publish generated content directly to your WordPress site</p>
                </div>
              </div>
              {wpSaved && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
                  Connected
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">WordPress Site URL</label>
                <input
                  type="url"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  className="input"
                  placeholder="https://yoursite.com"
                />
              </div>
              <div>
                <label className="input-label">Application Password</label>
                <input
                  type="password"
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                  className="input"
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                />
                <p className="text-xs text-ash-500 mt-1.5">
                  Generate an Application Password in WordPress under{' '}
                  <span className="text-ash-400">Users → Profile → Application Passwords</span>.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleWpSave}
                  disabled={wpSaving || !wpUrl.trim()}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {wpSaving ? 'Saving…' : 'Save'}
                </button>
                {wpSaved && wpUrl.trim() === '' && (
                  <span className="text-xs text-ash-500">Integration removed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <NotificationsTab
          profile={profile}
          user={user}
          supabase={supabase}
          toast={toast}
        />
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl">Current Plan</h2>
                <p className="text-sm text-ash-400">Manage your subscription</p>
              </div>
              <Link href="/billing" className="btn-primary text-sm">
                View All Plans
              </Link>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <p className="text-3xl font-display capitalize mb-1">{tier}</p>
                {profile?.subscription_status === 'active' && (
                  <span className="inline-block px-3 py-1 bg-success/20 text-success text-sm rounded-full">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Usage Card */}
          <div className="card p-6">
            <h2 className="font-display text-xl mb-6">Usage This Period</h2>

            <div className="space-y-6">
              {/* Scans */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Site Audits</span>
                  <span className="text-sm text-ash-400">
                    {scansUsed} / {scansLimit}
                  </span>
                </div>
                <div className="h-2 bg-char-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      scansPercentage >= 90
                        ? 'bg-danger'
                        : scansPercentage >= 70
                        ? 'bg-warning'
                        : 'bg-flame-500'
                    }`}
                    style={{ width: `${Math.min(scansPercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-ash-500 mt-1">
                  {scansLimit - scansUsed} scans remaining
                </p>
              </div>

              {/* Content Tokens */}
              {tokensLimit > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Content Articles</span>
                    <span className="text-sm text-ash-400">
                      {tokensUsed} / {tokensLimit}
                    </span>
                  </div>
                  <div className="h-2 bg-char-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        tokensPercentage >= 90
                          ? 'bg-danger'
                          : tokensPercentage >= 70
                          ? 'bg-warning'
                          : 'bg-heat-500'
                      }`}
                      style={{ width: `${Math.min(tokensPercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-ash-500 mt-1">
                    {tokensLimit - tokensUsed} articles remaining
                  </p>
                </div>
              )}

              {/* Reset Date */}
              {profile?.subscription_period_end && (
                <div className="pt-4 border-t border-char-700">
                  <p className="text-sm text-ash-400">
                    Resets on{' '}
                    <span className="font-semibold text-ash-200">
                      {new Date(profile.subscription_period_end).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upgrade CTA if free tier */}
          {tier === 'free' && (
            <UpgradeCTA
              title="Unlock More Power"
              description="Upgrade to get more scans, content generation, and premium features."
              feature="Starting at just $99/month for the Analysis tier"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────────────────

interface NotificationPrefs {
  weekly_digest: boolean;
  scan_complete: boolean;
  campaign_sent: boolean;
  billing_reminder: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  weekly_digest: true,
  scan_complete: true,
  campaign_sent: false,
  billing_reminder: true,
};

function NotificationsTab({
  profile,
  user,
  supabase,
  toast,
}: {
  profile: any;
  user: any;
  supabase: any;
  toast: any;
}) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => ({
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(profile?.notification_prefs ?? {}),
  }));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: prefs })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (err) {
      console.error('Error saving notification prefs:', err);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const NOTIFICATION_OPTIONS = [
    {
      key: 'weekly_digest' as keyof NotificationPrefs,
      label: 'Weekly SEO digest',
      description: 'Receive a weekly summary of your SEO progress',
    },
    {
      key: 'scan_complete' as keyof NotificationPrefs,
      label: 'Scan complete',
      description: 'Get notified when a site audit or grid scan finishes',
    },
    {
      key: 'campaign_sent' as keyof NotificationPrefs,
      label: 'Campaign sent',
      description: 'Confirm when a campaign has been delivered',
    },
    {
      key: 'billing_reminder' as keyof NotificationPrefs,
      label: 'Billing reminders',
      description: 'Receive reminders before subscription renews',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-xl mb-6">Email Notifications</h2>
        <div className="space-y-4">
          {NOTIFICATION_OPTIONS.map((opt) => (
            <div key={opt.key} className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-ash-100">{opt.label}</div>
                <div className="text-xs text-ash-500 mt-0.5">{opt.description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={prefs[opt.key]}
                  onChange={(e) => setPrefs((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-char-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:bg-flame-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-char-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ash-400">Loading settings...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
