'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import StockTable from './components/StockTable'
import StockFilters from './components/StockFilters'
import SectorChart from './components/SectorChart'
import Watchlist from './components/Watchlist'
import ComparisonTool from './components/ComparisonTool'
import StockModal from './components/StockModal'
import StockOfTheWeek from './components/StockOfTheWeek'
import PERatioRanking from './components/PERatioRanking'
import EarningsCalendar from './components/EarningsCalendar'
import { Stock, FilterState, TabType } from '@/lib/types'
import { generateMockStocks } from '@/lib/api'

const WATCHLIST_STORAGE_KEY = 'spreads_watchlist'
const COMPARE_STORAGE_KEY = 'spreads_compare'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
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

  // Load stocks
  useEffect(() => {
    const loadStocks = async () => {
      setLoading(true)
      try {
        // In production, this would call the API
        // For demo, we use mock data
        const data = generateMockStocks()
        setStocks(data)
      } catch (error) {
        console.error('Failed to load stocks:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStocks()
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
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div key="dashboard" className="content-panel">
            {/* Stock of the Week Section */}
            <StockOfTheWeek stocks={stocks} onSelectStock={handleSelectStock} />

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">S&P 500 Stocks</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Analyze {stocks.length} stocks with comprehensive financial metrics
              </p>
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
                  onSelectStock={handleSelectStock}
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

      case 'watchlist':
        return (
          <div key="watchlist" className="content-panel">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your Watchlist</h2>
              <p className="text-gray-600 dark:text-gray-400">Track and monitor your favorite stocks</p>
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Compare Stocks</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Compare up to 5 stocks side by side
              </p>
            </div>

            <ComparisonTool
              stocks={stocks}
              compareList={compareList}
              onRemove={handleToggleCompare}
              onClearAll={handleClearCompare}
            />
          </div>
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
        <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Spreads Stock Analysis</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">S&P 500 Financial Dashboard</p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Data provided by Financial Modeling Prep
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
