'use client';

import { useState } from 'react';
import type { Contact, ContactSource, LeadType, Urgency, MarketName } from './types';
import { MARKETS } from './types';
import { detectMarket, calculateELV, isValidEmail, isValidPhone } from './utils';

interface AddContactProps {
  contact?: Contact;
  onSave: (contact: Partial<Contact>) => void;
  onCancel: () => void;
}

export default function AddContact({ contact, onSave, onCancel }: AddContactProps) {
  const isEditing = !!contact;

  const [formData, setFormData] = useState<Partial<Contact>>({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    company: contact?.company || '',
    address: contact?.address || '',
    city: contact?.city || '',
    state: contact?.state || '',
    zip: contact?.zip || '',
    source: contact?.source || 'direct',
    leadType: contact?.leadType,
    urgency: contact?.urgency,
    marketName: contact?.marketName,
    emailOptIn: contact?.emailOptIn || false,
    smsOptIn: contact?.smsOptIn || false,
    tags: contact?.tags || [],
    lists: contact?.lists || [],
    notes: contact?.notes || '',
    campaignName: contact?.campaignName || '',
    adGroup: contact?.adGroup || '',
    keyword: contact?.keyword || '',
    geoTarget: contact?.geoTarget || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  const handleChange = (
    field: keyof Contact,
    value: string | boolean | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleChange('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange(
      'tags',
      formData.tags?.filter((t) => t !== tag) || []
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName && !formData.lastName && !formData.company) {
      newErrors.name = 'Please provide a name or company';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!formData.email && !formData.phone) {
      newErrors.contact = 'Please provide at least email or phone';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Auto-detect market if not set
    let finalData = { ...formData };
    if (!finalData.marketName) {
      const market = detectMarket(finalData);
      finalData.marketId = market.id;
      finalData.marketName = market.name;
    }

    // Calculate ELV
    const { elv, factors } = calculateELV(finalData);
    finalData.elv = elv;
    finalData.elvFactors = factors;

    // Set timestamps
    const now = new Date().toISOString();
    if (!isEditing) {
      finalData.createdAt = now;
    }
    finalData.updatedAt = now;

    onSave(finalData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-char-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display text-gradient-flame">
              {isEditing ? 'Edit Contact' : 'Add Contact'}
            </h2>
            <button onClick={onCancel} className="btn-icon">
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Name */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Contact Name
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className="input"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="input-label">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="input"
                    placeholder="Smith"
                  />
                </div>
              </div>
              {errors.name && (
                <p className="text-danger text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="input"
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-danger text-xs mt-1">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="input"
                    placeholder="(503) 555-1234"
                  />
                  {errors.phone && (
                    <p className="text-danger text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="input-label">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="input"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
              {errors.contact && (
                <p className="text-danger text-xs mt-1">{errors.contact}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Address
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="input-label">Street Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="input"
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="input-label">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="input"
                      placeholder="Portland"
                    />
                  </div>
                  <div>
                    <label className="input-label">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="input"
                      placeholder="OR"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="input-label">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => handleChange('zip', e.target.value)}
                    className="input"
                    placeholder="97209"
                  />
                </div>
              </div>
            </div>

            {/* Lead Details */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Lead Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="input-label">Source *</label>
                  <select
                    value={formData.source}
                    onChange={(e) =>
                      handleChange('source', e.target.value as ContactSource)
                    }
                    className="input"
                    required
                  >
                    <option value="organic_search">Organic Search</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="facebook_ads">Facebook Ads</option>
                    <option value="referral">Referral</option>
                    <option value="direct">Direct</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="walk_in">Walk In</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Lead Type</label>
                  <select
                    value={formData.leadType || ''}
                    onChange={(e) =>
                      handleChange(
                        'leadType',
                        e.target.value as LeadType
                      )
                    }
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="new_customer">New Customer</option>
                    <option value="repeat_customer">Repeat Customer</option>
                    <option value="quote_request">Quote Request</option>
                    <option value="emergency">Emergency</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Urgency</label>
                  <select
                    value={formData.urgency || ''}
                    onChange={(e) =>
                      handleChange('urgency', e.target.value as Urgency)
                    }
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="urgent">Urgent</option>
                    <option value="soon">Soon</option>
                    <option value="flexible">Flexible</option>
                    <option value="planning">Planning</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Market</label>
                  <select
                    value={formData.marketName || ''}
                    onChange={(e) =>
                      handleChange('marketName', e.target.value as MarketName)
                    }
                    className="input"
                  >
                    <option value="">Auto-detect</option>
                    {MARKETS.map((market) => (
                      <option key={market.id} value={market.name}>
                        {market.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Campaign Attribution */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Campaign Attribution
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="input-label">Campaign Name</label>
                  <input
                    type="text"
                    value={formData.campaignName}
                    onChange={(e) => handleChange('campaignName', e.target.value)}
                    className="input"
                    placeholder="Summer Sale 2024"
                  />
                </div>
                <div>
                  <label className="input-label">Ad Group</label>
                  <input
                    type="text"
                    value={formData.adGroup}
                    onChange={(e) => handleChange('adGroup', e.target.value)}
                    className="input"
                    placeholder="Emergency Plumbing"
                  />
                </div>
                <div>
                  <label className="input-label">Keyword</label>
                  <input
                    type="text"
                    value={formData.keyword}
                    onChange={(e) => handleChange('keyword', e.target.value)}
                    className="input"
                    placeholder="emergency plumber portland"
                  />
                </div>
              </div>
            </div>

            {/* Opt-Ins */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Communication Preferences
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emailOptIn}
                    onChange={(e) => handleChange('emailOptIn', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-ash-200">Email Opt-In</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.smsOptIn}
                    onChange={(e) => handleChange('smsOptIn', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-ash-200">SMS Opt-In</span>
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Tags
              </h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="input flex-1"
                  placeholder="Add tag..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="tag tag-flame flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-display uppercase text-ash-400 mb-3">
                Notes
              </h3>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input min-h-[100px]"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-char-700 p-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} className="btn-primary">
            {isEditing ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
