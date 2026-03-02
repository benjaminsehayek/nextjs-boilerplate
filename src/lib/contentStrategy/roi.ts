// Two-axis ROI calculation model

import type { FunnelStage } from './funnel';
import {
  FUNNEL_MULT, CTR_BY_POSITION, DEFAULT_CTR,
  INTENT_CONV_MULT, LOCAL_CONV_MULT, COMPETITION_CTR_MULT,
  LOCAL_PACK_CTR_MULT, DIFFICULTY_PROB_MULT, EXPECTED_POSITION_BY_KD, kdBucket,
} from './constants';
import type { SimpleStrategyConfig } from '@/types';

export interface ROIResult {
  monthlyVisitors: number;
  monthlyLeads: number;
  monthlyClosed: number;
  roi: number;
}

/**
 * Calculate keyword ROI using two-axis model:
 *   Axis 1: Keyword intent (funnel stage) → conversion multiplier
 *   Axis 2: Service economics (profit per job × close rate)
 *
 * Formula:
 *   monthlyVisitors = volume × CTR[position]
 *   adjustedConvRate = baseConvRate × FUNNEL_MULT[funnelStage]
 *   monthlyLeads = monthlyVisitors × adjustedConvRate
 *   monthlyClosed = monthlyLeads × (closeRate / 100)
 *   roi = monthlyClosed × profitPerJob
 */
export function calculateKeywordROI(
  volume: number,
  funnelStage: FunnelStage,
  convRate: number,        // base conversion rate as decimal (e.g., 0.03 = 3%)
  profitPerJob: number,
  closeRate: number,       // percentage (e.g., 45 = 45%)
  position: number = 3,
): ROIResult {
  const ctr = CTR_BY_POSITION[position] ?? DEFAULT_CTR;
  const monthlyVisitors = volume * ctr;

  const funnelMultiplier = FUNNEL_MULT[funnelStage];
  const adjustedConvRate = convRate * funnelMultiplier;
  const monthlyLeads = monthlyVisitors * adjustedConvRate;

  const monthlyClosed = monthlyLeads * (closeRate / 100);
  const roi = monthlyClosed * profitPerJob;

  return {
    monthlyVisitors: Math.round(monthlyVisitors * 10) / 10,
    monthlyLeads: Math.round(monthlyLeads * 100) / 100,
    monthlyClosed: Math.round(monthlyClosed * 100) / 100,
    roi: Math.round(roi),
  };
}

/**
 * Multi-factor keyword ROI — accurate model with realistic position assumptions.
 *
 * Position:
 *   • Currently ranking → use actual rank (best case: real measured data)
 *   • Not ranking (external keyword) → use EXPECTED_POSITION_BY_KD[difficulty]
 *     e.g. KD 25 → position 5, KD 65 → position 16
 *   This prevents the position-3 default from inflating unranked keyword ROI 3–5×.
 *
 * CTR adjustments (factors that reduce organic clicks before reaching site):
 *   • Competition level  → more ads = lower organic CTR
 *   • Local pack present → Maps box absorbs ~45% of clicks for local queries
 *
 * ConvRate adjustment (visitor purchase-readiness):
 *   • Intent type × Local modifier ONLY — funnel stage is a coarse proxy for
 *     these two dimensions and would triple-count the same signal.
 *     Max: transactional × near_me = 1.5 × 1.5 = 2.25× → ~6.75% conv (realistic cap)
 *
 * Risk adjustment:
 *   • Keyword difficulty → probability of ranking at the expected position at all.
 *     Combined with realistic expected position, this properly discounts hard keywords.
 */
export function calculateKeywordROIV2(
  volume: number,
  cfg: SimpleStrategyConfig,
  factors: {
    funnel: FunnelStage;  // used for content categorisation, not the ROI formula
    intent: 'transactional' | 'commercial' | 'informational' | 'branded';
    localType: 'near_me' | 'city_name' | 'none';
    difficulty: number | null;
    competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null;
    hasLocalPack: boolean;
    currentRank: number | null;
  }
): ROIResult {
  // For ranked keywords: use actual position (bounded to positions 1–20 with data)
  // For unranked keywords: use expected position based on keyword difficulty
  // — avoids the old `currentRank ?? 3` default that inflated ROI by 3–5×
  const bucket = kdBucket(factors.difficulty);
  const position = factors.currentRank != null
    ? Math.max(1, Math.min(20, factors.currentRank))
    : (EXPECTED_POSITION_BY_KD[bucket] ?? 10);

  const baseCtr = CTR_BY_POSITION[position] ?? DEFAULT_CTR;

  // CTR adjustments (two independent factors that both reduce organic clicks)
  const ctr = baseCtr
    * COMPETITION_CTR_MULT[factors.competition ?? 'MEDIUM']
    * LOCAL_PACK_CTR_MULT[factors.hasLocalPack ? 'present' : 'absent'];

  const monthlyVisitors = volume * ctr;

  // ConvRate: intent × local only — no FUNNEL_MULT to avoid double-counting
  // Max = 1.5 × 1.5 = 2.25× (transactional near-me), realistic cap ~6–7%
  const adjustedConvRate = cfg.conversionRate
    * INTENT_CONV_MULT[factors.intent]
    * LOCAL_CONV_MULT[factors.localType];

  const monthlyLeads = monthlyVisitors * adjustedConvRate;
  const monthlyClosed = monthlyLeads * (cfg.closeRate / 100);
  const roiBase = monthlyClosed * cfg.profitPerJob;

  // Risk-adjust by probability of ranking at the expected position
  const roi = roiBase * DIFFICULTY_PROB_MULT[bucket];

  return {
    monthlyVisitors: Math.round(monthlyVisitors * 10) / 10,
    monthlyLeads: Math.round(monthlyLeads * 100) / 100,
    monthlyClosed: Math.round(monthlyClosed * 100) / 100,
    roi: Math.round(roi),
  };
}

/**
 * Match a keyword to the closest service by name word overlap.
 * Requires at least 2 matching words (>2 chars) to prevent false positives
 * from single generic words like "repair", "install", "service".
 */
export function matchService(
  keyword: string,
  services: Array<{ name: string; profit: number; close: number }>,
  explicitServiceName?: string,
): { name: string; profit: number; close: number } | null {
  // If explicit service name is provided, find it
  if (explicitServiceName) {
    const match = services.find(s => s.name.toLowerCase() === explicitServiceName.toLowerCase());
    if (match) return match;
  }

  // Otherwise try to match by keyword overlap
  const kw = keyword.toLowerCase();
  let bestMatch: typeof services[0] | null = null;
  let bestScore = 0;

  for (const svc of services) {
    const svcWords = svc.name.toLowerCase().split(/\s+/);
    let score = 0;
    for (const word of svcWords) {
      if (word.length > 2 && kw.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = svc;
    }
  }

  // Require at least 2 matching words — single-word matches (e.g. "repair")
  // are too generic and could incorrectly assign economics from the wrong service
  return bestScore >= 2 ? bestMatch : null;
}
