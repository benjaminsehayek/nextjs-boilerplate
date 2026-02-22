'use client';

import { useState, useEffect } from 'react';
import { INDUSTRY_PROFILES, LOCATION_CODES } from '@/lib/contentStrategy/constants';
import type { EnhancedConfigFormProps, EnhancedConfig, Service } from './types';

export default function ConfigForm({ onStartAnalysis, isLoading, scansRemaining, defaultDomain = '', defaultIndustry = '' }: EnhancedConfigFormProps) {
  const [domain, setDomain] = useState(defaultDomain);
  const [brand, setBrand] = useState('');
  const [industryKey, setIndustryKey] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [country, setCountry] = useState(2840); // US default
  const [language, setLanguage] = useState('en');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-select industry from default
  useEffect(() => {
    if (defaultIndustry) {
      const match = INDUSTRY_PROFILES.find(p =>
        p.name.toLowerCase() === defaultIndustry.toLowerCase() ||
        p.key === defaultIndustry.toLowerCase()
      );
      if (match) {
        setIndustryKey(match.key);
        setServices(match.services.map(s => ({ ...s, enabled: true })));
      }
    }
  }, [defaultIndustry]);

  function handleIndustryChange(key: string) {
    setIndustryKey(key);
    const profile = INDUSTRY_PROFILES.find(p => p.key === key);
    if (profile) {
      setServices(profile.services.map(s => ({ ...s, enabled: true })));
    } else {
      setServices([]);
    }
  }

  function handleServiceToggle(index: number) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s));
  }

  function handleServiceUpdate(index: number, field: 'profit' | 'close', value: number) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function addService() {
    setServices(prev => [...prev, { name: '', profit: 300, close: 35, enabled: true }]);
  }

  function removeService(index: number) {
    setServices(prev => prev.filter((_, i) => i !== index));
  }

  function handleServiceNameChange(index: number, name: string) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, name } : s));
  }

  function addLocation() {
    const loc = locationInput.trim();
    if (loc && !locations.includes(loc)) {
      setLocations(prev => [...prev, loc]);
      setLocationInput('');
    }
  }

  function removeLocation(index: number) {
    setLocations(prev => prev.filter((_, i) => i !== index));
  }

  function validateDomain(input: string): boolean {
    if (!input || input.trim().length === 0) {
      setValidationError('Please enter a domain');
      return false;
    }
    let cleaned = input.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/\/$/, '');
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleaned)) {
      setValidationError('Please enter a valid domain (e.g., example.com)');
      return false;
    }
    setValidationError(null);
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateDomain(domain)) return;

    const enabledServices = services.filter(s => s.enabled && s.name.trim());
    if (enabledServices.length === 0) {
      setValidationError('Please enable at least one service');
      return;
    }

    const config: EnhancedConfig = {
      domain: domain.trim(),
      industry: INDUSTRY_PROFILES.find(p => p.key === industryKey)?.name || industryKey,
      economics: {},
      services: enabledServices,
      locations,
      country,
      language,
      brand: brand.trim(),
    };

    onStartAnalysis(config);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center">
            <span className="text-4xl">📝</span>
          </div>
          <h2 className="text-2xl font-display mb-2">
            Build Your <span className="text-gradient-flame">Content Strategy</span>
          </h2>
          <p className="text-ash-400">
            ROI-based keyword research with AI content generation and gap analysis
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain Input */}
          <div>
            <label htmlFor="domain" className="input-label">
              Website Domain <span className="text-danger">*</span>
            </label>
            <input
              id="domain"
              type="text"
              className="input"
              placeholder="example.com"
              value={domain}
              onChange={(e) => { setDomain(e.target.value); setValidationError(null); }}
              disabled={isLoading}
              required
            />
            {validationError && <p className="text-danger text-sm mt-2">{validationError}</p>}
            <p className="text-ash-500 text-xs mt-2">Enter your domain without http:// or www</p>
          </div>

          {/* Brand Name */}
          <div>
            <label htmlFor="brand" className="input-label">Brand Name</label>
            <input
              id="brand"
              type="text"
              className="input"
              placeholder="Your Company Name"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Industry Dropdown */}
          <div>
            <label htmlFor="industry" className="input-label">
              Industry <span className="text-danger">*</span>
            </label>
            <select
              id="industry"
              className="input"
              value={industryKey}
              onChange={(e) => handleIndustryChange(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select an industry...</option>
              {INDUSTRY_PROFILES.map(p => (
                <option key={p.key} value={p.key}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Service Economics Table */}
          {services.length > 0 && (
            <div className="bg-char-900 rounded-btn p-4 border border-char-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-flame-500/10 flex items-center justify-center">
                    <span className="text-xl">💰</span>
                  </div>
                  <div>
                    <div className="input-label mb-0">Service Economics</div>
                    <p className="text-xs text-ash-500">Customize profit and close rate per service</p>
                  </div>
                </div>
                <button type="button" onClick={addService} className="btn-ghost text-sm">
                  + Add Service
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ash-500 text-xs">
                      <th className="text-left pb-2 pr-2">Service</th>
                      <th className="text-right pb-2 px-2 w-28">Profit/Job ($)</th>
                      <th className="text-right pb-2 px-2 w-24">Close (%)</th>
                      <th className="text-center pb-2 pl-2 w-16">Active</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-char-700">
                    {services.map((svc, i) => (
                      <tr key={i} className={svc.enabled ? '' : 'opacity-50'}>
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            className="input text-sm py-1"
                            value={svc.name}
                            onChange={(e) => handleServiceNameChange(i, e.target.value)}
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            className="input text-sm py-1 text-right"
                            value={svc.profit}
                            onChange={(e) => handleServiceUpdate(i, 'profit', parseInt(e.target.value) || 0)}
                            disabled={isLoading}
                            min={0}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            className="input text-sm py-1 text-right"
                            value={svc.close}
                            onChange={(e) => handleServiceUpdate(i, 'close', parseInt(e.target.value) || 0)}
                            disabled={isLoading}
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className="py-2 pl-2 text-center">
                          <input
                            type="checkbox"
                            checked={svc.enabled}
                            onChange={() => handleServiceToggle(i)}
                            disabled={isLoading}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <button type="button" onClick={() => removeService(i)} className="text-ash-500 hover:text-danger text-xs">
                            x
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Locations */}
          <div>
            <label className="input-label">Target Locations</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="e.g., Austin TX"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }}
                disabled={isLoading}
              />
              <button type="button" onClick={addLocation} className="btn-ghost" disabled={isLoading}>
                Add
              </button>
            </div>
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {locations.map((loc, i) => (
                  <span key={i} className="px-3 py-1 bg-char-800 border border-char-700 rounded-btn text-sm text-ash-300 flex items-center gap-2">
                    {loc}
                    <button type="button" onClick={() => removeLocation(i)} className="text-ash-500 hover:text-danger">x</button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-ash-500 text-xs mt-2">Add cities/areas you serve for location-based keywords</p>
          </div>

          {/* Country + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="input-label">Country</label>
              <select
                id="country"
                className="input"
                value={country}
                onChange={(e) => setCountry(parseInt(e.target.value))}
                disabled={isLoading}
              >
                {Object.entries(LOCATION_CODES).map(([name, code]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="language" className="input-label">Language</label>
              <select
                id="language"
                className="input"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isLoading}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>

          {/* Scans Remaining */}
          <div className="bg-char-900 rounded-btn p-4 border border-char-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="input-label mb-1">Scans Remaining</div>
                <div className="text-2xl font-display">
                  <span className={scansRemaining > 0 ? 'text-success' : 'text-danger'}>{scansRemaining}</span>
                  <span className="text-ash-500 text-base ml-2">this month</span>
                </div>
              </div>
              {scansRemaining === 0 && (
                <a href="/settings" className="btn-primary">Upgrade Plan</a>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={isLoading || scansRemaining === 0} className="btn-primary w-full py-3">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner-sm"></span>
                Starting Analysis...
              </span>
            ) : (
              'Analyze Content Strategy'
            )}
          </button>
        </form>

        {/* Features List */}
        <div className="mt-8 pt-6 border-t border-char-700">
          <h3 className="font-display text-sm text-ash-400 mb-4">What you'll get:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '🕷️', text: 'Site crawl & content gap detection' },
              { icon: '📊', text: 'ROI-based keyword analysis' },
              { icon: '🎯', text: 'Funnel stage classification' },
              { icon: '📅', text: '12-week phased content calendar' },
              { icon: '⚠️', text: 'Cannibalization detection' },
              { icon: '🤖', text: 'AI content generation' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-ash-300">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-ash-500">
        <p>Analysis typically takes 3-5 minutes. You can navigate away and come back to view results.</p>
      </div>
    </div>
  );
}
