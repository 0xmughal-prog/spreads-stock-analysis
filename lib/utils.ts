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

// Reddit Score Utilities
export function formatRedditScore(score: number): { text: string; color: string; bgColor: string } {
  if (score >= 80) return { text: 'Very High', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' }
  if (score >= 60) return { text: 'High', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' }
  if (score >= 40) return { text: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' }
  if (score >= 20) return { text: 'Low', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' }
  return { text: 'Very Low', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' }
}

export function formatMentions(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}

export function getSentimentColor(sentiment: 'bullish' | 'bearish' | 'neutral'): { text: string; bg: string; icon: string } {
  switch (sentiment) {
    case 'bullish':
      return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: '↑' }
    case 'bearish':
      return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: '↓' }
    default:
      return { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: '→' }
  }
}

export const SUBREDDIT_COLORS: Record<string, string> = {
  'wallstreetbets': '#FF4500',
  'stocks': '#0079D3',
  'investing': '#46A508',
  'options': '#7B68EE',
}
