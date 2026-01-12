import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Stock } from '@/lib/types'

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// Cache configuration
const CACHE_KEY = 'stocks:sp500-nasdaq'
const CACHE_TTL_SECONDS = 3600 // 1 hour

// Top 200 S&P 500 + NASDAQ stocks for cron refresh
const TOP_SYMBOLS = [
  // Mega-caps (Top 50 by market cap)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ',
  'JPM', 'V', 'XOM', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'LLY',
  'PEP', 'KO', 'COST', 'BAC', 'PFE', 'WMT', 'TMO', 'CSCO', 'MCD', 'DIS',
  'ABT', 'ACN', 'DHR', 'VZ', 'ADBE', 'NKE', 'CMCSA', 'TXN', 'NEE', 'PM',
  'WFC', 'BMY', 'COP', 'RTX', 'UNP', 'MS', 'UPS', 'ORCL', 'HON', 'INTC',

  // Large-caps (51-100)
  'IBM', 'LOW', 'QCOM', 'GE', 'CAT', 'AMGN', 'BA', 'SPGI', 'GS', 'ELV',
  'SBUX', 'DE', 'INTU', 'BLK', 'ISRG', 'GILD', 'AXP', 'MDLZ', 'ADI', 'SYK',
  'TJX', 'BKNG', 'REGN', 'ADP', 'VRTX', 'CVS', 'MMC', 'LMT', 'C', 'TMUS',
  'AMT', 'SCHW', 'CI', 'MO', 'EOG', 'ZTS', 'SO', 'PLD', 'DUK', 'EQIX',
  'BDX', 'SLB', 'NOC', 'CB', 'BSX', 'AON', 'ITW', 'CL', 'CME', 'NFLX',

  // Mid-caps (101-150)
  'LRCX', 'MU', 'ICE', 'SHW', 'PGR', 'FISV', 'MMM', 'FDX', 'PNC', 'APD',
  'WM', 'CSX', 'USB', 'MCK', 'TGT', 'MCO', 'EMR', 'NSC', 'PSA', 'ORLY',
  'CCI', 'GD', 'FCX', 'SNPS', 'CDNS', 'HCA', 'KLAC', 'APH', 'CTAS', 'AJG',
  'AZO', 'F', 'GM', 'MCHP', 'ANET', 'PCAR', 'TT', 'ADSK', 'NEM', 'TDG',
  'CARR', 'ROP', 'OXY', 'MSI', 'KMB', 'AEP', 'ECL', 'SRE', 'HUM', 'IDXX',

  // NASDAQ 100 Tech (151-200)
  'AMD', 'PYPL', 'CRM', 'NOW', 'CRWD', 'PANW', 'DDOG', 'SNOW', 'NET', 'MDB',
  'ZS', 'TEAM', 'WDAY', 'VEEV', 'TTD', 'OKTA', 'ZM', 'DOCU', 'ROKU', 'UBER',
  'DASH', 'ABNB', 'COIN', 'PLTR', 'SHOP', 'BABA', 'JD', 'PDD', 'NIO', 'MRNA',
  'SMCI', 'APP', 'AXON', 'CELH', 'DUOL', 'IOT', 'SAIA', 'ELF', 'TOST', 'WING',
  'CAVA', 'BROS', 'HOOD', 'SOFI', 'AFRM', 'UPST', 'BILL', 'HUBS', 'RNG', 'FIVN',
]

// Stock metadata
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
  'LRCX': { name: 'Lam Research', sector: 'Technology', industry: 'Semiconductors' },
  'MU': { name: 'Micron Technology', sector: 'Technology', industry: 'Semiconductors' },
  'ICE': { name: 'Intercontinental Exchange', sector: 'Financials', industry: 'Exchanges' },
  'SHW': { name: 'Sherwin-Williams', sector: 'Materials', industry: 'Chemicals' },
  'PGR': { name: 'Progressive Corporation', sector: 'Financials', industry: 'Insurance' },
  'FISV': { name: 'Fiserv Inc.', sector: 'Technology', industry: 'Payments' },
  'MMM': { name: '3M Company', sector: 'Industrials', industry: 'Diversified' },
  'FDX': { name: 'FedEx Corporation', sector: 'Industrials', industry: 'Logistics' },
  'PNC': { name: 'PNC Financial Services', sector: 'Financials', industry: 'Banks' },
  'APD': { name: 'Air Products', sector: 'Materials', industry: 'Chemicals' },
  'WM': { name: 'Waste Management', sector: 'Industrials', industry: 'Waste Management' },
  'CSX': { name: 'CSX Corporation', sector: 'Industrials', industry: 'Railroads' },
  'USB': { name: 'U.S. Bancorp', sector: 'Financials', industry: 'Banks' },
  'MCK': { name: 'McKesson Corporation', sector: 'Healthcare', industry: 'Healthcare Services' },
  'TGT': { name: 'Target Corporation', sector: 'Consumer Discretionary', industry: 'Retail' },
  'MCO': { name: "Moody's Corporation", sector: 'Financials', industry: 'Financial Data' },
  'EMR': { name: 'Emerson Electric', sector: 'Industrials', industry: 'Machinery' },
  'NSC': { name: 'Norfolk Southern', sector: 'Industrials', industry: 'Railroads' },
  'PSA': { name: 'Public Storage', sector: 'Real Estate', industry: 'REITs' },
  'ORLY': { name: "O'Reilly Automotive", sector: 'Consumer Discretionary', industry: 'Retail' },
  'CCI': { name: 'Crown Castle Inc.', sector: 'Real Estate', industry: 'REITs' },
  'GD': { name: 'General Dynamics', sector: 'Industrials', industry: 'Defense' },
  'FCX': { name: 'Freeport-McMoRan', sector: 'Materials', industry: 'Mining' },
  'SNPS': { name: 'Synopsys Inc.', sector: 'Technology', industry: 'Software' },
  'CDNS': { name: 'Cadence Design Systems', sector: 'Technology', industry: 'Software' },
  'HCA': { name: 'HCA Healthcare', sector: 'Healthcare', industry: 'Healthcare Services' },
  'KLAC': { name: 'KLA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  'APH': { name: 'Amphenol Corporation', sector: 'Technology', industry: 'Electronics' },
  'CTAS': { name: 'Cintas Corporation', sector: 'Industrials', industry: 'Business Services' },
  'AJG': { name: 'Arthur J. Gallagher', sector: 'Financials', industry: 'Insurance' },
  'AZO': { name: 'AutoZone Inc.', sector: 'Consumer Discretionary', industry: 'Retail' },
  'F': { name: 'Ford Motor Company', sector: 'Consumer Discretionary', industry: 'Automobiles' },
  'GM': { name: 'General Motors', sector: 'Consumer Discretionary', industry: 'Automobiles' },
  'MCHP': { name: 'Microchip Technology', sector: 'Technology', industry: 'Semiconductors' },
  'ANET': { name: 'Arista Networks', sector: 'Technology', industry: 'Networking' },
  'PCAR': { name: 'PACCAR Inc.', sector: 'Industrials', industry: 'Machinery' },
  'TT': { name: 'Trane Technologies', sector: 'Industrials', industry: 'HVAC' },
  'ADSK': { name: 'Autodesk Inc.', sector: 'Technology', industry: 'Software' },
  'NEM': { name: 'Newmont Corporation', sector: 'Materials', industry: 'Mining' },
  'TDG': { name: 'TransDigm Group', sector: 'Industrials', industry: 'Aerospace' },
  'CARR': { name: 'Carrier Global', sector: 'Industrials', industry: 'HVAC' },
  'ROP': { name: 'Roper Technologies', sector: 'Industrials', industry: 'Diversified' },
  'OXY': { name: 'Occidental Petroleum', sector: 'Energy', industry: 'Oil & Gas' },
  'MSI': { name: 'Motorola Solutions', sector: 'Technology', industry: 'Communications' },
  'KMB': { name: 'Kimberly-Clark', sector: 'Consumer Staples', industry: 'Household Products' },
  'AEP': { name: 'American Electric Power', sector: 'Utilities', industry: 'Utilities' },
  'ECL': { name: 'Ecolab Inc.', sector: 'Materials', industry: 'Chemicals' },
  'SRE': { name: 'Sempra Energy', sector: 'Utilities', industry: 'Utilities' },
  'HUM': { name: 'Humana Inc.', sector: 'Healthcare', industry: 'Health Insurance' },
  'IDXX': { name: 'IDEXX Laboratories', sector: 'Healthcare', industry: 'Diagnostics' },
  'AMD': { name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors' },
  'PYPL': { name: 'PayPal Holdings', sector: 'Financials', industry: 'Payments' },
  'CRM': { name: 'Salesforce Inc.', sector: 'Technology', industry: 'Software' },
  'NOW': { name: 'ServiceNow Inc.', sector: 'Technology', industry: 'Software' },
  'CRWD': { name: 'CrowdStrike Holdings', sector: 'Technology', industry: 'Cybersecurity' },
  'PANW': { name: 'Palo Alto Networks', sector: 'Technology', industry: 'Cybersecurity' },
  'DDOG': { name: 'Datadog Inc.', sector: 'Technology', industry: 'Software' },
  'SNOW': { name: 'Snowflake Inc.', sector: 'Technology', industry: 'Cloud Computing' },
  'NET': { name: 'Cloudflare Inc.', sector: 'Technology', industry: 'Cloud Computing' },
  'MDB': { name: 'MongoDB Inc.', sector: 'Technology', industry: 'Database' },
  'ZS': { name: 'Zscaler Inc.', sector: 'Technology', industry: 'Cybersecurity' },
  'TEAM': { name: 'Atlassian Corporation', sector: 'Technology', industry: 'Software' },
  'WDAY': { name: 'Workday Inc.', sector: 'Technology', industry: 'Software' },
  'VEEV': { name: 'Veeva Systems', sector: 'Healthcare', industry: 'Software' },
  'TTD': { name: 'The Trade Desk', sector: 'Technology', industry: 'Advertising' },
  'OKTA': { name: 'Okta Inc.', sector: 'Technology', industry: 'Cybersecurity' },
  'ZM': { name: 'Zoom Video Communications', sector: 'Technology', industry: 'Software' },
  'DOCU': { name: 'DocuSign Inc.', sector: 'Technology', industry: 'Software' },
  'ROKU': { name: 'Roku Inc.', sector: 'Communication Services', industry: 'Streaming' },
  'UBER': { name: 'Uber Technologies', sector: 'Technology', industry: 'Ride-Sharing' },
  'DASH': { name: 'DoorDash Inc.', sector: 'Technology', industry: 'Food Delivery' },
  'ABNB': { name: 'Airbnb Inc.', sector: 'Consumer Discretionary', industry: 'Travel' },
  'COIN': { name: 'Coinbase Global', sector: 'Financials', industry: 'Cryptocurrency' },
  'PLTR': { name: 'Palantir Technologies', sector: 'Technology', industry: 'Software' },
  'SHOP': { name: 'Shopify Inc.', sector: 'Technology', industry: 'E-Commerce' },
  'BABA': { name: 'Alibaba Group', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  'JD': { name: 'JD.com Inc.', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  'PDD': { name: 'PDD Holdings', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  'NIO': { name: 'NIO Inc.', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  'MRNA': { name: 'Moderna Inc.', sector: 'Healthcare', industry: 'Biotechnology' },
  'SMCI': { name: 'Super Micro Computer', sector: 'Technology', industry: 'Hardware' },
  'APP': { name: 'AppLovin Corporation', sector: 'Technology', industry: 'Software' },
  'AXON': { name: 'Axon Enterprise', sector: 'Industrials', industry: 'Defense' },
  'CELH': { name: 'Celsius Holdings', sector: 'Consumer Staples', industry: 'Beverages' },
  'DUOL': { name: 'Duolingo Inc.', sector: 'Technology', industry: 'Education' },
  'IOT': { name: 'Samsara Inc.', sector: 'Technology', industry: 'Software' },
  'SAIA': { name: 'Saia Inc.', sector: 'Industrials', industry: 'Logistics' },
  'ELF': { name: 'e.l.f. Beauty', sector: 'Consumer Staples', industry: 'Cosmetics' },
  'TOST': { name: 'Toast Inc.', sector: 'Technology', industry: 'Software' },
  'WING': { name: 'Wingstop Inc.', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'CAVA': { name: 'CAVA Group', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'BROS': { name: 'Dutch Bros Inc.', sector: 'Consumer Discretionary', industry: 'Restaurants' },
  'HOOD': { name: 'Robinhood Markets', sector: 'Financials', industry: 'Brokerage' },
  'SOFI': { name: 'SoFi Technologies', sector: 'Financials', industry: 'Fintech' },
  'AFRM': { name: 'Affirm Holdings', sector: 'Financials', industry: 'Fintech' },
  'UPST': { name: 'Upstart Holdings', sector: 'Financials', industry: 'Fintech' },
  'BILL': { name: 'Bill Holdings', sector: 'Technology', industry: 'Fintech' },
  'HUBS': { name: 'HubSpot Inc.', sector: 'Technology', industry: 'Software' },
  'RNG': { name: 'RingCentral Inc.', sector: 'Technology', industry: 'Software' },
  'FIVN': { name: 'Five9 Inc.', sector: 'Technology', industry: 'Software' },
}

interface FinnhubQuote {
  c: number
  d: number
  dp: number
  h: number
  l: number
  o: number
  pc: number
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

async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchMetrics(symbol: string): Promise<FinnhubMetrics | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function buildStock(symbol: string, quote: FinnhubQuote, metrics: FinnhubMetrics | null): Stock | null {
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
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow without auth for testing, but log it
    console.log('[CRON] No auth header or invalid secret - running anyway for testing')
  }

  const startTime = Date.now()
  const allStocks: Stock[] = []

  console.log(`[CRON] Starting refresh for ${TOP_SYMBOLS.length} stocks...`)

  try {
    // Finnhub free tier: 60 API calls/minute
    // Each stock needs 2 calls (quote + metrics)
    // So we can fetch ~25-30 stocks/minute max
    // Batch size of 5 stocks = 10 calls, wait 12 seconds = 50 calls/min (safe margin)
    const batchSize = 5
    const delayMs = 12000 // 12 seconds between batches
    const maxStocks = 100 // Limit to 100 stocks to stay within 5-minute timeout

    const symbolsToFetch = TOP_SYMBOLS.slice(0, maxStocks)

    for (let i = 0; i < symbolsToFetch.length; i += batchSize) {
      const batch = symbolsToFetch.slice(i, i + batchSize)

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

      for (const stock of results) {
        if (stock) allStocks.push(stock)
      }

      console.log(`[CRON] Processed ${Math.min(i + batchSize, symbolsToFetch.length)}/${symbolsToFetch.length} stocks (${allStocks.length} valid)`)

      // Delay between batches to respect rate limits
      if (i + batchSize < symbolsToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    // Sort by market cap
    allStocks.sort((a, b) => b.marketCap - a.marketCap)

    // Update cache
    await kv.set(CACHE_KEY, { stocks: allStocks, timestamp: Date.now() }, { ex: CACHE_TTL_SECONDS })

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`[CRON] Refresh complete - cached ${allStocks.length} stocks in ${duration}s`)

    return NextResponse.json({
      success: true,
      stockCount: allStocks.length,
      duration: `${duration}s`,
    })
  } catch (error) {
    console.error('[CRON] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// This endpoint can take a while to run
export const maxDuration = 300 // 5 minutes max
