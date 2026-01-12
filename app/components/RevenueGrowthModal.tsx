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
import { formatLargeCurrency } from '@/lib/utils'

interface QuarterlyRevenue {
  quarter: string
  year: number
  quarterNum: number
  revenue: number
  revenueGrowthYoY: number | null
}

interface RevenueGrowthData {
  symbol: string
  recent4Quarters: QuarterlyRevenue[]
  historicalData: QuarterlyRevenue[]
  avgGrowthRate: number | null
  dataPoints: number
}

interface RevenueGrowthModalProps {
  isOpen: boolean
  onClose: () => void
  symbol: string
  companyName: string
}

type TimeRange = '2Y' | '5Y' | '10Y'

const timeRangeQuarters: Record<TimeRange, number> = {
  '2Y': 8,
  '5Y': 20,
  '10Y': 40,
}

export default function RevenueGrowthModal({
  isOpen,
  onClose,
  symbol,
  companyName,
}: RevenueGrowthModalProps) {
  const { theme } = useTheme()
  const [data, setData] = useState<RevenueGrowthData | null>(null)
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
      const response = await fetch(`/api/revenue-growth/${symbol}`)
      if (!response.ok) {
        throw new Error('Failed to fetch revenue growth data')
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
    ? [...data.historicalData].reverse().slice(-timeRangeQuarters[selectedRange])
    : []

  const isDark = theme === 'dark'

  const getGrowthColor = (growth: number | null): string => {
    if (growth === null) return isDark ? '#6b7280' : '#9ca3af'
    if (growth > 5) return '#22c55e'   // Green: growth above 5%
    if (growth >= 0) return '#f59e0b'  // Orange: growth 0-5%
    return '#ef4444'                   // Red: negative growth
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl modal-content"
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
                {symbol} - Revenue Growth
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
          {(['2Y', '5Y', '10Y'] as TimeRange[]).map((range) => (
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
                  Loading revenue data...
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
                  Quarterly Revenue
                </span>
                {data.avgGrowthRate !== null && (
                  <span
                    className="text-sm"
                    style={{ color: data.avgGrowthRate >= 0 ? '#22c55e' : '#ef4444' }}
                  >
                    Avg YoY Growth: {data.avgGrowthRate >= 0 ? '+' : ''}{data.avgGrowthRate.toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
                  >
                    <XAxis
                      dataKey="quarter"
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                      tickFormatter={(value) => {
                        if (value >= 1e12) return `$${(value / 1e12).toFixed(0)}T`
                        if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`
                        if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
                        return `$${value}`
                      }}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1a1d21' : '#ffffff',
                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                      labelStyle={{ color: isDark ? '#f3f4f6' : '#193427', fontWeight: 'bold' }}
                      formatter={(value: number) => [formatLargeCurrency(value), 'Revenue']}
                      labelFormatter={(label: string) => {
                        const item = filteredData.find(d => d.quarter === label)
                        const growth = item?.revenueGrowthYoY
                        if (growth !== null && growth !== undefined) {
                          return `${label} (YoY: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%)`
                        }
                        return label
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={isDark ? '#374151' : '#e5e7eb'}
                    />
                    <Bar
                      dataKey="revenue"
                      radius={[4, 4, 0, 0]}
                    >
                      {filteredData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getGrowthColor(entry.revenueGrowthYoY)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-6 justify-center text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
                  <span>&gt;5% growth</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
                  <span>0-5% growth</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
                  <span>Negative growth</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Latest Revenue
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#f3f4f6' : '#193427' }}
                  >
                    {data.recent4Quarters[0] ? formatLargeCurrency(data.recent4Quarters[0].revenue) : 'N/A'}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Avg YoY Growth
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: data.avgGrowthRate && data.avgGrowthRate >= 0 ? '#22c55e' : '#ef4444' }}
                  >
                    {data.avgGrowthRate !== null ? `${data.avgGrowthRate >= 0 ? '+' : ''}${data.avgGrowthRate.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Min Revenue
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                  >
                    {formatLargeCurrency(Math.min(...filteredData.map(d => d.revenue)))}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: isDark ? '#252830' : '#f3f4f6' }}
                >
                  <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Max Revenue
                  </p>
                  <p
                    className="text-lg font-bold font-heading"
                    style={{ color: isDark ? '#22c55e' : '#16a34a' }}
                  >
                    {formatLargeCurrency(Math.max(...filteredData.map(d => d.revenue)))}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                No revenue data available for {symbol}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
