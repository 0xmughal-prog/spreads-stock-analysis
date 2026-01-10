'use client'

import { FilterState } from '@/lib/types'
import { SECTORS } from '@/lib/utils'

interface StockFiltersProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
}

export default function StockFilters({ filters, onFilterChange }: StockFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value })
  }

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, sector: e.target.value })
  }

  const handleMarketCapMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) * 1e9 : null
    onFilterChange({ ...filters, marketCapMin: value })
  }

  const handleMarketCapMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) * 1e9 : null
    onFilterChange({ ...filters, marketCapMax: value })
  }

  const handlePEMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null
    onFilterChange({ ...filters, peMin: value })
  }

  const handlePEMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null
    onFilterChange({ ...filters, peMax: value })
  }

  const handleDividendChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === '' ? null : e.target.value === 'true'
    onFilterChange({ ...filters, hasDividend: value })
  }

  const clearFilters = () => {
    onFilterChange({
      search: '',
      sector: '',
      marketCapMin: null,
      marketCapMax: null,
      peMin: null,
      peMax: null,
      hasDividend: null,
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.sector ||
    filters.marketCapMin !== null ||
    filters.marketCapMax !== null ||
    filters.peMin !== null ||
    filters.peMax !== null ||
    filters.hasDividend !== null

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by ticker or company name..."
              value={filters.search}
              onChange={handleSearchChange}
              className="input-field pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
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

        {/* Sector */}
        <div className="w-48">
          <select
            value={filters.sector}
            onChange={handleSectorChange}
            className="select-field"
          >
            <option value="">All Sectors</option>
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>

        {/* Market Cap Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">Market Cap:</span>
          <input
            type="number"
            placeholder="Min (B)"
            value={filters.marketCapMin ? filters.marketCapMin / 1e9 : ''}
            onChange={handleMarketCapMinChange}
            className="input-field w-24"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max (B)"
            value={filters.marketCapMax ? filters.marketCapMax / 1e9 : ''}
            onChange={handleMarketCapMaxChange}
            className="input-field w-24"
          />
        </div>

        {/* P/E Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">P/E:</span>
          <input
            type="number"
            placeholder="Min"
            value={filters.peMin ?? ''}
            onChange={handlePEMinChange}
            className="input-field w-20"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.peMax ?? ''}
            onChange={handlePEMaxChange}
            className="input-field w-20"
          />
        </div>

        {/* Dividend */}
        <div className="w-36">
          <select
            value={filters.hasDividend === null ? '' : String(filters.hasDividend)}
            onChange={handleDividendChange}
            className="select-field"
          >
            <option value="">Any Dividend</option>
            <option value="true">Has Dividend</option>
            <option value="false">No Dividend</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-secondary text-sm px-3 py-1.5"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  )
}
