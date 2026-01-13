import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { kv } from '@vercel/kv'
import { StoredUser } from '@/auth'
import { CompoundInterestCalculation } from '@/lib/types'

// GET endpoint - Fetch user's saved calculations
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

    // Return calculations or empty array
    const calculations = user.compoundCalculations ?? []

    return NextResponse.json({
      calculations,
      total: calculations.length,
    })
  } catch (error) {
    console.error('Error fetching calculations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calculations' },
      { status: 500 }
    )
  }
}

// POST endpoint - Save a new calculation
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { calculation } = body as { calculation: CompoundInterestCalculation }

    if (!calculation || !calculation.name) {
      return NextResponse.json(
        { error: 'Invalid calculation data' },
        { status: 400 }
      )
    }

    const user = await kv.hget<StoredUser>('users', session.user.email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get existing calculations or initialize empty array
    const existingCalculations = user.compoundCalculations ?? []

    // Check if user has hit limit (max 20 saved calculations)
    if (existingCalculations.length >= 20) {
      return NextResponse.json(
        { error: 'Maximum 20 calculations allowed' },
        { status: 400 }
      )
    }

    // Add new calculation with unique ID
    const newCalculation: CompoundInterestCalculation = {
      ...calculation,
      id: Date.now().toString(),
      createdAt: Date.now(),
    }

    const updatedCalculations = [...existingCalculations, newCalculation]

    // Update user in KV
    const updatedUser: StoredUser = {
      ...user,
      compoundCalculations: updatedCalculations,
    }

    await kv.hset('users', { [session.user.email]: updatedUser })

    return NextResponse.json({
      success: true,
      calculation: newCalculation,
      total: updatedCalculations.length,
    })
  } catch (error) {
    console.error('Error saving calculation:', error)
    return NextResponse.json(
      { error: 'Failed to save calculation' },
      { status: 500 }
    )
  }
}

// DELETE endpoint - Delete a specific calculation
export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const calculationId = searchParams.get('id')

    if (!calculationId) {
      return NextResponse.json(
        { error: 'Calculation ID required' },
        { status: 400 }
      )
    }

    const user = await kv.hget<StoredUser>('users', session.user.email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get existing calculations
    const existingCalculations = user.compoundCalculations ?? []

    // Filter out the calculation to delete
    const updatedCalculations = existingCalculations.filter(
      (calc) => calc.id !== calculationId
    )

    // Update user in KV
    const updatedUser: StoredUser = {
      ...user,
      compoundCalculations: updatedCalculations,
    }

    await kv.hset('users', { [session.user.email]: updatedUser })

    return NextResponse.json({
      success: true,
      total: updatedCalculations.length,
    })
  } catch (error) {
    console.error('Error deleting calculation:', error)
    return NextResponse.json(
      { error: 'Failed to delete calculation' },
      { status: 500 }
    )
  }
}
