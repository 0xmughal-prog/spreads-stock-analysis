'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Stock } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent } from '@/lib/utils'

interface TrendingStock {
  symbol: string
  watchlistCount?: number
  sentiment?: string
}

interface StockHeroSectionProps {
  stocks: Stock[]
}

export default function StockHeroSection({ stocks }: StockHeroSectionProps) {
  const [trendingSymbols, setTrendingSymbols] = useState<TrendingStock[]>([])
  const [trendingSource, setTrendingSource] = useState<'api' | 'fallback' | 'cache'>('fallback')

  // Fetch trending stocks from StockTwits API
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/trending')
        if (response.ok) {
          const data = await response.json()
          setTrendingSymbols(data.data)
          setTrendingSource(data.source)
        }
      } catch (error) {
        console.error('Failed to fetch trending stocks:', error)
      }
    }
    fetchTrending()
  }, [])

  // Top 3 gainers (highest positive change)
  const topGainers = useMemo(() => {
    return [...stocks]
      .filter(s => s.changesPercentage > 0)
      .sort((a, b) => b.changesPercentage - a.changesPercentage)
      .slice(0, 3)
  }, [stocks])

  // Top 3 biggest dips (largest negative change)
  const biggestDips = useMemo(() => {
    return [...stocks]
      .filter(s => s.changesPercentage < 0)
      .sort((a, b) => a.changesPercentage - b.changesPercentage)
      .slice(0, 3)
  }, [stocks])

  // Get trending stocks that exist in our stocks data
  const trendingStocks = useMemo(() => {
    const stockMap = new Map(stocks.map(s => [s.symbol, s]))
    return trendingSymbols
      .filter(t => stockMap.has(t.symbol))
      .map(t => ({
        ...stockMap.get(t.symbol)!,
        watchlistCount: t.watchlistCount
      }))
      .slice(0, 3)
  }, [stocks, trendingSymbols])

  // Generate stock logo placeholder with company initials
  const getStockInitials = (symbol: string, name: string) => {
    return symbol.slice(0, 2).toUpperCase()
  }

  // Get a consistent color for each stock logo based on symbol
  const getLogoColor = (symbol: string, isGainer: boolean, isDip: boolean) => {
    if (isGainer) return 'bg-emerald-500'
    if (isDip) return 'bg-red-500'
    // For trending, use brand colors
    const colors = [
      'bg-spreads-green',
      'bg-blue-500',
      'bg-purple-500',
      'bg-amber-500',
      'bg-cyan-500',
    ]
    const index = symbol.charCodeAt(0) % colors.length
    return colors[index]
  }

  const formatWatchlistCount = (count?: number) => {
    if (!count) return ''
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M watching`
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K watching`
    return `${count} watching`
  }

  if (stocks.length === 0) {
    return null
  }

  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-spreads-green to-emerald-600 text-white shadow-lg shadow-spreads-green/20">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold font-heading" style={{ color: 'var(--text-primary)' }}>
            Market Overview
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Today&apos;s top movers and trending stocks
          </p>
        </div>
      </div>

      {/* Three Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Gainers Column */}
        <div className="hero-card group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-heading" style={{ color: 'var(--text-primary)' }}>
                Top Gainers
              </h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                24H
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            {topGainers.map((stock, index) => (
              <Link
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className="hero-stock-row"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${getLogoColor(stock.symbol, true, false)} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                    {getStockInitials(stock.symbol, stock.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-spreads-green dark:text-emerald-400">{stock.symbol}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(stock.price)}</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {formatPercent(stock.changesPercentage)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Trending Column */}
        <div className="hero-card group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-heading" style={{ color: 'var(--text-primary)' }}>
                Trending
              </h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                24H
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            {trendingStocks.length > 0 ? (
              trendingStocks.map((stock, index) => (
                <Link
                  key={stock.symbol}
                  href={`/stock/${stock.symbol}`}
                  className="hero-stock-row"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${getLogoColor(stock.symbol, false, false)} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                      {getStockInitials(stock.symbol, stock.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-spreads-green dark:text-emerald-400">{stock.symbol}</span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{stock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(stock.price)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatWatchlistCount(stock.watchlistCount) || formatLargeCurrency(stock.marketCap)}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              // Fallback while loading
              [1, 2, 3].map((_, index) => (
                <div key={index} className="hero-stock-row opacity-50" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl skeleton" />
                    <div className="flex-1">
                      <div className="h-4 w-16 rounded skeleton mb-1" />
                      <div className="h-3 w-24 rounded skeleton" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-16 rounded skeleton mb-1 ml-auto" />
                    <div className="h-3 w-20 rounded skeleton ml-auto" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* StockTwits attribution */}
          {trendingSource !== 'fallback' && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.942 1.312 3.5a4.5 4.5 0 01.058.5 3 3 0 01-2.999 3.12z" clipRule="evenodd" />
                </svg>
                Powered by StockTwits
              </p>
            </div>
          )}
        </div>

        {/* Biggest Dips Column */}
        <div className="hero-card group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-heading" style={{ color: 'var(--text-primary)' }}>
                Biggest Dips
              </h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                24H
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            {biggestDips.map((stock, index) => (
              <Link
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className="hero-stock-row"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${getLogoColor(stock.symbol, false, true)} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                    {getStockInitials(stock.symbol, stock.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-spreads-green dark:text-emerald-400">{stock.symbol}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(stock.price)}</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {formatPercent(stock.changesPercentage)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
