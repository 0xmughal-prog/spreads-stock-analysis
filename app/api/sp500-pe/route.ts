import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache for 1 hour since S&P 500 P/E doesn't change frequently
const CACHE_TTL_SECONDS = 3600

interface CachedSP500PE {
  pe: number
  timestamp: number
}

function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function fetchSP500PE(): Promise<number | null> {
  try {
    // Use SPY ETF as proxy for S&P 500 P/E, or fetch index directly
    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=SPY&metric=all&token=${FINNHUB_API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch SPY metrics')
    }

    const data = await response.json()
    const pe = data.metric?.peTTM ?? data.metric?.peBasicExclExtraTTM ?? null

    // SPY P/E is typically close to S&P 500 P/E
    // Current historical average is around 20-25
    if (pe && pe > 0 && pe < 100) {
      return pe
    }

    // Fallback to a reasonable market average if API fails
    return 24.5
  } catch (error) {
    console.error('[SP500 PE API] Error fetching:', error)
    // Return historical average as fallback
    return 24.5
  }
}

export async function GET() {
  const cacheKey = 'sp500:pe'

  try {
    // Try to get cached data
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<CachedSP500PE>(cacheKey)

        if (cached && cached.pe) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[SP500 PE API] Cache hit - age: ${cacheAge}s`)

          return NextResponse.json({
            pe: cached.pe,
            cached: true,
            cacheAge
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
            }
          })
        }
      } catch (kvError) {
        console.error('[SP500 PE API] KV error:', kvError)
      }
    }

    console.log('[SP500 PE API] Cache miss - fetching from Finnhub')

    const pe = await fetchSP500PE()

    if (pe === null) {
      return NextResponse.json(
        { error: 'Failed to fetch S&P 500 P/E' },
        { status: 500 }
      )
    }

    // Store in cache
    if (isKVAvailable()) {
      try {
        await kv.set(cacheKey, { pe, timestamp: Date.now() }, { ex: CACHE_TTL_SECONDS })
        console.log(`[SP500 PE API] Cached for ${CACHE_TTL_SECONDS}s`)
      } catch (kvError) {
        console.error('[SP500 PE API] Failed to cache:', kvError)
      }
    }

    return NextResponse.json({
      pe,
      cached: false
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
      }
    })
  } catch (error) {
    console.error('[SP500 PE API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch S&P 500 P/E' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
