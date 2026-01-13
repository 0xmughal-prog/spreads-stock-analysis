import { NextRequest, NextResponse } from "next/server"

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd5hd4upr01qqequ1n9mgd5hd4upr01qqequ1n9n0'

// GET /api/portfolio/historical-price?symbol=AAPL&date=2024-01-15
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const dateString = searchParams.get('date')

    if (!symbol || !dateString) {
      return NextResponse.json(
        { error: "Symbol and date are required" },
        { status: 400 }
      )
    }

    // Parse the date and get Unix timestamps for the day
    const selectedDate = new Date(dateString)
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const fromTimestamp = Math.floor(startOfDay.getTime() / 1000)
    const toTimestamp = Math.floor(endOfDay.getTime() / 1000)

    // Fetch historical data from Finnhub (daily candles)
    const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${FINNHUB_API_KEY}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`)
    }

    const data = await response.json()

    // Check if data is available
    if (data.s === 'no_data' || !data.c || data.c.length === 0) {
      return NextResponse.json(
        {
          error: "No historical data available for this date",
          available: false
        },
        { status: 404 }
      )
    }

    // Return the closing price for that day
    // If multiple data points, use the last one (most recent)
    const closePrice = data.c[data.c.length - 1]
    const openPrice = data.o[data.o.length - 1]
    const highPrice = data.h[data.h.length - 1]
    const lowPrice = data.l[data.l.length - 1]

    return NextResponse.json({
      symbol,
      date: dateString,
      price: closePrice,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      available: true,
      source: 'finnhub'
    })

  } catch (error) {
    console.error("Error fetching historical price:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch historical price",
        available: false
      },
      { status: 500 }
    )
  }
}
