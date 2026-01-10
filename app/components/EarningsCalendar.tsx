'use client'

import { useState, useEffect, useMemo } from 'react'
import { EarningsEvent } from '@/lib/types'
import { getEarningsCalendar } from '@/lib/api'
import { formatLargeCurrency } from '@/lib/utils'

interface EarningsCalendarProps {
  onSelectEarnings?: (event: EarningsEvent) => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function getWeekDates(offset: number = 0): { start: Date; end: Date; dates: Date[] } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)

  // Adjust to Monday of the current week
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diff + offset * 7)
  monday.setHours(0, 0, 0, 0)

  const dates: Date[] = []
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date)
  }

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  return { start: monday, end: friday, dates }
}

function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatWeekRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' })
  const year = end.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`
}

export default function EarningsCalendar({ onSelectEarnings }: EarningsCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)

  const weekData = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true)
      try {
        const data = await getEarningsCalendar(
          formatDateForApi(weekData.start),
          formatDateForApi(weekData.end)
        )
        setEarnings(data)
      } catch (error) {
        console.error('Failed to fetch earnings:', error)
        setEarnings([])
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [weekData])

  const earningsByDate = useMemo(() => {
    const grouped: Record<string, EarningsEvent[]> = {}
    weekData.dates.forEach((date) => {
      grouped[formatDateForApi(date)] = []
    })

    earnings.forEach((event) => {
      if (grouped[event.date]) {
        grouped[event.date].push(event)
      }
    })

    // Sort each day's earnings: BMO first, then AMC
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        if (a.time === 'bmo' && b.time !== 'bmo') return -1
        if (a.time !== 'bmo' && b.time === 'bmo') return 1
        return a.symbol.localeCompare(b.symbol)
      })
    })

    return grouped
  }, [earnings, weekData])

  const getTimeLabel = (time: string) => {
    switch (time) {
      case 'bmo':
        return 'Pre Market'
      case 'amc':
        return 'Post Market'
      case 'dmh':
        return 'During Hours'
      default:
        return 'TBD'
    }
  }

  const getTimeBadgeColor = (time: string) => {
    switch (time) {
      case 'bmo':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'amc':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-heading">
          Earnings Calendar
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upcoming earnings announcements for S&P 500 companies
        </p>
      </div>

      {/* Week Navigation */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-heading">
              {formatWeekRange(weekData.start, weekData.end)}
            </h3>
            {weekOffset === 0 && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                This Week
              </span>
            )}
            {weekOffset === 1 && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Next Week
              </span>
            )}
            {weekOffset === -1 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Last Week
              </span>
            )}
          </div>

          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Quick Navigation */}
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              weekOffset === 0
                ? 'bg-spreads-green text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset(1)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              weekOffset === 1
                ? 'bg-spreads-green text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Next Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAYS.map((day) => (
            <div key={day} className="earnings-day animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {weekData.dates.map((date, index) => {
            const dateKey = formatDateForApi(date)
            const dayEarnings = earningsByDate[dateKey] || []
            const today = isToday(date)

            return (
              <div
                key={dateKey}
                className={`earnings-day ${today ? 'ring-2 ring-spreads-green' : ''}`}
              >
                {/* Day Header */}
                <div className={`mb-3 pb-2 border-b ${today ? 'border-spreads-green' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className={`font-semibold ${today ? 'text-spreads-green dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {DAYS[index]}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateDisplay(date)}
                  </div>
                  {today && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-spreads-green text-white text-xs rounded-full">
                      Today
                    </span>
                  )}
                </div>

                {/* Earnings Events */}
                <div className="space-y-2">
                  {dayEarnings.length > 0 ? (
                    dayEarnings.map((event) => (
                      <div
                        key={`${event.symbol}-${event.date}`}
                        className="earnings-card"
                        onClick={() => onSelectEarnings?.(event)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {event.symbol}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getTimeBadgeColor(event.time)}`}>
                            {getTimeLabel(event.time)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                          {event.name}
                        </p>
                        {event.epsEstimate !== null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Est. EPS</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              ${event.epsEstimate.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {event.revenueEstimate !== null && (
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-gray-500 dark:text-gray-400">Est. Rev</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {formatLargeCurrency(event.revenueEstimate)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                      No earnings
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="card p-4 mt-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTimeBadgeColor('bmo')}`}>
              Pre Market
            </span>
            <span className="text-gray-600 dark:text-gray-400">Before market open</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTimeBadgeColor('amc')}`}>
              Post Market
            </span>
            <span className="text-gray-600 dark:text-gray-400">After market close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
