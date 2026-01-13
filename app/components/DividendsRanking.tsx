'use client'

import { useState, useMemo, useEffect } from 'react'
import { Stock } from '@/lib/types'
import DividendsHistoricalModal from './DividendsHistoricalModal'

interface DividendsRankingProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
  onToggleWatchlist: (symbol: string) => void
  watchlist: string[]
}

interface DividendInfo {
  currentYield: number
  currentDividendAnnual: number
  dividendGrowthRate5Y: number | null
}

type YieldFilter = 'all' | 'high-yield' | 'moderate-yield' | 'low-yield'

// Yield thresholds for categorization
const YIELD_THRESHOLDS = {
  highYield: 4,    // >4% is high yield
  moderate: 2,     // 2-4% is moderate
  low: 0,          // <2% is low yield
}

export default function DividendsRanking({
  stocks,
  onSelectStock,
  onToggleWatchlist,
  watchlist,
}: DividendsRankingProps) {
  const [yieldFilter, setYieldFilter] = useState<YieldFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [dividendData, setDividendData] = useState<Record<string, DividendInfo>>({})
  const [modalStock, setModalStock] = useState<Stock | null>(null)
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set())

  // Filter stocks that pay dividends
  const dividendPayingStocks = useMemo(() => {
    return stocks.filter(s => s.dividendYield && s.dividendYield > 0)
  }, [stocks])

  // Fetch dividend data for stocks with rate limiting
  useEffect(() => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const fetchDividendData = async (symbols: string[]) => {
      const newLoadingSymbols = new Set(loadingSymbols)
      symbols.forEach(s => newLoadingSymbols.add(s))
      setLoadingSymbols(newLoadingSymbols)

      const newData: Record<string, DividendInfo> = {}

      // Fetch in batches of 3 with delays to avoid rate limiting
      for (let i = 0; i < symbols.length; i += 3) {
        const batch = symbols.slice(i, i + 3)
        const promises = batch.map(async (symbol) => {
          if (dividendData[symbol]) return // Already fetched
          try {
            const response = await fetch(`/api/dividends/${symbol}`)
            if (response.ok) {
              const data = await response.json()
              newData[symbol] = {
                currentYield: data.currentYield,
                currentDividendAnnual: data.currentDividendAnnual,
                dividendGrowthRate5Y: data.dividendGrowthRate5Y,
              }
            }
          } catch (err) {
            console.error(`Error fetching dividends for ${symbol}:`, err)
          }
        })
        await Promise.all(promises)

        // Update state after each batch so UI shows progress
        if (Object.keys(newData).length > 0) {
          setDividendData(prev => ({ ...prev, ...newData }))
        }

        // Add delay between batches to avoid rate limiting (1.5 seconds)
        if (i + 3 < symbols.length) {
          await delay(1500)
        }
      }

      const finalLoadingSymbols = new Set(loadingSymbols)
      symbols.forEach(s => finalLoadingSymbols.delete(s))
      setLoadingSymbols(finalLoadingSymbols)
    }

    // Get symbols we haven't fetched yet (limit to first 10 to reduce API calls)
    const symbolsToFetch = dividendPayingStocks
      .filter(s => !dividendData[s.symbol])
      .map(s => s.symbol)
      .slice(0, 10)

    if (symbolsToFetch.length > 0) {
      fetchDividendData(symbolsToFetch)
    }
  }, [dividendPayingStocks])

  const categorizeStock = (yield_: number): 'high-yield' | 'moderate-yield' | 'low-yield' => {
    if (yield_ >= YIELD_THRESHOLDS.highYield) return 'high-yield'
    if (yield_ >= YIELD_THRESHOLDS.moderate) return 'moderate-yield'
    return 'low-yield'
  }

  const filteredAndSortedStocks = useMemo(() => {
    return dividendPayingStocks
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

        // Filter by yield category
        if (yieldFilter !== 'all' && stock.dividendYield) {
          const category = categorizeStock(stock.dividendYield)
          if (category !== yieldFilter) return false
        }

        return true
      })
      .sort((a, b) => {
        const yieldA = a.dividendYield || 0
        const yieldB = b.dividendYield || 0

        return sortDirection === 'desc'
          ? yieldB - yieldA
          : yieldA - yieldB
      })
  }, [dividendPayingStocks, yieldFilter, searchQuery, sortDirection])

  const categoryCounts = useMemo(() => {
    const counts = { 'high-yield': 0, 'moderate-yield': 0, 'low-yield': 0, all: 0 }
    dividendPayingStocks.forEach((stock) => {
      if (stock.dividendYield && stock.dividendYield > 0) {
        counts.all++
        const category = categorizeStock(stock.dividendYield)
        counts[category]++
      }
    })
    return counts
  }, [dividendPayingStocks])

  const getCategoryColor = (category: 'high-yield' | 'moderate-yield' | 'low-yield') => {
    switch (category) {
      case 'high-yield':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'moderate-yield':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low-yield':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  const getCategoryBadgeColor = (category: YieldFilter, isActive: boolean) => {
    if (!isActive) return 'bg-white/5 text-gray-400 border-gray-600'
    switch (category) {
      case 'high-yield':
        return 'bg-green-500/20 text-green-400 border-green-500'
      case 'moderate-yield':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'low-yield':
        return 'bg-blue-500/20 text-blue-400 border-blue-500'
      default:
        return 'bg-white/10 text-white border-white/30'
    }
  }

  const getGrowthDisplay = (growth: number | null) => {
    if (growth === null) return { text: 'N/A', color: 'text-gray-500 dark:text-gray-400' }
    const sign = growth >= 0 ? '+' : ''
    const color = growth >= 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'
    return { text: `${sign}${growth.toFixed(1)}%`, color }
  }

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-heading">
          Dividends
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Dividend-paying stocks ranked by yield with estimated historical data
        </p>
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
            onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sortDirection === 'desc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              )}
            </svg>
            {sortDirection === 'desc' ? 'Highest Yield First' : 'Lowest Yield First'}
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(['all', 'high-yield', 'moderate-yield', 'low-yield'] as YieldFilter[]).map((category) => (
            <button
              key={category}
              onClick={() => setYieldFilter(category)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium text-sm ${getCategoryBadgeColor(
                category,
                yieldFilter === category
              )}`}
            >
              {category === 'all' ? 'All' : category === 'high-yield' ? 'High Yield' : category === 'moderate-yield' ? 'Moderate Yield' : 'Low Yield'}
              <span className="ml-2 opacity-70">
                ({category === 'all' ? categoryCounts.all : categoryCounts[category]})
              </span>
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>High Yield (&gt;4%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Moderate (2-4%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Low Yield (&lt;2%)</span>
          </div>
        </div>
      </div>

      {/* Stock List */}
      <div className="space-y-2">
        {filteredAndSortedStocks.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No dividend-paying stocks found matching your filters.
            </p>
          </div>
        ) : (
          filteredAndSortedStocks.map((stock, index) => {
            const data = dividendData[stock.symbol]
            const category = stock.dividendYield ? categorizeStock(stock.dividendYield) : 'low-yield'
            const isInWatchlist = watchlist.includes(stock.symbol)
            const isLoading = loadingSymbols.has(stock.symbol)
            const growthDisplay = getGrowthDisplay(data?.dividendGrowthRate5Y ?? null)

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
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(category)}`}
                      >
                        {category === 'high-yield' ? 'High Yield' : category === 'moderate-yield' ? 'Moderate' : 'Low Yield'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {stock.name}
                    </p>
                  </div>

                  {/* Dividend Info */}
                  <div className="hidden lg:block">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        Loading...
                      </div>
                    ) : data ? (
                      <div className="text-center px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Annual Dividend</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          ${data.currentDividendAnnual.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>

                  {/* Current Yield */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-spreads-green dark:text-spreads-green">
                      {stock.dividendYield?.toFixed(2) || 'N/A'}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Current Yield</div>
                  </div>

                  {/* 5Y Growth */}
                  <div className="text-right hidden md:block">
                    <div className={`text-lg font-bold ${growthDisplay.color}`}>
                      {growthDisplay.text}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">5Y Growth</div>
                  </div>

                  {/* Chart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setModalStock(stock)
                    }}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-spreads-tan/20 dark:hover:bg-spreads-tan/20 transition-colors group/chart"
                    title="View Dividend History"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover/chart:text-spreads-tan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>

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
          })
        )}
      </div>

      {/* Modal */}
      {modalStock && (
        <DividendsHistoricalModal
          isOpen={!!modalStock}
          onClose={() => setModalStock(null)}
          symbol={modalStock.symbol}
          companyName={modalStock.name}
        />
      )}
    </div>
  )
}
