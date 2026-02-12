'use client'

import { useState, useMemo, useEffect } from 'react'
import { Stock } from '@/lib/types'
import StockLogo from './StockLogo'

interface StockHeatmapProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
}

interface TreemapNode {
  stock: Stock
  x: number
  y: number
  width: number
  height: number
  value: number
}

// Sector categories with mapping
const SECTOR_CATEGORIES = {
  'All': [],
  'Technology': ['Technology', 'Information Technology'],
  'Software': ['Technology', 'Information Technology'], // We'll filter by industry too
  'AI': ['Technology', 'Information Technology'], // Special filter for AI companies
  'Finance': ['Financial Services', 'Financials', 'Financial'],
  'Healthcare': ['Healthcare', 'Health Care'],
  'Consumer': ['Consumer Cyclical', 'Consumer Defensive', 'Consumer Discretionary', 'Consumer Staples'],
  'Energy': ['Energy'],
  'Industrials': ['Industrials'],
  'Materials': ['Materials', 'Basic Materials'],
  'Utilities': ['Utilities'],
  'Real Estate': ['Real Estate'],
  'Communication': ['Communication Services', 'Telecommunication Services'],
  'Other': []
}

// AI-related keywords to identify AI companies
const AI_KEYWORDS = ['ai', 'artificial intelligence', 'machine learning', 'openai', 'anthropic', 'nvidia', 'meta', 'alphabet', 'google', 'microsoft', 'tesla', 'palantir']

// Software companies (by name/industry patterns)
const SOFTWARE_KEYWORDS = ['software', 'cloud', 'saas', 'platform', 'data', 'cyber', 'security']

export default function StockHeatmap({ stocks, onSelectStock }: StockHeatmapProps) {
  const [selectedSector, setSelectedSector] = useState<string>('All')
  const [hoveredStock, setHoveredStock] = useState<string | null>(null)

  // Filter stocks by sector
  const filteredStocks = useMemo(() => {
    if (selectedSector === 'All') return stocks

    return stocks.filter(stock => {
      const stockSector = stock.sector || ''
      const stockIndustry = stock.industry || ''
      const stockName = stock.name || ''

      // Special handling for AI filter
      if (selectedSector === 'AI') {
        const searchText = `${stockName} ${stockIndustry}`.toLowerCase()
        return AI_KEYWORDS.some(keyword => searchText.includes(keyword))
      }

      // Special handling for Software filter
      if (selectedSector === 'Software') {
        const searchText = `${stockIndustry}`.toLowerCase()
        return SOFTWARE_KEYWORDS.some(keyword => searchText.includes(keyword))
      }

      // Regular sector filtering
      const allowedSectors = SECTOR_CATEGORIES[selectedSector as keyof typeof SECTOR_CATEGORIES] || []
      if (allowedSectors.length === 0 && selectedSector === 'Other') {
        // "Other" means not in any defined category
        const allDefinedSectors = Object.values(SECTOR_CATEGORIES).flat()
        return !allDefinedSectors.includes(stockSector)
      }

      return allowedSectors.some(sector =>
        stockSector.toLowerCase().includes(sector.toLowerCase())
      )
    })
  }, [stocks, selectedSector])

  // Calculate color based on percentage change (relative scale)
  const getColor = (changePercent: number, min: number, max: number) => {
    const absMax = Math.max(Math.abs(min), Math.abs(max))
    const normalizedChange = changePercent / (absMax || 1)

    if (changePercent > 0) {
      // Green shades for positive
      const intensity = Math.min(normalizedChange * 100, 100)
      if (intensity > 66) return 'rgb(22, 163, 74)' // Dark green
      if (intensity > 33) return 'rgb(34, 197, 94)' // Medium green
      return 'rgb(74, 222, 128)' // Light green
    } else if (changePercent < 0) {
      // Red shades for negative
      const intensity = Math.min(Math.abs(normalizedChange) * 100, 100)
      if (intensity > 66) return 'rgb(220, 38, 38)' // Dark red
      if (intensity > 33) return 'rgb(239, 68, 68)' // Medium red
      return 'rgb(248, 113, 113)' // Light red
    }

    // Neutral gray
    return 'rgb(156, 163, 175)'
  }

  // Simple squarified treemap algorithm
  const treemapLayout = useMemo(() => {
    if (filteredStocks.length === 0) return []

    const containerWidth = 1200
    const containerHeight = 800
    const padding = 2

    // Sort by market cap descending
    const sortedStocks = [...filteredStocks].sort((a, b) => b.marketCap - a.marketCap)
    const totalValue = sortedStocks.reduce((sum, s) => sum + s.marketCap, 0)

    const nodes: TreemapNode[] = []
    let currentX = 0
    let currentY = 0
    let rowHeight = 0
    let rowWidth = 0
    const rows: Stock[][] = []
    let currentRow: Stock[] = []

    // Group into rows
    sortedStocks.forEach((stock, index) => {
      const ratio = stock.marketCap / totalValue
      const area = ratio * containerWidth * containerHeight
      const width = Math.sqrt(area)

      if (rowWidth + width > containerWidth && currentRow.length > 0) {
        rows.push([...currentRow])
        currentRow = [stock]
        rowWidth = width
      } else {
        currentRow.push(stock)
        rowWidth += width
      }
    })
    if (currentRow.length > 0) {
      rows.push(currentRow)
    }

    // Layout rows
    currentY = 0
    rows.forEach(row => {
      const rowTotalValue = row.reduce((sum, s) => sum + s.marketCap, 0)
      const rowHeightCalc = (rowTotalValue / totalValue) * containerHeight

      currentX = 0
      row.forEach(stock => {
        const ratio = stock.marketCap / rowTotalValue
        const width = ratio * containerWidth - padding
        const height = rowHeightCalc - padding

        nodes.push({
          stock,
          x: currentX,
          y: currentY,
          width: Math.max(width, 50), // Minimum width
          height: Math.max(height, 40), // Minimum height
          value: stock.marketCap
        })

        currentX += width + padding
      })

      currentY += rowHeightCalc
    })

    return nodes
  }, [filteredStocks])

  // Get min and max change for relative coloring
  const { minChange, maxChange } = useMemo(() => {
    const changes = filteredStocks.map(s => s.changesPercentage)
    return {
      minChange: Math.min(...changes),
      maxChange: Math.max(...changes)
    }
  }, [filteredStocks])

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Stock Market Heatmap
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Visualize {filteredStocks.length} stocks by market cap and daily performance
        </p>
      </div>

      {/* Sector Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {Object.keys(SECTOR_CATEGORIES).map(sector => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedSector === sector
                  ? 'text-white shadow-lg'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedSector === sector
                  ? 'var(--spreads-green)'
                  : 'var(--card-bg)',
                color: selectedSector === sector
                  ? 'white'
                  : 'var(--text-primary)',
                border: `1px solid ${selectedSector === sector ? 'var(--spreads-green)' : 'var(--border-color)'}`
              }}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">
            Performance:
          </span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(220, 38, 38)' }}></div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(156, 163, 175)' }}></div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Flat</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(74, 222, 128)' }}></div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(22, 163, 74)' }}></div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>High</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-secondary)' }} className="text-sm">
            Size = Market Cap
          </span>
        </div>
      </div>

      {/* Heatmap Container */}
      <div className="card overflow-hidden">
        <div className="relative w-full" style={{ paddingTop: '66.67%' /* 3:2 aspect ratio */ }}>
          <div className="absolute inset-0 p-4">
            <div className="relative w-full h-full">
              {treemapLayout.map(node => {
                const { stock, x, y, width, height } = node
                const isHovered = hoveredStock === stock.symbol
                const color = getColor(stock.changesPercentage, minChange, maxChange)
                const isSmall = width < 120 || height < 60

                return (
                  <button
                    key={stock.symbol}
                    onClick={() => onSelectStock(stock)}
                    onMouseEnter={() => setHoveredStock(stock.symbol)}
                    onMouseLeave={() => setHoveredStock(null)}
                    className="absolute transition-all duration-200 overflow-hidden group"
                    style={{
                      left: `${(x / 1200) * 100}%`,
                      top: `${(y / 800) * 100}%`,
                      width: `${(width / 1200) * 100}%`,
                      height: `${(height / 800) * 100}%`,
                      backgroundColor: color,
                      transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isHovered
                        ? '0 8px 16px rgba(0, 0, 0, 0.3)'
                        : '0 1px 2px rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="w-full h-full p-2 flex flex-col items-center justify-center text-white relative">
                      {/* Logo */}
                      {!isSmall && stock.logo && (
                        <div className="mb-1 bg-white rounded-md p-1" style={{
                          width: Math.min(width * 0.25, 40),
                          height: Math.min(width * 0.25, 40)
                        }}>
                          <StockLogo
                            symbol={stock.symbol}
                            logo={stock.logo}
                            size="sm"
                          />
                        </div>
                      )}

                      {/* Symbol */}
                      <div className={`font-bold ${isSmall ? 'text-xs' : 'text-sm'} mb-0.5`}>
                        {stock.symbol}
                      </div>

                      {/* Company Name - only for larger cells */}
                      {!isSmall && (
                        <div className="text-xs opacity-90 text-center line-clamp-1 px-1">
                          {stock.name}
                        </div>
                      )}

                      {/* Percentage Change */}
                      <div className={`font-bold ${isSmall ? 'text-sm' : 'text-lg'} mt-1`}>
                        {stock.changesPercentage > 0 ? '+' : ''}
                        {stock.changesPercentage.toFixed(2)}%
                      </div>

                      {/* Hover Overlay */}
                      {isHovered && (
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <div className="text-center p-2">
                            <div className="font-bold text-sm mb-1">{stock.symbol}</div>
                            <div className="text-xs opacity-90">{stock.name}</div>
                            <div className="text-xs mt-1">
                              ${stock.price.toFixed(2)}
                            </div>
                            <div className="text-xs">
                              {stock.changesPercentage > 0 ? '+' : ''}
                              {stock.changesPercentage.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Stocks Shown</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {filteredStocks.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg Change</div>
          <div className={`text-2xl font-bold ${
            (filteredStocks.reduce((sum, s) => sum + s.changesPercentage, 0) / filteredStocks.length) >= 0
              ? 'positive'
              : 'negative'
          }`}>
            {((filteredStocks.reduce((sum, s) => sum + s.changesPercentage, 0) / filteredStocks.length) || 0).toFixed(2)}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gainers</div>
          <div className="text-2xl font-bold positive">
            {filteredStocks.filter(s => s.changesPercentage > 0).length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Losers</div>
          <div className="text-2xl font-bold negative">
            {filteredStocks.filter(s => s.changesPercentage < 0).length}
          </div>
        </div>
      </div>
    </div>
  )
}
