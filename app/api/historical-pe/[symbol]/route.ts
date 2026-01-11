import { NextRequest, NextResponse } from 'next/server'

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'

interface HistoricalPEDataPoint {
  date: string
  pe: number
}

interface FMPKeyMetric {
  date: string
  symbol: string
  peRatio: number | null
  priceToSalesRatio: number | null
  [key: string]: string | number | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'FMP_API_KEY is not configured' },
      { status: 500 }
    )
  }

  try {
    // Fetch historical key metrics - this includes PE ratio
    // FMP provides quarterly data, we'll get 10+ years worth (40+ quarters)
    const response = await fetch(
      `${FMP_BASE_URL}/key-metrics/${symbol.toUpperCase()}?period=quarter&limit=60&apikey=${apiKey}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data: FMPKeyMetric[] = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No historical data available for this symbol' },
        { status: 404 }
      )
    }

    // Transform and filter data - only include records with valid PE ratios
    const historicalPE: HistoricalPEDataPoint[] = data
      .filter((item): item is FMPKeyMetric & { peRatio: number } =>
        item.peRatio !== null && item.peRatio > 0 && item.peRatio < 1000
      )
      .map((item) => ({
        date: item.date,
        pe: Number(item.peRatio.toFixed(2))
      }))
      .reverse() // Oldest first for charting

    // Calculate 5-year average (last 20 quarters)
    const last20Quarters = historicalPE.slice(-20)
    const avgPE5Y = last20Quarters.length > 0
      ? Number((last20Quarters.reduce((sum, item) => sum + item.pe, 0) / last20Quarters.length).toFixed(2))
      : null

    // Calculate averages for different time periods
    const currentPE = historicalPE.length > 0 ? historicalPE[historicalPE.length - 1].pe : null

    // 1Y = 4 quarters
    const last4Quarters = historicalPE.slice(-4)
    const avgPE1Y = last4Quarters.length > 0
      ? Number((last4Quarters.reduce((sum, item) => sum + item.pe, 0) / last4Quarters.length).toFixed(2))
      : null

    // 3Y = 12 quarters
    const last12Quarters = historicalPE.slice(-12)
    const avgPE3Y = last12Quarters.length > 0
      ? Number((last12Quarters.reduce((sum, item) => sum + item.pe, 0) / last12Quarters.length).toFixed(2))
      : null

    // 10Y = 40 quarters
    const last40Quarters = historicalPE.slice(-40)
    const avgPE10Y = last40Quarters.length > 0
      ? Number((last40Quarters.reduce((sum, item) => sum + item.pe, 0) / last40Quarters.length).toFixed(2))
      : null

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      currentPE,
      avgPE1Y,
      avgPE3Y,
      avgPE5Y,
      avgPE10Y,
      historicalData: historicalPE,
      dataPoints: historicalPE.length
    })
  } catch (error) {
    console.error('Error fetching historical PE:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical PE data' },
      { status: 500 }
    )
  }
}
