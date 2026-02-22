'use client';

import { useUser } from './useUser';
import type { SubscriptionTier } from '@/types';

const TOOL_ACCESS: Record<string, SubscriptionTier[]> = {
  'site-audit':        ['free', 'analysis', 'marketing', 'growth'],
  'content-strategy':  ['free', 'analysis', 'marketing', 'growth'],
  'local-grid':        ['free', 'analysis', 'marketing', 'growth'],
  'off-page-audit':    ['free', 'analysis', 'marketing', 'growth'],
  'lead-intelligence': ['free', 'analysis', 'marketing', 'growth'],
  'lead-database':     ['free', 'analysis', 'marketing', 'growth'],
  'marketing':         ['marketing', 'growth'],
};

const FEATURE_ACCESS: Record<string, SubscriptionTier[]> = {
  'content-generation':  ['marketing', 'growth'],
  'email-campaigns':     ['marketing', 'growth'],
  'sms-campaigns':       ['marketing', 'growth'],
  'real-time-leads':     ['growth'],
  'multi-location':      ['growth'],
  'cross-tool-pipeline': ['growth'],
};

export function useSubscription() {
  const { profile, loading } = useUser();

  const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
  const isActive = profile?.subscription_status === 'active';

  return {
    tier,
    isActive,
    loading,
    canAccessTool: (tool: string) => {
      // Free tier can access tools even without active subscription
      if (tier === 'free') return TOOL_ACCESS[tool]?.includes('free') ?? false;
      // Paid tiers require active subscription
      return isActive && (TOOL_ACCESS[tool]?.includes(tier) ?? false);
    },
    canAccessFeature: (feat: string) => {
      // Free tier can access features if they're in the list
      if (tier === 'free') return FEATURE_ACCESS[feat]?.includes('free') ?? false;
      // Paid tiers require active subscription
      return isActive && (FEATURE_ACCESS[feat]?.includes(tier) ?? false);
    },
    tokensRemaining:
      (profile?.content_tokens_limit || 0) -
      (profile?.content_tokens_used || 0),
    scansRemaining:
      (profile?.scan_credits_limit || 0) -
      (profile?.scan_credits_used || 0),
    profile,
  };
}
