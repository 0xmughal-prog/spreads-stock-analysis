'use client'

import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { TabType } from '@/lib/types'

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  watchlistCount: number
  compareCount: number
  onCollapseChange?: (collapsed: boolean) => void
}

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'pe-ratio',
    label: 'P/E Rankings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'earnings',
    label: 'Earnings Calendar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'compare',
    label: 'Compare',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeTab, onTabChange, watchlistCount, compareCount, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null)
  const { theme, toggleTheme } = useTheme()

  const handleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    onCollapseChange?.(newState)
  }

  const getBadgeCount = (tabId: TabType): number | null => {
    if (tabId === 'watchlist' && watchlistCount > 0) return watchlistCount
    if (tabId === 'compare' && compareCount > 0) return compareCount
    return null
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: 'var(--header-bg)' }}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <h1 className="text-xl font-bold tracking-tight font-heading text-white">
              SPREADS
            </h1>
            <p className="text-xs font-body" style={{ color: 'var(--spreads-tan)' }}>
              Stock Analysis
            </p>
          </div>
          <button
            onClick={handleCollapse}
            className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 text-white transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          const isHovered = hoveredTab === tab.id
          const badgeCount = getBadgeCount(tab.id)

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className={`sidebar-tab w-full text-left group ${isActive ? 'active' : 'text-white'}`}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <span className="tab-indicator" />

              <span className={`transition-transform duration-200 ${isHovered && !isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>

              <span
                className={`flex-1 whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                }`}
              >
                {tab.label}
              </span>

              {badgeCount && !isCollapsed && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full transition-all duration-200 ${
                    isActive ? 'bg-gray-900 text-white' : 'bg-white/20 text-white'
                  }`}
                >
                  {badgeCount}
                </span>
              )}

              {badgeCount && isCollapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-tab w-full text-white"
        >
          <span className="tab-indicator" />
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
          <span
            className={`whitespace-nowrap transition-all duration-300 ${
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>
      </div>
    </aside>
  )
}
