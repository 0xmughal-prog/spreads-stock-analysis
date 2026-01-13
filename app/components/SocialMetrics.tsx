'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Stock, TrendingRedditStock, RedditSentimentData } from '@/lib/types'
import { formatMentions, formatRedditScore, getSentimentColor, formatRelativeTime, SUBREDDIT_COLORS } from '@/lib/utils'

interface SocialMetricsProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
  onToggleWatchlist: (symbol: string) => void
  watchlist: string[]
}

type SortField = 'redditScore' | 'mentions' | 'upvotes' | 'comments'
type TimeFilter = '24h' | '7d'

// Tooltip component for explaining the scoring system
function ScoreTooltip({ show, position }: { show: boolean; position: 'left' | 'right' }) {
  if (!show) return null

  return (
    <div
      className={`absolute z-50 w-80 p-4 rounded-xl shadow-xl border ${
        position === 'right' ? 'left-full ml-2' : 'right-full mr-2'
      } top-0`}
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
        Reddit Score Formula
      </h4>

      <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Hybrid Score Formula:</p>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">60%</span>
              <span>Volume: (mentions / total posts) × 100</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">40%</span>
              <span>Engagement: avg upvotes + avg comments</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">×</span>
              <span>Sentiment multiplier (0.5× to 1.5×)</span>
            </div>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Balances buzz volume with post quality/virality
          </p>
        </div>

        <div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sentiment Analysis:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs">Bullish keywords: calls, moon, buy, breakout...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-xs">Bearish keywords: puts, short, crash, FUD...</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Bullish posts boost score, bearish posts reduce it
            </p>
          </div>
        </div>

        <div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Subreddit Weights:</p>
          <div className="grid grid-cols-2 gap-1">
            <div className="flex justify-between">
              <span>r/wallstreetbets</span>
              <span className="font-mono">1.0×</span>
            </div>
            <div className="flex justify-between">
              <span>r/stocks</span>
              <span className="font-mono">0.8×</span>
            </div>
            <div className="flex justify-between">
              <span>r/options</span>
              <span className="font-mono">0.7×</span>
            </div>
            <div className="flex justify-between">
              <span>r/investing</span>
              <span className="font-mono">0.6×</span>
            </div>
          </div>
        </div>

        <div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Overall Sentiment:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>&gt;50% bullish posts = Bullish</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              <span>Mixed sentiment = Neutral</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>&gt;50% bearish posts = Bearish</span>
            </div>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div
        className={`absolute top-4 w-2 h-2 rotate-45 border ${
          position === 'right' ? '-left-1 border-r-0 border-t-0' : '-right-1 border-l-0 border-b-0'
        }`}
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
        }}
      />
    </div>
  )
}

export default function SocialMetrics({
  stocks,
  onSelectStock,
  onToggleWatchlist,
  watchlist,
}: SocialMetricsProps) {
  const [trendingData, setTrendingData] = useState<TrendingRedditStock[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('redditScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [selectedStockData, setSelectedStockData] = useState<{ data24h: RedditSentimentData; data7d: RedditSentimentData } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h')
  const [showScoreTooltip, setShowScoreTooltip] = useState(false)
  const [showDetailTooltip, setShowDetailTooltip] = useState(false)

  // Fetch trending data
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/reddit-trending')
        if (response.ok) {
          const data = await response.json()
          setTrendingData(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch Reddit trending:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
  }, [])

  // Fetch detailed data when a stock is selected
  useEffect(() => {
    if (!selectedStock) {
      setSelectedStockData(null)
      return
    }

    const fetchDetail = async () => {
      try {
        setDetailLoading(true)
        const response = await fetch(`/api/reddit-sentiment/${selectedStock}`)
        if (response.ok) {
          const data = await response.json()
          setSelectedStockData({ data24h: data.data24h, data7d: data.data7d })
        }
      } catch (error) {
        console.error('Failed to fetch stock sentiment:', error)
      } finally {
        setDetailLoading(false)
      }
    }
    fetchDetail()
  }, [selectedStock])

  // Merge trending data with stock data
  const mergedData = useMemo(() => {
    const stockMap = new Map(stocks.map(s => [s.symbol, s]))
    return trendingData.map(t => ({
      ...t,
      stockData: stockMap.get(t.symbol),
    }))
  }, [stocks, trendingData])

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let result = [...mergedData]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        item =>
          item.symbol.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number, bVal: number
      switch (sortField) {
        case 'redditScore':
          aVal = a.redditScore
          bVal = b.redditScore
          break
        case 'mentions':
          aVal = a.totalMentions
          bVal = b.totalMentions
          break
        default:
          aVal = a.redditScore
          bVal = b.redditScore
      }
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
    })

    return result
  }, [mergedData, searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <svg
      className={`w-4 h-4 transition-transform ${sortField === field ? 'opacity-100' : 'opacity-30'} ${
        sortField === field && sortDirection === 'asc' ? 'rotate-180' : ''
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )

  const currentDetailData = selectedStockData
    ? timeFilter === '24h'
      ? selectedStockData.data24h
      : selectedStockData.data7d
    : null

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Social Metrics
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Reddit sentiment analysis from r/wallstreetbets, r/stocks, r/investing, r/options
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Stocks Tracked
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {trendingData.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Bullish Sentiment
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {trendingData.filter(t => t.sentiment === 'bullish').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Neutral Sentiment
          </p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {trendingData.filter(t => t.sentiment === 'neutral').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Bearish Sentiment
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {trendingData.filter(t => t.sentiment === 'bearish').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Search and Filters */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-8">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 rounded skeleton" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="text-left p-4 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Stock
                      </th>
                      <th
                        className="text-right p-4 text-xs font-medium uppercase tracking-wide cursor-pointer hover:text-orange-500 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => handleSort('redditScore')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowScoreTooltip(!showScoreTooltip)
                              }}
                              onMouseEnter={() => setShowScoreTooltip(true)}
                              onMouseLeave={() => setShowScoreTooltip(false)}
                              className="p-0.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                              title="How is Reddit Score calculated?"
                            >
                              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <ScoreTooltip show={showScoreTooltip} position="right" />
                          </div>
                          Reddit Score
                          <SortIcon field="redditScore" />
                        </div>
                      </th>
                      <th className="text-center p-4 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Sentiment
                      </th>
                      <th
                        className="text-right p-4 text-xs font-medium uppercase tracking-wide cursor-pointer hover:text-orange-500 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => handleSort('mentions')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Mentions
                          <SortIcon field="mentions" />
                        </div>
                      </th>
                      <th className="text-center p-4 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Top Subreddit
                      </th>
                      <th className="text-center p-4 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSorted.map((item, index) => {
                      const sentimentColors = getSentimentColor(item.sentiment)
                      const scoreInfo = formatRedditScore(item.redditScore)
                      const isInWatchlist = watchlist.includes(item.symbol)
                      const isSelected = selectedStock === item.symbol

                      return (
                        <tr
                          key={item.symbol}
                          className={`transition-colors cursor-pointer ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                          style={{ borderBottom: '1px solid var(--border-color)' }}
                          onClick={() => setSelectedStock(isSelected ? null : item.symbol)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-xs font-bold">
                                {item.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <Link
                                  href={`/stock/${item.symbol}`}
                                  className="font-semibold text-spreads-green dark:text-emerald-400 hover:underline"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {item.symbol}
                                </Link>
                                <p className="text-xs truncate max-w-[150px]" style={{ color: 'var(--text-secondary)' }}>
                                  {item.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              {item.redditScore}
                            </span>
                            <p className={`text-xs ${scoreInfo.color}`}>{scoreInfo.text}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sentimentColors.bg} ${sentimentColors.text}`}>
                              {sentimentColors.icon} {item.sentiment}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {formatMentions(item.totalMentions)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${SUBREDDIT_COLORS[item.topSubreddit] || '#FF4500'}20`,
                                color: SUBREDDIT_COLORS[item.topSubreddit] || '#FF4500',
                              }}
                            >
                              r/{item.topSubreddit}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                onToggleWatchlist(item.symbol)
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isInWatchlist
                                  ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                              title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                            >
                              <svg className="w-5 h-5" fill={isInWatchlist ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {filteredAndSorted.length === 0 && (
                  <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No stocks found matching your search.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-4">
            {selectedStock && currentDetailData ? (
              <>
                {/* Header with time toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
                      {selectedStock.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{selectedStock}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reddit Sentiment</p>
                    </div>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                      onClick={() => setTimeFilter('24h')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        timeFilter === '24h'
                          ? 'bg-orange-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      style={timeFilter !== '24h' ? { color: 'var(--text-secondary)' } : {}}
                    >
                      24H
                    </button>
                    <button
                      onClick={() => setTimeFilter('7d')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        timeFilter === '7d'
                          ? 'bg-orange-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      style={timeFilter !== '7d' ? { color: 'var(--text-secondary)' } : {}}
                    >
                      7D
                    </button>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 rounded-lg skeleton" />
                    <div className="h-32 rounded-lg skeleton" />
                  </div>
                ) : (
                  <>
                    {/* Score */}
                    <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reddit Score</p>
                            <div className="relative">
                              <button
                                onClick={() => setShowDetailTooltip(!showDetailTooltip)}
                                onMouseEnter={() => setShowDetailTooltip(true)}
                                onMouseLeave={() => setShowDetailTooltip(false)}
                                className="p-0.5 rounded hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors"
                                title="How is Reddit Score calculated?"
                              >
                                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <ScoreTooltip show={showDetailTooltip} position="right" />
                            </div>
                          </div>
                          <span className="text-3xl font-bold text-orange-500">{currentDetailData.redditScore}</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg ${getSentimentColor(currentDetailData.sentiment).bg}`}>
                          <span className={`text-sm font-medium ${getSentimentColor(currentDetailData.sentiment).text}`}>
                            {getSentimentColor(currentDetailData.sentiment).icon} {currentDetailData.sentiment}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatMentions(currentDetailData.totalMentions)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mentions</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatMentions(currentDetailData.totalUpvotes)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Upvotes</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatMentions(currentDetailData.totalComments)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Comments</p>
                      </div>
                    </div>

                    {/* Subreddit Breakdown */}
                    {currentDetailData.subredditBreakdown.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                          Subreddit Breakdown
                        </p>
                        <div className="space-y-2">
                          {currentDetailData.subredditBreakdown
                            .filter(sub => sub.mentionCount > 0)
                            .sort((a, b) => b.mentionCount - a.mentionCount)
                            .map(sub => {
                              const maxMentions = Math.max(...currentDetailData.subredditBreakdown.map(s => s.mentionCount), 1)
                              return (
                                <div key={sub.subreddit} className="flex items-center gap-2">
                                  <span className="text-xs w-20 truncate" style={{ color: 'var(--text-secondary)' }}>
                                    r/{sub.subreddit}
                                  </span>
                                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${(sub.mentionCount / maxMentions) * 100}%`,
                                        backgroundColor: SUBREDDIT_COLORS[sub.subreddit] || '#FF4500',
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium w-6 text-right" style={{ color: 'var(--text-secondary)' }}>
                                    {sub.mentionCount}
                                  </span>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    {/* Top Posts */}
                    {currentDetailData.topPosts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                          Top Posts
                        </p>
                        <div className="space-y-2">
                          {currentDetailData.topPosts.slice(0, 3).map(post => (
                            <a
                              key={post.id}
                              href={`https://reddit.com${post.permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                              style={{ backgroundColor: 'var(--bg-tertiary)' }}
                            >
                              <p className="text-xs line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>
                                {post.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <span>{formatMentions(post.score)} pts</span>
                                <span>{post.num_comments} comments</span>
                                <span>{formatRelativeTime(post.created_utc)}</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View Full Page Link */}
                    <Link
                      href={`/stock/${selectedStock}`}
                      className="mt-4 block w-full text-center py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      View Stock Details
                    </Link>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
                <p className="text-sm">Select a stock to view detailed Reddit sentiment</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="mt-6 text-center">
        <p className="text-xs flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
          </svg>
          Data from Reddit (r/wallstreetbets, r/stocks, r/investing, r/options) - Updated every 2 hours
        </p>
      </div>
    </div>
  )
}
