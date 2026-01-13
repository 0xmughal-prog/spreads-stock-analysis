'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface PointsData {
  totalPoints: number
  gridProgress: number
  streakDays: number
  lastClaimDate: string | null
  canClaimToday: boolean
  gridState: boolean[]
}

export default function PointsGrid() {
  const { data: session, status } = useSession()
  const [pointsData, setPointsData] = useState<PointsData | null>(null)
  const [newlyFilledSquare, setNewlyFilledSquare] = useState<number | null>(null)

  // Fetch points data
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchPointsData()
    }
  }, [status, session])

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (status === 'authenticated') {
      const interval = setInterval(fetchPointsData, 30000)
      return () => clearInterval(interval)
    }
  }, [status])

  const fetchPointsData = async () => {
    try {
      const response = await fetch('/api/points/claim')
      if (response.ok) {
        const data = await response.json()

        // Check if a new square was filled
        if (pointsData && data.totalPoints > pointsData.totalPoints) {
          const newIndex = data.totalPoints - 1
          setNewlyFilledSquare(newIndex)
          setTimeout(() => setNewlyFilledSquare(null), 1000)
        }

        setPointsData(data)
      }
    } catch (error) {
      console.error('Failed to fetch points:', error)
    }
  }

  // Don't render if not authenticated or no data
  if (status !== 'authenticated' || !pointsData) {
    return null
  }

  // Create 7x7 grid (49 squares)
  const gridSize = 7
  const totalSquares = gridSize * gridSize
  const gridState = pointsData.gridState || Array(totalSquares).fill(false)

  // Calculate which squares should be filled (left to right, top to bottom)
  const squares = Array.from({ length: totalSquares }, (_, index) => ({
    index,
    isFilled: gridState[index] || false,
    isNew: index === newlyFilledSquare,
  }))

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 1,
      }}
    >
      {/* 7x7 Grid Overlay - Aligns with 40px background grid */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          gap: '0',
          padding: '0',
        }}
      >
        {squares.map((square) => (
          <div
            key={square.index}
            className="relative"
            style={{
              aspectRatio: '1/1',
            }}
          >
            {square.isFilled && (
              <div
                className={`absolute inset-0 m-1 rounded-sm ${
                  square.isNew ? 'grid-square-fill' : 'grid-square-filled'
                }`}
                style={{
                  backgroundColor: 'var(--spreads-green)',
                  opacity: square.isNew ? 1 : 0.2,
                  border: '1px solid var(--spreads-green)',
                  boxShadow: square.isNew
                    ? '0 0 20px rgba(25, 52, 39, 0.5)'
                    : 'none',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Overlay effect for better visibility */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.02) 100%)',
        }}
      />
    </div>
  )
}
