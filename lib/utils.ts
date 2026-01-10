export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatLargeCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'

  const absValue = Math.abs(value)

  if (absValue >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`
  }
  if (absValue >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`
  }
  if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`
  }
  if (absValue >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`
  }

  return formatCurrency(value)
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatPercentSimple(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return value.toFixed(2)
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Industrials',
  'Materials',
  'Real Estate',
  'Communication Services',
  'Utilities',
]

export const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#004225',
  'Healthcare': '#006633',
  'Financials': '#008844',
  'Consumer Discretionary': '#00aa55',
  'Consumer Staples': '#00cc66',
  'Energy': '#33d977',
  'Industrials': '#66e699',
  'Materials': '#99f0bb',
  'Real Estate': '#ccf7dd',
  'Communication Services': '#003318',
  'Utilities': '#002211',
}
