import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache configuration - revenue data doesn't change often, cache for 24 hours
const CACHE_TTL_SECONDS = 86400 // 24 hours

interface QuarterlyRevenue {
  quarter: string // e.g., "Q1 2024"
  year: number
  quarterNum: number
  revenue: number
  revenueGrowthYoY: number | null // Year-over-year growth percentage
}

interface CachedRevenueData {
  symbol: string
  recent4Quarters: QuarterlyRevenue[]
  historicalData: QuarterlyRevenue[]
  avgGrowthRate: number | null
  dataPoints: number
  timestamp: number
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
      unit?: string
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
 * Extract revenue from income statement concepts
 */
function extractRevenue(report: FinancialReport): number | null {
  if (!report.report?.ic) return null

  // Try various revenue concepts used in SEC filings
  const revenueConcepts = [
    'us-gaap_Revenues',
    'us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax',
    'us-gaap_SalesRevenueNet',
    'us-gaap_NetRevenue',
    'us-gaap_TotalRevenue',
    'us-gaap_SalesRevenueServicesNet',
    'us-gaap_RevenueFromContractWithCustomerIncludingAssessedTax',
  ]

  for (const concept of revenueConcepts) {
    const item = report.report.ic.find(i => i.concept === concept)
    if (item && item.value > 0) {
      return item.value
    }
  }

  // Fallback: look for any concept containing "Revenue" with a reasonable value
  const revenueItem = report.report.ic.find(i =>
    i.concept.toLowerCase().includes('revenue') &&
    i.value > 0 &&
    !i.concept.toLowerCase().includes('cost')
  )

  return revenueItem?.value || null
}

/**
 * Fetch and process revenue data from Finnhub
 */
async function fetchRevenueData(symbol: string): Promise<CachedRevenueData | null> {
  const financialsRes = await fetch(
    `${FINNHUB_BASE_URL}/stock/financials-reported?symbol=${symbol}&token=${FINNHUB_API_KEY}`
  )

  if (!financialsRes.ok) {
    return null
  }

  const financials: FinnhubFinancials = await financialsRes.json()

  if (!financials.data || financials.data.length === 0) {
    return null
  }

  // Extract quarterly revenue data from all report types
  const quarterlyData: { year: number; quarter: number; revenue: number; endDate: string }[] = []

  for (const report of financials.data) {
    // Process quarterly reports (10-Q) for Q1, Q2, Q3
    // Process annual reports (10-K) for Q4
    if (report.form !== '10-Q' && report.form !== '10-K') continue

    const revenue = extractRevenue(report)
    if (!revenue) continue

    // For 10-K (annual), treat as Q4
    // For 10-Q (quarterly), use the quarter field directly (1, 2, or 3)
    const quarter = report.form === '10-K' ? 4 : report.quarter

    quarterlyData.push({
      year: report.year,
      quarter,
      revenue,
      endDate: report.endDate,
    })
  }

  // Sort by date (newest first)
  quarterlyData.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.quarter - a.quarter
  })

  // Remove duplicates (keep most recent filing for each quarter)
  const uniqueQuarters = new Map<string, typeof quarterlyData[0]>()
  for (const item of quarterlyData) {
    const key = `${item.year}-Q${item.quarter}`
    if (!uniqueQuarters.has(key)) {
      uniqueQuarters.set(key, item)
    }
  }

  // Convert to array and calculate YoY growth
  const revenueHistory: QuarterlyRevenue[] = []
  const sortedQuarters = Array.from(uniqueQuarters.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.quarter - a.quarter
    })

  for (const item of sortedQuarters) {
    // Find same quarter from previous year for YoY calculation
    const previousYearQuarter = sortedQuarters.find(
      q => q.year === item.year - 1 && q.quarter === item.quarter
    )

    let revenueGrowthYoY: number | null = null
    if (previousYearQuarter && previousYearQuarter.revenue > 0) {
      revenueGrowthYoY = ((item.revenue - previousYearQuarter.revenue) / previousYearQuarter.revenue) * 100
      revenueGrowthYoY = Math.round(revenueGrowthYoY * 100) / 100 // Round to 2 decimal places
    }

    revenueHistory.push({
      quarter: `Q${item.quarter} ${item.year}`,
      year: item.year,
      quarterNum: item.quarter,
      revenue: item.revenue,
      revenueGrowthYoY,
    })
  }

  // Get recent 4 quarters and all available data for chart
  const recent4Quarters = revenueHistory.slice(0, 4)

  // Calculate average growth rate (from available YoY data)
  const growthRates = revenueHistory
    .filter(q => q.revenueGrowthYoY !== null)
    .map(q => q.revenueGrowthYoY as number)

  const avgGrowthRate = growthRates.length > 0
    ? Math.round((growthRates.reduce((a, b) => a + b, 0) / growthRates.length) * 100) / 100
    : null

  return {
    symbol,
    recent4Quarters,
    historicalData: revenueHistory.slice(0, 40), // Up to 10 years of data
    avgGrowthRate,
    dataPoints: revenueHistory.length,
    timestamp: Date.now(),
  }
}

/**
 * GET /api/revenue-growth/[symbol]
 * Returns quarterly revenue data with year-over-year growth rates
 * Uses Vercel KV caching (24-hour TTL) to reduce API calls
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const upperSymbol = symbol.toUpperCase()
  const cacheKey = `revenue:${upperSymbol}`

  try {
    // Try to get cached data from Vercel KV
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<CachedRevenueData>(cacheKey)

        if (cached && cached.recent4Quarters && cached.recent4Quarters.length > 0) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[Revenue API] Cache hit for ${upperSymbol} - age: ${cacheAge}s`)

          return NextResponse.json({
            ...cached,
            cached: true,
            cacheAge,
            source: 'finnhub'
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
            }
          })
        }
      } catch (kvError) {
        console.error('[Revenue API] KV error:', kvError)
      }
    }

    console.log(`[Revenue API] Cache miss for ${upperSymbol} - fetching from Finnhub`)

    // Fetch fresh data from Finnhub
    const data = await fetchRevenueData(upperSymbol)

    if (!data) {
      return NextResponse.json(
        { error: 'No financial data available for this symbol' },
        { status: 404 }
      )
    }

    // Store in Vercel KV with TTL
    if (isKVAvailable()) {
      try {
        await kv.set(cacheKey, data, { ex: CACHE_TTL_SECONDS })
        console.log(`[Revenue API] Cached ${upperSymbol} for ${CACHE_TTL_SECONDS}s`)
      } catch (kvError) {
        console.error('[Revenue API] Failed to cache:', kvError)
      }
    }

    return NextResponse.json({
      ...data,
      cached: false,
      source: 'finnhub'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('[Revenue API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue growth data' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
