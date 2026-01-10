'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { Stock } from '@/lib/types'
import { formatLargeCurrency, formatCurrency, formatPercent } from '@/lib/utils'

interface ComparisonToolProps {
  stocks: Stock[]
  compareList: string[]
  onRemove: (symbol: string) => void
  onClearAll: () => void
  onAddStock: (symbol: string) => void
}

const COLORS = ['#004225', '#006633', '#008844', '#00aa55', '#00cc66']
const DARK_COLORS = ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7']

export default function ComparisonTool({ stocks, compareList, onRemove, onClearAll, onAddStock }: ComparisonToolProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const compareStocks = stocks.filter((stock) => compareList.includes(stock.symbol))

  // Filter stocks for search dropdown (exclude already selected)
  const filteredStocks = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase()
    return stocks
      .filter(
        (stock) =>
          !compareList.includes(stock.symbol) &&
          (stock.symbol.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query))
      )
      .slice(0, 10)
  }, [stocks, searchQuery, compareList])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddStock = (symbol: string) => {
    if (compareList.length < 5) {
      onAddStock(symbol)
      setSearchQuery('')
      setIsDropdownOpen(false)
    }
  }

  const barChartData = useMemo(() => {
    if (compareStocks.length === 0) return []

    return [
      {
        metric: 'Market Cap (B)',
        ...Object.fromEntries(
          compareStocks.map((s) => [s.symbol, (s.marketCap / 1e9).toFixed(1)])
        ),
      },
      {
        metric: 'P/E Ratio',
        ...Object.fromEntries(compareStocks.map((s) => [s.symbol, s.pe?.toFixed(1) || 0])),
      },
      {
        metric: 'EPS',
        ...Object.fromEntries(compareStocks.map((s) => [s.symbol, s.eps?.toFixed(2) || 0])),
      },
      {
        metric: 'Div Yield %',
        ...Object.fromEntries(compareStocks.map((s) => [s.symbol, s.dividendYield?.toFixed(2) || 0])),
      },
    ]
  }, [compareStocks])

  const radarData = useMemo(() => {
    if (compareStocks.length === 0) return []

    const maxMarketCap = Math.max(...compareStocks.map((s) => s.marketCap))
    const maxPE = Math.max(...compareStocks.map((s) => s.pe || 0))
    const maxEPS = Math.max(...compareStocks.map((s) => s.eps || 0))
    const maxDivYield = Math.max(...compareStocks.map((s) => s.dividendYield || 0))
    const maxChange = Math.max(...compareStocks.map((s) => Math.abs(s.changesPercentage)))

    return [
      {
        metric: 'Market Cap',
        ...Object.fromEntries(
          compareStocks.map((s) => [s.symbol, maxMarketCap > 0 ? (s.marketCap / maxMarketCap) * 100 : 0])
        ),
      },
      {
        metric: 'P/E Ratio',
        ...Object.fromEntries(
          compareStocks.map((s) => [s.symbol, maxPE > 0 ? ((s.pe || 0) / maxPE) * 100 : 0])
        ),
      },
      {
        metric: 'EPS',
        ...Object.fromEntries(
          compareStocks.map((s) => [s.symbol, maxEPS > 0 ? ((s.eps || 0) / maxEPS) * 100 : 0])
        ),
      },
      {
        metric: 'Div Yield',
        ...Object.fromEntries(
          compareStocks.map((s) => [s.symbol, maxDivYield > 0 ? ((s.dividendYield || 0) / maxDivYield) * 100 : 0])
        ),
      },
      {
        metric: 'Volatility',
        ...Object.fromEntries(
          compareStocks.map((s) => [
            s.symbol,
            maxChange > 0 ? (Math.abs(s.changesPercentage) / maxChange) * 100 : 0,
          ])
        ),
      },
    ]
  }, [compareStocks])

  // Stock Search Component
  const StockSearch = () => (
    <div className="card p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Add Stocks to Compare
      </h3>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        Search and add up to 5 stocks for comparison
      </p>
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by symbol or company name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsDropdownOpen(true)
              }}
              onFocus={() => setIsDropdownOpen(true)}
              disabled={compareList.length >= 5}
              className="input-field w-full pr-10"
              style={{
                opacity: compareList.length >= 5 ? 0.5 : 1,
                cursor: compareList.length >= 5 ? 'not-allowed' : 'text'
              }}
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
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
          </div>
        </div>

        {/* Dropdown */}
        {isDropdownOpen && filteredStocks.length > 0 && (
          <div
            className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)'
            }}
          >
            {filteredStocks.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => handleAddStock(stock.symbol)}
                className="w-full px-4 py-3 text-left transition-colors flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-color)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <span className="font-semibold" style={{ color: 'var(--spreads-green)' }}>
                    {stock.symbol}
                  </span>
                  <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {stock.name}
                  </span>
                </div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {stock.sector}
                </span>
              </button>
            ))}
          </div>
        )}

        {isDropdownOpen && searchQuery && filteredStocks.length === 0 && (
          <div
            className="absolute z-50 w-full mt-1 p-4 rounded-lg text-center"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}
          >
            No stocks found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {compareList.length >= 5 && (
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Maximum of 5 stocks reached. Remove a stock to add another.
        </p>
      )}

      {/* Selected count indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {compareList.length}/5 stocks selected
        </span>
        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              backgroundColor: 'var(--spreads-green)',
              width: `${(compareList.length / 5) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  )

  if (compareStocks.length === 0) {
    return (
      <div>
        <StockSearch />
        <div className="card p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No stocks selected for comparison
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Use the search above or click the &quot;Compare&quot; button on any stock in the dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stock Search */}
      <StockSearch />

      {/* Selected Stocks */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Comparing {compareStocks.length} stocks
          </h3>
          <button onClick={onClearAll} className="btn-secondary text-sm px-3 py-1.5">
            Clear All
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {compareStocks.map((stock, index) => (
            <div
              key={stock.symbol}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            >
              <span>{stock.symbol}</span>
              <button
                onClick={() => onRemove(stock.symbol)}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <tr>
              <th className="table-header">Metric</th>
              {compareStocks.map((stock) => (
                <th key={stock.symbol} className="table-header text-center">
                  {stock.symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'var(--card-bg)' }}>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">Company</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {stock.name}
                </td>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">Price</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center font-medium">
                  {formatCurrency(stock.price)}
                </td>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">Change</td>
              {compareStocks.map((stock) => (
                <td
                  key={stock.symbol}
                  className={`table-cell text-center font-medium ${
                    stock.changesPercentage >= 0 ? 'positive' : 'negative'
                  }`}
                >
                  {formatPercent(stock.changesPercentage)}
                </td>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">Market Cap</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {formatLargeCurrency(stock.marketCap)}
                </td>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">P/E Ratio</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {stock.pe?.toFixed(2) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">EPS</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {formatCurrency(stock.eps)}
                </td>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">EBITDA</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {formatLargeCurrency(stock.ebitda)}
                </td>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="table-cell font-medium">Dividend Yield</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="table-cell font-medium">Sector</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {stock.sector}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Metrics Comparison
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="metric" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Legend />
                {compareStocks.map((stock, index) => (
                  <Bar
                    key={stock.symbol}
                    dataKey={stock.symbol}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Relative Performance
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                {compareStocks.map((stock, index) => (
                  <Radar
                    key={stock.symbol}
                    name={stock.symbol}
                    dataKey={stock.symbol}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
