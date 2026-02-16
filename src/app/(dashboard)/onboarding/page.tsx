'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Business form data
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    industry: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('You must be logged in to complete onboarding');
      }

      // Create business record
      const { error: businessError } = await supabase
        .from('businesses')
        .insert({
          user_id: user.id,
          name: formData.name,
          domain: formData.domain,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          industry: formData.industry || null,
        });

      if (businessError) {
        // If business already exists, that's okay
        if (!businessError.message.includes('duplicate') && !businessError.message.includes('unique')) {
          throw businessError;
        }
      }

      // Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-display mb-8 text-center">
        <span className="text-flame-500">Welcome to ScorchLocal!</span>
      </h1>

      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-display mb-2">Let's set up your business</h2>
          <p className="text-ash-400">
            We need some basic information to get you started with your local SEO tools.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Name */}
          <div>
            <label className="block text-sm mb-2 font-medium">
              Business Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Smith Plumbing & Heating"
              required
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm mb-2 font-medium">
              Website Domain <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              className="input"
              placeholder="e.g., smithplumbing.com"
              required
            />
            <p className="text-xs text-ash-400 mt-1">
              Don't include https:// or www. - just the domain name
            </p>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm mb-2 font-medium">Industry</label>
            <input
              type="text"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Plumbing, HVAC, Roofing, etc."
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm mb-2 font-medium">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="e.g., (555) 123-4567"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm mb-2 font-medium">Street Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 123 Main St"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm mb-2 font-medium">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Portland"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm mb-2 font-medium">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="input"
                placeholder="e.g., OR"
                maxLength={2}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm mb-2 font-medium">ZIP Code</label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="input"
                placeholder="e.g., 97201"
                maxLength={10}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-ghost"
              disabled={loading}
            >
              Skip for Now
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </form>

        <p className="text-xs text-ash-400 text-center mt-6">
          You can update this information anytime in Settings
        </p>
      </div>
    </div>
  );
}
