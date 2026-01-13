import type { Metadata } from 'next'
import { Orbitron, Montserrat } from 'next/font/google'
import { ThemeProvider } from './context/ThemeContext'
import SessionProvider from './providers/SessionProvider'
import PointsGrid from './components/PointsGrid'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Spreads Stock Analysis - S&P 500 Dashboard',
  description: 'Analyze S&P 500 stocks with comprehensive financial metrics, charts, and comparison tools.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-body">
        <SessionProvider>
          <ThemeProvider>
            <PointsGrid />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
