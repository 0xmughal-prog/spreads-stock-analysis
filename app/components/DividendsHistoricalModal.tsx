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

interface DividendDataPoint {
  year: number
  annualDividend: number
  yoyGrowth: number | null
}

interface DividendData {
  symbol: string
  currentYield: number
  currentDividendAnnual: number
  avgDividend5Y: number | null
  dividendGrowthRate5Y: number | null
  historicalData: DividendDataPoint[]
  dataPoints: number
  source: 'estimated'
  timestamp: number
}

interface DividendsHistoricalModalProps {
  isOpen: boolean
  onClose: () => void
  symbol: string
  companyName: string
}

type TimeRange = '1Y' | '2Y' | '5Y' | '10Y'

const timeRangeYears: Record<TimeRange, number> = {
  '1Y': 1,
  '2Y': 2,
  '5Y': 5,
  '10Y': 10,
}

export default function DividendsHistoricalModal({
  isOpen,
  onClose,
  symbol,
  companyName,
}: DividendsHistoricalModalProps) {
  const { theme } = useTheme()
  const [data, setData] = useState<DividendData | null>(null)
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
      const response = await fetch(`/api/dividends/${symbol}`)
      if (!response.ok) {
        throw new Error('Failed to fetch historical dividend data')
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
    ? data.historicalData.slice(-timeRangeYears[selectedRange])
    : []

  const avgDividend = filteredData.length > 0
    ? filteredData.reduce((sum, d) => sum + d.annualDividend, 0) / filteredData.length
    : 0

  const isDark = theme === 'dark'

  // Color function based on YoY growth
  const getBarColor = (yoyGrowth: number | null): string => {
    if (yoyGrowth === null) return '#bba998' // Tan for no growth data
    if (yoyGrowth > 0) return isDark ? '#22c55e' : '#16a34a' // Green for positive growth
    if (yoyGrowth < 0) return isDark ? '#ef4444' : '#dc2626' // Red for dividend cut
    return '#bba998' // Tan for flat
  }

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
                {symbol} - Dividends
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
            {/* Estimated Data Badge */}
            <div
              className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
              style={{
                backgroundColor: isDark ? '#f59e0b20' : '#fef3c7',
                color: isDark ? '#fbbf24' : '#d97706',
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Estimated Data
            </div>
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
          {(['1Y', '2Y', '5Y', '10Y'] as TimeRange[]).map((range) => (
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
                  {symbol} Annual Dividend History
                </span>
                <span
                  className="text-sm"
                  style={{ color: isDark ? '#bba998' : '#bba998' }}
                >
                  {selectedRange} Avg: ${avgDividend.toFixed(2)}
                </span>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <XAxis
                      dataKey="year"
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      width={60}
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
                      formatter={(value: number, name: string, props: any) => {
                        const growth = props.payload.yoyGrowth
                        const growthText = growth !== null
                          ? ` (${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% YoY)`
                          : ''
                        return [`$${value.toFixed(2)}${growthText}`, 'Annual Dividend']
                      }}
                      labelFormatter={(label) => `Year ${label}`}
                      cursor={{ fill: isDark ? '#374151' : '#f3f4f6', opacity: 0.3 }}
                    />
                    {avgDividend > 0 && (
                      <ReferenceLine
                        y={avgDividend}
                        stroke={isDark ? '#bba99880' : '#bba99880'}
                        strokeDasharray="5 5"
                        label={{
                          value: `Avg: $${avgDividend.toFixed(2)}`,
                          fill: isDark ? '#bba998' : '#bba998',
                          fontSize: 11,
                          position: 'right',
                        }}
                      />
                    )}
                    <Bar
                      dataKey="annualDividend"
                      radius={[4, 4, 0, 0]}
                    >
                      {filteredData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getBarColor(entry.yoyGrowth)}
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
                    Current Yield
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#f3f4f6' : '#193427' }}
                  >
                    {data.currentYield?.toFixed(2) || 'N/A'}%
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    5Y Growth Rate
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: data.dividendGrowthRate5Y && data.dividendGrowthRate5Y >= 0 ? (isDark ? '#22c55e' : '#16a34a') : (isDark ? '#ef4444' : '#dc2626') }}
                  >
                    {data.dividendGrowthRate5Y !== null ? `${data.dividendGrowthRate5Y >= 0 ? '+' : ''}${data.dividendGrowthRate5Y.toFixed(1)}%` : 'N/A'}
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
                    ${Math.min(...filteredData.map((d) => d.annualDividend)).toFixed(2)}
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
                    ${Math.max(...filteredData.map((d) => d.annualDividend)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Info Note */}
              <div
                className="mt-4 p-3 rounded-lg text-xs"
                style={{
                  backgroundColor: isDark ? '#f59e0b10' : '#fef3c7',
                  color: isDark ? '#fbbf24' : '#d97706',
                  border: `1px solid ${isDark ? '#f59e0b30' : '#fde68a'}`,
                }}
              >
                <strong>Note:</strong> This dividend history is estimated based on current yield and stock price, assuming ~5% average annual dividend growth. Actual historical dividends may vary.
              </div>
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                No dividend data available for {symbol}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
