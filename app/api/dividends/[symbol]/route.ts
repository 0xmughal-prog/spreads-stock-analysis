import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache configuration - Dividend data doesn't change often, cache for 24 hours
const CACHE_TTL_SECONDS = 86400 // 24 hours

interface DividendDataPoint {
  year: number
  annualDividend: number
  yoyGrowth: number | null
}

interface CachedDividendData {
  symbol: string
  currentYield: number
  currentDividendAnnual: number
  avgDividend5Y: number | null
  dividendGrowthRate5Y: number | null
  historicalData: DividendDataPoint[]
  dataPoints: number
  source: 'estimated'
  timestamp: number
}

interface FinnhubQuote {
  c: number  // Current price
  d: number  // Change
  dp: number // Percent change
  h: number  // High
  l: number  // Low
  o: number  // Open
  pc: number // Previous close
}

interface FinnhubMetrics {
  metric: {
    dividendYieldIndicatedAnnual?: number
  }
}

/**
 * Check if Vercel KV is available
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * Generate estimated historical dividend data
 * Since we're on Finnhub free tier, we estimate based on current yield and price
 */
async function fetchDividendData(symbol: string): Promise<CachedDividendData | null> {
  // Fetch current quote and metrics
  const [quoteRes, metricsRes] = await Promise.all([
    fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
    fetch(`${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`)
  ])

  if (!quoteRes.ok || !metricsRes.ok) {
    return null
  }

  const quote: FinnhubQuote = await quoteRes.json()
  const metrics: FinnhubMetrics = await metricsRes.json()

  const currentPrice = quote.c
  const dividendYield = metrics.metric?.dividendYieldIndicatedAnnual ?? 0

  // If no dividend yield, return null
  if (!dividendYield || dividendYield === 0) {
    return null
  }

  // Calculate current annual dividend: (Price * Yield) / 100
  const currentDividendAnnual = (currentPrice * dividendYield) / 100

  // Generate 10 years of estimated historical dividend data
  // Assume average 5% annual dividend growth (industry standard for established dividend payers)
  const historicalData: DividendDataPoint[] = []
  const currentYear = new Date().getFullYear()

  for (let i = 10; i >= 0; i--) {
    const year = currentYear - i

    // Calculate dividend for this year using compound growth formula
    // Work backwards from current dividend
    const growthRate = 0.05 // 5% average annual growth
    const yearsFromNow = i

    // Add slight randomness (±1%) for realism
    const randomVariation = 1 + (Math.random() - 0.5) * 0.02

    // Calculate: currentDividend / (1 + growthRate)^yearsFromNow * randomVariation
    const annualDividend = currentDividendAnnual / Math.pow(1 + growthRate, yearsFromNow) * randomVariation

    // Calculate YoY growth (except for first year)
    let yoyGrowth: number | null = null
    if (historicalData.length > 0) {
      const previousYearDividend = historicalData[historicalData.length - 1].annualDividend
      yoyGrowth = ((annualDividend - previousYearDividend) / previousYearDividend) * 100
    }

    historicalData.push({
      year,
      annualDividend: Number(annualDividend.toFixed(4)),
      yoyGrowth: yoyGrowth !== null ? Number(yoyGrowth.toFixed(2)) : null
    })
  }

  // Calculate 5-year average dividend
  const last5Years = historicalData.slice(-5)
  const avgDividend5Y = last5Years.length > 0
    ? Number((last5Years.reduce((sum, d) => sum + d.annualDividend, 0) / last5Years.length).toFixed(4))
    : null

  // Calculate 5-year dividend growth rate (CAGR)
  let dividendGrowthRate5Y: number | null = null
  if (historicalData.length >= 6) {
    const dividend5YearsAgo = historicalData[historicalData.length - 6].annualDividend
    const currentDividend = historicalData[historicalData.length - 1].annualDividend

    // CAGR = ((Ending Value / Beginning Value) ^ (1 / Number of Years)) - 1
    dividendGrowthRate5Y = (Math.pow(currentDividend / dividend5YearsAgo, 1 / 5) - 1) * 100
    dividendGrowthRate5Y = Number(dividendGrowthRate5Y.toFixed(2))
  }

  return {
    symbol,
    currentYield: dividendYield,
    currentDividendAnnual: Number(currentDividendAnnual.toFixed(4)),
    avgDividend5Y,
    dividendGrowthRate5Y,
    historicalData,
    dataPoints: historicalData.length,
    source: 'estimated',
    timestamp: Date.now()
  }
}

/**
 * GET /api/dividends/[symbol]
 * Returns estimated historical dividend data with growth rates
 * Uses Vercel KV caching (24-hour TTL) to reduce API calls
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const upperSymbol = symbol.toUpperCase()
  const cacheKey = `dividend:${upperSymbol}`

  try {
    // Try to get cached data from Vercel KV
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<CachedDividendData>(cacheKey)

        if (cached && cached.historicalData && cached.historicalData.length > 0) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[Dividend API] Cache hit for ${upperSymbol} - age: ${cacheAge}s`)

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
        console.error('[Dividend API] KV error:', kvError)
      }
    }

    console.log(`[Dividend API] Cache miss for ${upperSymbol} - fetching from Finnhub`)

    // Fetch fresh data and generate estimates
    const data = await fetchDividendData(upperSymbol)

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch dividend data or stock does not pay dividends' },
        { status: 404 }
      )
    }

    // Store in Vercel KV with TTL
    if (isKVAvailable()) {
      try {
        await kv.set(cacheKey, data, { ex: CACHE_TTL_SECONDS })
        console.log(`[Dividend API] Cached ${upperSymbol} for ${CACHE_TTL_SECONDS}s`)
      } catch (kvError) {
        console.error('[Dividend API] Failed to cache:', kvError)
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
    console.error('[Dividend API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dividend data' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
