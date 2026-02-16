'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { createClient } from '@/lib/supabase/client';

const tiers = [
  {
    name: 'Analysis',
    price: '$120',
    period: '/month',
    features: [
      'Site Audit',
      'Content Strategy',
      'Local Grid',
      'Off-Page Audit',
      '5 scans per month',
    ],
  },
  {
    name: 'Marketing',
    price: '$250',
    period: '/month',
    features: [
      'Everything in Analysis',
      'Lead Database',
      'Content Generation (6 articles/month)',
      'Email & SMS campaigns',
      '15 scans per month',
    ],
  },
  {
    name: 'Growth',
    price: '$450',
    period: '/month',
    features: [
      'Everything in Marketing',
      'Lead Intelligence',
      'Multi-location support',
      'Cross-tool pipeline',
      'Content Generation (30 articles/month)',
      '50 scans per month',
    ],
  },
];

export default function SettingsPage() {
  const { user, profile } = useUser();
  const { tier, scansRemaining, tokensRemaining } = useSubscription();
  const { business } = useBusiness();
  const supabase = createClient();

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

  const handleBusinessUpdate = async () => {
    if (!business) return;

    setSaving(true);
    try {
      const { error } = await supabase
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

  return (
    <div>
      <h1 className="text-3xl font-display mb-8">
        <span className="text-flame-500">Settings</span>
      </h1>

      <div className="card p-6 mb-8">
        <h2 className="font-display text-xl mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="input-label">Name</div>
            <div className="text-ash-100">{profile?.full_name || 'Not set'}</div>
          </div>
          <div>
            <div className="input-label">Email</div>
            <div className="text-ash-100">{user?.email}</div>
          </div>
          <div>
            <div className="input-label">Current Plan</div>
            <div className="text-ash-100 capitalize">{tier}</div>
          </div>
          <div>
            <div className="input-label">Scans Remaining</div>
            <div className="text-ash-100">{scansRemaining} this month</div>
          </div>
        </div>
      </div>

      {business && (
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

      <h2 className="font-display text-2xl mb-6">Subscription Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`card p-6 ${
              tier === t.name.toLowerCase()
                ? 'border-flame-500 bg-flame-500/5'
                : ''
            }`}
          >
            <h3 className="font-display text-xl mb-2 text-flame-500">
              {t.name}
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-display">{t.price}</span>
              <span className="text-ash-400">{t.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {t.features.map((feature, i) => (
                <li key={i} className="text-sm text-ash-300 flex items-start gap-2">
                  <span className="text-success">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            {tier === t.name.toLowerCase() ? (
              <div className="btn-ghost w-full text-center cursor-default">
                Current Plan
              </div>
            ) : (
              <button className="btn-primary w-full">
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
