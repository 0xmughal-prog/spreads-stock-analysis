import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { TrendingRedditStock, RedditSentimentData } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Top stocks to check for trending (most commonly discussed)
const TOP_SYMBOLS = [
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'JPM',
  'PLTR', 'GME', 'AMC', 'SPY', 'QQQ', 'COIN', 'SOFI', 'NIO', 'RIVN', 'LCID',
  'INTC', 'BA', 'DIS', 'V', 'MA', 'PYPL', 'SQ', 'SHOP', 'ROKU', 'UBER',
  'CRM', 'ORCL', 'SNOW', 'NOW', 'ADBE', 'AVGO', 'MU', 'QCOM', 'ARM', 'SMCI',
]

// Stock names mapping
const STOCK_NAMES: Record<string, string> = {
  'NVDA': 'NVIDIA Corporation',
  'TSLA': 'Tesla, Inc.',
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'META': 'Meta Platforms, Inc.',
  'AMZN': 'Amazon.com, Inc.',
  'GOOGL': 'Alphabet Inc.',
  'AMD': 'Advanced Micro Devices',
  'NFLX': 'Netflix, Inc.',
  'JPM': 'JPMorgan Chase & Co.',
  'PLTR': 'Palantir Technologies',
  'GME': 'GameStop Corp.',
  'AMC': 'AMC Entertainment',
  'SPY': 'SPDR S&P 500 ETF',
  'QQQ': 'Invesco QQQ Trust',
  'COIN': 'Coinbase Global',
  'SOFI': 'SoFi Technologies',
  'NIO': 'NIO Inc.',
  'RIVN': 'Rivian Automotive',
  'LCID': 'Lucid Group',
  'INTC': 'Intel Corporation',
  'BA': 'Boeing Company',
  'DIS': 'Walt Disney Company',
  'V': 'Visa Inc.',
  'MA': 'Mastercard Inc.',
  'PYPL': 'PayPal Holdings',
  'SQ': 'Block, Inc.',
  'SHOP': 'Shopify Inc.',
  'ROKU': 'Roku, Inc.',
  'UBER': 'Uber Technologies',
  'CRM': 'Salesforce, Inc.',
  'ORCL': 'Oracle Corporation',
  'SNOW': 'Snowflake Inc.',
  'NOW': 'ServiceNow, Inc.',
  'ADBE': 'Adobe Inc.',
  'AVGO': 'Broadcom Inc.',
  'MU': 'Micron Technology',
  'QCOM': 'QUALCOMM Inc.',
  'ARM': 'Arm Holdings',
  'SMCI': 'Super Micro Computer',
}

// Cache configuration
const CACHE_KEY = 'reddit:trending'
const CACHE_TTL_SECONDS = 7200 // 2 hours

// In-memory cache
let memoryCache: { data: TrendingRedditStock[]; timestamp: number } | null = null
const MEMORY_CACHE_TTL = 300000 // 5 minutes

// Check if KV is available
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

// Fallback trending data when APIs fail
const FALLBACK_TRENDING: TrendingRedditStock[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', redditScore: 85, sentiment: 'bullish', totalMentions: 1250, topSubreddit: 'wallstreetbets', change24h: null },
  { symbol: 'TSLA', name: 'Tesla, Inc.', redditScore: 78, sentiment: 'bullish', totalMentions: 980, topSubreddit: 'wallstreetbets', change24h: null },
  { symbol: 'AAPL', name: 'Apple Inc.', redditScore: 65, sentiment: 'neutral', totalMentions: 720, topSubreddit: 'stocks', change24h: null },
  { symbol: 'AMD', name: 'Advanced Micro Devices', redditScore: 62, sentiment: 'bullish', totalMentions: 650, topSubreddit: 'wallstreetbets', change24h: null },
  { symbol: 'PLTR', name: 'Palantir Technologies', redditScore: 58, sentiment: 'bullish', totalMentions: 520, topSubreddit: 'wallstreetbets', change24h: null },
  { symbol: 'META', name: 'Meta Platforms, Inc.', redditScore: 55, sentiment: 'neutral', totalMentions: 480, topSubreddit: 'stocks', change24h: null },
  { symbol: 'MSFT', name: 'Microsoft Corporation', redditScore: 52, sentiment: 'neutral', totalMentions: 420, topSubreddit: 'investing', change24h: null },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', redditScore: 48, sentiment: 'neutral', totalMentions: 380, topSubreddit: 'stocks', change24h: null },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', redditScore: 45, sentiment: 'neutral', totalMentions: 350, topSubreddit: 'investing', change24h: null },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', redditScore: 42, sentiment: 'neutral', totalMentions: 320, topSubreddit: 'options', change24h: null },
]

interface CachedTrending {
  data: TrendingRedditStock[]
  timestamp: number
}

// Fetch sentiment for a single symbol with timeout
async function fetchSymbolSentiment(symbol: string): Promise<RedditSentimentData | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    // Use internal API route for consistency
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/reddit-sentiment/${symbol}`, {
      signal: controller.signal,
      cache: 'no-store',
    })

    clearTimeout(timeoutId)

    if (!response.ok) return null

    const data = await response.json()
    return data.data24h || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    // Check KV cache first
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<CachedTrending>(CACHE_KEY)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_SECONDS * 1000) {
          return NextResponse.json({
            data: cached.data,
            source: 'cache',
            cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
          })
        }
      } catch (kvError) {
        console.error('[Reddit Trending] KV cache read error:', kvError)
      }
    }

    // Check memory cache
    if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_CACHE_TTL) {
      return NextResponse.json({
        data: memoryCache.data,
        source: 'memory-cache',
        cacheAge: Math.round((Date.now() - memoryCache.timestamp) / 1000),
      })
    }

    console.log('[Reddit Trending] Fetching fresh trending data')

    // Fetch sentiment for top symbols in batches
    const trendingStocks: TrendingRedditStock[] = []
    const batchSize = 5
    const delayBetweenBatches = 2000 // 2 seconds

    for (let i = 0; i < Math.min(TOP_SYMBOLS.length, 20); i += batchSize) {
      const batch = TOP_SYMBOLS.slice(i, i + batchSize)

      const results = await Promise.all(
        batch.map(async (symbol) => {
          const sentiment = await fetchSymbolSentiment(symbol)
          if (sentiment && sentiment.totalMentions > 0) {
            // Find top subreddit
            const topSub = sentiment.subredditBreakdown
              .sort((a, b) => b.mentionCount - a.mentionCount)[0]

            return {
              symbol,
              name: STOCK_NAMES[symbol] || symbol,
              redditScore: sentiment.redditScore,
              sentiment: sentiment.sentiment,
              totalMentions: sentiment.totalMentions,
              topSubreddit: topSub?.subreddit || 'wallstreetbets',
              change24h: sentiment.scoreChange,
            }
          }
          return null
        })
      )

      trendingStocks.push(...results.filter((r): r is TrendingRedditStock => r !== null))

      // Delay between batches
      if (i + batchSize < TOP_SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    // Sort by Reddit score and take top 10
    const sortedTrending = trendingStocks
      .sort((a, b) => b.redditScore - a.redditScore)
      .slice(0, 10)

    // Use fallback if no data
    const finalData = sortedTrending.length > 0 ? sortedTrending : FALLBACK_TRENDING

    // Cache the results
    const cacheData: CachedTrending = {
      data: finalData,
      timestamp: Date.now(),
    }

    if (isKVAvailable()) {
      try {
        await kv.set(CACHE_KEY, cacheData, { ex: CACHE_TTL_SECONDS })
      } catch (kvError) {
        console.error('[Reddit Trending] KV cache write error:', kvError)
      }
    }

    memoryCache = cacheData

    return NextResponse.json({
      data: finalData,
      source: sortedTrending.length > 0 ? 'reddit' : 'fallback',
      fetchedAt: Date.now(),
    })

  } catch (error) {
    console.error('[Reddit Trending] Error:', error)

    // Return cached data if available
    if (isKVAvailable()) {
      try {
        const staleCache = await kv.get<CachedTrending>(CACHE_KEY)
        if (staleCache) {
          return NextResponse.json({
            data: staleCache.data,
            source: 'stale-cache',
            error: 'Using cached data due to error',
          })
        }
      } catch {
        // Ignore
      }
    }

    if (memoryCache) {
      return NextResponse.json({
        data: memoryCache.data,
        source: 'stale-memory-cache',
        error: 'Using cached data due to error',
      })
    }

    // Return fallback
    return NextResponse.json({
      data: FALLBACK_TRENDING,
      source: 'fallback',
      error: 'Failed to fetch trending data',
    })
  }
}
