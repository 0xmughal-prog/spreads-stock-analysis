'use client'

import { useMemo } from 'react'
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
}

const COLORS = ['#004225', '#006633', '#008844', '#00aa55', '#00cc66']

export default function ComparisonTool({ stocks, compareList, onRemove, onClearAll }: ComparisonToolProps) {
  const compareStocks = stocks.filter((stock) => compareList.includes(stock.symbol))

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

  if (compareStocks.length === 0) {
    return (
      <div className="card p-8 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No stocks selected for comparison</h3>
        <p className="text-gray-500">
          Click the &quot;Compare&quot; button on any stock in the dashboard to add it to the comparison.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selected Stocks */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Metric</th>
              {compareStocks.map((stock) => (
                <th key={stock.symbol} className="table-header text-center">
                  {stock.symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            <tr>
              <td className="table-cell font-medium">Company</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {stock.name}
                </td>
              ))}
            </tr>
            <tr>
              <td className="table-cell font-medium">Price</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center font-medium">
                  {formatCurrency(stock.price)}
                </td>
              ))}
            </tr>
            <tr>
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
            <tr>
              <td className="table-cell font-medium">Market Cap</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {formatLargeCurrency(stock.marketCap)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="table-cell font-medium">P/E Ratio</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {stock.pe?.toFixed(2) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="table-cell font-medium">EPS</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {formatCurrency(stock.eps)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="table-cell font-medium">EBITDA</td>
              {compareStocks.map((stock) => (
                <td key={stock.symbol} className="table-cell text-center">
                  {formatLargeCurrency(stock.ebitda)}
                </td>
              ))}
            </tr>
            <tr>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Comparison</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Relative Performance</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
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
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
