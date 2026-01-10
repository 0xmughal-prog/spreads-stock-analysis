'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Stock } from '@/lib/types'
import { SECTOR_COLORS } from '@/lib/utils'
import ExpandedChartModal from './ExpandedChartModal'

interface SectorChartProps {
  stocks: Stock[]
  onSectorClick: (sector: string) => void
  selectedSector: string
}

export default function SectorChart({ stocks, onSectorClick, selectedSector }: SectorChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const sectorData = useMemo(() => {
    const sectorMap = new Map<string, { count: number; marketCap: number }>()

    stocks.forEach((stock) => {
      const existing = sectorMap.get(stock.sector) || { count: 0, marketCap: 0 }
      sectorMap.set(stock.sector, {
        count: existing.count + 1,
        marketCap: existing.marketCap + stock.marketCap,
      })
    })

    return Array.from(sectorMap.entries())
      .map(([sector, data]) => ({
        name: sector,
        value: data.count,
        marketCap: data.marketCap,
        color: SECTOR_COLORS[sector] || '#888888',
      }))
      .sort((a, b) => b.value - a.value)
  }, [stocks])

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
    return `$${(value / 1e9).toFixed(0)}B`
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof sectorData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="p-3 rounded-lg shadow-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.name}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.value} stocks</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Market Cap: {formatMarketCap(data.marketCap)}</p>
        </div>
      )
    }
    return null
  }

  const totalStocks = sectorData.reduce((sum, s) => sum + s.value, 0)

  return (
    <>
      <div className="card p-4">
        {/* Header with expand button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold font-heading" style={{ color: 'var(--text-primary)' }}>
            Sector Distribution
          </h3>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
            aria-label="Expand chart"
          >
            <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        {/* Pie Chart - adjusted positioning */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onClick={(data) => {
                  if (selectedSector === data.name) {
                    onSectorClick('')
                  } else {
                    onSectorClick(data.name)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {sectorData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={selectedSector === entry.name ? 'var(--text-primary)' : 'transparent'}
                    strokeWidth={selectedSector === entry.name ? 3 : 0}
                    opacity={selectedSector && selectedSector !== entry.name ? 0.4 : 1}
                    className="transition-opacity duration-200"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend Grid - below chart */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {sectorData.slice(0, 6).map((entry) => (
            <button
              key={entry.name}
              onClick={() => {
                if (selectedSector === entry.name) {
                  onSectorClick('')
                } else {
                  onSectorClick(entry.name)
                }
              }}
              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-200 ${
                selectedSector === entry.name ? 'ring-2 ring-spreads-green' : ''
              }`}
              style={{
                backgroundColor: selectedSector === entry.name ? 'var(--bg-tertiary)' : 'transparent',
              }}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {entry.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {entry.value} ({((entry.value / totalStocks) * 100).toFixed(0)}%)
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Show more indicator if there are more sectors */}
        {sectorData.length > 6 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full mt-2 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
          >
            +{sectorData.length - 6} more sectors
          </button>
        )}

        {/* Clear filter button */}
        {selectedSector && (
          <div className="mt-3 text-center">
            <button
              onClick={() => onSectorClick('')}
              className="text-sm hover:underline transition-colors"
              style={{ color: 'var(--spreads-green)' }}
            >
              Clear sector filter
            </button>
          </div>
        )}
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <ExpandedChartModal
          sectorData={sectorData}
          selectedSector={selectedSector}
          onSectorClick={onSectorClick}
          onClose={() => setIsExpanded(false)}
          formatMarketCap={formatMarketCap}
        />
      )}
    </>
  )
}
