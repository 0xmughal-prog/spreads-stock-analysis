'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stock } from '@/lib/types'
import { getStockBySymbol } from '@/lib/api'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'
import { useTheme } from '@/app/context/ThemeContext'

declare global {
  interface Window {
    TradingView: {
      widget: new (config: TradingViewConfig) => void
    }
  }
}

interface TradingViewConfig {
  autosize: boolean
  symbol: string
  interval: string
  timezone: string
  theme: string
  style: string
  locale: string
  toolbar_bg: string
  enable_publishing: boolean
  allow_symbol_change: boolean
  container_id: string
  hide_top_toolbar: boolean
  hide_legend: boolean
  save_image: boolean
  studies: string[]
}

function TradingViewWidget({ symbol, theme }: { symbol: string; theme: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (containerRef.current && window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: 'D',
          timezone: 'America/New_York',
          theme: theme === 'dark' ? 'dark' : 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: theme === 'dark' ? '#1a1d21' : '#f7f8f9',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview_widget',
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        })
      }
    }
    document.head.appendChild(script)

    return () => {
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [symbol, theme])

  return (
    <div className="w-full h-full min-h-[500px] lg:min-h-[600px]">
      <div id="tradingview_widget" ref={containerRef} className="w-full h-full" />
    </div>
  )
}

function MetricCard({ label, value, subValue, positive }: {
  label: string
  value: string
  subValue?: string
  positive?: boolean
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold ${positive !== undefined ? (positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>
      )}
    </div>
  )
}

export default function StockDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { theme } = useTheme()
  const symbol = typeof params.symbol === 'string' ? params.symbol.toUpperCase() : ''

  const [stock, setStock] = useState<Stock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStock = async () => {
      if (!symbol) return

      setLoading(true)
      setError(null)

      try {
        const data = await getStockBySymbol(symbol)
        if (data) {
          setStock(data)
        } else {
          setError('Stock not found')
        }
      } catch (err) {
        console.error('Error fetching stock:', err)
        setError('Failed to load stock data')
      } finally {
        setLoading(false)
      }
    }

    fetchStock()
  }, [symbol])

  if (loading) {
    return (
      <div className="min-h-screen bg-off-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-[500px] bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen bg-off-white dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-heading">
            {error || 'Stock Not Found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Unable to find data for symbol: {symbol}
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const isPositive = stock.changesPercentage >= 0

  return (
    <div className="min-h-screen bg-off-white dark:bg-dark-bg">
      {/* Grid Background */}
      <div className="grid-background" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-spreads-green dark:text-green-400 font-heading">
                  {stock.symbol}
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-spreads-green/10 text-spreads-green dark:bg-green-900/30 dark:text-green-400">
                  {stock.sector}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{stock.name}</p>
            </div>
          </div>

          {/* Price Display - Mobile */}
          <div className="sm:hidden card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Price</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stock.price)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(stock.changesPercentage)}
                </p>
                <p className={`text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-heading">
                  Price Chart
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="hidden sm:inline">Powered by</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">TradingView</span>
                </div>
              </div>
              <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
                <TradingViewWidget symbol={stock.symbol} theme={theme} />
              </div>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-4">
            {/* Price Card - Desktop */}
            <div className="hidden sm:block card p-5">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Price</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stock.price)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isPositive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {isPositive ? '+' : ''}{formatPercent(stock.changesPercentage)}
                </span>
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                </span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Key Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Market Cap</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatLargeCurrency(stock.marketCap)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">P/E Ratio</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.pe?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">EPS</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.eps ? formatCurrency(stock.eps) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">EBITDA</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.ebitda ? formatLargeCurrency(stock.ebitda) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Dividend Yield</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Range */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Trading Range
              </h3>
              <div className="space-y-4">
                {/* Day Range */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>Day Range</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.dayLow)}</span>
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.dayHigh)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-spreads-green dark:bg-green-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                {/* 52 Week Range */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>52 Week Range</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.yearLow)}</span>
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(stock.yearHigh)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-spreads-tan rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((stock.price - stock.yearLow) / (stock.yearHigh - stock.yearLow)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Company Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sector</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.sector}
                  </span>
                </div>
                {stock.industry && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Industry</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {stock.industry}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Exchange</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {stock.exchange}
                  </span>
                </div>
              </div>
            </div>

            {/* Back to Dashboard Button */}
            <Link
              href="/"
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
