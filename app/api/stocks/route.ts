import { NextResponse } from 'next/server'
import { getAllStockData, generateMockStocks } from '@/lib/api'

export async function GET() {
  try {
    // Check if API key is set
    if (!process.env.FMP_API_KEY) {
      // Return mock data if no API key
      const mockData = generateMockStocks()
      return NextResponse.json({
        data: mockData,
        source: 'mock',
        message: 'Using mock data. Set FMP_API_KEY environment variable for real data.',
      })
    }

    const stocks = await getAllStockData()
    return NextResponse.json({
      data: stocks,
      source: 'api',
      message: 'Data from Financial Modeling Prep',
    })
  } catch (error) {
    console.error('Error fetching stocks:', error)

    // Fallback to mock data on error
    const mockData = generateMockStocks()
    return NextResponse.json({
      data: mockData,
      source: 'mock',
      message: 'API error. Using mock data.',
    })
  }
}

export const revalidate = 300 // Cache for 5 minutes
