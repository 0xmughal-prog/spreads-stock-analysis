'use client'

import { useState, useMemo, useEffect } from 'react'
import { Stock } from '@/lib/types'
import { formatLargeCurrency } from '@/lib/utils'
import RevenueGrowthModal from './RevenueGrowthModal'

interface RevenueGrowthProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
  onToggleWatchlist: (symbol: string) => void
  watchlist: string[]
}

interface QuarterlyRevenueData {
  recent4Quarters: Array<{
    quarter: string
    revenue: number
    revenueGrowthYoY: number | null
  }>
  avgGrowthRate: number | null
}

type GrowthFilter = 'all' | 'high-growth' | 'moderate' | 'declining'

// Growth rate thresholds for categorization
const GROWTH_THRESHOLDS = {
  highGrowth: 5,  // >5% is high growth
  moderate: 0,    // 0-5% is moderate
}

export default function RevenueGrowth({
  stocks,
  onSelectStock,
  onToggleWatchlist,
  watchlist,
}: RevenueGrowthProps) {
  const [growthFilter, setGrowthFilter] = useState<GrowthFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [revenueData, setRevenueData] = useState<Record<string, QuarterlyRevenueData>>({})
  const [modalStock, setModalStock] = useState<Stock | null>(null)
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set())

  // Fetch revenue data for stocks with rate limiting
  useEffect(() => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const fetchRevenueData = async (symbols: string[]) => {
      const newLoadingSymbols = new Set(loadingSymbols)
      symbols.forEach(s => newLoadingSymbols.add(s))
      setLoadingSymbols(newLoadingSymbols)

      const newData: Record<string, QuarterlyRevenueData> = {}

      // Fetch in batches of 3 with delays to avoid rate limiting
      for (let i = 0; i < symbols.length; i += 3) {
        const batch = symbols.slice(i, i + 3)
        const promises = batch.map(async (symbol) => {
          if (revenueData[symbol]) return // Already fetched
          try {
            const response = await fetch(`/api/revenue-growth/${symbol}`)
            if (response.ok) {
              const data = await response.json()
              newData[symbol] = {
                recent4Quarters: data.recent4Quarters || [],
                avgGrowthRate: data.avgGrowthRate,
              }
            }
          } catch (err) {
            console.error(`Error fetching revenue for ${symbol}:`, err)
          }
        })
        await Promise.all(promises)

        // Update state after each batch so UI shows progress
        if (Object.keys(newData).length > 0) {
          setRevenueData(prev => ({ ...prev, ...newData }))
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

    // Get symbols we haven't fetched yet
    const symbolsToFetch = stocks
      .filter(s => !revenueData[s.symbol])
      .map(s => s.symbol)
      .slice(0, 10) // Limit initial fetch to top 10 to reduce API calls

    if (symbolsToFetch.length > 0) {
      fetchRevenueData(symbolsToFetch)
    }
  }, [stocks])

  const categorizeStock = (avgGrowth: number | null): 'high-growth' | 'moderate' | 'declining' | 'n/a' => {
    if (avgGrowth === null) return 'n/a'
    if (avgGrowth >= GROWTH_THRESHOLDS.highGrowth) return 'high-growth'
    if (avgGrowth >= GROWTH_THRESHOLDS.moderate) return 'moderate'
    return 'declining'
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

        // Filter by category
        if (growthFilter !== 'all') {
          const data = revenueData[stock.symbol]
          if (!data) return false
          const category = categorizeStock(data.avgGrowthRate)
          if (category !== growthFilter) return false
        }

        return true
      })
      .sort((a, b) => {
        const dataA = revenueData[a.symbol]
        const dataB = revenueData[b.symbol]

        // Stocks without data go to the end
        if (!dataA?.avgGrowthRate) return 1
        if (!dataB?.avgGrowthRate) return -1

        return sortDirection === 'desc'
          ? dataB.avgGrowthRate - dataA.avgGrowthRate
          : dataA.avgGrowthRate - dataB.avgGrowthRate
      })
  }, [stocks, growthFilter, searchQuery, sortDirection, revenueData])

  const categoryCounts = useMemo(() => {
    const counts = { 'high-growth': 0, moderate: 0, declining: 0, all: 0 }
    Object.values(revenueData).forEach((data) => {
      if (data.avgGrowthRate !== null) {
        counts.all++
        const category = categorizeStock(data.avgGrowthRate)
        if (category !== 'n/a') counts[category]++
      }
    })
    return counts
  }, [revenueData])

  const getCategoryColor = (category: 'high-growth' | 'moderate' | 'declining' | 'n/a') => {
    switch (category) {
      case 'high-growth':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'moderate':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
      case 'declining':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getCategoryBadgeColor = (category: GrowthFilter, isActive: boolean) => {
    if (!isActive) return 'bg-white/5 text-gray-400 border-gray-600'
    switch (category) {
      case 'high-growth':
        return 'bg-green-500/20 text-green-400 border-green-500'
      case 'moderate':
        return 'bg-orange-500/20 text-orange-400 border-orange-500'
      case 'declining':
        return 'bg-red-500/20 text-red-400 border-red-500'
      default:
        return 'bg-white/10 text-white border-white/30'
    }
  }

  const getGrowthDisplay = (growth: number | null) => {
    if (growth === null) return { text: 'N/A', color: 'text-gray-500 dark:text-gray-400' }
    const sign = growth >= 0 ? '+' : ''
    const color = growth > 5
      ? 'text-green-600 dark:text-green-400'
      : growth >= 0
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-red-600 dark:text-red-400'
    return { text: `${sign}${growth.toFixed(1)}%`, color }
  }

  const formatQuarterlyRevenue = (quarters: QuarterlyRevenueData['recent4Quarters']) => {
    if (!quarters || quarters.length === 0) return []
    return quarters.slice(0, 4).map(q => ({
      label: q.quarter,
      revenue: formatLargeCurrency(q.revenue),
      growth: q.revenueGrowthYoY,
    }))
  }

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-heading">
          Revenue Growth
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Quarterly revenue data with year-over-year growth rates
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
            {sortDirection === 'desc' ? 'Highest First' : 'Lowest First'}
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(['all', 'high-growth', 'moderate', 'declining'] as GrowthFilter[]).map((category) => (
            <button
              key={category}
              onClick={() => setGrowthFilter(category)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium text-sm ${getCategoryBadgeColor(
                category,
                growthFilter === category
              )}`}
            >
              {category === 'all' ? 'All' : category === 'high-growth' ? 'High Growth' : category.charAt(0).toUpperCase() + category.slice(1)}
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
            <span>High Growth (&gt;5% YoY)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Moderate (0-5% YoY)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Declining (&lt;0% YoY)</span>
          </div>
        </div>
      </div>

      {/* Stock List */}
      <div className="space-y-2">
        {filteredAndSortedStocks.map((stock, index) => {
          const data = revenueData[stock.symbol]
          const category = categorizeStock(data?.avgGrowthRate ?? null)
          const isInWatchlist = watchlist.includes(stock.symbol)
          const isLoading = loadingSymbols.has(stock.symbol)
          const quarters = formatQuarterlyRevenue(data?.recent4Quarters || [])
          const growthDisplay = getGrowthDisplay(data?.avgGrowthRate ?? null)

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
                    {data && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(category)}`}
                      >
                        {category === 'n/a' ? 'N/A' : category === 'high-growth' ? 'High Growth' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {stock.name}
                  </p>
                </div>

                {/* Recent 4 Quarters - Hidden on mobile */}
                <div className="hidden xl:flex gap-2">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      Loading...
                    </div>
                  ) : quarters.length > 0 ? (
                    quarters.map((q, i) => (
                      <div
                        key={i}
                        className="text-center px-3 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400">{q.label}</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{q.revenue}</div>
                        {q.growth !== null && (
                          <div className={`text-xs ${q.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {q.growth >= 0 ? '+' : ''}{q.growth.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No data</span>
                  )}
                </div>

                {/* Avg Growth Rate */}
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className={`text-xl font-bold ${growthDisplay.color}`}>
                      {growthDisplay.text}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Avg YoY Growth</div>
                  </div>
                  {/* Chart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setModalStock(stock)
                    }}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-spreads-tan/20 dark:hover:bg-spreads-tan/20 transition-colors group/chart"
                    title="View Revenue History"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover/chart:text-spreads-tan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

      {/* Revenue Growth Modal */}
      {modalStock && (
        <RevenueGrowthModal
          isOpen={!!modalStock}
          onClose={() => setModalStock(null)}
          symbol={modalStock.symbol}
          companyName={modalStock.name}
        />
      )}
    </div>
  )
}
