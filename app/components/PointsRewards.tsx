'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Stock } from '@/lib/types'
import { useTheme } from '../context/ThemeContext'

interface PointsRewardsProps {
  stocks: Stock[]
}

interface PointsData {
  totalPoints: number
  gridProgress: number
  streakDays: number
  lastClaimDate: string | null
  canClaimToday: boolean
  gridState: boolean[]
}

export default function PointsRewards({ stocks }: PointsRewardsProps) {
  const { theme } = useTheme()
  const { data: session } = useSession()
  const [pointsData, setPointsData] = useState<PointsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newSquareIndex, setNewSquareIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchPointsData()
  }, [])

  const fetchPointsData = async () => {
    try {
      const response = await fetch('/api/points/claim')
      if (response.ok) {
        const data = await response.json()
        setPointsData(data)
      }
    } catch (error) {
      console.error('Failed to fetch points:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!pointsData?.canClaimToday || claiming) return

    setClaiming(true)
    setMessage(null)

    try {
      const response = await fetch('/api/points/claim', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `+1 Point! ${data.streakDays} day streak! 🎉`,
        })
        setPointsData(data)

        // Trigger animation for new square
        if (data.newSquareIndex !== undefined) {
          setNewSquareIndex(data.newSquareIndex)
          setTimeout(() => setNewSquareIndex(null), 1000)
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to claim points',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to claim points. Please try again.',
      })
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="content-panel">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse-slow text-center">
            <div className="text-4xl mb-4">💎</div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading your rewards...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!pointsData) {
    return (
      <div className="content-panel">
        <div className="card p-8 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>
            Failed to load points data. Please refresh the page.
          </p>
        </div>
      </div>
    )
  }

  const gridSize = 7
  const totalSquares = gridSize * gridSize
  const gridState = pointsData.gridState || Array(totalSquares).fill(false)
  const progress = (pointsData.totalPoints / totalSquares) * 100

  return (
    <div className="content-panel">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--spreads-green)' }}
        >
          Points & Rewards
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Claim your daily point and fill the grid to unlock rewards!
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-stagger">
        {/* Total Points Card */}
        <div className="card p-6 card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Points
            </p>
            <span className="text-2xl">💎</span>
          </div>
          <p
            className="text-4xl font-bold mb-1"
            style={{ color: 'var(--spreads-green)' }}
          >
            {pointsData.totalPoints}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {pointsData.totalPoints} / {totalSquares} squares filled
          </p>
          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--spreads-green)',
              }}
            />
          </div>
        </div>

        {/* Streak Card */}
        <div className="card p-6 card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Daily Streak
            </p>
            <span className="text-2xl">🔥</span>
          </div>
          <p
            className="text-4xl font-bold mb-1"
            style={{ color: 'var(--spreads-green)' }}
          >
            {pointsData.streakDays}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {pointsData.streakDays === 0
              ? 'Start your streak today!'
              : `${pointsData.streakDays} day${pointsData.streakDays > 1 ? 's' : ''} in a row`}
          </p>
        </div>

        {/* Last Claim Card */}
        <div className="card p-6 card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Last Claim
            </p>
            <span className="text-2xl">📅</span>
          </div>
          <p
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--spreads-green)' }}
          >
            {pointsData.lastClaimDate
              ? new Date(pointsData.lastClaimDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'Never'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {pointsData.canClaimToday ? 'Ready to claim!' : 'Come back tomorrow'}
          </p>
        </div>
      </div>

      {/* Claim Button Section */}
      {pointsData.canClaimToday && (
        <div className="card p-8 mb-6 text-center">
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--spreads-green)' }}
          >
            Daily Point Available!
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Click below to claim your daily point and continue your streak
          </p>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="claim-button btn-primary px-8 py-4 text-lg font-bold"
            style={{
              backgroundColor: 'var(--spreads-green)',
              opacity: claiming ? 0.6 : 1,
            }}
          >
            {claiming ? 'Claiming...' : '✨ Claim Daily Point ✨'}
          </button>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`mt-4 p-4 rounded-lg animate-fade-in ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              <p
                className="font-medium"
                style={{
                  color:
                    message.type === 'success'
                      ? 'var(--spreads-green)'
                      : '#ef4444',
                }}
              >
                {message.text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Visual Grid Display */}
      <div className="card p-8">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: 'var(--spreads-green)' }}
        >
          Your Progress Grid (7×7)
        </h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Each square represents one daily point. Fill all 49 squares!
        </p>

        {/* 7x7 Grid */}
        <div
          className="grid gap-2 max-w-2xl mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {Array.from({ length: totalSquares }, (_, index) => {
            const isFilled = gridState[index] || false
            const isNew = index === newSquareIndex

            return (
              <div
                key={index}
                className={`aspect-square rounded-lg border-2 transition-all duration-300 ${
                  isFilled ? 'border-opacity-100' : 'border-opacity-30'
                } ${isNew ? 'grid-square-fill' : ''}`}
                style={{
                  backgroundColor: isFilled
                    ? 'var(--spreads-green)'
                    : 'var(--bg-tertiary)',
                  borderColor: 'var(--spreads-green)',
                  opacity: isFilled ? 1 : 0.3,
                  boxShadow: isNew
                    ? '0 0 20px rgba(25, 52, 39, 0.6)'
                    : isFilled
                    ? '0 2px 8px rgba(25, 52, 39, 0.2)'
                    : 'none',
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  {isFilled && <span className="text-white text-xs">✓</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Grid Legend */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border-2"
              style={{
                backgroundColor: 'var(--spreads-green)',
                borderColor: 'var(--spreads-green)',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Claimed</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border-2"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--spreads-green)',
                opacity: 0.3,
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Unclaimed</span>
          </div>
        </div>
      </div>

      {/* Rewards Section */}
      <div className="card p-8 mt-6">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: 'var(--spreads-green)' }}
        >
          Upcoming Rewards 🎁
        </h2>
        <div className="space-y-4">
          {[
            { points: 7, reward: 'Bronze Badge', icon: '🥉' },
            { points: 14, reward: 'Silver Badge', icon: '🥈' },
            { points: 21, reward: 'Gold Badge', icon: '🥇' },
            { points: 30, reward: 'Diamond Badge', icon: '💎' },
            { points: 49, reward: 'Master Achievement', icon: '👑' },
          ].map((milestone) => {
            const achieved = pointsData.totalPoints >= milestone.points
            return (
              <div
                key={milestone.points}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  achieved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{milestone.icon}</span>
                  <div>
                    <p
                      className="font-medium"
                      style={{
                        color: achieved
                          ? 'var(--spreads-green)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {milestone.reward}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {milestone.points} points required
                    </p>
                  </div>
                </div>
                {achieved && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--spreads-green)',
                      color: 'white',
                    }}
                  >
                    Unlocked!
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
