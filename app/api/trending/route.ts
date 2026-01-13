import { NextResponse } from 'next/server'

interface TrendingStock {
  symbol: string
  watchlistCount?: number
  sentiment?: string
}

interface StockTwitsResponse {
  symbols: Array<{
    symbol: string
    title: string
    watchlist_count: number
  }>
}

// Cache trending data for 5 minutes
let cachedTrending: TrendingStock[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  try {
    const now = Date.now()

    // Return cached data if still valid
    if (cachedTrending && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json({
        data: cachedTrending,
        source: 'cache',
        message: 'Cached trending stocks'
      })
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Try StockTwits API for trending symbols
    const response = await fetch('https://api.stocktwits.com/api/2/trending/symbols.json', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
      cache: 'no-store' // Avoid caching Cloudflare challenge pages
    })

    clearTimeout(timeoutId)

    // Check if response is actually JSON (not Cloudflare challenge page)
    const contentType = response.headers.get('content-type')
    if (response.ok && contentType?.includes('application/json')) {
      const data: StockTwitsResponse = await response.json()

      // Filter to only include stocks we care about (major exchanges)
      const trendingStocks: TrendingStock[] = data.symbols
        .slice(0, 10) // Get top 10 trending
        .map(symbol => ({
          symbol: symbol.symbol,
          watchlistCount: symbol.watchlist_count,
          sentiment: 'trending'
        }))

      cachedTrending = trendingStocks
      cacheTimestamp = now

      return NextResponse.json({
        data: trendingStocks,
        source: 'api',
        message: 'Live trending data from StockTwits'
      })
    }

    // Fallback: Return popular stock symbols if StockTwits fails
    const fallbackTrending: TrendingStock[] = [
      { symbol: 'NVDA', watchlistCount: 500000, sentiment: 'bullish' },
      { symbol: 'TSLA', watchlistCount: 450000, sentiment: 'bullish' },
      { symbol: 'AAPL', watchlistCount: 400000, sentiment: 'neutral' },
      { symbol: 'MSFT', watchlistCount: 350000, sentiment: 'bullish' },
      { symbol: 'META', watchlistCount: 320000, sentiment: 'bullish' },
      { symbol: 'AMZN', watchlistCount: 300000, sentiment: 'neutral' },
      { symbol: 'GOOGL', watchlistCount: 280000, sentiment: 'neutral' },
      { symbol: 'AMD', watchlistCount: 260000, sentiment: 'bullish' },
      { symbol: 'NFLX', watchlistCount: 240000, sentiment: 'neutral' },
      { symbol: 'JPM', watchlistCount: 220000, sentiment: 'neutral' },
    ]

    cachedTrending = fallbackTrending
    cacheTimestamp = now

    return NextResponse.json({
      data: fallbackTrending,
      source: 'fallback',
      message: 'Using fallback trending data'
    })

  } catch (error: unknown) {
    // Log different messages for timeout vs other errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('StockTwits API timeout after 5 seconds')
    } else {
      console.error('Error fetching trending stocks:', error)
    }

    // Return cached data even if expired on error
    if (cachedTrending) {
      return NextResponse.json({
        data: cachedTrending,
        source: 'cache',
        message: 'Using stale cache due to error'
      })
    }

    // Ultimate fallback
    return NextResponse.json({
      data: [
        { symbol: 'NVDA', watchlistCount: 500000, sentiment: 'bullish' },
        { symbol: 'TSLA', watchlistCount: 450000, sentiment: 'bullish' },
        { symbol: 'AAPL', watchlistCount: 400000, sentiment: 'neutral' },
      ],
      source: 'fallback',
      message: 'Using fallback trending data'
    })
  }
}
