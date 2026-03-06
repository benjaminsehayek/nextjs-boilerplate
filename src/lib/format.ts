import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns'

// ─── Date formatting ─────────────────────────────────────────────────────────

/** Relative if < 7 days old ("2 days ago"), absolute if older ("Mar 3, 2026") */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const sevenDaysAgo = subDays(new Date(), 7)
  if (isAfter(d, sevenDaysAgo)) return formatDistanceToNow(d, { addSuffix: true })
  return format(d, 'MMM d, yyyy')
}

/** Short form for chart axes: "Mar 3" */
export function formatDateShort(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return format(d, 'MMM d')
}

/** Full date + time for scheduling: "Mar 3, 2026 2:30 PM" */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return format(d, 'MMM d, yyyy h:mm a')
}

/** Day of week + short date for calendars: "Mon, Mar 3" */
export function formatCalendarDate(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return format(d, 'EEE, MMM d')
}

// ─── Number formatting ────────────────────────────────────────────────────────

/** Abbreviated for Customer Layer metric cards: 1800 → "1.8k", 47000 → "47k", 1200000 → "1.2M" */
export function formatCount(n: number): string {
  if (!isFinite(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

/** Abbreviated currency for Customer Layer cards: 24 → "$24", 1400 → "$1.4k" */
export function formatCurrency(n: number): string {
  if (!isFinite(n)) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

/** Full precision for billing and invoices: 1847.5 → "$1,847.50" */
export function formatCurrencyPrecise(n: number): string {
  if (!isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

/** Full number with commas for AI Agent Layer tables: 47293 → "47,293" */
export function formatNumber(n: number): string {
  if (!isFinite(n)) return '—'
  return n.toLocaleString()
}

/** Percentage: 12.4 → "12.4%", 0.124 is NOT auto-converted — pass the already-multiplied value */
export function formatPercent(n: number, decimals = 1): string {
  if (!isFinite(n)) return '—'
  return `${n.toFixed(decimals)}%`
}

// ─── Trend formatting ─────────────────────────────────────────────────────────

export type TrendResult = {
  value: string          // e.g. "+12.4%"
  direction: 'up' | 'down' | 'flat'
  color: 'text-success' | 'text-danger' | 'text-ash-400'
  arrow: '↑' | '↓' | '→'
}

/**
 * Compute a trend comparison between two periods.
 * @param current  Current period value
 * @param previous Previous period value
 * @param higherIsBetter  false for metrics where lower is better (e.g. cost per lead)
 */
export function formatTrend(
  current: number,
  previous: number,
  higherIsBetter = true
): TrendResult {
  if (!previous || previous === 0) {
    return { value: '—', direction: 'flat', color: 'text-ash-400', arrow: '→' }
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const abs = Math.abs(pct)
  const flat = abs < 1

  if (flat) return { value: `${formatPercent(abs)} vs last period`, direction: 'flat', color: 'text-ash-400', arrow: '→' }

  const up = pct > 0
  const positive = higherIsBetter ? up : !up

  return {
    value: `${up ? '+' : ''}${formatPercent(pct)} vs last period`,
    direction: up ? 'up' : 'down',
    color: positive ? 'text-success' : 'text-danger',
    arrow: up ? '↑' : '↓',
  }
}

// ─── Score labeling ───────────────────────────────────────────────────────────

/** Reframe a 0–100 score as a customer-friendly label */
export function formatHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Great',      color: 'text-success' }
  if (score >= 60) return { label: 'Good',       color: 'text-success' }
  if (score >= 40) return { label: 'Fair',       color: 'text-ember-500' }
  return              { label: 'Needs Work',  color: 'text-danger' }
}
