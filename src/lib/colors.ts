/**
 * Chart and JS color constants.
 * Use these wherever Tailwind classes can't be used (Recharts stroke/fill props, canvas, etc.)
 * Always import from here — never hardcode hex values in components.
 */

export const CHART_COLORS = {
  primary:   '#FF5C1A', // flame-500
  secondary: '#FF9B3D', // heat-400
  tertiary:  '#FFD166', // ember-400
  fourth:    '#A78BFA', // violet-400 — no semantic meaning
  fifth:     '#2DD4BF', // teal-400   — no semantic meaning
} as const

/** Semantic colors for JS logic (match tailwind.config tokens exactly) */
export const SEMANTIC_COLORS = {
  success: '#2ECC71',
  danger:  '#E74C3C',
  warning: '#FFC233', // ember-500
  info:    '#3498DB',
} as const

/** Rank position colors for Local Grid heatmap (used in CSS classes, not inline styles) */
export const RANK_COLOR_CLASSES = {
  top3:       { bg: 'bg-success/20',    text: 'text-success',    label: 'Top 3'      },
  mid:        { bg: 'bg-ember-500/20',  text: 'text-ember-500',  label: '4–10'       },
  low:        { bg: 'bg-heat-400/20',   text: 'text-heat-400',   label: '11–20'      },
  notRanking: { bg: 'bg-danger/15',     text: 'text-danger',     label: 'Not ranking'},
} as const

export type RankTier = keyof typeof RANK_COLOR_CLASSES

export function getRankTier(rank: number | null | undefined): RankTier {
  if (!rank || rank === 0) return 'notRanking'
  if (rank <= 3) return 'top3'
  if (rank <= 10) return 'mid'
  if (rank <= 20) return 'low'
  return 'notRanking'
}
