'use client'

import { Stock } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent, formatNumber } from '@/lib/utils'

interface StockModalProps {
  stock: Stock | null
  isOpen: boolean
  onClose: () => void
  isInWatchlist: boolean
  onToggleWatchlist: () => void
}

export default function StockModal({
  stock,
  isOpen,
  onClose,
  isInWatchlist,
  onToggleWatchlist,
}: StockModalProps) {
  if (!isOpen || !stock) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle bg-white rounded-2xl shadow-xl transform transition-all">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-spreads-green">{stock.symbol}</h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-spreads-green-50 text-spreads-green">
                  {stock.sector}
                </span>
              </div>
              <p className="text-gray-600 mt-1">{stock.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleWatchlist}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isInWatchlist ? (
                  <svg className="w-6 h-6 text-yellow-500 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Price Section */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Price</p>
                <p className="text-4xl font-bold text-gray-900">{formatCurrency(stock.price)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Today&apos;s Change</p>
                <p className={`text-2xl font-bold ${stock.changesPercentage >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(stock.changesPercentage)}
                </p>
                <p className={`text-sm ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                  {stock.change >= 0 ? '+' : ''}{formatCurrency(stock.change)}
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <MetricCard label="Market Cap" value={formatLargeCurrency(stock.marketCap)} />
            <MetricCard label="P/E Ratio" value={stock.pe?.toFixed(2) || 'N/A'} />
            <MetricCard label="EPS" value={formatCurrency(stock.eps)} />
            <MetricCard label="EBITDA" value={formatLargeCurrency(stock.ebitda)} />
            <MetricCard
              label="Dividend Yield"
              value={stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
            />
            <MetricCard label="Exchange" value={stock.exchange} />
          </div>

          {/* Trading Info */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Trading Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Day High</p>
                <p className="text-sm font-medium">{formatCurrency(stock.dayHigh)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Day Low</p>
                <p className="text-sm font-medium">{formatCurrency(stock.dayLow)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">52W High</p>
                <p className="text-sm font-medium">{formatCurrency(stock.yearHigh)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">52W Low</p>
                <p className="text-sm font-medium">{formatCurrency(stock.yearLow)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Volume</p>
                <p className="text-sm font-medium">{formatNumber(stock.volume, 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Volume</p>
                <p className="text-sm font-medium">{formatNumber(stock.avgVolume, 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}
