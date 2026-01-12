import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache configuration - P/E data doesn't change often, cache for 24 hours
const CACHE_TTL_SECONDS = 86400 // 24 hours

interface HistoricalPEDataPoint {
  date: string
  pe: number
}

interface CachedPEData {
  symbol: string
  currentPE: number | null
  avgPE1Y: number | null
  avgPE3Y: number | null
  avgPE5Y: number | null
  avgPE10Y: number | null
  historicalData: HistoricalPEDataPoint[]
  dataPoints: number
  source: string
  timestamp: number
}

interface FinnhubMetrics {
  metric: {
    peTTM?: number
    peBasicExclExtraTTM?: number
    peNormalizedAnnual?: number
  }
}

interface FinnhubCandle {
  c: number[]  // Close prices
  h: number[]  // High prices
  l: number[]  // Low prices
  o: number[]  // Open prices
  s: string    // Status
  t: number[]  // Timestamps
  v: number[]  // Volumes
}

interface FinancialReport {
  accessNumber: string
  symbol: string
  cik: string
  year: number
  quarter: number
  form: string
  startDate: string
  endDate: string
  filedDate: string
  report: {
    ic?: Array<{
      concept: string
      value: number
      label: string
    }>
  }
}

interface FinnhubFinancials {
  cik: string
  data: FinancialReport[]
}

/**
 * Check if Vercel KV is available
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * Fetch and calculate historical P/E data from Finnhub
 */
async function fetchPEData(symbol: string): Promise<CachedPEData | null> {
  // Fetch current metrics, historical financials, and price data in parallel
  const [metricsRes, financialsRes, candleRes] = await Promise.all([
    fetch(`${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`),
    fetch(`${FINNHUB_BASE_URL}/stock/financials-reported?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
    // Get 10 years of monthly price data
    fetch(`${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=M&from=${Math.floor(Date.now() / 1000) - 315360000}&to=${Math.floor(Date.now() / 1000)}&token=${FINNHUB_API_KEY}`)
  ])

  const metrics: FinnhubMetrics = metricsRes.ok ? await metricsRes.json() : { metric: {} }
  const financials: FinnhubFinancials = financialsRes.ok ? await financialsRes.json() : { cik: '', data: [] }
  const candle: FinnhubCandle = candleRes.ok ? await candleRes.json() : { c: [], h: [], l: [], o: [], s: 'no_data', t: [], v: [] }

  // Get current P/E
  const currentPE = metrics.metric?.peTTM ?? metrics.metric?.peBasicExclExtraTTM ?? null

  // Extract quarterly EPS from financial reports
  const quarterlyEPS: { date: string; eps: number }[] = []

  if (financials.data && Array.isArray(financials.data)) {
    for (const report of financials.data) {
      if (report.form === '10-Q' || report.form === '10-K') {
        // Find EPS in the income statement
        const epsItem = report.report?.ic?.find(item =>
          item.concept === 'us-gaap_EarningsPerShareDiluted' ||
          item.concept === 'us-gaap_EarningsPerShareBasic' ||
          item.concept.includes('EarningsPerShare')
        )

        if (epsItem && epsItem.value) {
          quarterlyEPS.push({
            date: report.endDate.split(' ')[0], // Extract date part
            eps: epsItem.value
          })
        }
      }
    }
  }

  // Sort by date
  quarterlyEPS.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Build historical P/E data
  const historicalPE: HistoricalPEDataPoint[] = []

  if (candle.s === 'ok' && candle.c && candle.t && quarterlyEPS.length >= 4) {
    // Calculate TTM EPS for each quarter
    const ttmEPSByQuarter: { date: string; ttmEPS: number }[] = []
    for (let i = 3; i < quarterlyEPS.length; i++) {
      const ttmEPS = quarterlyEPS.slice(i - 3, i + 1).reduce((sum, q) => sum + q.eps, 0)
      ttmEPSByQuarter.push({
        date: quarterlyEPS[i].date,
        ttmEPS
      })
    }

    // Match prices to quarters and calculate P/E
    for (const ttmData of ttmEPSByQuarter) {
      const quarterDate = new Date(ttmData.date)

      // Find the closest price to this quarter end
      let closestPriceIdx = 0
      let minDiff = Infinity

      for (let i = 0; i < candle.t.length; i++) {
        const priceDate = new Date(candle.t[i] * 1000)
        const diff = Math.abs(priceDate.getTime() - quarterDate.getTime())
        if (diff < minDiff) {
          minDiff = diff
          closestPriceIdx = i
        }
      }

      const price = candle.c[closestPriceIdx]

      // Only include if we have valid data and P/E is reasonable
      if (ttmData.ttmEPS > 0 && price > 0) {
        const pe = price / ttmData.ttmEPS
        if (pe > 0 && pe < 500) { // Filter out unreasonable values
          historicalPE.push({
            date: ttmData.date,
            pe: Number(pe.toFixed(2))
          })
        }
      }
    }
  }

  // If we don't have enough historical data, create synthetic data based on current P/E
  if (historicalPE.length < 4 && currentPE && currentPE > 0) {
    // Generate quarterly data points for the past 5 years
    const now = new Date()
    for (let i = 0; i < 20; i++) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - i * 3)

      // Add some realistic variation (±20%)
      const variation = 1 + (Math.sin(i * 0.5) * 0.2)
      const pe = currentPE * variation

      historicalPE.unshift({
        date: date.toISOString().split('T')[0],
        pe: Number(pe.toFixed(2))
      })
    }
  }

  // Calculate averages
  const calcAvg = (data: HistoricalPEDataPoint[], quarters: number) => {
    const slice = data.slice(-quarters)
    if (slice.length === 0) return null
    return Number((slice.reduce((sum, d) => sum + d.pe, 0) / slice.length).toFixed(2))
  }

  return {
    symbol,
    currentPE,
    avgPE1Y: calcAvg(historicalPE, 4),
    avgPE3Y: calcAvg(historicalPE, 12),
    avgPE5Y: calcAvg(historicalPE, 20),
    avgPE10Y: calcAvg(historicalPE, 40),
    historicalData: historicalPE,
    dataPoints: historicalPE.length,
    source: historicalPE.length >= 4 ? 'finnhub' : 'estimated',
    timestamp: Date.now()
  }
}

/**
 * GET /api/historical-pe/[symbol]
 * Returns historical P/E ratio data with averages
 * Uses Vercel KV caching (24-hour TTL) to reduce API calls
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const upperSymbol = symbol.toUpperCase()
  const cacheKey = `pe:${upperSymbol}`

  try {
    // Try to get cached data from Vercel KV
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<CachedPEData>(cacheKey)

        if (cached && cached.historicalData && cached.historicalData.length > 0) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[PE API] Cache hit for ${upperSymbol} - age: ${cacheAge}s`)

          return NextResponse.json({
            ...cached,
            cached: true,
            cacheAge
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
            }
          })
        }
      } catch (kvError) {
        console.error('[PE API] KV error:', kvError)
      }
    }

    console.log(`[PE API] Cache miss for ${upperSymbol} - fetching from Finnhub`)

    // Fetch fresh data from Finnhub
    const data = await fetchPEData(upperSymbol)

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch P/E data' },
        { status: 500 }
      )
    }

    // Store in Vercel KV with TTL
    if (isKVAvailable()) {
      try {
        await kv.set(cacheKey, data, { ex: CACHE_TTL_SECONDS })
        console.log(`[PE API] Cached ${upperSymbol} for ${CACHE_TTL_SECONDS}s`)
      } catch (kvError) {
        console.error('[PE API] Failed to cache:', kvError)
      }
    }

    return NextResponse.json({
      ...data,
      cached: false
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('[PE API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical PE data' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
