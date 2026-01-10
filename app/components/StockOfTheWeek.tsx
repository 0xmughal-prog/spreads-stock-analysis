'use client'

import { useMemo } from 'react'
import { Stock } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'

interface StockOfTheWeekProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
}

export default function StockOfTheWeek({ stocks, onSelectStock }: StockOfTheWeekProps) {
  // Get top 3 stocks by price change percentage
  const topStocks = useMemo(() => {
    return [...stocks]
      .sort((a, b) => b.changesPercentage - a.changesPercentage)
      .slice(0, 3)
  }, [stocks])

  if (topStocks.length === 0) {
    return null
  }

  const getRankBadge = (index: number) => {
    const badges = [
      { bg: 'bg-yellow-400', text: 'text-yellow-900', label: '1st' },
      { bg: 'bg-gray-300', text: 'text-gray-700', label: '2nd' },
      { bg: 'bg-amber-600', text: 'text-amber-100', label: '3rd' },
    ]
    return badges[index]
  }

  const getGoogleFinanceUrl = (symbol: string) => {
    return `https://www.google.com/finance/quote/${symbol}:NASDAQ`
  }

  const getGoogleNewsUrl = (symbol: string, companyName: string) => {
    const query = encodeURIComponent(`${symbol} ${companyName} stock news`)
    return `https://www.google.com/search?q=${query}&tbm=nws`
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-spreads-green text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock of the Week</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Top 3 performers by price change</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Stocks Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topStocks.map((stock, index) => {
              const badge = getRankBadge(index)
              return (
                <div
                  key={stock.symbol}
                  className="card card-hover p-4 cursor-pointer relative overflow-hidden"
                  onClick={() => onSelectStock(stock)}
                >
                  {/* Rank Badge */}
                  <div className={`absolute top-2 right-2 ${badge.bg} ${badge.text} text-xs font-bold px-2 py-1 rounded-full`}>
                    {badge.label}
                  </div>

                  {/* Stock Info */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-spreads-green">{stock.symbol}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{stock.name}</p>
                  </div>

                  {/* Price & Change */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(stock.price)}</p>
                      <p className={`text-lg font-semibold ${stock.changesPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {formatPercent(stock.changesPercentage)}
                      </p>
                    </div>

                    {/* Additional Metrics */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Market Cap</span>
                        <span className="font-medium">{formatLargeCurrency(stock.marketCap)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Sector</span>
                        <span className="font-medium text-xs">{stock.sector}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                    <a
                      href={getGoogleFinanceUrl(stock.symbol)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center text-xs py-1.5 px-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Finance
                    </a>
                    <a
                      href={getGoogleNewsUrl(stock.symbol, stock.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center text-xs py-1.5 px-2 bg-spreads-green text-white rounded hover:opacity-90 transition-opacity"
                    >
                      News
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* News Panel */}
        <div className="lg:col-span-1">
          <div className="card h-full p-4">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-spreads-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Latest News</h3>
            </div>

            <div className="space-y-3">
              {topStocks.map((stock) => (
                <a
                  key={stock.symbol}
                  href={getGoogleNewsUrl(stock.symbol, stock.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      stock.changesPercentage >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {stock.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {stock.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPercent(stock.changesPercentage)} today
                      </p>
                      <p className="text-xs text-spreads-green mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View news on Google
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <a
                href="https://www.google.com/finance/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-spreads-green transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google Finance
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
