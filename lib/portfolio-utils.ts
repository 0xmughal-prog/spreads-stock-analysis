import { PortfolioHolding, PortfolioTimeRange } from './types'
import { kv } from '@vercel/kv'
import crypto from 'crypto'

const FINNHUB_API_KEY = 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

/**
 * Calculate MD5 hash of holdings for change detection
 */
export function calculateHoldingsHash(holdings: PortfolioHolding[]): string {
  // Sort holdings by symbol to ensure consistent hash
  const sortedHoldings = [...holdings].sort((a, b) => a.symbol.localeCompare(b.symbol))

  // Create a string representation of holdings
  const holdingsString = sortedHoldings
    .map(h => `${h.symbol}:${h.shares}:${h.purchasePrice}:${h.purchaseDate}`)
    .join('|')

  // Generate MD5 hash
  return crypto.createHash('md5').update(holdingsString).digest('hex')
}

/**
 * Get business days between two dates (excluding weekends)
 */
export function getBusinessDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return days
}

/**
 * Find closest trading day price from price map
 */
export function findClosestPrice(
  priceMap: Record<string, number>,
  targetDate: string
): number | null {
  // Try exact match first
  if (priceMap[targetDate]) {
    return priceMap[targetDate]
  }

  // Try previous 7 days (for weekends and holidays)
  const target = new Date(targetDate)
  for (let i = 1; i <= 7; i++) {
    const prevDate = new Date(target)
    prevDate.setDate(prevDate.getDate() - i)
    const prevDateStr = prevDate.toISOString().split('T')[0]
    if (priceMap[prevDateStr]) {
      return priceMap[prevDateStr]
    }
  }

  // Try next 3 days (in case data starts after target date)
  for (let i = 1; i <= 3; i++) {
    const nextDate = new Date(target)
    nextDate.setDate(nextDate.getDate() + i)
    const nextDateStr = nextDate.toISOString().split('T')[0]
    if (priceMap[nextDateStr]) {
      return priceMap[nextDateStr]
    }
  }

  return null
}

/**
 * Generate date range based on timeframe
 */
export function getDateRangeForTimeframe(
  timeframe: PortfolioTimeRange,
  earliestPurchaseDate: string
): { dates: string[], interval: 'daily' | 'weekly' } {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today

  let startDate: Date
  let interval: 'daily' | 'weekly' = 'daily'

  switch (timeframe) {
    case '1W':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
      interval = 'daily'
      break
    case '1M':
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 1)
      interval = 'daily'
      break
    case '3M':
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 3)
      interval = 'daily'
      break
    case '1Y':
      startDate = new Date(now)
      startDate.setFullYear(startDate.getFullYear() - 1)
      interval = 'weekly'
      break
    case 'All':
      startDate = new Date(earliestPurchaseDate)
      interval = 'weekly'
      break
  }

  // Don't start before earliest purchase date
  const earliestDate = new Date(earliestPurchaseDate)
  if (startDate < earliestDate) {
    startDate = earliestDate
  }

  // Generate date array
  const dates: string[] = []
  const current = new Date(startDate)

  if (interval === 'daily') {
    // Generate daily dates (skip weekends)
    const businessDays = getBusinessDays(startDate, now)
    return {
      dates: businessDays.map(d => d.toISOString().split('T')[0]),
      interval: 'daily'
    }
  } else {
    // Generate weekly dates (every 7 days)
    while (current <= now) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 7)
    }
    // Always include today if not already included
    const today = now.toISOString().split('T')[0]
    if (dates[dates.length - 1] !== today) {
      dates.push(today)
    }
  }

  return { dates, interval }
}

/**
 * Batch fetch historical prices from Finnhub for multiple symbols
 */
export async function fetchHistoricalPricesBatch(
  symbols: string[],
  fromDate: string,
  toDate: string
): Promise<Map<string, Record<string, number>>> {
  const priceMap = new Map<string, Record<string, number>>()

  const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000)
  const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000)

  console.log(`[Portfolio History] Fetching prices for ${symbols.length} symbols from ${fromDate} to ${toDate}`)

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    const cacheKey = `stock_prices:${symbol}:${fromDate}:${toDate}`

    try {
      // Check cache first (7-day TTL)
      const cached = await kv.get<Record<string, number>>(cacheKey)
      if (cached) {
        console.log(`[Portfolio History] Cache hit for ${symbol}`)
        priceMap.set(symbol, cached)
        continue
      }

      console.log(`[Portfolio History] Fetching ${symbol} (${i + 1}/${symbols.length})`)

      // Fetch from Finnhub candle API
      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${FINNHUB_API_KEY}`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`[Portfolio History] Finnhub API error for ${symbol}:`, response.status)
        priceMap.set(symbol, {})
        continue
      }

      const data = await response.json()

      if (data.s !== 'ok' || !data.c || !data.t) {
        console.error(`[Portfolio History] No data available for ${symbol}`)
        priceMap.set(symbol, {})
        continue
      }

      // Convert timestamps to dates and build price map
      const symbolPrices: Record<string, number> = {}
      for (let j = 0; j < data.t.length; j++) {
        const date = new Date(data.t[j] * 1000).toISOString().split('T')[0]
        symbolPrices[date] = data.c[j] // closing price
      }

      priceMap.set(symbol, symbolPrices)

      // Cache for 7 days
      await kv.set(cacheKey, symbolPrices, { ex: 604800 })

      // Rate limiting: wait 1 second between calls to respect 60 calls/min limit
      if (i < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error(`[Portfolio History] Error fetching prices for ${symbol}:`, error)
      priceMap.set(symbol, {})
    }
  }

  console.log(`[Portfolio History] Finished fetching prices for ${symbols.length} symbols`)
  return priceMap
}

/**
 * Format date for display (e.g., "Jan 15" or "01/15/24")
 */
export function formatChartDate(dateStr: string, interval: 'daily' | 'weekly'): string {
  const date = new Date(dateStr)

  if (interval === 'daily') {
    // Short format: "Jan 15"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } else {
    // Date format: "01/15/24"
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
  }
}

/**
 * Get the earliest purchase date from holdings
 */
export function getEarliestPurchaseDate(holdings: PortfolioHolding[]): string {
  if (holdings.length === 0) {
    return new Date().toISOString().split('T')[0]
  }

  const dates = holdings.map(h => new Date(h.purchaseDate).getTime())
  const earliestTimestamp = Math.min(...dates)
  return new Date(earliestTimestamp).toISOString().split('T')[0]
}
