import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

// Top stocks to pre-fetch
const TOP_SYMBOLS = [
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'JPM',
  'PLTR', 'GME', 'AMC', 'SPY', 'QQQ', 'COIN', 'SOFI', 'NIO', 'RIVN', 'LCID',
  'INTC', 'BA', 'DIS', 'V', 'MA', 'PYPL', 'SQ', 'SHOP', 'ROKU', 'UBER',
  'CRM', 'ORCL', 'SNOW', 'NOW', 'ADBE', 'AVGO', 'MU', 'QCOM', 'ARM', 'SMCI',
]

const BATCH_SIZE = 5
const DELAY_BETWEEN_BATCHES = 3000 // 3 seconds

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('[Reddit Cron] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[Reddit Cron] Starting Reddit data refresh')

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL || 'http://localhost:3000'

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  // Process in batches
  for (let i = 0; i < TOP_SYMBOLS.length; i += BATCH_SIZE) {
    const batch = TOP_SYMBOLS.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(TOP_SYMBOLS.length / BATCH_SIZE)

    console.log(`[Reddit Cron] Processing batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`)

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (symbol) => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

          const response = await fetch(`${baseUrl}/api/reddit-sentiment/${symbol}`, {
            signal: controller.signal,
            cache: 'no-store',
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            return { symbol, success: true }
          } else {
            return { symbol, success: false, error: `HTTP ${response.status}` }
          }
        } catch (error) {
          return {
            symbol,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })
    )

    // Count results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successCount++
        } else {
          errorCount++
          errors.push(`${result.value.symbol}: ${result.value.error}`)
        }
      } else {
        errorCount++
        errors.push(`Unknown error: ${result.reason}`)
      }
    }

    // Delay between batches (except for last batch)
    if (i + BATCH_SIZE < TOP_SYMBOLS.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
    }
  }

  // Also refresh the trending endpoint
  try {
    console.log('[Reddit Cron] Refreshing trending data')
    await fetch(`${baseUrl}/api/reddit-trending`, { cache: 'no-store' })
  } catch (error) {
    console.error('[Reddit Cron] Failed to refresh trending:', error)
  }

  const duration = Math.round((Date.now() - startTime) / 1000)

  console.log(`[Reddit Cron] Completed in ${duration}s - Success: ${successCount}, Errors: ${errorCount}`)

  return NextResponse.json({
    message: 'Reddit data refresh completed',
    stats: {
      total: TOP_SYMBOLS.length,
      success: successCount,
      errors: errorCount,
      duration: `${duration}s`,
    },
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error details
  })
}
