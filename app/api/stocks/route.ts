import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache configuration
const CACHE_KEY = 'stocks:sp500'
const CACHE_TTL_SECONDS = 600 // 10 minutes (longer cache for more stocks)

// S&P 500 Top 200 stocks by market cap (for heatmap)
const SP500_SYMBOLS = [
  // Mega cap (>$500B)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ',
  'JPM', 'V', 'XOM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'LLY',
  // Large cap ($100B-$500B)
  'PEP', 'KO', 'COST', 'BAC', 'PFE', 'WMT', 'TMO', 'CSCO', 'MCD', 'DIS',
  'ABT', 'ACN', 'DHR', 'VZ', 'ADBE', 'NKE', 'CMCSA', 'TXN', 'NEE', 'PM',
  'WFC', 'BMY', 'COP', 'RTX', 'UNP', 'MS', 'UPS', 'ORCL', 'HON', 'INTC',
  'IBM', 'LOW', 'QCOM', 'GE', 'CAT', 'AMGN', 'BA', 'SPGI', 'GS', 'ELV',
  'SBUX', 'DE', 'INTU', 'BLK', 'ISRG', 'GILD', 'AXP', 'MDLZ', 'ADI', 'SYK',
  'TJX', 'BKNG', 'REGN', 'ADP', 'VRTX', 'CVS', 'MMC', 'LMT', 'C', 'TMUS',
  'AMT', 'SCHW', 'CI', 'MO', 'EOG', 'ZTS', 'SO', 'PLD', 'DUK', 'EQIX',
  'BDX', 'SLB', 'NOC', 'CB', 'BSX', 'AON', 'ITW', 'CL', 'CME', 'NFLX',
  // Additional top 100
  'USB', 'FI', 'PNC', 'TGT', 'COIN', 'SHW', 'MCO', 'CCI', 'HCA', 'GM',
  'AIG', 'PYPL', 'BK', 'PGR', 'DG', 'PSA', 'CL', 'ETN', 'MCK', 'ICE',
  'COF', 'ECL', 'WM', 'EMR', 'NSC', 'MMM', 'AJG', 'WELL', 'O', 'TT',
  'CARR', 'GD', 'APD', 'SRE', 'AEP', 'CSX', 'F', 'KLAC', 'LRCX', 'AMAT',
  'PANW', 'CRWD', 'FTNT', 'MRVL', 'ADSK', 'PAYX', 'ROST', 'ODFL', 'CTAS', 'ORLY',
  // Tech & Growth
  'AVGO', 'ASML', 'AMD', 'CRM', 'NOW', 'SNOW', 'DDOG', 'NET', 'ZS', 'WDAY',
  'SHOP', 'SQ', 'TEAM', 'DOCU', 'ZM', 'UBER', 'LYFT', 'ABNB', 'DASH', 'RIVN',
  // Healthcare
  'MRNA', 'BIIB', 'ILMN', 'ALGN', 'IDXX', 'DXCM', 'ZBH', 'HOLX', 'BAX', 'BDX',
  // Consumer
  'NKE', 'LULU', 'DECK', 'DPZ', 'YUM', 'CMG', 'SBUX', 'MCD', 'QSR', 'WEN',
  // Finance
  'GS', 'MS', 'JPM', 'BAC', 'C', 'WFC', 'USB', 'PNC', 'TFC', 'BK',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'HAL'
]

// Stock metadata for names and sectors
const STOCK_METADATA: Record<string, { name: string; sector: string; industry: string }> = {
  'AAPL': { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  'GOOGL': { name: 'Alphabet Inc.', sector: 'Communication Services', industry: 'Internet Services' },
  'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  'META': { name: 'Meta Platforms Inc.', sector: 'Communication Services', industry: 'Social Media' },
  'TSLA': { name: 'Tesla Inc.', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  'BRK.B': { name: 'Berkshire Hathaway Inc.', sector: 'Financials', industry: 'Insurance' },
  'UNH': { name: 'UnitedHealth Group Inc.', sector: 'Healthcare', industry: 'Health Insurance' },
  'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Financials', industry: 'Banks' },
  'V': { name: 'Visa Inc.', sector: 'Financials', industry: 'Credit Services' },
  'XOM': { name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  'PG': { name: 'Procter & Gamble Co.', sector: 'Consumer Staples', industry: 'Household Products' },
  'MA': { name: 'Mastercard Inc.', sector: 'Financials', industry: 'Credit Services' },
  'HD': { name: 'The Home Depot Inc.', sector: 'Consumer Discretionary', industry: 'Home Improvement' },
  'CVX': { name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  'MRK': { name: 'Merck & Co. Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'ABBV': { name: 'AbbVie Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'LLY': { name: 'Eli Lilly and Company', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'PEP': { name: 'PepsiCo Inc.', sector: 'Consumer Staples', industry: 'Beverages' },
  'KO': { name: 'The Coca-Cola Company', sector: 'Consumer Staples', industry: 'Beverages' },
  'COST': { name: 'Costco Wholesale Corp.', sector: 'Consumer Staples', industry: 'Retail' },
  'BAC': { name: 'Bank of America Corp.', sector: 'Financials', industry: 'Banks' },
  'PFE': { name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'WMT': { name: 'Walmart Inc.', sector: 'Consumer Staples', industry: 'Retail' },
  'TMO': { name: 'Thermo Fisher Scientific', sector: 'Healthcare', industry: 'Life Sciences' },
  'CSCO': { name: 'Cisco Systems Inc.', sector: 'Technology', industry: 'Networking' },
  'MCD': { name: "McDonald's Corporation", sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'DIS': { name: 'The Walt Disney Company', sector: 'Communication Services', industry: 'Entertainment' },
  'ABT': { name: 'Abbott Laboratories', sector: 'Healthcare', industry: 'Medical Devices' },
  'ACN': { name: 'Accenture plc', sector: 'Technology', industry: 'IT Services' },
  'DHR': { name: 'Danaher Corporation', sector: 'Healthcare', industry: 'Life Sciences' },
  'VZ': { name: 'Verizon Communications', sector: 'Communication Services', industry: 'Telecom' },
  'ADBE': { name: 'Adobe Inc.', sector: 'Technology', industry: 'Software' },
  'NKE': { name: 'NIKE Inc.', sector: 'Consumer Discretionary', industry: 'Apparel' },
  'CMCSA': { name: 'Comcast Corporation', sector: 'Communication Services', industry: 'Media' },
  'TXN': { name: 'Texas Instruments', sector: 'Technology', industry: 'Semiconductors' },
  'NEE': { name: 'NextEra Energy Inc.', sector: 'Utilities', industry: 'Utilities' },
  'PM': { name: 'Philip Morris International', sector: 'Consumer Staples', industry: 'Tobacco' },
  'WFC': { name: 'Wells Fargo & Company', sector: 'Financials', industry: 'Banks' },
  'BMY': { name: 'Bristol-Myers Squibb', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'COP': { name: 'ConocoPhillips', sector: 'Energy', industry: 'Oil & Gas' },
  'RTX': { name: 'RTX Corporation', sector: 'Industrials', industry: 'Aerospace' },
  'UNP': { name: 'Union Pacific Corporation', sector: 'Industrials', industry: 'Railroads' },
  'MS': { name: 'Morgan Stanley', sector: 'Financials', industry: 'Investment Banking' },
  'UPS': { name: 'United Parcel Service', sector: 'Industrials', industry: 'Logistics' },
  'ORCL': { name: 'Oracle Corporation', sector: 'Technology', industry: 'Software' },
  'HON': { name: 'Honeywell International', sector: 'Industrials', industry: 'Aerospace' },
  'INTC': { name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
  'IBM': { name: 'IBM Corporation', sector: 'Technology', industry: 'IT Services' },
  'LOW': { name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary', industry: 'Home Improvement' },
  'QCOM': { name: 'Qualcomm Inc.', sector: 'Technology', industry: 'Semiconductors' },
  'GE': { name: 'General Electric', sector: 'Industrials', industry: 'Aerospace' },
  'CAT': { name: 'Caterpillar Inc.', sector: 'Industrials', industry: 'Machinery' },
  'AMGN': { name: 'Amgen Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'BA': { name: 'Boeing Company', sector: 'Industrials', industry: 'Aerospace' },
  'SPGI': { name: 'S&P Global Inc.', sector: 'Financials', industry: 'Financial Data' },
  'GS': { name: 'Goldman Sachs Group', sector: 'Financials', industry: 'Investment Banking' },
  'ELV': { name: 'Elevance Health', sector: 'Healthcare', industry: 'Health Insurance' },
  'SBUX': { name: 'Starbucks Corporation', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'DE': { name: 'Deere & Company', sector: 'Industrials', industry: 'Machinery' },
  'INTU': { name: 'Intuit Inc.', sector: 'Technology', industry: 'Software' },
  'BLK': { name: 'BlackRock Inc.', sector: 'Financials', industry: 'Asset Management' },
  'ISRG': { name: 'Intuitive Surgical', sector: 'Healthcare', industry: 'Medical Devices' },
  'GILD': { name: 'Gilead Sciences', sector: 'Healthcare', industry: 'Biotechnology' },
  'AXP': { name: 'American Express', sector: 'Financials', industry: 'Credit Services' },
  'MDLZ': { name: 'Mondelez International', sector: 'Consumer Staples', industry: 'Food Products' },
  'ADI': { name: 'Analog Devices', sector: 'Technology', industry: 'Semiconductors' },
  'SYK': { name: 'Stryker Corporation', sector: 'Healthcare', industry: 'Medical Devices' },
  'TJX': { name: 'TJX Companies', sector: 'Consumer Discretionary', industry: 'Retail' },
  'BKNG': { name: 'Booking Holdings', sector: 'Consumer Discretionary', industry: 'Travel' },
  'REGN': { name: 'Regeneron Pharmaceuticals', sector: 'Healthcare', industry: 'Biotechnology' },
  'ADP': { name: 'Automatic Data Processing', sector: 'Industrials', industry: 'Business Services' },
  'VRTX': { name: 'Vertex Pharmaceuticals', sector: 'Healthcare', industry: 'Biotechnology' },
  'CVS': { name: 'CVS Health Corporation', sector: 'Healthcare', industry: 'Healthcare Services' },
  'MMC': { name: 'Marsh & McLennan', sector: 'Financials', industry: 'Insurance' },
  'LMT': { name: 'Lockheed Martin', sector: 'Industrials', industry: 'Defense' },
  'C': { name: 'Citigroup Inc.', sector: 'Financials', industry: 'Banks' },
  'TMUS': { name: 'T-Mobile US Inc.', sector: 'Communication Services', industry: 'Telecom' },
  'AMT': { name: 'American Tower Corp.', sector: 'Real Estate', industry: 'REITs' },
  'SCHW': { name: 'Charles Schwab', sector: 'Financials', industry: 'Brokerage' },
  'CI': { name: 'Cigna Group', sector: 'Healthcare', industry: 'Health Insurance' },
  'MO': { name: 'Altria Group', sector: 'Consumer Staples', industry: 'Tobacco' },
  'EOG': { name: 'EOG Resources Inc.', sector: 'Energy', industry: 'Oil & Gas' },
  'ZTS': { name: 'Zoetis Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'SO': { name: 'Southern Company', sector: 'Utilities', industry: 'Utilities' },
  'PLD': { name: 'Prologis Inc.', sector: 'Real Estate', industry: 'REITs' },
  'DUK': { name: 'Duke Energy Corporation', sector: 'Utilities', industry: 'Utilities' },
  'EQIX': { name: 'Equinix Inc.', sector: 'Real Estate', industry: 'Data Centers' },
  'BDX': { name: 'Becton Dickinson', sector: 'Healthcare', industry: 'Medical Devices' },
  'SLB': { name: 'Schlumberger Limited', sector: 'Energy', industry: 'Oil Services' },
  'NOC': { name: 'Northrop Grumman', sector: 'Industrials', industry: 'Defense' },
  'CB': { name: 'Chubb Limited', sector: 'Financials', industry: 'Insurance' },
  'BSX': { name: 'Boston Scientific', sector: 'Healthcare', industry: 'Medical Devices' },
  'AON': { name: 'Aon plc', sector: 'Financials', industry: 'Insurance' },
  'ITW': { name: 'Illinois Tool Works', sector: 'Industrials', industry: 'Machinery' },
  'CL': { name: 'Colgate-Palmolive', sector: 'Consumer Staples', industry: 'Personal Products' },
  'CME': { name: 'CME Group', sector: 'Financials', industry: 'Exchanges' },
  'NFLX': { name: 'Netflix Inc.', sector: 'Communication Services', industry: 'Streaming' },
}

// Finnhub API types
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
    peTTM?: number
    peBasicExclExtraTTM?: number
    epsTTM?: number
    epsBasicExclExtraItemsTTM?: number
    marketCapitalization?: number
    '52WeekHigh'?: number
    '52WeekLow'?: number
    dividendYieldIndicatedAnnual?: number
  }
}

interface CachedData {
  stocks: Stock[]
  timestamp: number
}

/**
 * Fetch a single stock's quote from Finnhub
 */
async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Fetch a single stock's metrics from Finnhub
 */
async function fetchMetrics(symbol: string): Promise<FinnhubMetrics | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Build a Stock object from Finnhub data
 */
function buildStock(symbol: string, quote: FinnhubQuote, metrics: FinnhubMetrics | null): Stock | null {
  // Skip invalid data
  if (quote.c === 0 && quote.d === null) return null

  const metadata = STOCK_METADATA[symbol] || {
    name: symbol,
    sector: 'Other',
    industry: ''
  }

  const pe = metrics?.metric?.peTTM ?? metrics?.metric?.peBasicExclExtraTTM ?? null
  const eps = metrics?.metric?.epsTTM ?? metrics?.metric?.epsBasicExclExtraItemsTTM ?? null
  const marketCap = metrics?.metric?.marketCapitalization
    ? metrics.metric.marketCapitalization * 1e6
    : quote.c * 1e9
  const dividendYield = metrics?.metric?.dividendYieldIndicatedAnnual ?? null

  return {
    symbol,
    name: metadata.name,
    price: quote.c,
    change: quote.d || 0,
    changesPercentage: quote.dp || 0,
    marketCap,
    pe,
    eps,
    ebitda: null,
    dividendYield,
    sector: metadata.sector,
    industry: metadata.industry,
    exchange: 'US',
    volume: 0,
    avgVolume: 0,
    dayHigh: quote.h,
    dayLow: quote.l,
    yearHigh: metrics?.metric?.['52WeekHigh'] ?? quote.h * 1.1,
    yearLow: metrics?.metric?.['52WeekLow'] ?? quote.l * 0.9,
    logo: `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`,
  }
}

/**
 * Fetch all S&P 500 stocks in parallel batches
 */
async function fetchAllStocks(): Promise<Stock[]> {
  const stocks: Stock[] = []
  const batchSize = 30 // Fetch 30 stocks at a time (within rate limit)

  console.log(`[API] Fetching ${SP500_SYMBOLS.length} S&P 500 stocks...`)

  for (let i = 0; i < SP500_SYMBOLS.length; i += batchSize) {
    const batch = SP500_SYMBOLS.slice(i, i + batchSize)

    // Fetch quotes and metrics in parallel for this batch
    const results = await Promise.all(
      batch.map(async (symbol) => {
        const [quote, metrics] = await Promise.all([
          fetchQuote(symbol),
          fetchMetrics(symbol)
        ])
        if (!quote) return null
        return buildStock(symbol, quote, metrics)
      })
    )

    // Add valid stocks to results
    for (const stock of results) {
      if (stock) stocks.push(stock)
    }

    console.log(`[API] Progress: ${Math.min(i + batchSize, SP500_SYMBOLS.length)}/${SP500_SYMBOLS.length}`)

    // Small delay between batches to respect rate limits
    if (i + batchSize < SP500_SYMBOLS.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log(`[API] Completed: ${stocks.length} stocks fetched successfully`)
  return stocks.sort((a, b) => b.marketCap - a.marketCap)
}

/**
 * Generate mock stocks for fallback
 */
function generateMockStocks(): Stock[] {
  return SP500_SYMBOLS.map((symbol, index) => {
    const metadata = STOCK_METADATA[symbol] || { name: symbol, sector: 'Other', industry: '' }
    const basePrice = 50 + Math.random() * 400
    const change = (Math.random() - 0.5) * 10
    const marketCap = (100 - index) * 30e9 + Math.random() * 50e9

    return {
      symbol,
      name: metadata.name,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changesPercentage: parseFloat((change / basePrice * 100).toFixed(2)),
      marketCap: Math.floor(marketCap),
      pe: 15 + Math.random() * 30,
      eps: basePrice / (15 + Math.random() * 30),
      ebitda: null,
      dividendYield: Math.random() > 0.3 ? Math.random() * 3 : null,
      sector: metadata.sector,
      industry: metadata.industry,
      exchange: 'US',
      volume: Math.floor(10e6 + Math.random() * 50e6),
      avgVolume: Math.floor(10e6 + Math.random() * 50e6),
      dayHigh: parseFloat((basePrice * 1.02).toFixed(2)),
      dayLow: parseFloat((basePrice * 0.98).toFixed(2)),
      yearHigh: parseFloat((basePrice * 1.25).toFixed(2)),
      yearLow: parseFloat((basePrice * 0.75).toFixed(2)),
      logo: `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${symbol}.png`,
    }
  }).sort((a, b) => b.marketCap - a.marketCap)
}

/**
 * Check if Vercel KV is available
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * GET /api/stocks
 * Returns S&P 100 stock data with Vercel KV caching (5-min TTL)
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Try to get cached data from Vercel KV (if available)
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<CachedData>(CACHE_KEY)

        if (cached && cached.stocks && cached.stocks.length > 0) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[API] Cache hit - ${cached.stocks.length} stocks, age: ${cacheAge}s`)

          return NextResponse.json({
            data: cached.stocks,
            source: 'live',
            cached: true,
            cacheAge,
            stockCount: cached.stocks.length,
            responseTime: Date.now() - startTime,
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            }
          })
        }
      } catch (kvError) {
        console.error('[API] KV error, continuing without cache:', kvError)
      }
    }

    console.log('[API] Cache miss - fetching from Finnhub')

    // Fetch fresh data from Finnhub
    const stocks = await fetchAllStocks()

    if (stocks.length > 0) {
      // Store in Vercel KV with TTL (if available)
      if (isKVAvailable()) {
        try {
          await kv.set(CACHE_KEY, { stocks, timestamp: Date.now() }, { ex: CACHE_TTL_SECONDS })
          console.log(`[API] Cached ${stocks.length} stocks for ${CACHE_TTL_SECONDS}s`)
        } catch (kvError) {
          console.error('[API] Failed to cache in KV:', kvError)
        }
      }

      return NextResponse.json({
        data: stocks,
        source: 'live',
        cached: false,
        stockCount: stocks.length,
        responseTime: Date.now() - startTime,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        }
      })
    }

    // Fallback to mock data if Finnhub fails
    throw new Error('No stocks fetched from Finnhub')

  } catch (error) {
    console.error('[API] Error:', error)

    // Return mock data as fallback
    const mockStocks = generateMockStocks()

    return NextResponse.json({
      data: mockStocks,
      source: 'mock',
      cached: false,
      stockCount: mockStocks.length,
      responseTime: Date.now() - startTime,
      error: 'Using demo data - live data unavailable',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  }
}

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic'

// ISR revalidation every 5 minutes (for edge caching)
export const revalidate = 300
