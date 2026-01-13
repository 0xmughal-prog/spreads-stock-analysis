'use client'

import { useState, useEffect } from 'react'
import { Stock, PortfolioHolding } from '@/lib/types'
import AddTransactionModal from './AddTransactionModal'
import PortfolioChart from './PortfolioChart'

interface PortfolioProps {
  stocks: Stock[]
  onSelectStock: (stock: Stock) => void
}

export default function Portfolio({ stocks, onSelectStock }: PortfolioProps) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [totalValue, setTotalValue] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPercent, setTotalGainLossPercent] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Load portfolio holdings from API
  useEffect(() => {
    const loadPortfolio = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/portfolio')
        if (!response.ok) {
          throw new Error('Failed to load portfolio')
        }
        const data = await response.json()
        setHoldings(data.holdings || [])
        calculatePortfolioMetrics(data.holdings || [])
      } catch (error) {
        console.error('Failed to load portfolio:', error)
        setHoldings([])
      } finally {
        setLoading(false)
      }
    }

    loadPortfolio()
  }, [])

  // Calculate portfolio metrics when holdings change
  const calculatePortfolioMetrics = (currentHoldings: PortfolioHolding[]) => {
    if (currentHoldings.length === 0) {
      setTotalValue(0)
      setTotalCost(0)
      setTotalGainLoss(0)
      setTotalGainLossPercent(0)
      return
    }

    let totalVal = 0
    let totalInvested = 0

    currentHoldings.forEach((holding) => {
      // Find current price from stocks data
      const stock = stocks.find((s) => s.symbol === holding.symbol)
      const currentPrice = stock?.price || holding.purchasePrice

      const currentValue = holding.shares * currentPrice
      const invested = holding.totalCost

      totalVal += currentValue
      totalInvested += invested
    })

    const gainLoss = totalVal - totalInvested
    const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0

    setTotalValue(totalVal)
    setTotalCost(totalInvested)
    setTotalGainLoss(gainLoss)
    setTotalGainLossPercent(gainLossPercent)
  }

  // Recalculate when stocks data updates (prices change)
  useEffect(() => {
    if (holdings.length > 0) {
      calculatePortfolioMetrics(holdings)
    }
  }, [stocks, holdings])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const handleAddSuccess = async () => {
    // Reload portfolio data
    try {
      const response = await fetch('/api/portfolio')
      if (response.ok) {
        const data = await response.json()
        setHoldings(data.holdings || [])
        showNotification('Transaction saved successfully!', 'success')
      }
    } catch (error) {
      console.error('Failed to reload portfolio:', error)
    }
  }

  const handleEdit = (holding: PortfolioHolding) => {
    setEditingHolding(holding)
    setShowAddModal(true)
  }

  const handleDelete = async (holdingId: string) => {
    if (!confirm('Are you sure you want to delete this holding?')) {
      return
    }

    try {
      const response = await fetch(`/api/portfolio?id=${holdingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete holding')

      const data = await response.json()
      setHoldings(data.holdings || [])
      showNotification('Holding deleted successfully', 'success')
    } catch (error) {
      console.error('Failed to delete holding:', error)
      showNotification('Failed to delete holding', 'error')
    }
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingHolding(null)
  }

  if (loading) {
    return (
      <div className="content-panel">
        <div className="animate-pulse space-y-6">
          <div className="h-32 rounded-xl skeleton"></div>
          <div className="h-96 rounded-xl skeleton"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="content-panel space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          My Portfolio
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Track your investment holdings and performance
        </p>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Value
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(totalValue)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Cost
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(totalCost)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Gain/Loss
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: totalGainLoss >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)' }}
          >
            {formatCurrency(totalGainLoss)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Return
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: totalGainLossPercent >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)' }}
          >
            {formatPercent(totalGainLossPercent)}
          </div>
        </div>
      </div>

      {/* Portfolio Chart */}
      {holdings.length > 0 && <PortfolioChart />}

      {/* Empty State or Holdings */}
      {holdings.length === 0 ? (
        <div className="card p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            No holdings yet
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Start building your portfolio by adding your first asset
          </p>
          <button
            className="btn-primary px-6 py-3"
            onClick={() => setShowAddModal(true)}
          >
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Holdings
              </h3>
              <button
                className="btn-primary px-4 py-2 text-sm"
                onClick={() => setShowAddModal(true)}
              >
                Add Transaction
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="table-header text-left">Asset</th>
                  <th className="table-header text-right">Shares</th>
                  <th className="table-header text-right">Avg Buy Price</th>
                  <th className="table-header text-right">Current Price</th>
                  <th className="table-header text-right">Total Value</th>
                  <th className="table-header text-right">Gain/Loss</th>
                  <th className="table-header text-right">Return</th>
                  <th className="table-header text-right">Allocation</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const stock = stocks.find((s) => s.symbol === holding.symbol)
                  const currentPrice = stock?.price || holding.purchasePrice
                  const currentValue = holding.shares * currentPrice
                  const gainLoss = currentValue - holding.totalCost
                  const gainLossPercent = (gainLoss / holding.totalCost) * 100
                  const allocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0

                  return (
                    <tr
                      key={holding.id}
                      className="table-cell border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                              {holding.symbol}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {holding.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                        {holding.shares.toLocaleString()}
                      </td>
                      <td className="table-cell text-right" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(holding.purchasePrice)}
                      </td>
                      <td className="table-cell text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(currentPrice)}
                      </td>
                      <td className="table-cell text-right font-bold" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(currentValue)}
                      </td>
                      <td
                        className="table-cell text-right font-medium"
                        style={{ color: gainLoss >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)' }}
                      >
                        {formatCurrency(gainLoss)}
                      </td>
                      <td
                        className="table-cell text-right font-medium"
                        style={{ color: gainLossPercent >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)' }}
                      >
                        {formatPercent(gainLossPercent)}
                      </td>
                      <td className="table-cell text-right" style={{ color: 'var(--text-secondary)' }}>
                        {allocation.toFixed(2)}%
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(holding)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(holding.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-red-600"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        stocks={stocks}
        onSuccess={handleAddSuccess}
        existingHolding={editingHolding}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
