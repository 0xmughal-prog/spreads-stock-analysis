// localStorage caching utility with 24-hour expiration

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

export const CACHE_KEYS = {
  STOCKS: 'spreads_stocks_cache',
  EARNINGS: 'spreads_earnings_cache',
  LAST_FETCH: 'spreads_last_fetch',
} as const

/**
 * Save data to localStorage with timestamp
 */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION_MS,
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    console.warn('Failed to save to cache:', error)
    // Handle quota exceeded by clearing old cache
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearAllCache()
    }
  }
}

/**
 * Get data from localStorage if not expired
 */
export function getCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry: CacheEntry<T> = JSON.parse(cached)

    // Check if cache is expired
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch (error) {
    console.warn('Failed to read from cache:', error)
    return null
  }
}

/**
 * Check if cache exists and is valid
 */
export function isCacheValid(key: string): boolean {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return false

    const entry = JSON.parse(cached)
    return Date.now() < entry.expiresAt
  } catch {
    return false
  }
}

/**
 * Get cache age in minutes
 */
export function getCacheAge(key: string): number | null {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry = JSON.parse(cached)
    return Math.floor((Date.now() - entry.timestamp) / (60 * 1000))
  } catch {
    return null
  }
}

/**
 * Get time until cache expires in hours
 */
export function getCacheTimeRemaining(key: string): number | null {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry = JSON.parse(cached)
    const remaining = entry.expiresAt - Date.now()
    if (remaining <= 0) return null

    return Math.floor(remaining / (60 * 60 * 1000))
  } catch {
    return null
  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn('Failed to clear cache:', error)
  }
}

/**
 * Clear all app cache entries
 */
export function clearAllCache(): void {
  Object.values(CACHE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  })
}

/**
 * Force refresh cache by clearing and returning null
 */
export function invalidateCache(key: string): void {
  clearCache(key)
}

/**
 * Get cache metadata for debugging/display
 */
export function getCacheInfo(key: string): {
  exists: boolean
  isValid: boolean
  ageMinutes: number | null
  hoursRemaining: number | null
} {
  const exists = localStorage.getItem(key) !== null
  return {
    exists,
    isValid: isCacheValid(key),
    ageMinutes: getCacheAge(key),
    hoursRemaining: getCacheTimeRemaining(key),
  }
}
