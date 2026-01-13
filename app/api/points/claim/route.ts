import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { kv } from '@vercel/kv'
import { StoredUser } from '@/auth'

// Helper function to get UTC date string (YYYY-MM-DD)
function getUTCDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

// Helper function to check if two dates are consecutive days
function areConsecutiveDays(dateStr1: string, dateStr2: string): boolean {
  const date1 = new Date(dateStr1)
  const date2 = new Date(dateStr2)
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays === 1
}

// GET endpoint - Fetch current points status
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await kv.hget<StoredUser>('users', session.user.email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Initialize points data if not exists
    const totalPoints = user.totalPoints ?? 0
    const streakDays = user.streakDays ?? 0
    const lastClaimDate = user.lastClaimDate ?? null
    const gridState = user.gridState ?? Array(49).fill(false)
    const gridProgress = totalPoints
    const todayUTC = getUTCDateString()
    const canClaimToday = lastClaimDate !== todayUTC

    return NextResponse.json({
      totalPoints,
      gridProgress,
      streakDays,
      lastClaimDate,
      canClaimToday,
      gridState,
    })
  } catch (error) {
    console.error('Error fetching points:', error)
    return NextResponse.json(
      { error: 'Failed to fetch points' },
      { status: 500 }
    )
  }
}

// POST endpoint - Claim daily point
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await kv.hget<StoredUser>('users', session.user.email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Initialize points data if not exists
    let totalPoints = user.totalPoints ?? 0
    let streakDays = user.streakDays ?? 0
    const lastClaimDate = user.lastClaimDate ?? null
    let gridState = user.gridState ?? Array(49).fill(false)

    const todayUTC = getUTCDateString()

    // Check if already claimed today
    if (lastClaimDate === todayUTC) {
      return NextResponse.json(
        {
          error: 'Already claimed today',
          totalPoints,
          gridProgress: totalPoints,
          streakDays,
          canClaimToday: false,
        },
        { status: 400 }
      )
    }

    // Check if streak should reset (missed a day)
    if (lastClaimDate) {
      if (areConsecutiveDays(lastClaimDate, todayUTC)) {
        // Consecutive day - increment streak
        streakDays += 1
      } else {
        // Missed a day - reset streak to 1 (starting new streak)
        streakDays = 1
      }
    } else {
      // First claim ever
      streakDays = 1
    }

    // Add 1 point
    totalPoints += 1

    // Update grid state - fill the next empty square (left to right, top to bottom)
    const nextEmptyIndex = gridState.findIndex(square => !square)
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 49) {
      gridState[nextEmptyIndex] = true
    }

    // Update user in KV
    const updatedUser: StoredUser = {
      ...user,
      totalPoints,
      streakDays,
      lastClaimDate: todayUTC,
      gridState,
    }

    await kv.hset('users', { [session.user.email]: updatedUser })

    return NextResponse.json({
      success: true,
      totalPoints,
      gridProgress: totalPoints,
      streakDays,
      lastClaimDate: todayUTC,
      canClaimToday: false,
      gridState,
      newSquareIndex: nextEmptyIndex, // For animation purposes
    })
  } catch (error) {
    console.error('Error claiming points:', error)
    return NextResponse.json(
      { error: 'Failed to claim points' },
      { status: 500 }
    )
  }
}
