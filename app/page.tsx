'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import StockTable from './components/StockTable'
import StockFilters from './components/StockFilters'
import SectorChart from './components/SectorChart'
import Watchlist from './components/Watchlist'
import ComparisonTool from './components/ComparisonTool'
import StockModal from './components/StockModal'
import StockHeroSection from './components/StockHeroSection'
import PERatioRanking from './components/PERatioRanking'
import EarningsCalendar from './components/EarningsCalendar'
import RevenueGrowth from './components/RevenueGrowth'
import DividendsRanking from './components/DividendsRanking'
import SocialMetrics from './components/SocialMetrics'
import PointsRewards from './components/PointsRewards'
import CompoundInterestCalculator from './components/CompoundInterestCalculator'
import { Stock, FilterState, TabType } from '@/lib/types'

const WATCHLIST_STORAGE_KEY = 'spreads_watchlist'
const COMPARE_STORAGE_KEY = 'spreads_compare'

interface StockApiResponse {
  data: Stock[]
  source: 'api' | 'mock'
  message: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'api' | 'mock' | 'cache'>('mock')
  const [cacheHoursRemaining, setCacheHoursRemaining] = useState<number | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [compareList, setCompareList] = useState<string[]>([])
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sector: '',
    marketCapMin: null,
    marketCapMax: null,
    peMin: null,
    peMax: null,
    hasDividend: null,
  })

  // Load stocks from server API (uses Vercel KV caching)
  useEffect(() => {
    const loadStocks = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/stocks')
        if (!response.ok) throw new Error('Failed to fetch stocks')

        const result = await response.json()
        setStocks(result.data)
        setDataSource(result.source === 'mock' ? 'mock' : 'api')

        if (result.cached && result.cacheAge) {
          // Cache has 5-min TTL, show remaining time
          const remainingMinutes = Math.max(0, Math.ceil((300 - result.cacheAge) / 60))
          setCacheHoursRemaining(remainingMinutes)
        } else {
          setCacheHoursRemaining(5)
        }
      } catch (error) {
        console.error('Failed to load stocks:', error)
        setDataSource('mock')
      } finally {
        setLoading(false)
      }
    }

    loadStocks()
  }, [])

  // Function to force refresh data
  const handleRefreshData = useCallback(async () => {
    setLoading(true)

    try {
      // Add cache-busting query param to force fresh fetch
      const response = await fetch('/api/stocks?refresh=' + Date.now())
      if (!response.ok) throw new Error('Failed to fetch stocks')

      const result = await response.json()
      setStocks(result.data)
      setDataSource(result.source === 'mock' ? 'mock' : 'api')
      setCacheHoursRemaining(5)
    } catch (error) {
      console.error('Failed to refresh stocks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load watchlist and compare list from localStorage
  useEffect(() => {
    const savedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist))
    }

    const savedCompare = localStorage.getItem(COMPARE_STORAGE_KEY)
    if (savedCompare) {
      setCompareList(JSON.parse(savedCompare))
    }
  }, [])

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  // Save compare list to localStorage
  useEffect(() => {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareList))
  }, [compareList])

  const handleToggleWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    )
  }, [])

  const handleToggleCompare = useCallback((symbol: string) => {
    setCompareList((prev) => {
      if (prev.includes(symbol)) {
        return prev.filter((s) => s !== symbol)
      }
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, symbol]
    })
  }, [])

  const handleClearCompare = useCallback(() => {
    setCompareList([])
  }, [])

  const handleAddToCompare = useCallback((symbol: string) => {
    setCompareList((prev) => {
      if (prev.includes(symbol) || prev.length >= 5) {
        return prev
      }
      return [...prev, symbol]
    })
  }, [])

  const handleSectorClick = useCallback((sector: string) => {
    setFilters((prev) => ({ ...prev, sector }))
  }, [])

  const handleSelectStock = useCallback((stock: Stock) => {
    setSelectedStock(stock)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedStock(null)
  }, [])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-6">
          <div className="h-16 rounded-xl skeleton"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="h-96 rounded-xl skeleton"></div>
            </div>
            <div className="h-96 rounded-xl skeleton"></div>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div key="dashboard" className="content-panel">
            {/* Hero Section - Top Gainers, Trending, Biggest Dips */}
            <StockHeroSection stocks={stocks} />

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Top US Stocks by Market Cap
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Analyze {stocks.length} stocks with price, P/E, EPS, and dividend data
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Data source indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: dataSource === 'api' ? 'rgba(34, 197, 94, 0.1)' :
                        dataSource === 'cache' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: dataSource === 'api' ? 'rgb(34, 197, 94)' :
                        dataSource === 'cache' ? 'rgb(59, 130, 246)' : 'rgb(234, 179, 8)',
                    }}>
                    <span className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: dataSource === 'api' ? 'rgb(34, 197, 94)' :
                          dataSource === 'cache' ? 'rgb(59, 130, 246)' : 'rgb(234, 179, 8)',
                      }} />
                    {dataSource === 'api' ? `Live Data (${cacheHoursRemaining}m cache)` :
                      dataSource === 'cache' ? `Cached (${cacheHoursRemaining}m remaining)` : 'Demo Data'}
                  </div>
                  {/* Refresh button */}
                  <button
                    onClick={handleRefreshData}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    title="Refresh data from API">
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <StockFilters filters={filters} onFilterChange={setFilters} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <StockTable
                  stocks={stocks}
                  filters={filters}
                  watchlist={watchlist}
                  compareList={compareList}
                  onToggleWatchlist={handleToggleWatchlist}
                  onToggleCompare={handleToggleCompare}
                />
              </div>
              <div className="lg:col-span-1">
                <SectorChart
                  stocks={stocks}
                  onSectorClick={handleSectorClick}
                  selectedSector={filters.sector}
                />
              </div>
            </div>
          </div>
        )

      case 'pe-ratio':
        return (
          <PERatioRanking
            key="pe-ratio"
            stocks={stocks}
            onSelectStock={handleSelectStock}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />
        )

      case 'earnings':
        return <EarningsCalendar key="earnings" />

      case 'revenue-growth':
        return (
          <RevenueGrowth
            key="revenue-growth"
            stocks={stocks}
            onSelectStock={handleSelectStock}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />
        )

      case 'dividends':
        return (
          <DividendsRanking
            key="dividends"
            stocks={stocks}
            onSelectStock={handleSelectStock}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />
        )

      case 'social-metrics':
        return (
          <SocialMetrics
            key="social-metrics"
            stocks={stocks}
            onSelectStock={handleSelectStock}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />
        )

      case 'watchlist':
        return (
          <div key="watchlist" className="content-panel">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Your Watchlist</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Track and monitor your favorite stocks</p>
            </div>

            <Watchlist
              stocks={stocks}
              watchlist={watchlist}
              onRemove={handleToggleWatchlist}
              onSelectStock={handleSelectStock}
              onToggleCompare={handleToggleCompare}
              compareList={compareList}
            />
          </div>
        )

      case 'compare':
        return (
          <div key="compare" className="content-panel">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Compare Stocks</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Compare up to 5 stocks side by side
              </p>
            </div>

            <ComparisonTool
              stocks={stocks}
              compareList={compareList}
              onRemove={handleToggleCompare}
              onClearAll={handleClearCompare}
              onAddStock={handleAddToCompare}
            />
          </div>
        )

      case 'compound-interest':
        return (
          <CompoundInterestCalculator
            key="compound-interest"
          />
        )

      case 'points-rewards':
        return (
          <PointsRewards
            key="points-rewards"
            stocks={stocks}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-off-white dark:bg-dark-bg">
      {/* Grid Background */}
      <div className="grid-background" />
      <div className="grid-squares" />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 px-4 flex items-center justify-between"
           style={{ backgroundColor: 'var(--header-bg)' }}>
        <h1 className="text-xl font-bold tracking-tight font-heading text-white">
          SPREADS
        </h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`lg:block ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            setMobileMenuOpen(false)
          }}
          watchlistCount={watchlist.length}
          compareCount={compareList.length}
          onCollapseChange={setSidebarCollapsed}
        />
      </div>

      {/* Main Content */}
      <main className={`min-h-screen relative z-10 transition-all duration-300 pt-16 lg:pt-0 ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </div>

        {/* Footer */}
        <footer className="mt-16" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Spreads Stock Analysis</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>S&P 500 Financial Dashboard</p>
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Data provided by Finnhub
              </div>
            </div>
          </div>
        </footer>
      </main>

      <StockModal
        stock={selectedStock}
        isOpen={selectedStock !== null}
        onClose={handleCloseModal}
        isInWatchlist={selectedStock ? watchlist.includes(selectedStock.symbol) : false}
        onToggleWatchlist={() => selectedStock && handleToggleWatchlist(selectedStock.symbol)}
      />
    </div>
  )
}
