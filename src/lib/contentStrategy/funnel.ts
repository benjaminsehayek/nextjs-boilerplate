// Funnel stage classification

export type FunnelStage = 'bottom' | 'middle' | 'top';

const BOTTOM_PATTERNS = [
  /\b(emergency|urgent|same\s*day|24\s*hour|after\s*hours)\b/i,
  /\b(near\s*me|in\s*my\s*area|close\s*by|nearby)\b/i,
  /\b(call|book|hire|schedule|request|get\s*a\s*quote|free\s*estimate)\b/i,
  /\b(fix|repair|broken|leak|clogged|stuck|not\s*working)\b/i,
];

const MIDDLE_PATTERNS = [
  /\b(best|top|affordable|compare|review|rated|recommended)\b/i,
  /\b(install|replacement|new|upgrade|remodel)\b/i,
  /\b(company|companies|contractor|service|pro|professional)\b/i,
  /\b(quote|estimate|pricing)\b/i,
];

const TOP_PATTERNS = [
  /^(how|what|why|when|where|can|do|does|is|are|should)\b/i,
  /\b(cost|price|guide|tips|ideas|diy|tutorial|learn)\b/i,
  /\b(signs|symptoms|causes|prevent|maintain|average)\b/i,
  /\b(checklist|steps|process|explained|meaning)\b/i,
];

/** Classify a keyword into a funnel stage (bottom/middle/top) */
export function classifyFunnel(keyword: string, locations: string[] = []): FunnelStage {
  const kw = keyword.toLowerCase();

  // Check for location-specific signals (boost toward bottom)
  const hasLocation = locations.some(loc => kw.includes(loc.toLowerCase()));

  // BOTTOM: Emergency terms, "near me", action words, repair + location
  for (const pat of BOTTOM_PATTERNS) {
    if (pat.test(kw)) return 'bottom';
  }

  // Service + location = bottom funnel
  if (hasLocation && kw.split(/\s+/).length <= 5) return 'bottom';

  // TOP: Questions and informational queries
  for (const pat of TOP_PATTERNS) {
    if (pat.test(kw)) return 'top';
  }

  // MIDDLE: Comparison, evaluation, installation
  for (const pat of MIDDLE_PATTERNS) {
    if (pat.test(kw)) return 'middle';
  }

  // Default: short phrases (3 words or fewer) = middle (commercial intent)
  //          longer phrases (4+ words) = top (informational)
  const wordCount = kw.split(/\s+/).length;
  return wordCount <= 3 ? 'middle' : 'top';
}

/** Get funnel display label */
export function funnelLabel(stage: FunnelStage): string {
  switch (stage) {
    case 'bottom': return 'Bottom (Ready to Buy)';
    case 'middle': return 'Middle (Evaluating)';
    case 'top': return 'Top (Researching)';
  }
}

/** Get funnel color class */
export function funnelColor(stage: FunnelStage): string {
  switch (stage) {
    case 'bottom': return 'text-success';
    case 'middle': return 'text-ember-500';
    case 'top': return 'text-flame-400';
  }
}

/** Get funnel badge bg class */
export function funnelBadgeBg(stage: FunnelStage): string {
  switch (stage) {
    case 'bottom': return 'bg-success/20 text-success';
    case 'middle': return 'bg-ember-500/20 text-ember-500';
    case 'top': return 'bg-flame-400/20 text-flame-400';
  }
}
