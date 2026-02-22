// Two-axis ROI calculation model

import type { FunnelStage } from './funnel';
import { FUNNEL_MULT, CTR_BY_POSITION, DEFAULT_CTR } from './constants';

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
