'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Stock, SortField, SortDirection, FilterState } from '@/lib/types'
import { formatCurrency, formatLargeCurrency, formatPercent, formatRatio } from '@/lib/utils'
import StockLogo from './StockLogo'

interface StockTableProps {
  stocks: Stock[]
  filters: FilterState
  watchlist: string[]
  compareList: string[]
  onToggleWatchlist: (symbol: string) => void
  onToggleCompare: (symbol: string) => void
}

const ITEMS_PER_PAGE = 50

export default function StockTable({
  stocks,
  filters,
  watchlist,
  compareList,
  onToggleWatchlist,
  onToggleCompare,
}: StockTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('marketCap')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredAndSortedStocks = useMemo(() => {
    let result = [...stocks]

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchLower) ||
          stock.name.toLowerCase().includes(searchLower)
      )
    }

    if (filters.sector) {
      result = result.filter((stock) => stock.sector === filters.sector)
    }

    if (filters.marketCapMin !== null) {
      result = result.filter((stock) => stock.marketCap >= filters.marketCapMin!)
    }

    if (filters.marketCapMax !== null) {
      result = result.filter((stock) => stock.marketCap <= filters.marketCapMax!)
    }

    if (filters.peMin !== null) {
      result = result.filter((stock) => stock.pe !== null && stock.pe >= filters.peMin!)
    }

    if (filters.peMax !== null) {
      result = result.filter((stock) => stock.pe !== null && stock.pe <= filters.peMax!)
    }

    if (filters.hasDividend === true) {
      result = result.filter((stock) => stock.dividendYield !== null && stock.dividendYield > 0)
    } else if (filters.hasDividend === false) {
      result = result.filter((stock) => stock.dividendYield === null || stock.dividendYield === 0)
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      // Handle null values
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      // Number comparison
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })

    return result
  }, [stocks, filters, sortField, sortDirection])

  const totalPages = Math.ceil(filteredAndSortedStocks.length / ITEMS_PER_PAGE)
  const paginatedStocks = filteredAndSortedStocks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4" style={{ color: 'var(--spreads-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" style={{ color: 'var(--spreads-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="table-container">
        <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <tr>
              <th className="table-header w-10"></th>
              <th className="table-header w-12"></th>
              <th className="table-header" onClick={() => handleSort('symbol')}>
                <div className="flex items-center gap-1">
                  Ticker <SortIcon field="symbol" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Company <SortIcon field="name" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('price')}>
                <div className="flex items-center gap-1">
                  Price <SortIcon field="price" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('changesPercentage')}>
                <div className="flex items-center gap-1">
                  Change <SortIcon field="changesPercentage" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('marketCap')}>
                <div className="flex items-center gap-1">
                  Market Cap <SortIcon field="marketCap" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('pe')}>
                <div className="flex items-center gap-1">
                  P/E <SortIcon field="pe" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('eps')}>
                <div className="flex items-center gap-1">
                  EPS <SortIcon field="eps" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('ebitda')}>
                <div className="flex items-center gap-1">
                  EBITDA <SortIcon field="ebitda" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('dividendYield')}>
                <div className="flex items-center gap-1">
                  Div Yield <SortIcon field="dividendYield" />
                </div>
              </th>
              <th className="table-header" onClick={() => handleSort('sector')}>
                <div className="flex items-center gap-1">
                  Sector <SortIcon field="sector" />
                </div>
              </th>
              <th className="table-header w-24">Actions</th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'var(--card-bg)' }}>
            {paginatedStocks.map((stock) => (
              <tr
                key={stock.symbol}
                className="cursor-pointer transition-colors table-row-animated"
                style={{ borderBottom: '1px solid var(--border-color)' }}
                onClick={() => router.push(`/stock/${stock.symbol}`)}
              >
                <td className="table-cell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleWatchlist(stock.symbol)
                    }}
                    className="p-1 rounded transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {watchlist.includes(stock.symbol) ? (
                      <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 hover:text-yellow-500" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="table-cell">
                  <StockLogo symbol={stock.symbol} logo={stock.logo} size="md" />
                </td>
                <td className="table-cell font-semibold" style={{ color: 'var(--spreads-green)' }}>{stock.symbol}</td>
                <td className="table-cell max-w-[200px] truncate">{stock.name}</td>
                <td className="table-cell font-medium">{formatCurrency(stock.price)}</td>
                <td className={`table-cell font-medium ${stock.changesPercentage >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(stock.changesPercentage)}
                </td>
                <td className="table-cell">{formatLargeCurrency(stock.marketCap)}</td>
                <td className="table-cell">{formatRatio(stock.pe)}</td>
                <td className="table-cell">{formatCurrency(stock.eps)}</td>
                <td className="table-cell">{formatLargeCurrency(stock.ebitda)}</td>
                <td className="table-cell">
                  {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
                </td>
                <td className="table-cell">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--spreads-green)'
                    }}
                  >
                    {stock.sector}
                  </span>
                </td>
                <td className="table-cell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleCompare(stock.symbol)
                    }}
                    className="px-2 py-1 text-xs rounded transition-colors"
                    style={
                      compareList.includes(stock.symbol)
                        ? { backgroundColor: 'var(--spreads-green)', color: 'white' }
                        : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                    }
                  >
                    {compareList.includes(stock.symbol) ? 'Selected' : 'Compare'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-color)'
        }}
      >
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedStocks.length)} of{' '}
          {filteredAndSortedStocks.length} stocks
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)'
            }}
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 text-sm rounded transition-colors"
                  style={
                    currentPage === pageNum
                      ? { backgroundColor: 'var(--spreads-green)', color: 'white' }
                      : {
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--card-bg)',
                          color: 'var(--text-primary)'
                        }
                  }
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)'
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
