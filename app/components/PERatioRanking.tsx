'use client'

import { useState, useMemo, useEffect } from 'react'
import { Stock } from '@/lib/types'
import { formatRatio, formatLargeCurrency } from '@/lib/utils'
import PEHistoricalModal from './PEHistoricalModal'

interface PERatioRankingProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
  onToggleWatchlist: (symbol: string) => void
  watchlist: string[]
}

interface HistoricalPEData {
  avgPE5Y: number | null
}

type PERangeFilter = 'all' | 'under20' | '20to30' | 'over30'

export default function PERatioRanking({
  stocks,
  onSelectStock,
  onToggleWatchlist,
  watchlist,
}: PERatioRankingProps) {
  const [peRangeFilter, setPeRangeFilter] = useState<PERangeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [historicalPEData, setHistoricalPEData] = useState<Record<string, HistoricalPEData>>({})
  const [modalStock, setModalStock] = useState<Stock | null>(null)
  const [sp500PE, setSp500PE] = useState<number | null>(null)
  const [sp500Loading, setSp500Loading] = useState(true)

  // Fetch S&P 500 P/E ratio
  useEffect(() => {
    const fetchSP500PE = async () => {
      try {
        const response = await fetch('/api/sp500-pe')
        if (response.ok) {
          const data = await response.json()
          setSp500PE(data.pe)
        }
      } catch (err) {
        console.error('Error fetching S&P 500 P/E:', err)
      } finally {
        setSp500Loading(false)
      }
    }
    fetchSP500PE()
  }, [])

  // Fetch 5Y avg P/E for visible stocks with rate limiting
  useEffect(() => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const fetchHistoricalPE = async (symbols: string[]) => {
      const newData: Record<string, HistoricalPEData> = {}

      // Fetch in batches of 3 with delays to avoid rate limiting
      for (let i = 0; i < symbols.length; i += 3) {
        const batch = symbols.slice(i, i + 3)
        const promises = batch.map(async (symbol) => {
          if (historicalPEData[symbol]) return // Already fetched
          try {
            const response = await fetch(`/api/historical-pe/${symbol}`)
            if (response.ok) {
              const data = await response.json()
              newData[symbol] = { avgPE5Y: data.avgPE5Y }
            }
          } catch (err) {
            console.error(`Error fetching P/E for ${symbol}:`, err)
          }
        })
        await Promise.all(promises)

        // Update state after each batch so UI shows progress
        if (Object.keys(newData).length > 0) {
          setHistoricalPEData(prev => ({ ...prev, ...newData }))
        }

        // Add delay between batches to avoid rate limiting (1.5 seconds)
        if (i + 3 < symbols.length) {
          await delay(1500)
        }
      }
    }

    // Get symbols of stocks with valid P/E that we haven't fetched yet
    const symbolsToFetch = stocks
      .filter(s => s.pe !== null && s.pe > 0 && !historicalPEData[s.symbol])
      .map(s => s.symbol)
      .slice(0, 10) // Limit initial fetch to top 10 to reduce API calls

    if (symbolsToFetch.length > 0) {
      fetchHistoricalPE(symbolsToFetch)
    }
  }, [stocks])

  const getPERange = (pe: number | null): PERangeFilter | 'n/a' => {
    if (pe === null || pe <= 0) return 'n/a'
    if (pe < 20) return 'under20'
    if (pe <= 30) return '20to30'
    return 'over30'
  }

  const filteredAndSortedStocks = useMemo(() => {
    return stocks
      .filter((stock) => {
        // Filter by search
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          if (
            !stock.symbol.toLowerCase().includes(query) &&
            !stock.name.toLowerCase().includes(query)
          ) {
            return false
          }
        }

        // Filter by P/E range
        if (peRangeFilter !== 'all') {
          const range = getPERange(stock.pe)
          if (range !== peRangeFilter) return false
        }

        // Only show stocks with valid P/E when filtering
        if (peRangeFilter !== 'all' && (stock.pe === null || stock.pe <= 0)) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        // Stocks without P/E go to the end
        if (a.pe === null || a.pe <= 0) return 1
        if (b.pe === null || b.pe <= 0) return -1

        return sortDirection === 'asc' ? a.pe - b.pe : b.pe - a.pe
      })
  }, [stocks, peRangeFilter, searchQuery, sortDirection])

  const rangeCounts = useMemo(() => {
    const counts = { under20: 0, '20to30': 0, over30: 0, all: 0 }
    stocks.forEach((stock) => {
      if (stock.pe !== null && stock.pe > 0) {
        counts.all++
        const range = getPERange(stock.pe)
        if (range !== 'n/a' && range !== 'all') counts[range]++
      }
    })
    return counts
  }, [stocks])

  const getFilterBadgeColor = (filter: PERangeFilter, isActive: boolean) => {
    if (!isActive) return 'bg-white/5 text-gray-400 border-gray-600'
    switch (filter) {
      case 'under20':
        return 'bg-green-500/20 text-green-400 border-green-500'
      case '20to30':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'over30':
        return 'bg-red-500/20 text-red-400 border-red-500'
      default:
        return 'bg-white/10 text-white border-white/30'
    }
  }

  const getFilterLabel = (filter: PERangeFilter) => {
    switch (filter) {
      case 'under20':
        return 'Under 20'
      case '20to30':
        return '20-30'
      case 'over30':
        return 'Over 30'
      default:
        return 'All'
    }
  }

  return (
    <div className="content-panel">
      {/* Header with S&P 500 Widget */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-heading">
            P/E Ratio Rankings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Stocks ranked by Price-to-Earnings ratio
          </p>
        </div>

        {/* S&P 500 P/E Widget */}
        <div className="card p-4 lg:min-w-[200px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">S&P 500 P/E</p>
              {sp500Loading ? (
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {sp500PE ? `${sp500PE.toFixed(1)}x` : 'N/A'}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Compare stocks to market average
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by symbol or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Sort Direction */}
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sortDirection === 'asc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              )}
            </svg>
            {sortDirection === 'asc' ? 'Lowest First' : 'Highest First'}
          </button>
        </div>

        {/* P/E Range Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(['all', 'under20', '20to30', 'over30'] as PERangeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setPeRangeFilter(filter)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium text-sm ${getFilterBadgeColor(
                filter,
                peRangeFilter === filter
              )}`}
            >
              {getFilterLabel(filter)}
              <span className="ml-2 opacity-70">
                ({filter === 'all' ? rangeCounts.all : rangeCounts[filter]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stock List */}
      <div className="space-y-2">
        {filteredAndSortedStocks.map((stock, index) => {
          const isInWatchlist = watchlist.includes(stock.symbol)
          const peRange = getPERange(stock.pe)

          return (
            <div
              key={stock.symbol}
              className="card p-4 cursor-pointer hover:shadow-lg transition-all duration-200 group"
              onClick={() => setModalStock(stock)}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                  {index + 1}
                </div>

                {/* Stock Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {stock.symbol}
                    </span>
                    {sp500PE && stock.pe && stock.pe > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          stock.pe < sp500PE
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                            : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        {stock.pe < sp500PE ? 'Below S&P' : 'Above S&P'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {stock.name}
                  </p>
                </div>

                {/* P/E Ratio */}
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {stock.pe !== null && stock.pe > 0 ? formatRatio(stock.pe) : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                      <span>P/E Ratio</span>
                      {historicalPEData[stock.symbol]?.avgPE5Y && (
                        <span className="text-spreads-tan">
                          (5Y: {historicalPEData[stock.symbol].avgPE5Y?.toFixed(1)})
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Chart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setModalStock(stock)
                    }}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-spreads-tan/20 dark:hover:bg-spreads-tan/20 transition-colors group/chart"
                    title="View P/E History"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover/chart:text-spreads-tan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </button>
                </div>

                {/* Market Cap */}
                <div className="text-right hidden sm:block">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatLargeCurrency(stock.marketCap)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Market Cap</div>
                </div>

                {/* Price Change */}
                <div className="text-right hidden md:block">
                  <div
                    className={`font-medium ${
                      stock.changesPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {stock.changesPercentage >= 0 ? '+' : ''}
                    {stock.changesPercentage.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Today</div>
                </div>

                {/* Watchlist Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleWatchlist(stock.symbol)
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isInWatchlist
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-400 hover:text-yellow-500'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill={isInWatchlist ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}

        {filteredAndSortedStocks.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No stocks found matching your criteria
            </p>
          </div>
        )}
      </div>

      {/* P/E Historical Modal */}
      {modalStock && (
        <PEHistoricalModal
          isOpen={!!modalStock}
          onClose={() => setModalStock(null)}
          symbol={modalStock.symbol}
          companyName={modalStock.name}
        />
      )}
    </div>
  )
}
