// Two-axis ROI calculation model

import type { FunnelStage } from './funnel';
import {
  FUNNEL_MULT, CTR_BY_POSITION, DEFAULT_CTR,
  INTENT_CONV_MULT, LOCAL_CONV_MULT, COMPETITION_CTR_MULT,
  LOCAL_PACK_CTR_MULT, DIFFICULTY_PROB_MULT, kdBucket,
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
 * Multi-factor keyword ROI — extends the 2-axis model with five additional signals:
 *
 * CTR adjustments (factors that steal organic clicks):
 *   • Competition level  → fewer/more ads competing for the SERP
 *   • Local pack present → Maps box absorbs ~25% of organic clicks
 *
 * ConvRate adjustments (factors that affect visitor quality):
 *   • Funnel stage       → bottom-funnel converts at 3× top-funnel rate
 *   • Intent type        → transactional visitors are purchase-ready
 *   • Local modifier     → "near me" signals immediate local urgency
 *
 * Risk adjustment:
 *   • Keyword difficulty → probability of actually ranking (risk-adjusts ROI)
 *
 * Formula:
 *   ctr            = baseCTR[rank] × COMPETITION_CTR_MULT × LOCAL_PACK_CTR_MULT
 *   convRate       = baseConv × FUNNEL_MULT × INTENT_CONV_MULT × LOCAL_CONV_MULT
 *   roi            = volume × ctr × convRate × (closeRate/100) × profitPerJob
 *                  × DIFFICULTY_PROB_MULT[kdBucket(difficulty)]
 */
export function calculateKeywordROIV2(
  volume: number,
  cfg: SimpleStrategyConfig,
  factors: {
    funnel: FunnelStage;
    intent: 'transactional' | 'commercial' | 'informational' | 'branded';
    localType: 'near_me' | 'city_name' | 'none';
    difficulty: number | null;
    competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null;
    hasLocalPack: boolean;
    currentRank: number | null;
  }
): ROIResult {
  const position = Math.max(1, Math.min(15, factors.currentRank ?? 3));
  const baseCtr = CTR_BY_POSITION[position] ?? DEFAULT_CTR;

  // CTR adjustments
  const ctr = baseCtr
    * COMPETITION_CTR_MULT[factors.competition ?? 'MEDIUM']
    * LOCAL_PACK_CTR_MULT[factors.hasLocalPack ? 'present' : 'absent'];

  const monthlyVisitors = volume * ctr;

  // ConvRate adjustments
  const adjustedConvRate = cfg.conversionRate
    * FUNNEL_MULT[factors.funnel]
    * INTENT_CONV_MULT[factors.intent]
    * LOCAL_CONV_MULT[factors.localType];

  const monthlyLeads = monthlyVisitors * adjustedConvRate;
  const monthlyClosed = monthlyLeads * (cfg.closeRate / 100);
  const roiBase = monthlyClosed * cfg.profitPerJob;

  // Risk-adjust by probability of ranking
  const roi = roiBase * DIFFICULTY_PROB_MULT[kdBucket(factors.difficulty)];

  return {
    monthlyVisitors: Math.round(monthlyVisitors * 10) / 10,
    monthlyLeads: Math.round(monthlyLeads * 100) / 100,
    monthlyClosed: Math.round(monthlyClosed * 100) / 100,
    roi: Math.round(roi),
  };
}

/** Match a keyword to the closest service by name overlap */
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

  return bestMatch;
}
