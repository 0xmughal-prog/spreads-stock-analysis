'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

interface SectorData {
  name: string
  value: number
  marketCap: number
  color: string
}

interface ExpandedChartModalProps {
  sectorData: SectorData[]
  selectedSector: string
  onSectorClick: (sector: string) => void
  onClose: () => void
  formatMarketCap: (value: number) => string
}

export default function ExpandedChartModal({
  sectorData,
  selectedSector,
  onSectorClick,
  onClose,
  formatMarketCap,
}: ExpandedChartModalProps) {
  const totalStocks = sectorData.reduce((sum, s) => sum + s.value, 0)
  const totalMarketCap = sectorData.reduce((sum, s) => sum + s.marketCap, 0)

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SectorData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="p-3 rounded-lg shadow-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.name}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.value} stocks ({((data.value / totalStocks) * 100).toFixed(1)}%)</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Market Cap: {formatMarketCap(data.marketCap)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl modal-content mx-4"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-2xl font-bold font-heading" style={{ color: 'var(--text-primary)' }}>
              Sector Distribution
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {totalStocks} stocks across {sectorData.length} sectors • Total: {formatMarketCap(totalMarketCap)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Stock Distribution
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
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
            </div>

            {/* Bar Chart */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Market Cap by Sector
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatMarketCap(value)}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="marketCap"
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
                          key={`bar-${index}`}
                          fill={entry.color}
                          opacity={selectedSector && selectedSector !== entry.name ? 0.4 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full Legend */}
          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              All Sectors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sectorData.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => {
                    if (selectedSector === entry.name) {
                      onSectorClick('')
                    } else {
                      onSectorClick(entry.name)
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                    selectedSector === entry.name ? 'ring-2 ring-spreads-green' : ''
                  }`}
                  style={{
                    backgroundColor: selectedSector === entry.name ? 'var(--card-bg)' : 'transparent',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {entry.value} stocks • {formatMarketCap(entry.marketCap)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Clear filter button */}
          {selectedSector && (
            <div className="mt-4 text-center">
              <button
                onClick={() => onSectorClick('')}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--spreads-green)', color: 'white' }}
              >
                Clear sector filter: {selectedSector}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
