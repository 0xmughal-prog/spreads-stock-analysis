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

    // Batch fetch historical prices
    const fromDate = dates[0]
    const toDate = dates[dates.length - 1]
    const priceData = await fetchHistoricalPricesBatch(symbols, fromDate, toDate)

    // Calculate portfolio value for each date
    const snapshots: PortfolioSnapshot[] = []

    for (const date of dates) {
      let totalValue = 0
      let totalCost = 0

      for (const holding of holdings) {
        // Only include holdings purchased before or on this date
        if (holding.purchaseDate <= date) {
          const symbolPrices = priceData.get(holding.symbol)

          if (symbolPrices) {
            // Find price for this date (or closest trading day)
            const price = findClosestPrice(symbolPrices, date)

            if (price !== null) {
              totalValue += holding.shares * price
            } else {
              // Fallback to purchase price if no historical data
              totalValue += holding.shares * holding.purchasePrice
            }
          } else {
            // Fallback to purchase price if symbol data not available
            totalValue += holding.shares * holding.purchasePrice
          }

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
