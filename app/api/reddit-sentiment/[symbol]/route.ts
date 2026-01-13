import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { RedditPost, RedditSentimentData, SubredditSentiment, CachedRedditData } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Subreddits to track
const SUBREDDITS = ['wallstreetbets', 'stocks', 'investing', 'options']

// Subreddit weights for score calculation
const SUBREDDIT_WEIGHTS: Record<string, number> = {
  'wallstreetbets': 1.0,
  'stocks': 0.8,
  'options': 0.7,
  'investing': 0.6,
}

// Keyword-based sentiment detection
const BULLISH_KEYWORDS = [
  'calls', 'call', 'moon', 'bullish', 'buy', 'buying', 'long', 'breakout',
  'rally', 'pump', 'rocket', 'gain', 'gains', 'squeeze', 'yolo', 'diamond hands',
  'hold', 'hodl', 'bull', 'up', 'green', 'profit', 'win', 'winning', 'tendies',
  'bullrun', 'surge', 'soaring', 'all time high', 'ath'
]

const BEARISH_KEYWORDS = [
  'puts', 'put', 'short', 'shorting', 'sell', 'selling', 'crash', 'dump',
  'bear', 'bearish', 'down', 'red', 'loss', 'losses', 'rip', 'dead', 'tank',
  'tanking', 'bag holder', 'bagholder', 'fud', 'panic', 'drop', 'dropping',
  'plunge', 'collapse', 'overvalued', 'bubble', 'drill', 'drilling'
]

// Analyze post sentiment based on keywords
function analyzePostSentiment(post: RedditPost): 'bullish' | 'bearish' | 'neutral' {
  const text = `${post.title} ${post.selftext || ''}`.toLowerCase()

  let bullishScore = 0
  let bearishScore = 0

  for (const keyword of BULLISH_KEYWORDS) {
    if (text.includes(keyword)) bullishScore++
  }

  for (const keyword of BEARISH_KEYWORDS) {
    if (text.includes(keyword)) bearishScore++
  }

  if (bullishScore > bearishScore) return 'bullish'
  if (bearishScore > bullishScore) return 'bearish'

  // If tied or no keywords, use engagement as a signal
  // High upvotes typically indicate positive sentiment in these communities
  if (post.score > 50) return 'bullish'
  if (post.score < 5) return 'bearish'

  return 'neutral'
}

// Cache configuration
const CACHE_TTL_SECONDS = 7200 // 2 hours
const STALE_TTL_SECONDS = 14400 // 4 hours

// In-memory fallback cache
const memoryCache = new Map<string, { data: CachedRedditData; timestamp: number }>()
const MEMORY_CACHE_TTL = 300000 // 5 minutes

// Rate limiting
const REQUEST_TIMEOUT = 10000 // 10 seconds
const DELAY_BETWEEN_SUBREDDITS = 500 // 0.5 seconds

interface RedditApiResponse {
  data: {
    children: Array<{
      data: {
        id: string
        title: string
        selftext: string
        score: number
        num_comments: number
        subreddit: string
        permalink: string
        created_utc: number
        all_awardings: Array<{ name: string; count: number }>
      }
    }>
  }
}

// Check if KV is available
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

// Fetch total post count from subreddit (for percentage calculation)
async function fetchSubredditTotalPosts(
  subreddit: string,
  timeframe: 'day' | 'week'
): Promise<number> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    // Fetch recent posts from subreddit (sorted by new)
    const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=100&t=${timeframe}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    clearTimeout(timeoutId)

    if (!response.ok) return 100 // Default fallback

    const data: RedditApiResponse = await response.json()
    // Use the count as a proxy for total activity (minimum 100)
    return Math.max(100, data.data.children.length)
  } catch {
    return 100 // Default fallback
  }
}

// Fetch posts from a single subreddit
async function fetchSubredditPosts(
  subreddit: string,
  symbol: string,
  timeframe: 'day' | 'week'
): Promise<RedditPost[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${symbol}&sort=new&t=${timeframe}&limit=100&restrict_sr=on`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[Reddit API] ${subreddit} returned ${response.status}`)
      return []
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      console.error(`[Reddit API] ${subreddit} returned non-JSON response`)
      return []
    }

    const data: RedditApiResponse = await response.json()

    // Filter posts that actually mention the symbol (case-insensitive)
    const symbolRegex = new RegExp(`\\b${symbol}\\b`, 'i')

    return data.data.children
      .filter(post =>
        symbolRegex.test(post.data.title) ||
        symbolRegex.test(post.data.selftext)
      )
      .map(post => ({
        id: post.data.id,
        title: post.data.title,
        score: post.data.score,
        num_comments: post.data.num_comments,
        subreddit: post.data.subreddit,
        permalink: post.data.permalink,
        created_utc: post.data.created_utc,
        selftext: post.data.selftext?.slice(0, 200),
      }))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Reddit API] ${subreddit} request timed out`)
    } else {
      console.error(`[Reddit API] ${subreddit} error:`, error)
    }
    return []
  }
}

// Calculate overall sentiment based on sentiment breakdown
function determineSentiment(
  bullishCount: number,
  bearishCount: number,
  neutralCount: number
): 'bullish' | 'bearish' | 'neutral' {
  const total = bullishCount + bearishCount + neutralCount
  if (total === 0) return 'neutral'

  const bullishPct = (bullishCount / total) * 100
  const bearishPct = (bearishCount / total) * 100

  // More than 50% bullish = bullish
  if (bullishPct > 50) return 'bullish'
  // More than 50% bearish = bearish
  if (bearishPct > 50) return 'bearish'
  // Otherwise neutral
  return 'neutral'
}

// Calculate Reddit Score (0-100) - Hybrid approach combining percentage and engagement
function calculateRedditScore(
  subredditData: Array<{
    subreddit: string
    mentionCount: number
    totalPosts: number
    bullishCount: number
    bearishCount: number
    neutralCount: number
    totalUpvotes: number
    totalComments: number
  }>
): number {
  if (subredditData.length === 0) return 0

  let weightedScore = 0
  let totalWeight = 0

  for (const sub of subredditData) {
    const weight = SUBREDDIT_WEIGHTS[sub.subreddit] || 0.5

    // 1. Percentage Score (0-50 points): Based on mention percentage
    const mentionPercentage = (sub.mentionCount / sub.totalPosts) * 100
    const percentageScore = Math.min(50, mentionPercentage * 5) // Scale up percentage

    // 2. Engagement Score (0-50 points): Based on upvotes and comments
    const avgUpvotes = sub.mentionCount > 0 ? sub.totalUpvotes / sub.mentionCount : 0
    const avgComments = sub.mentionCount > 0 ? sub.totalComments / sub.mentionCount : 0

    // Score engagement: high upvotes/comments mean quality discussion
    const upvoteScore = Math.min(30, avgUpvotes / 10) // 300+ avg upvotes = max 30 points
    const commentScore = Math.min(20, avgComments / 5) // 100+ avg comments = max 20 points
    const engagementScore = upvoteScore + commentScore

    // 3. Sentiment Multiplier (0.5x to 1.5x): Adjusts final score based on bullish/bearish ratio
    const sentimentMultiplier = sub.mentionCount > 0
      ? Math.min(1.5, Math.max(0.5,
          (sub.bullishCount * 1.5 - sub.bearishCount * 0.5 + sub.neutralCount) / sub.mentionCount
        ))
      : 1.0

    // Combine: 60% percentage + 40% engagement, then apply sentiment
    const subScore = ((percentageScore * 0.6) + (engagementScore * 0.4)) * sentimentMultiplier

    weightedScore += subScore * weight
    totalWeight += weight
  }

  // Normalize to 0-100
  const normalizedScore = totalWeight > 0 ? (weightedScore / totalWeight) : 0
  return Math.min(100, Math.round(normalizedScore))
}

// Process posts for a specific period
async function processForPeriod(
  symbol: string,
  timeframe: 'day' | 'week'
): Promise<RedditSentimentData> {
  const allPosts: RedditPost[] = []
  const subredditBreakdown: SubredditSentiment[] = []
  const scoreCalculationData: Array<{
    subreddit: string
    mentionCount: number
    totalPosts: number
    bullishCount: number
    bearishCount: number
    neutralCount: number
    totalUpvotes: number
    totalComments: number
  }> = []

  let totalBullish = 0
  let totalBearish = 0
  let totalNeutral = 0

  // Fetch from each subreddit with delays
  for (const subreddit of SUBREDDITS) {
    const posts = await fetchSubredditPosts(subreddit, symbol, timeframe)
    const totalPosts = await fetchSubredditTotalPosts(subreddit, timeframe)

    allPosts.push(...posts)

    // Categorize posts by sentiment
    let bullishCount = 0
    let bearishCount = 0
    let neutralCount = 0

    for (const post of posts) {
      const sentiment = analyzePostSentiment(post)
      if (sentiment === 'bullish') bullishCount++
      else if (sentiment === 'bearish') bearishCount++
      else neutralCount++
    }

    totalBullish += bullishCount
    totalBearish += bearishCount
    totalNeutral += neutralCount

    const totalAwards = 0 // Reddit JSON endpoint doesn't always include awards reliably

    const subSentiment: SubredditSentiment = {
      subreddit,
      mentionCount: posts.length,
      totalUpvotes: posts.reduce((sum, p) => sum + p.score, 0),
      totalComments: posts.reduce((sum, p) => sum + p.num_comments, 0),
      totalAwards,
      sentimentScore: posts.length > 0
        ? Math.round(posts.reduce((sum, p) => sum + p.score, 0) / posts.length)
        : 0,
      topPost: posts.length > 0
        ? {
            title: posts.sort((a, b) => b.score - a.score)[0].title,
            score: posts.sort((a, b) => b.score - a.score)[0].score,
            permalink: posts.sort((a, b) => b.score - a.score)[0].permalink,
          }
        : null,
    }

    subredditBreakdown.push(subSentiment)

    // Store data for score calculation
    scoreCalculationData.push({
      subreddit,
      mentionCount: posts.length,
      totalPosts,
      bullishCount,
      bearishCount,
      neutralCount,
      totalUpvotes: posts.reduce((sum, p) => sum + p.score, 0),
      totalComments: posts.reduce((sum, p) => sum + p.num_comments, 0),
    })

    // Delay between subreddit requests
    if (SUBREDDITS.indexOf(subreddit) < SUBREDDITS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SUBREDDITS))
    }
  }

  // Sort all posts by score for top posts, prioritize bullish posts
  const postsWithSentiment = allPosts.map(post => ({
    post,
    sentiment: analyzePostSentiment(post),
  }))

  const topPosts = postsWithSentiment
    .sort((a, b) => {
      // Prioritize bullish posts, then by score
      if (a.sentiment === 'bullish' && b.sentiment !== 'bullish') return -1
      if (a.sentiment !== 'bullish' && b.sentiment === 'bullish') return 1
      return b.post.score - a.post.score
    })
    .slice(0, 5)
    .map(item => item.post)

  const redditScore = calculateRedditScore(scoreCalculationData)
  const sentiment = determineSentiment(totalBullish, totalBearish, totalNeutral)

  return {
    symbol,
    period: timeframe === 'day' ? '24h' : '7d',
    redditScore,
    scoreChange: null, // Will be calculated by comparing with previous data
    sentiment,
    totalMentions: allPosts.length,
    totalUpvotes: allPosts.reduce((sum, p) => sum + p.score, 0),
    totalComments: allPosts.reduce((sum, p) => sum + p.num_comments, 0),
    totalAwards: 0,
    subredditBreakdown,
    topPosts,
    trendingRank: null,
    fetchedAt: Date.now(),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const upperSymbol = symbol.toUpperCase()
    const cacheKey = `reddit:sentiment:${upperSymbol}`

    // Check cache first
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<CachedRedditData>(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_SECONDS * 1000) {
          return NextResponse.json({
            data24h: cached.data24h,
            data7d: cached.data7d,
            source: 'cache',
            cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
          })
        }
      } catch (kvError) {
        console.error('[Reddit API] KV cache read error:', kvError)
      }
    }

    // Check memory cache fallback
    const memoryCached = memoryCache.get(cacheKey)
    if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TTL) {
      return NextResponse.json({
        data24h: memoryCached.data.data24h,
        data7d: memoryCached.data.data7d,
        source: 'memory-cache',
        cacheAge: Math.round((Date.now() - memoryCached.timestamp) / 1000),
      })
    }

    // Fetch fresh data
    console.log(`[Reddit API] Fetching data for ${upperSymbol}`)

    const [data24h, data7d] = await Promise.all([
      processForPeriod(upperSymbol, 'day'),
      processForPeriod(upperSymbol, 'week'),
    ])

    const cacheData: CachedRedditData = {
      data24h,
      data7d,
      timestamp: Date.now(),
    }

    // Save to KV cache
    if (isKVAvailable()) {
      try {
        await kv.set(cacheKey, cacheData, { ex: STALE_TTL_SECONDS })
      } catch (kvError) {
        console.error('[Reddit API] KV cache write error:', kvError)
      }
    }

    // Save to memory cache
    memoryCache.set(cacheKey, { data: cacheData, timestamp: Date.now() })

    return NextResponse.json({
      data24h,
      data7d,
      source: 'reddit',
      fetchedAt: Date.now(),
    })

  } catch (error) {
    console.error('[Reddit API] Error:', error)

    // Try to return stale cache on error
    const { symbol } = await params
    const upperSymbol = symbol.toUpperCase()
    const cacheKey = `reddit:sentiment:${upperSymbol}`

    if (isKVAvailable()) {
      try {
        const staleCache = await kv.get<CachedRedditData>(cacheKey)
        if (staleCache) {
          return NextResponse.json({
            data24h: staleCache.data24h,
            data7d: staleCache.data7d,
            source: 'stale-cache',
            error: 'Using cached data due to error',
            cacheAge: Math.round((Date.now() - staleCache.timestamp) / 1000),
          })
        }
      } catch {
        // Ignore cache errors
      }
    }

    // Return empty response
    const emptyData: RedditSentimentData = {
      symbol: symbol.toUpperCase(),
      period: '24h',
      redditScore: 0,
      scoreChange: null,
      sentiment: 'neutral',
      totalMentions: 0,
      totalUpvotes: 0,
      totalComments: 0,
      totalAwards: 0,
      subredditBreakdown: [],
      topPosts: [],
      trendingRank: null,
      fetchedAt: Date.now(),
    }

    return NextResponse.json({
      data24h: emptyData,
      data7d: { ...emptyData, period: '7d' },
      source: 'fallback',
      error: 'Failed to fetch Reddit data',
    })
  }
}
