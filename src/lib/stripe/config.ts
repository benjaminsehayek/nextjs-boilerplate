interface TierPricing {
  monthly: number;
  annual: number;
}

interface BaseTierConfig {
  name: string;
  tier: string;
  features: string[];
  scans: number;
  tokens: number;
  popular: boolean;
}

interface FreeTierConfig extends BaseTierConfig {
  tier: 'free';
  price: 0;
  priceIds: {
    monthly: null;
    annual: null;
  };
}

interface PaidTierConfig extends BaseTierConfig {
  tier: 'analysis' | 'marketing' | 'growth';
  price: TierPricing;
  priceIds: {
    monthly: string;
    annual: string;
  };
}

export type TierConfig = FreeTierConfig | PaidTierConfig;

export const SUBSCRIPTION_TIERS: Record<string, TierConfig> = {
  free: {
    name: 'Free',
    tier: 'free',
    price: 0,
    priceIds: {
      monthly: null,
      annual: null,
    },
    features: [
      'Limited access',
      '1 scan per month',
      'Basic support',
    ],
    scans: 1,
    tokens: 0,
    popular: false,
  },
  analysis: {
    name: 'Analysis',
    tier: 'analysis',
    price: {
      monthly: 120,
      annual: 1200,
    },
    priceIds: {
      monthly: 'price_analysis_monthly',
      annual: 'price_analysis_annual',
    },
    features: [
      'Site Audit',
      'Content Strategy',
      'Local Grid',
      'Off-Page Audit',
      '5 scans per month',
      'Priority support',
    ],
    scans: 5,
    tokens: 0,
    popular: false,
  },
  marketing: {
    name: 'Marketing',
    tier: 'marketing',
    price: {
      monthly: 250,
      annual: 2500,
    },
    priceIds: {
      monthly: 'price_marketing_monthly',
      annual: 'price_marketing_annual',
    },
    features: [
      'Everything in Analysis',
      'Lead Database',
      'Content Generation (6 articles/month)',
      'Email & SMS campaigns',
      '15 scans per month',
      'Priority support',
    ],
    scans: 15,
    tokens: 6,
    popular: true,
  },
  growth: {
    name: 'Growth',
    tier: 'growth',
    price: {
      monthly: 450,
      annual: 4500,
    },
    priceIds: {
      monthly: 'price_growth_monthly',
      annual: 'price_growth_annual',
    },
    features: [
      'Everything in Marketing',
      'Lead Intelligence',
      'Multi-location support',
      'Cross-tool pipeline',
      'Content Generation (30 articles/month)',
      '50 scans per month',
      'Dedicated support',
    ],
    scans: 50,
    tokens: 30,
    popular: false,
  },
};

export type TierKey = keyof typeof SUBSCRIPTION_TIERS;
export type BillingInterval = 'monthly' | 'annual';
