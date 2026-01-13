import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { kv } from "@vercel/kv"
import type { PortfolioHolding } from "@/lib/types"

// GET /api/portfolio - Fetch user's portfolio holdings
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch portfolio from KV
    const portfolioKey = `portfolio:${session.user.email}`
    const holdings = await kv.get<PortfolioHolding[]>(portfolioKey)

    return NextResponse.json({
      holdings: holdings || [],
      timestamp: Date.now()
    })

  } catch (error) {
    console.error("Error fetching portfolio:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    )
  }
}

// POST /api/portfolio - Save/update user's portfolio holdings
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { holdings } = body

    if (!holdings || !Array.isArray(holdings)) {
      return NextResponse.json(
        { error: "Invalid holdings data" },
        { status: 400 }
      )
    }

    // Validate each holding
    for (const holding of holdings) {
      if (!holding.id || !holding.symbol || !holding.name ||
          typeof holding.shares !== 'number' ||
          typeof holding.purchasePrice !== 'number' ||
          typeof holding.totalCost !== 'number' ||
          !holding.purchaseDate) {
        return NextResponse.json(
          { error: "Invalid holding data format" },
          { status: 400 }
        )
      }
    }

    // Save portfolio to KV
    const portfolioKey = `portfolio:${session.user.email}`
    await kv.set(portfolioKey, holdings)

    return NextResponse.json({
      success: true,
      holdings,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error("Error saving portfolio:", error)
    return NextResponse.json(
      { error: "Failed to save portfolio" },
      { status: 500 }
    )
  }
}

// DELETE /api/portfolio - Delete a specific holding or clear entire portfolio
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const holdingId = searchParams.get('id')

    const portfolioKey = `portfolio:${session.user.email}`

    if (!holdingId) {
      // Clear entire portfolio
      await kv.del(portfolioKey)
      return NextResponse.json({
        success: true,
        message: "Portfolio cleared"
      })
    }

    // Delete specific holding
    const holdings = await kv.get<PortfolioHolding[]>(portfolioKey)

    if (!holdings) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    const updatedHoldings = holdings.filter(h => h.id !== holdingId)
    await kv.set(portfolioKey, updatedHoldings)

    return NextResponse.json({
      success: true,
      holdings: updatedHoldings
    })

  } catch (error) {
    console.error("Error deleting from portfolio:", error)
    return NextResponse.json(
      { error: "Failed to delete from portfolio" },
      { status: 500 }
    )
  }
}
