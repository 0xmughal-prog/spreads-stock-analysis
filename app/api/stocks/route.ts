import { NextResponse } from 'next/server'
import { Stock } from '@/lib/types'

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// In-memory cache (persists across warm serverless invocations)
let stockCache: Stock[] = []
let lastFetchTime = 0
let isFetching = false
let fetchProgress = { current: 0, total: 0 }

// Cache duration: 5 minutes for fresh data, 24 hours for stale-while-revalidate
const CACHE_FRESH_MS = 5 * 60 * 1000
const CACHE_MAX_MS = 24 * 60 * 60 * 1000

// Top 700 stock symbols
const TOP_STOCK_SYMBOLS = [
  // S&P 500 Major Components
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'BRK.B', 'TSLA', 'UNH',
  'JNJ', 'JPM', 'V', 'XOM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
  'LLY', 'PEP', 'KO', 'COST', 'BAC', 'PFE', 'WMT', 'TMO', 'CSCO', 'MCD',
  'DIS', 'ABT', 'ACN', 'DHR', 'VZ', 'ADBE', 'NKE', 'CMCSA', 'TXN', 'NEE',
  'PM', 'WFC', 'BMY', 'COP', 'RTX', 'UNP', 'MS', 'UPS', 'ORCL', 'HON',
  'INTC', 'IBM', 'LOW', 'QCOM', 'GE', 'CAT', 'AMGN', 'BA', 'SPGI', 'GS',
  'ELV', 'SBUX', 'DE', 'INTU', 'BLK', 'ISRG', 'GILD', 'AXP', 'MDLZ', 'ADI',
  'SYK', 'TJX', 'BKNG', 'REGN', 'ADP', 'VRTX', 'CVS', 'MMC', 'LMT', 'C',
  'TMUS', 'AMT', 'SCHW', 'CI', 'MO', 'EOG', 'ZTS', 'SO', 'PLD', 'DUK',
  'EQIX', 'BDX', 'SLB', 'NOC', 'CB', 'BSX', 'AON', 'ITW', 'CL', 'CME',
  'LRCX', 'MU', 'ICE', 'SHW', 'PGR', 'FISV', 'MMM', 'FDX', 'PNC', 'APD',
  'WM', 'CSX', 'USB', 'MCK', 'TGT', 'MCO', 'EMR', 'NSC', 'PSA', 'ORLY',
  'CCI', 'GD', 'FCX', 'SNPS', 'CDNS', 'HCA', 'KLAC', 'APH', 'CTAS',
  'AJG', 'AZO', 'F', 'GM', 'MCHP', 'ANET', 'PCAR', 'TT', 'ADSK', 'NEM',
  'TDG', 'CARR', 'ROP', 'OXY', 'MSI', 'KMB', 'AEP', 'ECL', 'SRE', 'HUM',
  'IDXX', 'GIS', 'PAYX', 'WELL', 'MSCI', 'EW', 'ADM', 'HSY', 'MNST', 'IQV',
  'PSX', 'VLO', 'BIIB', 'A', 'DXCM', 'FAST', 'AFL', 'EXC', 'CTSH', 'YUM',
  'STZ', 'MPC', 'D', 'FTNT', 'DHI', 'CMG', 'LHX', 'AIG', 'HLT', 'PRU',
  'ALL', 'DOW', 'XEL', 'DLTR', 'BK', 'KR', 'ROST', 'O', 'EA', 'VRSK',
  'TEL', 'AME', 'ES', 'CTVA', 'WBD', 'KDP', 'OTIS', 'RMD', 'IFF', 'PEG',
  // NASDAQ 100 additions
  'NFLX', 'AMD', 'PYPL', 'ABNB', 'COIN', 'MELI', 'WDAY', 'TEAM', 'CRWD', 'ZS',
  'DDOG', 'SNOW', 'NET', 'MDB', 'PANW', 'VEEV', 'TTD', 'OKTA', 'ZM',
  'DOCU', 'ROKU', 'SQ', 'SNAP', 'PINS', 'UBER', 'LYFT', 'DASH', 'RBLX',
  'U', 'PLTR', 'PATH', 'CPNG', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'BIDU',
  'JD', 'PDD', 'BABA', 'SE', 'GRAB', 'SHOP', 'ETSY', 'W', 'CHWY', 'CVNA',
  'HOOD', 'SOFI', 'AFRM', 'UPST', 'BILL', 'HUBS', 'FIVN', 'RNG',
  // Russell 2000 sampling (mid/small caps)
  'SMCI', 'APP', 'CELH', 'DUOL', 'IOT', 'SAIA', 'ELF', 'AXON', 'TOST', 'BROS',
  'WING', 'CAVA', 'RVMD', 'CRSP', 'NTLA', 'BEAM', 'NVAX',
  'MRNA', 'SPCE', 'RKLB', 'ASTS', 'GSAT', 'IRDM',
  'IONS', 'ALNY', 'NBIX', 'SRPT', 'BMRN', 'INCY', 'JAZZ',
  'EXEL', 'HALO', 'ARVN', 'CYTK', 'ACAD',
  // Financial sector
  'TFC', 'MTB', 'KEY', 'CFG', 'RF', 'HBAN', 'ZION', 'CMA',
  'EWBC', 'FHN', 'UMBF', 'CBSH', 'PNFP', 'BOKF',
  'FFIN', 'GBCI', 'IBOC', 'WAFD', 'BANR', 'COLB', 'WSFS', 'HOPE',
  // Healthcare
  'BNTX', 'FOLD',
  'MNKD', 'AUPH',
  // Technology
  'DOCN', 'CFLT', 'ESTC',
  'DT', 'RPD', 'TENB', 'QLYS', 'CYBR', 'VRNS',
  'MANH', 'NCNO', 'CALX', 'LITE', 'VIAV', 'CIEN', 'JNPR',
  'FFIV', 'NTAP', 'PSTG', 'GNTX',
  // Industrial
  'GWW', 'FTV', 'ROK', 'PH', 'DOV', 'SWK', 'GNRC', 'XYL', 'NDSN', 'IEX',
  'KEYS', 'TDY', 'CPRT', 'J', 'LII', 'ALLE', 'AOS', 'MIDD',
  'GGG', 'ITT', 'NPO', 'CW',
  'HUBB', 'PNR', 'XPO', 'ODFL',
  // Consumer
  'LULU', 'DKS', 'ANF', 'GPS', 'AEO', 'URBN', 'RL', 'PVH',
  'COLM', 'SKX', 'CROX', 'DECK',
  'RH', 'TPX',
  'SIG', 'WSM', 'FIVE', 'OLLI', 'DG',
  // Energy
  'DVN', 'FANG', 'PXD', 'APA', 'HAL', 'BKR', 'NOV', 'OVV', 'CTRA',
  'AR', 'RRC', 'SWN', 'EQT', 'CNX', 'MTDR',
  'PTEN', 'CLB', 'OII',
  'ET', 'EPD',
  // Materials
  'NUE', 'STLD', 'CLF', 'X', 'RS', 'ATI', 'CMC',
  'SON', 'PKG', 'WRK', 'IP', 'GPK', 'SEE', 'BLL', 'CCK',
  'BERY', 'HUN', 'OLN',
  'ASH', 'EMN', 'CE', 'RPM', 'CBT',
  // Real Estate
  'AVB', 'EQR', 'ESS', 'MAA', 'UDR', 'CPT', 'INVH', 'AMH', 'SUI', 'ELS',
  'REXR', 'FR', 'STAG', 'IIPR', 'COLD', 'SBAC',
  'MPW', 'VTR', 'OHI', 'DOC', 'PEAK', 'NHI', 'LTC',
  'BRX', 'KIM', 'REG', 'FRT', 'AKR', 'ROIC',
  // Communication Services
  'MTCH', 'IAC', 'ZG', 'Z', 'YELP', 'CARG',
  'SPOT', 'LYV', 'DLB', 'SIRI',
  'NXST', 'NYT', 'WMG', 'SONO',
  'PARA', 'FOXA', 'FOX', 'NWS', 'NWSA',
  // Utilities
  'AES', 'NRG', 'VST', 'OGE', 'POR', 'BKH', 'NWE', 'OGS', 'NJR',
  'SWX', 'AVA', 'PNM', 'IDA', 'HE',
  'WTRG', 'SJW', 'AWK', 'AWR',
  // More tech/growth
  'NOW', 'CRM', 'ZEN', 'MGNI', 'PUBM',
  'APPS', 'DM', 'DDD', 'SSYS',
  'HPQ', 'DELL', 'HPE', 'WDC', 'STX',
  'ZBRA', 'GRMN', 'TER', 'LSCC', 'MPWR', 'SWKS', 'QRVO',
  'MRVL', 'ON', 'NXPI', 'WOLF', 'DIOD', 'POWI', 'COHR',
  'IPGP', 'MKSI', 'ENTG', 'UCTT', 'BRKS', 'AMAT',
  'ASML', 'ANSS', 'SITM', 'PI',
  'VSH', 'CLS', 'FLEX', 'JBL', 'SANM', 'PLXS', 'TTMI', 'CTS',
  'CRUS', 'SYNA', 'SGH', 'RMBS', 'AMKR',
  'ACMR', 'ONTO', 'NVMI', 'AEHR', 'LAZR',
  'MVIS', 'IDCC',
]

// Stock metadata for names and sectors
const STOCK_METADATA: Record<string, { name: string; sector: string; industry: string }> = {
  'AAPL': { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  'GOOGL': { name: 'Alphabet Inc.', sector: 'Communication Services', industry: 'Internet Services' },
  'GOOG': { name: 'Alphabet Inc. Class C', sector: 'Communication Services', industry: 'Internet Services' },
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
  'NFLX': { name: 'Netflix Inc.', sector: 'Communication Services', industry: 'Streaming' },
  'AMD': { name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors' },
  'INTC': { name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
  'ADBE': { name: 'Adobe Inc.', sector: 'Technology', industry: 'Software' },
  'NKE': { name: 'NIKE Inc.', sector: 'Consumer Discretionary', industry: 'Apparel' },
  'CRM': { name: 'Salesforce Inc.', sector: 'Technology', industry: 'Software' },
  'ORCL': { name: 'Oracle Corporation', sector: 'Technology', industry: 'Software' },
  'ACN': { name: 'Accenture plc', sector: 'Technology', industry: 'IT Services' },
  'IBM': { name: 'IBM Corporation', sector: 'Technology', industry: 'IT Services' },
  'QCOM': { name: 'Qualcomm Inc.', sector: 'Technology', industry: 'Semiconductors' },
  'TXN': { name: 'Texas Instruments', sector: 'Technology', industry: 'Semiconductors' },
  'NOW': { name: 'ServiceNow Inc.', sector: 'Technology', industry: 'Software' },
  'INTU': { name: 'Intuit Inc.', sector: 'Technology', industry: 'Software' },
  'SBUX': { name: 'Starbucks Corporation', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'LOW': { name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary', industry: 'Home Improvement' },
  'GS': { name: 'Goldman Sachs Group', sector: 'Financials', industry: 'Investment Banking' },
  'MS': { name: 'Morgan Stanley', sector: 'Financials', industry: 'Investment Banking' },
  'AXP': { name: 'American Express', sector: 'Financials', industry: 'Credit Services' },
  'BLK': { name: 'BlackRock Inc.', sector: 'Financials', industry: 'Asset Management' },
  'C': { name: 'Citigroup Inc.', sector: 'Financials', industry: 'Banks' },
  'WFC': { name: 'Wells Fargo & Company', sector: 'Financials', industry: 'Banks' },
  'BMY': { name: 'Bristol-Myers Squibb', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'AMGN': { name: 'Amgen Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'GILD': { name: 'Gilead Sciences', sector: 'Healthcare', industry: 'Biotechnology' },
  'DHR': { name: 'Danaher Corporation', sector: 'Healthcare', industry: 'Life Sciences' },
  'SYK': { name: 'Stryker Corporation', sector: 'Healthcare', industry: 'Medical Devices' },
  'CVS': { name: 'CVS Health Corporation', sector: 'Healthcare', industry: 'Healthcare Services' },
  'COP': { name: 'ConocoPhillips', sector: 'Energy', industry: 'Oil & Gas' },
  'SLB': { name: 'Schlumberger Limited', sector: 'Energy', industry: 'Oil Services' },
  'EOG': { name: 'EOG Resources Inc.', sector: 'Energy', industry: 'Oil & Gas' },
  'NEE': { name: 'NextEra Energy Inc.', sector: 'Utilities', industry: 'Utilities' },
  'DUK': { name: 'Duke Energy Corporation', sector: 'Utilities', industry: 'Utilities' },
  'SO': { name: 'Southern Company', sector: 'Utilities', industry: 'Utilities' },
  'D': { name: 'Dominion Energy Inc.', sector: 'Utilities', industry: 'Utilities' },
  'UNP': { name: 'Union Pacific Corporation', sector: 'Industrials', industry: 'Railroads' },
  'HON': { name: 'Honeywell International', sector: 'Industrials', industry: 'Aerospace' },
  'RTX': { name: 'RTX Corporation', sector: 'Industrials', industry: 'Aerospace' },
  'BA': { name: 'Boeing Company', sector: 'Industrials', industry: 'Aerospace' },
  'CAT': { name: 'Caterpillar Inc.', sector: 'Industrials', industry: 'Machinery' },
  'GE': { name: 'General Electric', sector: 'Industrials', industry: 'Aerospace' },
  'MMM': { name: '3M Company', sector: 'Industrials', industry: 'Diversified' },
  'LMT': { name: 'Lockheed Martin', sector: 'Industrials', industry: 'Defense' },
  'AMT': { name: 'American Tower Corp.', sector: 'Real Estate', industry: 'REITs' },
  'PLD': { name: 'Prologis Inc.', sector: 'Real Estate', industry: 'REITs' },
  'CCI': { name: 'Crown Castle Inc.', sector: 'Real Estate', industry: 'REITs' },
  'LIN': { name: 'Linde plc', sector: 'Materials', industry: 'Chemicals' },
  'APD': { name: 'Air Products', sector: 'Materials', industry: 'Chemicals' },
  'SHW': { name: 'Sherwin-Williams', sector: 'Materials', industry: 'Chemicals' },
  'FCX': { name: 'Freeport-McMoRan', sector: 'Materials', industry: 'Mining' },
  'VZ': { name: 'Verizon Communications', sector: 'Communication Services', industry: 'Telecom' },
  'CMCSA': { name: 'Comcast Corporation', sector: 'Communication Services', industry: 'Media' },
  'TMUS': { name: 'T-Mobile US Inc.', sector: 'Communication Services', industry: 'Telecom' },
  'PYPL': { name: 'PayPal Holdings Inc.', sector: 'Financials', industry: 'Payments' },
  'UBER': { name: 'Uber Technologies', sector: 'Technology', industry: 'Ride-Sharing' },
  'SQ': { name: 'Block Inc.', sector: 'Financials', industry: 'Payments' },
  'SHOP': { name: 'Shopify Inc.', sector: 'Technology', industry: 'E-Commerce' },
  'SNOW': { name: 'Snowflake Inc.', sector: 'Technology', industry: 'Cloud Computing' },
  'CRWD': { name: 'CrowdStrike Holdings', sector: 'Technology', industry: 'Cybersecurity' },
  'ZS': { name: 'Zscaler Inc.', sector: 'Technology', industry: 'Cybersecurity' },
  'DDOG': { name: 'Datadog Inc.', sector: 'Technology', industry: 'Software' },
  'NET': { name: 'Cloudflare Inc.', sector: 'Technology', industry: 'Cloud Computing' },
  'MDB': { name: 'MongoDB Inc.', sector: 'Technology', industry: 'Database' },
  'PANW': { name: 'Palo Alto Networks', sector: 'Technology', industry: 'Cybersecurity' },
  'MRNA': { name: 'Moderna Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'BNTX': { name: 'BioNTech SE', sector: 'Healthcare', industry: 'Biotechnology' },
  'ABNB': { name: 'Airbnb Inc.', sector: 'Consumer Discretionary', industry: 'Travel' },
  'COIN': { name: 'Coinbase Global', sector: 'Financials', industry: 'Cryptocurrency' },
  'RIVN': { name: 'Rivian Automotive', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  'LCID': { name: 'Lucid Group Inc.', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  'PLTR': { name: 'Palantir Technologies', sector: 'Technology', industry: 'Software' },
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

/**
 * Fetch a single stock's data from Finnhub
 */
async function fetchStockData(symbol: string): Promise<Stock | null> {
  try {
    const [quoteRes, metricsRes] = await Promise.all([
      fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
      fetch(`${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`)
    ])

    if (!quoteRes.ok || !metricsRes.ok) return null

    const quote: FinnhubQuote = await quoteRes.json()
    const metricsData: FinnhubMetrics = await metricsRes.json()

    // Skip invalid data
    if (quote.c === 0 && quote.d === null) return null

    const metadata = STOCK_METADATA[symbol] || {
      name: symbol,
      sector: 'Other',
      industry: ''
    }

    const pe = metricsData.metric?.peTTM ?? metricsData.metric?.peBasicExclExtraTTM ?? null
    const eps = metricsData.metric?.epsTTM ?? metricsData.metric?.epsBasicExclExtraItemsTTM ?? null
    const marketCap = metricsData.metric?.marketCapitalization
      ? metricsData.metric.marketCapitalization * 1e6
      : quote.c * 1e9
    const dividendYield = metricsData.metric?.dividendYieldIndicatedAnnual ?? null

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
      yearHigh: metricsData.metric?.['52WeekHigh'] ?? quote.h * 1.1,
      yearLow: metricsData.metric?.['52WeekLow'] ?? quote.l * 0.9,
    }
  } catch {
    return null
  }
}

/**
 * Fetch all stocks in batches (respects rate limits)
 */
async function fetchAllStocks(): Promise<Stock[]> {
  if (isFetching) {
    console.log('[API] Fetch already in progress, returning cached data')
    return stockCache.length > 0 ? stockCache : generateMockStocks()
  }

  isFetching = true
  const uniqueSymbols = [...new Set(TOP_STOCK_SYMBOLS)]
  const stocks: Stock[] = []
  const batchSize = 10
  const delayMs = 1100 // ~55 calls/min to stay under 60/min limit

  console.log(`[API] Starting fetch of ${uniqueSymbols.length} stocks...`)
  fetchProgress = { current: 0, total: uniqueSymbols.length }

  try {
    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize)

      // Fetch batch in parallel
      const results = await Promise.all(batch.map(fetchStockData))
      const validStocks = results.filter((s): s is Stock => s !== null)
      stocks.push(...validStocks)

      fetchProgress.current = Math.min(i + batchSize, uniqueSymbols.length)
      console.log(`[API] Progress: ${fetchProgress.current}/${fetchProgress.total} stocks`)

      // Update cache incrementally
      if (stocks.length > 0) {
        stockCache = [...stocks].sort((a, b) => b.marketCap - a.marketCap)
        lastFetchTime = Date.now()
      }

      // Rate limit delay
      if (i + batchSize < uniqueSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    console.log(`[API] Completed fetch: ${stocks.length} stocks`)
    stockCache = stocks.sort((a, b) => b.marketCap - a.marketCap)
    lastFetchTime = Date.now()
    return stockCache

  } catch (error) {
    console.error('[API] Error fetching stocks:', error)
    return stockCache.length > 0 ? stockCache : generateMockStocks()
  } finally {
    isFetching = false
  }
}

/**
 * Generate mock stocks for instant loading
 */
function generateMockStocks(): Stock[] {
  const mockStocks: Stock[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.72, change: 2.15, changesPercentage: 1.22, marketCap: 2800000000000, pe: 28.5, eps: 6.27, ebitda: 130000000000, dividendYield: 0.5, sector: 'Technology', industry: 'Consumer Electronics', exchange: 'NASDAQ', volume: 52000000, avgVolume: 58000000, dayHigh: 180.12, dayLow: 176.50, yearHigh: 199.62, yearLow: 164.08 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.91, change: 4.23, changesPercentage: 1.13, marketCap: 2810000000000, pe: 35.2, eps: 10.76, ebitda: 98000000000, dividendYield: 0.8, sector: 'Technology', industry: 'Software', exchange: 'NASDAQ', volume: 22000000, avgVolume: 25000000, dayHigh: 381.50, dayLow: 375.20, yearHigh: 390.00, yearLow: 275.00 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: 1.95, changesPercentage: 1.39, marketCap: 1780000000000, pe: 25.1, eps: 5.65, ebitda: 85000000000, dividendYield: null, sector: 'Communication Services', industry: 'Internet Services', exchange: 'NASDAQ', volume: 25000000, avgVolume: 27000000, dayHigh: 143.20, dayLow: 140.10, yearHigh: 153.78, yearLow: 102.63 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.25, change: 2.80, changesPercentage: 1.60, marketCap: 1850000000000, pe: 62.4, eps: 2.86, ebitda: 72000000000, dividendYield: null, sector: 'Consumer Discretionary', industry: 'E-Commerce', exchange: 'NASDAQ', volume: 45000000, avgVolume: 50000000, dayHigh: 180.50, dayLow: 175.80, yearHigh: 189.00, yearLow: 118.35 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 495.22, change: 12.50, changesPercentage: 2.59, marketCap: 1220000000000, pe: 65.8, eps: 7.53, ebitda: 18000000000, dividendYield: 0.04, sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', volume: 42000000, avgVolume: 48000000, dayHigh: 502.00, dayLow: 485.00, yearHigh: 505.00, yearLow: 138.84 },
    { symbol: 'META', name: 'Meta Platforms Inc.', price: 505.95, change: 8.20, changesPercentage: 1.65, marketCap: 1300000000000, pe: 32.5, eps: 15.57, ebitda: 58000000000, dividendYield: null, sector: 'Communication Services', industry: 'Social Media', exchange: 'NASDAQ', volume: 15000000, avgVolume: 18000000, dayHigh: 510.00, dayLow: 498.00, yearHigh: 531.49, yearLow: 274.38 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', price: 363.54, change: -1.20, changesPercentage: -0.33, marketCap: 790000000000, pe: 8.5, eps: 42.77, ebitda: 45000000000, dividendYield: null, sector: 'Financials', industry: 'Insurance', exchange: 'NYSE', volume: 3500000, avgVolume: 4000000, dayHigh: 366.00, dayLow: 362.00, yearHigh: 375.00, yearLow: 294.00 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 195.20, change: 1.85, changesPercentage: 0.96, marketCap: 565000000000, pe: 11.2, eps: 17.43, ebitda: null, dividendYield: 2.4, sector: 'Financials', industry: 'Banks', exchange: 'NYSE', volume: 9000000, avgVolume: 10000000, dayHigh: 197.00, dayLow: 193.50, yearHigh: 200.00, yearLow: 135.00 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: 5.30, changesPercentage: 2.18, marketCap: 790000000000, pe: 72.5, eps: 3.43, ebitda: 14000000000, dividendYield: null, sector: 'Consumer Discretionary', industry: 'Electric Vehicles', exchange: 'NASDAQ', volume: 95000000, avgVolume: 100000000, dayHigh: 252.00, dayLow: 244.00, yearHigh: 299.29, yearLow: 152.37 },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', price: 527.30, change: 3.45, changesPercentage: 0.66, marketCap: 490000000000, pe: 22.1, eps: 23.86, ebitda: 35000000000, dividendYield: 1.3, sector: 'Healthcare', industry: 'Health Insurance', exchange: 'NYSE', volume: 3200000, avgVolume: 3500000, dayHigh: 530.00, dayLow: 523.00, yearHigh: 558.10, yearLow: 445.00 },
  ]

  // Generate more mock stocks to fill 700
  const sectors = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Consumer Staples', 'Energy', 'Industrials', 'Materials', 'Utilities', 'Real Estate', 'Communication Services']
  const uniqueSymbols = [...new Set(TOP_STOCK_SYMBOLS)]

  for (const symbol of uniqueSymbols) {
    if (mockStocks.find(s => s.symbol === symbol)) continue

    const metadata = STOCK_METADATA[symbol] || {
      name: symbol,
      sector: sectors[Math.floor(Math.random() * sectors.length)],
      industry: ''
    }

    const basePrice = 20 + Math.random() * 400
    const marketCap = (5 + Math.random() * 500) * 1e9
    const change = (Math.random() - 0.5) * 10
    const pe = Math.random() > 0.15 ? 8 + Math.random() * 60 : null
    const eps = pe ? basePrice / pe : null
    const dividendYield = Math.random() > 0.4 ? Math.random() * 4 : null

    mockStocks.push({
      symbol,
      name: metadata.name,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changesPercentage: parseFloat((change / basePrice * 100).toFixed(2)),
      marketCap: Math.floor(marketCap),
      pe: pe ? parseFloat(pe.toFixed(2)) : null,
      eps: eps ? parseFloat(eps.toFixed(2)) : null,
      ebitda: null,
      dividendYield: dividendYield ? parseFloat(dividendYield.toFixed(2)) : null,
      sector: metadata.sector,
      industry: metadata.industry,
      exchange: Math.random() > 0.5 ? 'NYSE' : 'NASDAQ',
      volume: Math.floor(1000000 + Math.random() * 50000000),
      avgVolume: Math.floor(1000000 + Math.random() * 50000000),
      dayHigh: parseFloat((basePrice * 1.02).toFixed(2)),
      dayLow: parseFloat((basePrice * 0.98).toFixed(2)),
      yearHigh: parseFloat((basePrice * 1.3).toFixed(2)),
      yearLow: parseFloat((basePrice * 0.7).toFixed(2)),
    })
  }

  return mockStocks.sort((a, b) => b.marketCap - a.marketCap)
}

/**
 * GET /api/stocks
 * Returns cached stock data with stale-while-revalidate pattern
 */
export async function GET() {
  const now = Date.now()
  const cacheAge = now - lastFetchTime
  const hasFreshCache = stockCache.length > 0 && cacheAge < CACHE_FRESH_MS
  const hasStaleCache = stockCache.length > 0 && cacheAge < CACHE_MAX_MS

  // Return cached data immediately if available
  if (hasFreshCache) {
    console.log('[API] Returning fresh cache')
    return NextResponse.json({
      data: stockCache,
      source: 'live',
      cached: true,
      cacheAge: Math.round(cacheAge / 1000),
      stockCount: stockCache.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      }
    })
  }

  // Return stale cache but trigger background refresh
  if (hasStaleCache) {
    console.log('[API] Returning stale cache, triggering refresh')
    // Trigger background fetch (non-blocking)
    fetchAllStocks().catch(console.error)

    return NextResponse.json({
      data: stockCache,
      source: 'live',
      cached: true,
      stale: true,
      cacheAge: Math.round(cacheAge / 1000),
      stockCount: stockCache.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=86400',
      }
    })
  }

  // No cache - return mock data and start fetching
  console.log('[API] No cache, returning mock data and starting fetch')
  const mockData = generateMockStocks()

  // Start background fetch
  fetchAllStocks().catch(console.error)

  return NextResponse.json({
    data: mockData,
    source: 'mock',
    cached: false,
    message: 'Loading live data in background...',
    stockCount: mockData.length,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=86400',
    }
  })
}

// Vercel Edge caching
export const revalidate = 300 // Revalidate every 5 minutes
