'use client'

import { Stock } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'

interface WatchlistProps {
  stocks: Stock[]
  watchlist: string[]
  onRemove: (symbol: string) => void
  onSelectStock: (stock: Stock) => void
  onToggleCompare: (symbol: string) => void
  compareList: string[]
}

export default function Watchlist({
  stocks,
  watchlist,
  onRemove,
  onSelectStock,
  onToggleCompare,
  compareList,
}: WatchlistProps) {
  const watchlistStocks = stocks.filter((stock) => watchlist.includes(stock.symbol))

  if (watchlistStocks.length === 0) {
    return (
      <div className="card p-8 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your watchlist is empty</h3>
        <p className="text-gray-500">
          Click the star icon on any stock in the dashboard to add it to your watchlist.
        </p>
      </div>
    )
  }

  const totalMarketCap = watchlistStocks.reduce((sum, stock) => sum + stock.marketCap, 0)
  const avgChange =
    watchlistStocks.reduce((sum, stock) => sum + stock.changesPercentage, 0) / watchlistStocks.length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Stocks in Watchlist</p>
          <p className="text-2xl font-bold text-spreads-green">{watchlistStocks.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Market Cap</p>
          <p className="text-2xl font-bold text-spreads-green">{formatLargeCurrency(totalMarketCap)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Avg. Daily Change</p>
          <p className={`text-2xl font-bold ${avgChange >= 0 ? 'positive' : 'negative'}`}>
            {formatPercent(avgChange)}
          </p>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Ticker</th>
              <th className="table-header">Company</th>
              <th className="table-header">Price</th>
              <th className="table-header">Change</th>
              <th className="table-header">Market Cap</th>
              <th className="table-header">P/E</th>
              <th className="table-header">Sector</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {watchlistStocks.map((stock) => (
              <tr
                key={stock.symbol}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectStock(stock)}
              >
                <td className="table-cell font-semibold text-spreads-green">{stock.symbol}</td>
                <td className="table-cell max-w-[200px] truncate">{stock.name}</td>
                <td className="table-cell font-medium">{formatCurrency(stock.price)}</td>
                <td className={`table-cell font-medium ${stock.changesPercentage >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(stock.changesPercentage)}
                </td>
                <td className="table-cell">{formatLargeCurrency(stock.marketCap)}</td>
                <td className="table-cell">{stock.pe?.toFixed(2) || 'N/A'}</td>
                <td className="table-cell">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-spreads-green-50 text-spreads-green">
                    {stock.sector}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCompare(stock.symbol)
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        compareList.includes(stock.symbol)
                          ? 'bg-spreads-green text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {compareList.includes(stock.symbol) ? 'Selected' : 'Compare'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(stock.symbol)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
