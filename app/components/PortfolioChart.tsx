'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  CartesianGrid
} from 'recharts'
import { useTheme } from '@/app/context/ThemeContext'
import { formatCurrency } from '@/lib/utils'
import type { PortfolioTimeRange, PortfolioSnapshot } from '@/lib/types'

interface PortfolioChartProps {
  onTimeRangeChange?: (range: PortfolioTimeRange) => void
}

interface ChartResponse {
  timeframe: PortfolioTimeRange
  snapshots: PortfolioSnapshot[]
  dateRange: { from: string; to: string }
  cached: boolean
  calculatedAt: number
}

export default function PortfolioChart({ onTimeRangeChange }: PortfolioChartProps) {
  const { theme } = useTheme()
  const [selectedRange, setSelectedRange] = useState<PortfolioTimeRange>('1M')
  const [data, setData] = useState<ChartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChartData()
  }, [selectedRange])

  const fetchChartData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/portfolio/history?timeframe=${selectedRange}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No holdings found')
        }
        throw new Error('Failed to fetch portfolio history')
      }

      const result: ChartResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRangeChange = (range: PortfolioTimeRange) => {
    setSelectedRange(range)
    onTimeRangeChange?.(range)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (selectedRange === '1W' || selectedRange === '1M') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
  }

  const isDark = theme === 'dark'
  const chartData = data?.snapshots || []

  // Determine if portfolio is overall positive or negative
  const isPositive = chartData.length > 0 && chartData[chartData.length - 1].gainLoss >= 0
  const lineColor = isPositive ? '#22c55e' : '#ef4444'
  const gradientColor = isPositive ? '#22c55e' : '#ef4444'

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PortfolioSnapshot
      return (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>
            {new Date(data.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
          <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>
            Value: {formatCurrency(data.totalValue)}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            Cost: {formatCurrency(data.totalCost)}
          </p>
          <p
            style={{
              color: data.gainLoss >= 0 ? '#22c55e' : '#ef4444',
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss)} ({data.gainLossPercent >= 0 ? '+' : ''}{data.gainLossPercent.toFixed(2)}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--border-color)'
      }}
    >
      {/* Header with time range selector */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Portfolio Performance
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['1W', '1M', '3M', '1Y', 'All'] as PortfolioTimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: selectedRange === range ? 'var(--spreads-green)' : 'var(--bg-tertiary)',
                color: selectedRange === range ? '#ffffff' : 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {loading && (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="animate-pulse"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '8px'
            }}
          />
        </div>
      )}

      {error && (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{error}</p>
          <button
            onClick={fetchChartData}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--spreads-green)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              style={{ fontSize: '12px' }}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              style={{ fontSize: '12px' }}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Reference line for break-even (using final total cost) */}
            {chartData.length > 0 && (
              <ReferenceLine
                y={chartData[chartData.length - 1].totalCost}
                stroke={isDark ? '#6b7280' : '#9ca3af'}
                strokeDasharray="5 5"
                label={{
                  value: 'Break-even',
                  fill: isDark ? '#9ca3af' : '#6b7280',
                  fontSize: 11,
                  position: 'insideTopRight'
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="totalValue"
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{ r: 6, fill: lineColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {!loading && !error && chartData.length === 0 && (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No data available for selected time range</p>
        </div>
      )}

      {/* Summary stats */}
      {!loading && !error && chartData.length > 0 && (
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
              Current Value
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600' }}>
              {formatCurrency(chartData[chartData.length - 1].totalValue)}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
              Total Cost
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600' }}>
              {formatCurrency(chartData[chartData.length - 1].totalCost)}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
              Total Gain/Loss
            </p>
            <p
              style={{
                color: chartData[chartData.length - 1].gainLoss >= 0 ? '#22c55e' : '#ef4444',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {chartData[chartData.length - 1].gainLoss >= 0 ? '+' : ''}
              {formatCurrency(chartData[chartData.length - 1].gainLoss)}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
              Return
            </p>
            <p
              style={{
                color: chartData[chartData.length - 1].gainLossPercent >= 0 ? '#22c55e' : '#ef4444',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {chartData[chartData.length - 1].gainLossPercent >= 0 ? '+' : ''}
              {chartData[chartData.length - 1].gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
