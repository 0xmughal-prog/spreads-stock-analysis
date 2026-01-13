'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from '../context/ThemeContext'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { CompoundInterestCalculation, YearlyBreakdown } from '@/lib/types'

const CURRENCY_SYMBOLS = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  BTC: '₿',
}

const HISTORICAL_PRESETS = [
  { name: 'S&P 500 Avg (10Y)', return: 10.5 },
  { name: 'S&P 500 Conservative', return: 8.0 },
  { name: 'Bonds Average', return: 4.5 },
  { name: 'Bitcoin (5Y Avg)', return: 45.0 },
  { name: 'High-Yield Savings', return: 4.0 },
  { name: 'Real Estate', return: 9.0 },
]

const FREQUENCY_VALUES = {
  daily: 365,
  monthly: 12,
  quarterly: 4,
  'semi-annually': 2,
  annually: 1,
}

interface CompoundInterestCalculatorProps {
  onClose?: () => void
}

export default function CompoundInterestCalculator({ onClose }: CompoundInterestCalculatorProps) {
  const { theme } = useTheme()
  const { data: session } = useSession()

  // Form state
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'EUR' | 'BTC'>('USD')
  const [initialBalance, setInitialBalance] = useState<string>('10000')
  const [annualReturn, setAnnualReturn] = useState<string>('10')
  const [compoundFrequency, setCompoundFrequency] = useState<
    'annually' | 'semi-annually' | 'quarterly' | 'monthly' | 'daily'
  >('monthly')
  const [years, setYears] = useState<string>('10')
  const [months, setMonths] = useState<string>('0')
  const [depositAmount, setDepositAmount] = useState<string>('500')
  const [depositFrequency, setDepositFrequency] = useState<
    'annually' | 'semi-annually' | 'quarterly' | 'monthly'
  >('monthly')

  // UI state
  const [hasCalculated, setHasCalculated] = useState(false)
  const [savedCalculations, setSavedCalculations] = useState<CompoundInterestCalculation[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [calculationName, setCalculationName] = useState('')
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table')
  const [loadingCalculations, setLoadingCalculations] = useState(true)
  const [savingCalculation, setSavingCalculation] = useState(false)
  const [showSavedScenarios, setShowSavedScenarios] = useState(false)

  // Load saved calculations from API on mount
  useEffect(() => {
    const loadCalculations = async () => {
      if (!session?.user?.email) {
        setLoadingCalculations(false)
        return
      }

      try {
        const response = await fetch('/api/compound-calculations')
        if (response.ok) {
          const data = await response.json()
          setSavedCalculations(data.calculations || [])
        }
      } catch (error) {
        console.error('Failed to load calculations:', error)
      } finally {
        setLoadingCalculations(false)
      }
    }

    loadCalculations()
  }, [session])

  // Calculation logic
  const calculateCompoundInterest = useMemo(() => {
    if (!hasCalculated) return null

    const principal = parseFloat(initialBalance) || 0
    const rate = (parseFloat(annualReturn) || 0) / 100
    const totalYears = parseFloat(years) || 0
    const totalMonths = parseFloat(months) || 0
    const totalTimeInYears = totalYears + totalMonths / 12
    const deposit = parseFloat(depositAmount) || 0

    const compoundsPerYear = FREQUENCY_VALUES[compoundFrequency]
    const depositsPerYear = FREQUENCY_VALUES[depositFrequency]

    const yearlyBreakdown: YearlyBreakdown[] = []
    let currentBalance = principal

    for (let year = 0; year <= Math.ceil(totalTimeInYears); year++) {
      const startingBalance = currentBalance
      const yearsElapsed = Math.min(year, totalTimeInYears)
      const isPartialYear = year === Math.ceil(totalTimeInYears) && totalMonths > 0

      // Calculate interest for this year
      let yearInterest = 0
      let yearDeposits = 0

      if (year === 0) {
        // Year 0 - starting point
        yearlyBreakdown.push({
          year: 0,
          startingBalance: principal,
          deposits: 0,
          interest: 0,
          endingBalance: principal,
          cumulativeInterest: 0,
        })
        continue
      }

      // Calculate deposits for this year
      const depositPeriods = isPartialYear
        ? (totalMonths / 12) * depositsPerYear
        : depositsPerYear

      yearDeposits = deposit * depositPeriods

      // Calculate compound interest for this year
      const periodsInYear = isPartialYear ? (totalMonths / 12) * compoundsPerYear : compoundsPerYear
      const ratePerPeriod = rate / compoundsPerYear

      // For each deposit period in the year
      for (let i = 0; i < depositPeriods; i++) {
        // Add deposit
        currentBalance += deposit
        // Calculate remaining periods for this deposit
        const remainingPeriods = periodsInYear - (i * compoundsPerYear) / depositsPerYear
        // Compound the balance
        for (let j = 0; j < remainingPeriods / depositPeriods; j++) {
          currentBalance *= 1 + ratePerPeriod
        }
      }

      // Add interest from starting balance
      currentBalance = startingBalance * Math.pow(1 + ratePerPeriod, periodsInYear) + currentBalance - startingBalance

      yearInterest = currentBalance - startingBalance - yearDeposits
      const cumulativeInterest =
        (yearlyBreakdown[year - 1]?.cumulativeInterest || 0) + yearInterest

      yearlyBreakdown.push({
        year,
        startingBalance,
        deposits: yearDeposits,
        interest: yearInterest,
        endingBalance: currentBalance,
        cumulativeInterest,
      })
    }

    const finalBalance = yearlyBreakdown[yearlyBreakdown.length - 1]?.endingBalance || 0
    const totalDeposits = principal + deposit * depositsPerYear * totalTimeInYears
    const totalInterest = finalBalance - totalDeposits

    return {
      yearlyBreakdown,
      finalBalance,
      totalDeposits,
      totalInterest,
      roi: ((finalBalance - totalDeposits) / totalDeposits) * 100,
    }
  }, [
    initialBalance,
    annualReturn,
    compoundFrequency,
    years,
    months,
    depositAmount,
    depositFrequency,
    hasCalculated,
  ])

  const handleCalculate = () => {
    setHasCalculated(true)
  }

  const handleSave = async () => {
    if (!calculationName.trim() || !session?.user?.email) return

    setSavingCalculation(true)

    try {
      const calculation: Omit<CompoundInterestCalculation, 'id' | 'createdAt'> = {
        name: calculationName,
        currency,
        initialBalance: parseFloat(initialBalance),
        annualReturn: parseFloat(annualReturn),
        compoundFrequency,
        years: parseFloat(years),
        months: parseFloat(months),
        depositAmount: parseFloat(depositAmount),
        depositFrequency,
      }

      const response = await fetch('/api/compound-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculation }),
      })

      if (response.ok) {
        const data = await response.json()
        setSavedCalculations((prev) => [...prev, data.calculation])
        setShowSaveModal(false)
        setCalculationName('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save calculation')
      }
    } catch (error) {
      console.error('Failed to save calculation:', error)
      alert('Failed to save calculation')
    } finally {
      setSavingCalculation(false)
    }
  }

  const handleLoadCalculation = (calc: CompoundInterestCalculation) => {
    setCurrency(calc.currency)
    setInitialBalance(calc.initialBalance.toString())
    setAnnualReturn(calc.annualReturn.toString())
    setCompoundFrequency(calc.compoundFrequency)
    setYears(calc.years.toString())
    setMonths(calc.months.toString())
    setDepositAmount(calc.depositAmount.toString())
    setDepositFrequency(calc.depositFrequency)
    setHasCalculated(false)
  }

  const handleDeleteCalculation = async (id: string) => {
    if (!session?.user?.email) return

    try {
      const response = await fetch(`/api/compound-calculations?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSavedCalculations((prev) => prev.filter((c) => c.id !== id))
      } else {
        alert('Failed to delete calculation')
      }
    } catch (error) {
      console.error('Failed to delete calculation:', error)
      alert('Failed to delete calculation')
    }
  }

  const handleExportCSV = () => {
    if (!calculateCompoundInterest) return

    const { yearlyBreakdown } = calculateCompoundInterest
    const csvContent = [
      ['Year', 'Starting Balance', 'Deposits', 'Interest', 'Ending Balance', 'Cumulative Interest'],
      ...yearlyBreakdown.map((row) => [
        row.year,
        row.startingBalance.toFixed(2),
        row.deposits.toFixed(2),
        row.interest.toFixed(2),
        row.endingBalance.toFixed(2),
        row.cumulativeInterest.toFixed(2),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compound-interest-${Date.now()}.csv`
    a.click()
  }

  const handleApplyPreset = (presetReturn: number) => {
    setAnnualReturn(presetReturn.toString())
  }

  const formatCurrency = (value: number) => {
    const symbol = CURRENCY_SYMBOLS[currency]
    if (currency === 'BTC') {
      return `${symbol}${value.toFixed(8)}`
    }
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
            Compound Interest Calculator
          </h1>
          <p className="mt-2 text-lg font-body" style={{ color: 'var(--text-secondary)' }}>
            Discover the power of compounding and plan your investment strategy
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-6">
              <h2 className="text-xl font-heading font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                Investment Details
              </h2>

              {/* Currency Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium font-body mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Currency
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['USD', 'GBP', 'EUR', 'BTC'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setCurrency(curr)}
                      className={`px-3 py-2 rounded-lg font-body text-sm font-medium transition-all ${
                        currency === curr
                          ? 'text-white shadow-md'
                          : 'border'
                      }`}
                      style={
                        currency === curr
                          ? { backgroundColor: 'var(--spreads-green)' }
                          : { borderColor: 'var(--border-color)', color: 'var(--text-primary)' }
                      }
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Initial Balance */}
              <div className="mb-4">
                <label className="block text-sm font-medium font-body mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Initial Investment
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 font-body"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {CURRENCY_SYMBOLS[currency]}
                  </span>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="input-field pl-8"
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* Annual Return */}
              <div className="mb-4">
                <label className="block text-sm font-medium font-body mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Annual Return Rate (%)
                </label>
                <input
                  type="number"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  className="input-field"
                  placeholder="10"
                  step="0.1"
                />
                {/* Historical Presets */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {HISTORICAL_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset.return)}
                      className="px-2 py-1 text-xs rounded font-body transition-all hover:scale-105"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                      }}
                      title={`${preset.return}% annual return`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compound Frequency */}
              <div className="mb-4">
                <label className="block text-sm font-medium font-body mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Compound Frequency
                </label>
                <select
                  value={compoundFrequency}
                  onChange={(e) => {
                    const freq = e.target.value as typeof compoundFrequency
                    setCompoundFrequency(freq)
                    // Auto-match deposit frequency
                    if (freq !== 'daily') {
                      setDepositFrequency(freq as typeof depositFrequency)
                    }
                  }}
                  className="select-field"
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly (12/yr)</option>
                  <option value="quarterly">Quarterly (4/yr)</option>
                  <option value="semi-annually">Semi-annually (2/yr)</option>
                  <option value="annually">Annually (1/yr)</option>
                </select>
              </div>

              {/* Time Period */}
              <div className="mb-4">
                <label className="block text-sm font-medium font-body mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Time Period
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      className="input-field"
                      placeholder="Years"
                      min="0"
                    />
                    <span className="text-xs mt-1 block font-body" style={{ color: 'var(--text-muted)' }}>
                      Years
                    </span>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                      className="input-field"
                      placeholder="Months"
                      min="0"
                      max="11"
                    />
                    <span className="text-xs mt-1 block font-body" style={{ color: 'var(--text-muted)' }}>
                      Months
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Deposits */}
              <div className="mb-4">
                <label className="block text-sm font-medium font-body mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Additional Contributions
                </label>
                <div className="relative mb-2">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 font-body"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {CURRENCY_SYMBOLS[currency]}
                  </span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input-field pl-8"
                    placeholder="500"
                  />
                </div>
                <select
                  value={depositFrequency}
                  onChange={(e) => setDepositFrequency(e.target.value as typeof depositFrequency)}
                  className="select-field"
                  disabled={compoundFrequency === 'daily'}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annually">Semi-annually</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              {/* Calculate Button */}
              <button onClick={handleCalculate} className="btn-primary w-full mb-3">
                Calculate
              </button>

              {/* Save Button */}
              {hasCalculated && session?.user?.email && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="btn-secondary w-full"
                  disabled={savingCalculation}
                >
                  {savingCalculation ? 'Saving...' : 'Save Calculation'}
                </button>
              )}

              {/* Login prompt for non-authenticated users */}
              {hasCalculated && !session?.user?.email && (
                <div className="text-center p-4 rounded-lg mt-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                    Sign in to save your calculations
                  </p>
                </div>
              )}
            </div>

            {/* Saved Calculations - Expandable */}
            {session?.user?.email && (
              <div className="card p-6 mt-6">
                <button
                  onClick={() => setShowSavedScenarios(!showSavedScenarios)}
                  className="w-full flex items-center justify-between transition-all hover:opacity-80"
                >
                  <h3 className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
                    Saved Scenarios {savedCalculations.length > 0 && `(${savedCalculations.length})`}
                  </h3>
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${showSavedScenarios ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showSavedScenarios && (
                  <div className="mt-4">
                    {loadingCalculations ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--spreads-green)' }}></div>
                        <p className="mt-2 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                          Loading scenarios...
                        </p>
                      </div>
                    ) : savedCalculations.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                          No saved scenarios yet. Calculate and save your first investment scenario!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {savedCalculations.map((calc) => (
                          <div
                            key={calc.id}
                            className="flex items-center justify-between p-3 rounded-lg transition-all hover:scale-[1.02]"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-body font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                {calc.name}
                              </p>
                              <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                                {calc.currency} • {calc.annualReturn}% • {calc.years}y {calc.months}m
                              </p>
                            </div>
                            <div className="flex gap-2 ml-3">
                              <button
                                onClick={() => handleLoadCalculation(calc)}
                                className="px-3 py-1 text-xs rounded font-body whitespace-nowrap"
                                style={{
                                  backgroundColor: 'var(--spreads-green)',
                                  color: 'white',
                                }}
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeleteCalculation(calc.id)}
                                className="px-3 py-1 text-xs rounded font-body whitespace-nowrap"
                                style={{
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {!hasCalculated ? (
              <div className="card p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-2xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Ready to Calculate
                </h3>
                <p className="font-body" style={{ color: 'var(--text-secondary)' }}>
                  Enter your investment details and click Calculate to see the power of compound interest
                </p>
              </div>
            ) : calculateCompoundInterest ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="card p-6">
                    <p className="text-sm font-body mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Future Value
                    </p>
                    <p className="text-2xl font-body font-bold break-words" style={{ color: 'var(--spreads-green)' }}>
                      {formatCurrency(calculateCompoundInterest.finalBalance)}
                    </p>
                  </div>
                  <div className="card p-6">
                    <p className="text-sm font-body mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Total Interest Earned
                    </p>
                    <p className="text-2xl font-body font-bold break-words" style={{ color: 'var(--spreads-tan)' }}>
                      {formatCurrency(calculateCompoundInterest.totalInterest)}
                    </p>
                  </div>
                  <div className="card p-6">
                    <p className="text-sm font-body mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Return on Investment
                    </p>
                    <p className="text-2xl font-body font-bold break-words" style={{ color: 'var(--text-primary)' }}>
                      {calculateCompoundInterest.roi.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="card">
                  <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                      onClick={() => setActiveTab('chart')}
                      className={`flex-1 px-6 py-4 font-body font-medium transition-all ${
                        activeTab === 'chart' ? 'border-b-2' : ''
                      }`}
                      style={
                        activeTab === 'chart'
                          ? { borderColor: 'var(--spreads-green)', color: 'var(--spreads-green)' }
                          : { color: 'var(--text-secondary)' }
                      }
                    >
                      Chart View
                    </button>
                    <button
                      onClick={() => setActiveTab('table')}
                      className={`flex-1 px-6 py-4 font-body font-medium transition-all ${
                        activeTab === 'table' ? 'border-b-2' : ''
                      }`}
                      style={
                        activeTab === 'table'
                          ? { borderColor: 'var(--spreads-green)', color: 'var(--spreads-green)' }
                          : { color: 'var(--text-secondary)' }
                      }
                    >
                      Table View
                    </button>
                  </div>

                  <div className="p-6">
                    {activeTab === 'chart' ? (
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={calculateCompoundInterest.yearlyBreakdown}>
                            <defs>
                              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="5%"
                                  stopColor={theme === 'dark' ? '#22c55e' : '#193427'}
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={theme === 'dark' ? '#22c55e' : '#193427'}
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                            />
                            <XAxis
                              dataKey="year"
                              stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                              style={{ fontSize: '12px', fontFamily: 'Montserrat' }}
                            />
                            <YAxis
                              stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                              style={{ fontSize: '12px', fontFamily: 'Montserrat' }}
                              tickFormatter={(value) => formatCurrency(value)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: '1px solid',
                                borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                                borderRadius: '8px',
                                fontFamily: 'Montserrat',
                              }}
                              formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend
                              wrapperStyle={{ fontFamily: 'Montserrat', fontSize: '14px' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="endingBalance"
                              stroke={theme === 'dark' ? '#22c55e' : '#193427'}
                              strokeWidth={2}
                              fill="url(#colorBalance)"
                              name="Balance"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="table-header">Year</th>
                              <th className="table-header text-right">Starting Balance</th>
                              <th className="table-header text-right">Deposits</th>
                              <th className="table-header text-right">Interest</th>
                              <th className="table-header text-right">Ending Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculateCompoundInterest.yearlyBreakdown.map((row, idx) => (
                              <tr
                                key={row.year}
                                className="border-b transition-colors hover:bg-opacity-50"
                                style={{
                                  borderColor: 'var(--border-color)',
                                  backgroundColor:
                                    idx % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)',
                                }}
                              >
                                <td className="table-cell font-semibold">{row.year}</td>
                                <td className="table-cell text-right">
                                  {formatCurrency(row.startingBalance)}
                                </td>
                                <td className="table-cell text-right">
                                  {formatCurrency(row.deposits)}
                                </td>
                                <td className="table-cell text-right" style={{ color: 'var(--spreads-tan)' }}>
                                  {formatCurrency(row.interest)}
                                </td>
                                <td className="table-cell text-right font-semibold">
                                  {formatCurrency(row.endingBalance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Export Button */}
                  <div className="px-6 pb-6">
                    <button onClick={handleExportCSV} className="btn-accent">
                      Export as CSV
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Save Calculation
            </h3>
            <input
              type="text"
              value={calculationName}
              onChange={(e) => setCalculationName(e.target.value)}
              className="input-field mb-4"
              placeholder="e.g., Retirement Fund 2040"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !savingCalculation) {
                  handleSave()
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="btn-primary flex-1"
                disabled={savingCalculation || !calculationName.trim()}
              >
                {savingCalculation ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setCalculationName('')
                }}
                className="btn-secondary flex-1"
                disabled={savingCalculation}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
