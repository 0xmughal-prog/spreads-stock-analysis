'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { useTheme } from '@/app/context/ThemeContext'

interface HistoricalPEData {
  symbol: string
  currentPE: number | null
  avgPE1Y: number | null
  avgPE3Y: number | null
  avgPE5Y: number | null
  avgPE10Y: number | null
  historicalData: Array<{ date: string; pe: number }>
  dataPoints: number
}

interface PEHistoricalModalProps {
  isOpen: boolean
  onClose: () => void
  symbol: string
  companyName: string
}

type TimeRange = '1Y' | '2Y' | '3Y' | '5Y' | '10Y'

const timeRangeQuarters: Record<TimeRange, number> = {
  '1Y': 4,
  '2Y': 8,
  '3Y': 12,
  '5Y': 20,
  '10Y': 40,
}

export default function PEHistoricalModal({
  isOpen,
  onClose,
  symbol,
  companyName,
}: PEHistoricalModalProps) {
  const { theme } = useTheme()
  const [data, setData] = useState<HistoricalPEData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState<TimeRange>('5Y')

  useEffect(() => {
    if (isOpen && symbol) {
      fetchData()
    }
  }, [isOpen, symbol])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/historical-pe/${symbol}`)
      if (!response.ok) {
        throw new Error('Failed to fetch historical P/E data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const filteredData = data?.historicalData
    ? data.historicalData.slice(-timeRangeQuarters[selectedRange])
    : []

  const avgPE = selectedRange === '1Y' ? data?.avgPE1Y
    : selectedRange === '3Y' ? data?.avgPE3Y
    : selectedRange === '5Y' ? data?.avgPE5Y
    : data?.avgPE10Y

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear().toString().slice(-2)
    return `${month} ${year}`
  }

  const isDark = theme === 'dark'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl modal-content"
        style={{
          backgroundColor: isDark ? '#1a1d21' : '#ffffff',
          borderRadius: '16px',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-heading font-bold text-lg"
              style={{
                backgroundColor: isDark ? '#22c55e20' : '#19342710',
                color: isDark ? '#22c55e' : '#193427',
              }}
            >
              {symbol.slice(0, 2)}
            </div>
            <div>
              <h2
                className="text-xl font-bold font-heading"
                style={{ color: isDark ? '#f3f4f6' : '#193427' }}
              >
                {symbol} - P/E Ratio
              </h2>
              <p
                className="text-sm"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Download button (optional - decorative) */}
            <button
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isDark ? '#374151' : '#f3f4f6',
                color: isDark ? '#9ca3af' : '#6b7280',
              }}
              title="Download chart"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isDark ? '#374151' : '#f3f4f6',
                color: isDark ? '#9ca3af' : '#6b7280',
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Time Range Toggles */}
        <div className="flex justify-center gap-2 p-4">
          {(['1Y', '2Y', '3Y', '5Y', '10Y'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                backgroundColor:
                  selectedRange === range
                    ? isDark ? '#22c55e' : '#193427'
                    : isDark ? '#374151' : '#f3f4f6',
                color:
                  selectedRange === range
                    ? '#ffffff'
                    : isDark ? '#9ca3af' : '#6b7280',
              }}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart Area */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 border-4 rounded-full animate-spin"
                  style={{
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderTopColor: isDark ? '#22c55e' : '#193427',
                  }}
                />
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Loading historical data...
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <p style={{ color: '#ef4444' }} className="text-lg font-medium mb-2">
                  {error}
                </p>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{
                    backgroundColor: isDark ? '#22c55e' : '#193427',
                    color: '#ffffff',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : data && filteredData.length > 0 ? (
            <>
              {/* Chart Title */}
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="text-sm font-medium"
                  style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                >
                  {symbol} P/E Ratio
                </span>
                {avgPE && (
                  <span
                    className="text-sm"
                    style={{ color: isDark ? '#bba998' : '#bba998' }}
                  >
                    {selectedRange} Avg: {avgPE.toFixed(1)}x
                  </span>
                )}
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickFormatter={(value) => `${value}x`}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1a1d21' : '#ffffff',
                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                      labelStyle={{ color: isDark ? '#f3f4f6' : '#193427' }}
                      itemStyle={{ color: '#bba998' }}
                      formatter={(value: number) => [`${value.toFixed(2)}x`, 'P/E Ratio']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                      cursor={{ fill: isDark ? '#374151' : '#f3f4f6', opacity: 0.3 }}
                    />
                    {avgPE && (
                      <ReferenceLine
                        y={avgPE}
                        stroke={isDark ? '#bba99880' : '#bba99880'}
                        strokeDasharray="5 5"
                        label={{
                          value: `Avg: ${avgPE.toFixed(1)}x`,
                          fill: isDark ? '#bba998' : '#bba998',
                          fontSize: 11,
                          position: 'right',
                        }}
                      />
                    )}
                    <Bar
                      dataKey="pe"
                      radius={[4, 4, 0, 0]}
                    >
                      {filteredData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pe < 20 ? (isDark ? '#22c55e' : '#16a34a') : entry.pe <= 30 ? '#bba998' : (isDark ? '#ef4444' : '#dc2626')}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats Row */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Current P/E
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#f3f4f6' : '#193427' }}
                  >
                    {data.currentPE?.toFixed(1) || 'N/A'}x
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    5Y Avg P/E
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#bba998' : '#bba998' }}
                  >
                    {data.avgPE5Y?.toFixed(1) || 'N/A'}x
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Min ({selectedRange})
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#22c55e' : '#16a34a' }}
                  >
                    {Math.min(...filteredData.map((d) => d.pe)).toFixed(1)}x
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Max ({selectedRange})
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#ef4444' : '#dc2626' }}
                  >
                    {Math.max(...filteredData.map((d) => d.pe)).toFixed(1)}x
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                No historical P/E data available for {symbol}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
