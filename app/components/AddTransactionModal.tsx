'use client'

import { useState, useEffect } from 'react'
import { Stock, PortfolioHolding } from '@/lib/types'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  stocks: Stock[]
  onSuccess: (holding: PortfolioHolding) => void
  existingHolding?: PortfolioHolding | null
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  stocks,
  onSuccess,
  existingHolding,
}: AddTransactionModalProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState('')
  const [pricePerShare, setPricePerShare] = useState('')
  const [shares, setShares] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [priceMessage, setPriceMessage] = useState('')

  // Filter stocks based on search query
  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10)

  // Pre-fill form if editing existing holding
  useEffect(() => {
    if (existingHolding) {
      setSelectedSymbol(existingHolding.symbol)
      setSearchQuery(existingHolding.symbol)
      setPurchaseDate(existingHolding.purchaseDate)
      setPricePerShare(existingHolding.purchasePrice.toString())
      setShares(existingHolding.shares.toString())
    }
  }, [existingHolding])

  // Fetch historical price when both symbol and date are selected
  useEffect(() => {
    const fetchHistoricalPrice = async () => {
      if (!selectedSymbol || !purchaseDate) {
        setPriceMessage('')
        return
      }

      // Don't fetch if we're editing an existing holding (price already set)
      if (existingHolding && pricePerShare) {
        return
      }

      setFetchingPrice(true)
      setPriceMessage('')

      try {
        const response = await fetch(
          `/api/portfolio/historical-price?symbol=${selectedSymbol}&date=${purchaseDate}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          setPriceMessage(errorData.error || 'Historical price not available')
          setFetchingPrice(false)
          return
        }

        const data = await response.json()

        if (data.available && data.price) {
          setPricePerShare(data.price.toFixed(2))
          setPriceMessage(`Historical closing price on ${purchaseDate}`)
        } else {
          setPriceMessage('Historical price not available for this date')
        }
      } catch (err) {
        console.error('Failed to fetch historical price:', err)
        setPriceMessage('Could not fetch historical price')
      } finally {
        setFetchingPrice(false)
      }
    }

    fetchHistoricalPrice()
  }, [selectedSymbol, purchaseDate, existingHolding, pricePerShare])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedSymbol('')
      setSearchQuery('')
      setPurchaseDate('')
      setPricePerShare('')
      setShares('')
      setError('')
      setShowDropdown(false)
      setPriceMessage('')
      setFetchingPrice(false)
    }
  }, [isOpen])

  const handleSelectStock = (stock: Stock) => {
    setSelectedSymbol(stock.symbol)
    setSearchQuery(`${stock.symbol} - ${stock.name}`)
    setShowDropdown(false)
    // Price will be auto-filled based on the purchase date via historical API
  }

  const calculateTotal = () => {
    const price = parseFloat(pricePerShare) || 0
    const numShares = parseFloat(shares) || 0
    return price * numShares
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!selectedSymbol) {
      setError('Please select a stock')
      return
    }
    if (!purchaseDate) {
      setError('Please enter purchase date')
      return
    }
    if (!pricePerShare || parseFloat(pricePerShare) <= 0) {
      setError('Please enter a valid price per share')
      return
    }
    if (!shares || parseFloat(shares) <= 0) {
      setError('Please enter a valid number of shares')
      return
    }

    setLoading(true)

    try {
      const selectedStock = stocks.find((s) => s.symbol === selectedSymbol)

      if (!selectedStock) {
        setError('Stock not found')
        setLoading(false)
        return
      }

      const newHolding: PortfolioHolding = {
        id: existingHolding?.id || `${selectedSymbol}-${Date.now()}`,
        symbol: selectedSymbol,
        name: selectedStock.name,
        shares: parseFloat(shares),
        purchasePrice: parseFloat(pricePerShare),
        purchaseDate,
        totalCost: calculateTotal(),
        addedAt: existingHolding?.addedAt || Date.now(),
      }

      // Fetch existing holdings
      const response = await fetch('/api/portfolio')
      if (!response.ok) throw new Error('Failed to fetch portfolio')

      const data = await response.json()
      const existingHoldings: PortfolioHolding[] = data.holdings || []

      // Update or add new holding
      let updatedHoldings: PortfolioHolding[]
      if (existingHolding) {
        // Update existing holding
        updatedHoldings = existingHoldings.map((h) =>
          h.id === existingHolding.id ? newHolding : h
        )
      } else {
        // Add new holding
        updatedHoldings = [...existingHoldings, newHolding]
      }

      // Save to API
      const saveResponse = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: updatedHoldings }),
      })

      if (!saveResponse.ok) throw new Error('Failed to save portfolio')

      onSuccess(newHolding)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const totalCost = calculateTotal()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle rounded-2xl shadow-xl transform transition-all"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--spreads-green)' }}>
                {existingHolding ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {existingHolding ? 'Update your holding details' : 'Add a new asset to your portfolio'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stock Symbol Autocomplete */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Stock Symbol
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                    setSelectedSymbol('')
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by symbol or name..."
                  className="input-field w-full px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                  disabled={!!existingHolding}
                />

                {/* Dropdown */}
                {showDropdown && searchQuery && !existingHolding && (
                  <div
                    className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-auto"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {filteredStocks.length > 0 ? (
                      filteredStocks.map((stock) => (
                        <button
                          key={stock.symbol}
                          type="button"
                          onClick={() => handleSelectStock(stock)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                {stock.symbol}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {stock.name}
                              </div>
                            </div>
                            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                              ${stock.price.toFixed(2)}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center" style={{ color: 'var(--text-secondary)' }}>
                        No stocks found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Purchase Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="input-field w-full px-4 py-3 pr-12 rounded-lg cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    colorScheme: 'dark'
                  }}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Price Per Share */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Price Per Share
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={pricePerShare}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow only numbers and one decimal point
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      setPricePerShare(value)
                      setPriceMessage('') // Clear message when manually editing
                    }
                  }}
                  placeholder="0.00"
                  disabled={fetchingPrice}
                  className="input-field w-full pl-8 pr-12 py-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    opacity: fetchingPrice ? 0.6 : 1,
                  }}
                />
                {fetchingPrice && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="animate-spin h-5 w-5"
                      style={{ color: 'var(--spreads-green)' }}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>
              {priceMessage && (
                <p
                  className="text-xs mt-1"
                  style={{
                    color: priceMessage.includes('Historical closing price')
                      ? 'var(--spreads-green)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {priceMessage}
                </p>
              )}
            </div>

            {/* Number of Shares */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Number of Shares
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={shares}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow only numbers and one decimal point
                  if (value === '' || /^\d*\.?\d{0,4}$/.test(value)) {
                    setShares(value)
                  }
                }}
                placeholder="0"
                className="input-field w-full px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>

            {/* Total Cost Display */}
            {totalCost > 0 && (
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Total Cost
                  </span>
                  <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 px-4 py-3"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 px-4 py-3"
                disabled={loading || !selectedSymbol}
              >
                {loading ? 'Saving...' : existingHolding ? 'Update' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
