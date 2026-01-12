export interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changesPercentage: number
  marketCap: number
  pe: number | null
  eps: number | null
  ebitda: number | null
  dividendYield: number | null
  sector: string
  industry: string
  exchange: string
  volume: number
  avgVolume: number
  dayHigh: number
  dayLow: number
  yearHigh: number
  yearLow: number
}

export interface SP500Constituent {
  symbol: string
  name: string
  sector: string
  subSector: string
  headQuarter: string
  dateFirstAdded: string
  cik: string
  founded: string
}

export interface StockQuote {
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  marketCap: number
  priceAvg50: number
  priceAvg200: number
  exchange: string
  volume: number
  avgVolume: number
  open: number
  previousClose: number
  eps: number | null
  pe: number | null
  earningsAnnouncement: string | null
  sharesOutstanding: number
  timestamp: number
}

export interface CompanyProfile {
  symbol: string
  companyName: string
  price: number
  beta: number
  volAvg: number
  mktCap: number
  lastDiv: number
  range: string
  changes: number
  currency: string
  cik: string
  isin: string
  cusip: string
  exchange: string
  exchangeShortName: string
  industry: string
  website: string
  description: string
  ceo: string
  sector: string
  country: string
  fullTimeEmployees: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  dcfDiff: number
  dcf: number
  image: string
  ipoDate: string
  defaultImage: boolean
  isEtf: boolean
  isActivelyTrading: boolean
  isAdr: boolean
  isFund: boolean
}

export interface KeyMetrics {
  symbol: string
  date: string
  period: string
  revenuePerShare: number
  netIncomePerShare: number
  operatingCashFlowPerShare: number
  freeCashFlowPerShare: number
  cashPerShare: number
  bookValuePerShare: number
  tangibleBookValuePerShare: number
  shareholdersEquityPerShare: number
  interestDebtPerShare: number
  marketCap: number
  enterpriseValue: number
  peRatio: number
  priceToSalesRatio: number
  pocfratio: number
  pfcfRatio: number
  pbRatio: number
  ptbRatio: number
  evToSales: number
  enterpriseValueOverEBITDA: number
  evToOperatingCashFlow: number
  evToFreeCashFlow: number
  earningsYield: number
  freeCashFlowYield: number
  debtToEquity: number
  debtToAssets: number
  netDebtToEBITDA: number
  currentRatio: number
  interestCoverage: number
  incomeQuality: number
  dividendYield: number
  payoutRatio: number
  salesGeneralAndAdministrativeToRevenue: number
  researchAndDdevelopementToRevenue: number
  intangiblesToTotalAssets: number
  capexToOperatingCashFlow: number
  capexToRevenue: number
  capexToDepreciation: number
  stockBasedCompensationToRevenue: number
  grahamNumber: number
  roic: number
  returnOnTangibleAssets: number
  grahamNetNet: number
  workingCapital: number
  tangibleAssetValue: number
  netCurrentAssetValue: number
  investedCapital: number
  averageReceivables: number
  averagePayables: number
  averageInventory: number
  daysSalesOutstanding: number
  daysPayablesOutstanding: number
  daysOfInventoryOnHand: number
  receivablesTurnover: number
  payablesTurnover: number
  inventoryTurnover: number
  roe: number
  capexPerShare: number
}

export interface IncomeStatement {
  date: string
  symbol: string
  reportedCurrency: string
  cik: string
  fillingDate: string
  acceptedDate: string
  calendarYear: string
  period: string
  revenue: number
  costOfRevenue: number
  grossProfit: number
  grossProfitRatio: number
  researchAndDevelopmentExpenses: number
  generalAndAdministrativeExpenses: number
  sellingAndMarketingExpenses: number
  sellingGeneralAndAdministrativeExpenses: number
  otherExpenses: number
  operatingExpenses: number
  costAndExpenses: number
  interestIncome: number
  interestExpense: number
  depreciationAndAmortization: number
  ebitda: number
  ebitdaratio: number
  operatingIncome: number
  operatingIncomeRatio: number
  totalOtherIncomeExpensesNet: number
  incomeBeforeTax: number
  incomeBeforeTaxRatio: number
  incomeTaxExpense: number
  netIncome: number
  netIncomeRatio: number
  eps: number
  epsdiluted: number
  weightedAverageShsOut: number
  weightedAverageShsOutDil: number
  link: string
  finalLink: string
}

export type SortField =
  | 'symbol'
  | 'name'
  | 'price'
  | 'changesPercentage'
  | 'marketCap'
  | 'pe'
  | 'ebitda'
  | 'eps'
  | 'dividendYield'
  | 'sector'

export type SortDirection = 'asc' | 'desc'

export interface FilterState {
  search: string
  sector: string
  marketCapMin: number | null
  marketCapMax: number | null
  peMin: number | null
  peMax: number | null
  hasDividend: boolean | null
}

export interface WatchlistItem {
  symbol: string
  addedAt: number
}

export interface EarningsEvent {
  symbol: string
  name: string
  date: string
  time: 'bmo' | 'amc' | 'dmh' | '--' // before market open, after market close, during market hours
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
  fiscalQuarterEnding: string
}

export interface EarningsCalendarResponse {
  earningsCalendar: EarningsEvent[]
}

export type TabType = 'dashboard' | 'watchlist' | 'compare' | 'pe-ratio' | 'earnings' | 'revenue-growth'
