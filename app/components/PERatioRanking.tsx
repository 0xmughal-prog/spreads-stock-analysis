'use client'

import { useState, useMemo } from 'react'
import { Stock } from '@/lib/types'
import { formatRatio, formatLargeCurrency } from '@/lib/utils'

interface PERatioRankingProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
  onToggleWatchlist: (symbol: string) => void
  watchlist: string[]
}

type CategoryFilter = 'all' | 'undervalued' | 'fair' | 'overvalued'

// P/E ratio thresholds for categorization
const PE_THRESHOLDS = {
  undervalued: 15,
  fair: 25,
  overvalued: 25,
}

export default function PERatioRanking({
  stocks,
  onSelectStock,
  onToggleWatchlist,
  watchlist,
}: PERatioRankingProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const categorizeStock = (pe: number | null): 'undervalued' | 'fair' | 'overvalued' | 'n/a' => {
    if (pe === null || pe <= 0) return 'n/a'
    if (pe < PE_THRESHOLDS.undervalued) return 'undervalued'
    if (pe <= PE_THRESHOLDS.fair) return 'fair'
    return 'overvalued'
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
        if (categoryFilter !== 'all') {
          const category = categorizeStock(stock.pe)
          if (category !== categoryFilter) return false
        }

        // Only show stocks with valid P/E
        if (categoryFilter !== 'all' && (stock.pe === null || stock.pe <= 0)) {
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
  }, [stocks, categoryFilter, searchQuery, sortDirection])

  const categoryCounts = useMemo(() => {
    const counts = { undervalued: 0, fair: 0, overvalued: 0, all: 0 }
    stocks.forEach((stock) => {
      if (stock.pe !== null && stock.pe > 0) {
        counts.all++
        const category = categorizeStock(stock.pe)
        if (category !== 'n/a') counts[category]++
      }
    })
    return counts
  }, [stocks])

  const getCategoryColor = (category: 'undervalued' | 'fair' | 'overvalued' | 'n/a') => {
    switch (category) {
      case 'undervalued':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'fair':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'overvalued':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getCategoryBadgeColor = (category: CategoryFilter, isActive: boolean) => {
    if (!isActive) return 'bg-white/5 text-gray-400 border-gray-600'
    switch (category) {
      case 'undervalued':
        return 'bg-green-500/20 text-green-400 border-green-500'
      case 'fair':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'overvalued':
        return 'bg-red-500/20 text-red-400 border-red-500'
      default:
        return 'bg-white/10 text-white border-white/30'
    }
  }

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-heading">
          P/E Ratio Rankings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Stocks ranked by Price-to-Earnings ratio with valuation categories
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

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(['all', 'undervalued', 'fair', 'overvalued'] as CategoryFilter[]).map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium text-sm ${getCategoryBadgeColor(
                category,
                categoryFilter === category
              )}`}
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
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
            <span>Undervalued (P/E &lt; 15)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Fair Value (P/E 15-25)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Overvalued (P/E &gt; 25)</span>
          </div>
        </div>
      </div>

      {/* Stock List */}
      <div className="space-y-2">
        {filteredAndSortedStocks.map((stock, index) => {
          const category = categorizeStock(stock.pe)
          const isInWatchlist = watchlist.includes(stock.symbol)

          return (
            <div
              key={stock.symbol}
              className="card p-4 cursor-pointer hover:shadow-lg transition-all duration-200 group"
              onClick={() => onSelectStock(stock)}
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
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                        category
                      )}`}
                    >
                      {category === 'n/a' ? 'N/A' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {stock.name}
                  </p>
                </div>

                {/* P/E Ratio */}
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {stock.pe !== null && stock.pe > 0 ? formatRatio(stock.pe) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">P/E Ratio</div>
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
    </div>
  )
}
