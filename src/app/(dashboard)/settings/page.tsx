'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
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
import { z } from 'zod';
import type { BusinessLocation } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, refreshProfile } = useUser();
  const { tier, scansRemaining, tokensRemaining } = useSubscription();
  const { business } = useBusiness();
  const { locations, loading: locationsLoading } = useLocations(business?.id);
  const supabase = createClient();

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

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('businesses')
        .update({
          name: businessData.name,
          domain: businessData.domain,
          industry: businessData.industry || null,
          phone: businessData.phone || null,
          address: businessData.address || null,
          city: businessData.city || null,
          state: businessData.state || null,
          zip: businessData.zip || null,
        })
        .eq('id', business.id);

      if (error) throw error;

      setEditing(false);
      window.location.reload(); // Refresh to show updated data
    } catch (error) {
      console.error('Error updating business:', error);
      alert('Failed to update business information');
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        alert(error.issues[0].message);
      } else {
        console.error('Error updating profile:', error);
        alert('Failed to update profile');
      }
    } finally {
      setSavingProfile(false);
    }
  };

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
      alert('Failed to save avatar');
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
      alert('Cannot delete the only location. Add another location first.');
      return;
    }

    const locationToDelete = locations.find((l) => l.id === id);
    if (locationToDelete?.is_primary) {
      alert('Cannot delete primary location. Mark another location as primary first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await (supabase as any)
        .from('business_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
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
        .eq('id', id);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
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
        .eq('id', id);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error deleting market:', error);
      alert('Failed to delete market');
    }
  };

  const scansUsed = profile?.scan_credits_used || 0;
  const scansLimit = profile?.scan_credits_limit || 1;
  const tokensUsed = profile?.content_tokens_used || 0;
  const tokensLimit = profile?.content_tokens_limit || 0;
  const scansPercentage = Math.round((scansUsed / scansLimit) * 100);
  const tokensPercentage = tokensLimit > 0 ? Math.round((tokensUsed / tokensLimit) * 100) : 0;

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
      {activeTab === 'personal' && user && (
        <div className="space-y-6">
          {/* Profile Information Card */}
      {user && (
        <div className="card p-6 mb-8">
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
                  required
                />
              )}
            </div>
          </div>
        </div>
      )}

          {/* Account Information Card */}
          <div className="card p-6">
            <h2 className="font-display text-xl mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="input-label">Email</div>
                <div className="text-ash-100">{user?.email}</div>
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
        </div>
      )}

      {/* Business Tab */}
      {activeTab === 'business' && business && (
        <div className="space-y-6">
          {/* Business Information Card */}
        <div className="card p-6 mb-8">
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
      )}

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
      {activeTab === 'services' && business && (
        <div className="space-y-6">
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl">Target Markets</h2>
                <p className="text-sm text-ash-400">Define the markets you serve</p>
              </div>
              <button
                onClick={openAddMarketModal}
                className="btn-primary text-sm"
              >
                + Add Market
              </button>
            </div>

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
        </div>
      )}

      {/* Market Modal */}
      {showMarketModal && business && (
        <MarketModal
          isOpen={showMarketModal}
          onClose={() => setShowMarketModal(false)}
          market={editingMarket}
          businessId={business.id}
          onSave={() => {
            setShowMarketModal(false);
            window.location.reload();
          }}
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
