import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { kv } from "@vercel/kv"
import type {
  PortfolioHolding,
  PortfolioSnapshot,
  PortfolioHistory,
  PortfolioTimeRange
} from "@/lib/types"
import {
  calculateHoldingsHash,
  getDateRangeForTimeframe,
  getEarliestPurchaseDate,
  fetchHistoricalPricesBatch,
  findClosestPrice
} from "@/lib/portfolio-utils"

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

/**
 * Fetch real-time quote for a single symbol from Finnhub
 */
async function fetchRealTimeQuote(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.c || null // current price
  } catch (error) {
    console.error(`[Portfolio History] Error fetching real-time quote for ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch real-time quotes for multiple symbols
 */
async function fetchRealTimeQuotes(symbols: string[]): Promise<Map<string, number>> {
  const quotes = new Map<string, number>()

  console.log(`[Portfolio History] Fetching real-time quotes for ${symbols.length} symbols`)

  // Fetch all quotes in parallel
  const results = await Promise.all(
    symbols.map(async (symbol) => ({
      symbol,
      price: await fetchRealTimeQuote(symbol)
    }))
  )

  for (const { symbol, price } of results) {
    if (price !== null) {
      quotes.set(symbol, price)
    }
  }

  console.log(`[Portfolio History] Fetched ${quotes.size} real-time quotes`)
  return quotes
}

// GET /api/portfolio/history?timeframe=1M - Calculate portfolio historical values
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const timeframe = (searchParams.get('timeframe') || '1M') as PortfolioTimeRange
    const forceRefresh = searchParams.get('force_refresh') === 'true'

    // Validate timeframe
    const validTimeframes: PortfolioTimeRange[] = ['1W', '1M', '3M', '1Y', 'All']
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: "Invalid timeframe. Must be one of: 1W, 1M, 3M, 1Y, All" },
        { status: 400 }
      )
    }

    console.log(`[Portfolio History] Request for ${session.user.email}, timeframe: ${timeframe}, force: ${forceRefresh}`)

    // Fetch current holdings
    const portfolioKey = `portfolio:${session.user.email}`
    const holdings = await kv.get<PortfolioHolding[]>(portfolioKey)

    if (!holdings || holdings.length === 0) {
      return NextResponse.json(
        { error: "No holdings found" },
        { status: 404 }
      )
    }

    // Calculate holdings hash for change detection
    const currentHash = calculateHoldingsHash(holdings)

    // Check cache
    const cacheKey = `portfolio_history:${session.user.email}`
    if (!forceRefresh) {
      const cached = await kv.get<PortfolioHistory>(cacheKey)
      if (cached && cached.holdingsHash === currentHash) {
        console.log(`[Portfolio History] Cache hit for ${session.user.email}`)

        // Filter snapshots by timeframe
        const earliestDate = getEarliestPurchaseDate(holdings)
        const { dates } = getDateRangeForTimeframe(timeframe, earliestDate)
        const fromDate = dates[0]
        const toDate = dates[dates.length - 1]

        const filteredSnapshots = cached.snapshots.filter(
          s => s.date >= fromDate && s.date <= toDate
        )

        return NextResponse.json({
          timeframe,
          snapshots: filteredSnapshots,
          dateRange: { from: fromDate, to: toDate },
          cached: true,
          calculatedAt: cached.lastCalculated
        })
      }
    }

    console.log(`[Portfolio History] Cache miss or forced refresh, calculating...`)

    // Determine date range
    const earliestDate = getEarliestPurchaseDate(holdings)
    const { dates, interval } = getDateRangeForTimeframe(timeframe, earliestDate)

    console.log(`[Portfolio History] Date range: ${dates[0]} to ${dates[dates.length - 1]} (${dates.length} points, ${interval})`)

    // Get unique symbols
    const symbols = Array.from(new Set(holdings.map(h => h.symbol)))

    // Fetch real-time quotes for today's prices
    const realTimeQuotes = await fetchRealTimeQuotes(symbols)

    // Batch fetch historical prices
    const fromDate = dates[0]
    const toDate = dates[dates.length - 1]
    const priceData = await fetchHistoricalPricesBatch(symbols, fromDate, toDate)

    // Get today's date string for comparison
    const todayDateStr = new Date().toISOString().split('T')[0]

    // Calculate portfolio value for each date
    const snapshots: PortfolioSnapshot[] = []

    for (const date of dates) {
      let totalValue = 0
      let totalCost = 0
      const isToday = date === todayDateStr

      for (const holding of holdings) {
        // Only include holdings purchased before or on this date
        if (holding.purchaseDate <= date) {
          let price: number | null = null

          // For today's date, use real-time quotes
          if (isToday) {
            const realTimePrice = realTimeQuotes.get(holding.symbol)
            if (realTimePrice !== undefined) {
              price = realTimePrice
            }
          }

          // If not today or real-time quote not available, use historical data
          if (price === null) {
            const symbolPrices = priceData.get(holding.symbol)

            if (symbolPrices) {
              // Find price for this date (or closest trading day)
              price = findClosestPrice(symbolPrices, date)
            }
          }

          // Final fallback to purchase price
          if (price === null) {
            price = holding.purchasePrice
          }

          totalValue += holding.shares * price
          totalCost += holding.totalCost
        }
      }

      const gainLoss = totalValue - totalCost
      const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

      snapshots.push({
        date,
        totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimals
        totalCost: Math.round(totalCost * 100) / 100,
        gainLoss: Math.round(gainLoss * 100) / 100,
        gainLossPercent: Math.round(gainLossPercent * 100) / 100
      })
    }

    // Cache the results (1-hour TTL = 3600 seconds)
    const historyData: PortfolioHistory = {
      userEmail: session.user.email,
      snapshots,
      lastCalculated: Date.now(),
      holdingsHash: currentHash
    }

    await kv.set(cacheKey, historyData, { ex: 3600 })

    console.log(`[Portfolio History] Calculation complete. ${snapshots.length} snapshots cached.`)

    return NextResponse.json({
      timeframe,
      snapshots,
      dateRange: { from: fromDate, to: toDate },
      cached: false,
      calculatedAt: Date.now()
    })

  } catch (error) {
    console.error("[Portfolio History] Error:", error)
    return NextResponse.json(
      { error: "Failed to calculate portfolio history" },
      { status: 500 }
    )
  }
}
