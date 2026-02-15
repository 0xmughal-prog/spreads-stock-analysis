import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// Cache configuration
const CACHE_KEY = 'stocks:heatmap:global'
const CACHE_TTL_SECONDS = 600 // 10 minutes

// Yahoo Finance Quote API
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote'

// Stock lists by region
const STOCK_LISTS = {
  // US - S&P 500 Top 100 by Market Cap
  US: [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ',
    'JPM', 'V', 'XOM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'LLY',
    'PEP', 'KO', 'COST', 'BAC', 'PFE', 'WMT', 'TMO', 'CSCO', 'MCD', 'DIS',
    'ABT', 'ACN', 'DHR', 'VZ', 'ADBE', 'NKE', 'CMCSA', 'TXN', 'NEE', 'PM',
    'WFC', 'BMY', 'COP', 'RTX', 'UNP', 'MS', 'UPS', 'ORCL', 'HON', 'INTC',
    'IBM', 'LOW', 'QCOM', 'GE', 'CAT', 'AMGN', 'BA', 'SPGI', 'GS', 'ELV',
    'SBUX', 'DE', 'INTU', 'BLK', 'ISRG', 'GILD', 'AXP', 'MDLZ', 'ADI', 'SYK',
    'TJX', 'BKNG', 'REGN', 'ADP', 'VRTX', 'CVS', 'MMC', 'LMT', 'C', 'TMUS',
    'AMT', 'SCHW', 'CI', 'MO', 'EOG', 'ZTS', 'SO', 'PLD', 'DUK', 'EQIX',
    'BDX', 'SLB', 'NOC', 'CB', 'BSX', 'AON', 'ITW', 'CL', 'CME', 'NFLX'
  ],

  // NASDAQ-100 Additional (not in above)
  NASDAQ: [
    'AVGO', 'ASML', 'SHOP', 'AMD', 'PANW', 'AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS',
    'MRVL', 'CRWD', 'FTNT', 'WDAY', 'DXCM', 'TEAM', 'ZS', 'MNST', 'ABNB', 'DASH'
  ],

  // UK - FTSE 100 Top 50
  UK: [
    'SHEL.L', 'AZN.L', 'HSBA.L', 'ULVR.L', 'DGE.L', 'BP.L', 'GSK.L', 'RIO.L', 'NG.L', 'REL.L',
    'LSEG.L', 'BARC.L', 'VOD.L', 'LLOY.L', 'PRU.L', 'BT-A.L', 'AAL.L', 'GLEN.L', 'BA.L', 'IMB.L',
    'III.L', 'AV.L', 'CRH.L', 'EXPN.L', 'RR.L', 'TSCO.L', 'NWG.L', 'WPP.L', 'INF.L', 'SMDS.L',
    'FERG.L', 'LGEN.L', 'ANTO.L', 'JD.L', 'OCDO.L', 'BDEV.L', 'SSE.L', 'SBRY.L', 'RKT.L', 'BKG.L'
  ],

  // Hong Kong - Hang Seng Top 30
  HK: [
    '0700.HK', '9988.HK', '0005.HK', '0941.HK', '0388.HK', '1299.HK', '0939.HK', '2318.HK', '1398.HK', '0011.HK',
    '1810.HK', '0001.HK', '2382.HK', '0016.HK', '0003.HK', '0688.HK', '0883.HK', '2020.HK', '0175.HK', '0002.HK',
    '1113.HK', '0027.HK', '1109.HK', '0012.HK', '0066.HK', '2269.HK', '0006.HK', '0823.HK', '0017.HK', '0386.HK'
  ],

  // China - Shanghai & Shenzhen Top 30
  CN: [
    '600519.SS', '600036.SS', '601318.SS', '600276.SS', '600887.SS', '600900.SS', '601288.SS', '601166.SS', '601398.SS', '600028.SS',
    '000858.SZ', '000333.SZ', '000002.SZ', '000651.SZ', '000001.SZ', '002594.SZ', '300750.SZ', '002475.SZ', '000568.SZ', '002714.SZ',
    '600009.SS', '600030.SS', '601888.SS', '600196.SS', '600050.SS', '601328.SS', '600000.SS', '601988.SS', '600104.SS', '600585.SS'
  ],

  // Japan - Nikkei Top 30
  JP: [
    '7203.T', '6758.T', '9984.T', '6861.T', '9432.T', '8306.T', '6098.T', '9433.T', '8035.T', '7267.T',
    '4063.T', '4568.T', '6367.T', '4502.T', '6981.T', '6762.T', '8031.T', '4543.T', '9020.T', '6954.T',
    '4503.T', '6752.T', '8058.T', '7974.T', '8001.T', '5108.T', '6902.T', '6301.T', '8411.T', '4519.T'
  ],

  // Singapore - STI Top 20
  SG: [
    'D05.SI', 'O39.SI', 'U11.SI', 'C31.SI', 'Z74.SI', 'C38U.SI', 'G13.SI', 'C52.SI', 'N2IU.SI', 'BN4.SI',
    'C09.SI', 'Y92.SI', 'U96.SI', 'V03.SI', 'A17U.SI', 'ME8U.SI', 'S58.SI', 'C07.SI', 'F34.SI', 'M44U.SI'
  ],

  // South Korea - KOSPI Top 20
  KR: [
    '005930.KS', '000660.KS', '035420.KS', '005380.KS', '051910.KS', '006400.KS', '035720.KS', '005490.KS', '068270.KS', '207940.KS',
    '003670.KS', '012330.KS', '028260.KS', '066570.KS', '017670.KS', '033780.KS', '034020.KS', '034220.KS', '009150.KS', '018260.KS'
  ],

  // India - NIFTY Top 20
  IN: [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS', 'ICICIBANK.NS', 'BHARTIARTL.NS', 'SBIN.NS', 'ITC.NS', 'BAJFINANCE.NS',
    'LT.NS', 'KOTAKBANK.NS', 'ASIANPAINT.NS', 'HCLTECH.NS', 'AXISBANK.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'ULTRACEMCO.NS', 'NESTLEIND.NS'
  ]
}

// Region metadata
const REGION_INFO: Record<string, { name: string; flag: string; exchange: string }> = {
  US: { name: 'United States', flag: '🇺🇸', exchange: 'NASDAQ/NYSE' },
  NASDAQ: { name: 'NASDAQ', flag: '🇺🇸', exchange: 'NASDAQ' },
  UK: { name: 'United Kingdom', flag: '🇬🇧', exchange: 'LSE' },
  HK: { name: 'Hong Kong', flag: '🇭🇰', exchange: 'HKEX' },
  CN: { name: 'China', flag: '🇨🇳', exchange: 'SSE/SZSE' },
  JP: { name: 'Japan', flag: '🇯🇵', exchange: 'TSE' },
  SG: { name: 'Singapore', flag: '🇸🇬', exchange: 'SGX' },
  KR: { name: 'South Korea', flag: '🇰🇷', exchange: 'KRX' },
  IN: { name: 'India', flag: '🇮🇳', exchange: 'NSE' }
}

interface HeatmapStock {
  symbol: string
  name: string
  price: number
  change: number
  changesPercentage: number
  marketCap: number
  sector: string
  industry: string
  region: string
  exchange: string
  logo?: string
}

interface YahooQuoteResult {
  symbol: string
  shortName?: string
  longName?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  marketCap?: number
  sector?: string
  industry?: string
  quoteType?: string
  exchange?: string
}

/**
 * Fetch quotes from Yahoo Finance in bulk
 */
async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuoteResult[]> {
  try {
    const symbolsParam = symbols.join(',')
    const url = `${YAHOO_QUOTE_URL}?symbols=${symbolsParam}&fields=symbol,shortName,longName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap,sector,industry,quoteType,exchange`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      console.error('[Yahoo] API error:', response.status)
      return []
    }

    const data = await response.json()
    return data?.quoteResponse?.result || []
  } catch (error) {
    console.error('[Yahoo] Fetch error:', error)
    return []
  }
}

/**
 * Get company logo URL using Clearbit Logo API
 */
function getLogoUrl(symbol: string, name: string): string {
  // Remove exchange suffix for logo lookup
  const cleanSymbol = symbol.split('.')[0]

  // Known domains for major companies
  const domainMap: Record<string, string> = {
    'AAPL': 'apple.com',
    'MSFT': 'microsoft.com',
    'GOOGL': 'google.com',
    'AMZN': 'amazon.com',
    'NVDA': 'nvidia.com',
    'META': 'meta.com',
    'TSLA': 'tesla.com',
    'NFLX': 'netflix.com',
    'HSBA': 'hsbc.com',
    'BP': 'bp.com',
    'SHEL': 'shell.com',
    '0700': 'tencent.com',
    '9988': 'alibaba.com',
    '7203': 'toyota.com',
    '005930': 'samsung.com',
  }

  // Try to get domain from map or derive from company name
  let domain = domainMap[cleanSymbol]

  if (!domain && name) {
    // Simple heuristic: take first word of company name + .com
    const firstName = name.split(' ')[0].toLowerCase()
    domain = `${firstName}.com`
  }

  // Use Clearbit Logo API
  return domain ? `https://logo.clearbit.com/${domain}` : ''
}

/**
 * Convert Yahoo quote to HeatmapStock format
 */
function convertToHeatmapStock(quote: YahooQuoteResult, region: string): HeatmapStock | null {
  // Skip invalid quotes
  if (!quote.regularMarketPrice || quote.regularMarketPrice === 0) {
    return null
  }

  const name = quote.longName || quote.shortName || quote.symbol
  const regionInfo = REGION_INFO[region] || { name: region, flag: '', exchange: '' }

  return {
    symbol: quote.symbol,
    name,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange || 0,
    changesPercentage: quote.regularMarketChangePercent || 0,
    marketCap: quote.marketCap || 0,
    sector: quote.sector || 'Other',
    industry: quote.industry || '',
    region: regionInfo.name,
    exchange: quote.exchange || regionInfo.exchange,
    logo: getLogoUrl(quote.symbol, name),
  }
}

/**
 * Fetch all stocks across all regions
 */
async function fetchAllHeatmapStocks(): Promise<HeatmapStock[]> {
  const allStocks: HeatmapStock[] = []
  const batchSize = 100 // Yahoo supports up to 100+ symbols per request

  console.log('[Heatmap] Fetching global stocks...')

  // Process each region
  for (const [region, symbols] of Object.entries(STOCK_LISTS)) {
    console.log(`[Heatmap] Fetching ${region}: ${symbols.length} stocks`)

    // Batch requests
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      const quotes = await fetchYahooQuotes(batch)

      // Convert quotes to heatmap stocks
      for (const quote of quotes) {
        const stock = convertToHeatmapStock(quote, region)
        if (stock) {
          allStocks.push(stock)
        }
      }

      // Small delay between batches to be nice to Yahoo
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`[Heatmap] ${region} completed: ${allStocks.filter(s => s.region === REGION_INFO[region].name).length} stocks`)
  }

  console.log(`[Heatmap] Total stocks fetched: ${allStocks.length}`)
  return allStocks
}

/**
 * Check if Vercel KV is available
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * GET /api/stocks/heatmap
 * Returns global stock data for heatmap visualization
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Try cache first
    if (isKVAvailable()) {
      try {
        const cached = await kv.get<{ stocks: HeatmapStock[]; timestamp: number }>(CACHE_KEY)

        if (cached && cached.stocks && cached.stocks.length > 0) {
          const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000)
          console.log(`[Heatmap] Cache hit - ${cached.stocks.length} stocks, age: ${cacheAge}s`)

          return NextResponse.json({
            data: cached.stocks,
            cached: true,
            cacheAge,
            stockCount: cached.stocks.length,
            responseTime: Date.now() - startTime,
          })
        }
      } catch (kvError) {
        console.error('[Heatmap] KV error:', kvError)
      }
    }

    console.log('[Heatmap] Cache miss - fetching fresh data')

    // Fetch fresh data
    const stocks = await fetchAllHeatmapStocks()

    if (stocks.length > 0) {
      // Cache the results
      if (isKVAvailable()) {
        try {
          await kv.set(CACHE_KEY, { stocks, timestamp: Date.now() }, { ex: CACHE_TTL_SECONDS })
          console.log(`[Heatmap] Cached ${stocks.length} stocks for ${CACHE_TTL_SECONDS}s`)
        } catch (kvError) {
          console.error('[Heatmap] Failed to cache:', kvError)
        }
      }

      return NextResponse.json({
        data: stocks,
        cached: false,
        stockCount: stocks.length,
        responseTime: Date.now() - startTime,
      })
    }

    throw new Error('No stocks fetched')

  } catch (error) {
    console.error('[Heatmap] Error:', error)

    return NextResponse.json({
      data: [],
      error: 'Failed to fetch heatmap data',
      stockCount: 0,
      responseTime: Date.now() - startTime,
    }, { status: 500 })
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Cache for 10 minutes
export const revalidate = 600
