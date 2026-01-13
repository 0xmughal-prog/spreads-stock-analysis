'use client'

import { useState } from 'react'

interface StockLogoProps {
  symbol: string
  logo?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StockLogo({ symbol, logo, size = 'md', className = '' }: StockLogoProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-12 h-12 text-sm'
  }

  const sizeClass = sizeClasses[size]

  // If no logo or image failed to load, show fallback with ticker abbreviation
  if (!logo || imageError) {
    return (
      <div
        className={`${sizeClass} rounded-lg bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center font-bold ${className}`}
        style={{ color: 'var(--spreads-green)' }}
      >
        {symbol.slice(0, 2)}
      </div>
    )
  }

  return (
    <img
      src={logo}
      alt={`${symbol} logo`}
      className={`${sizeClass} rounded-lg object-contain bg-white dark:bg-gray-800 ${className}`}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  )
}
