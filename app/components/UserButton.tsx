'use client'

import { useState, useRef, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import Link from "next/link"

interface UserButtonProps {
  collapsed?: boolean
}

export default function UserButton({ collapsed = false }: UserButtonProps) {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (status === "loading") {
    return (
      <div className="sidebar-tab w-full text-white opacity-50">
        <span className="tab-indicator" />
        <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
        <span className={`whitespace-nowrap transition-all duration-300 ${
          collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
        }`}>
          Loading...
        </span>
      </div>
    )
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="sidebar-tab w-full text-white"
      >
        <span className="tab-indicator" />
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        <span className={`whitespace-nowrap transition-all duration-300 ${
          collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
        }`}>
          Sign In
        </span>
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="sidebar-tab w-full text-white flex items-center gap-3"
      >
        <span className="tab-indicator" />
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-8 h-8 rounded-full border-2 border-white/20 flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--spreads-tan)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--spreads-green)' }}>
              {session.user.name?.[0] || session.user.email?.[0] || "U"}
            </span>
          </div>
        )}
        <span className={`flex-1 text-left whitespace-nowrap transition-all duration-300 overflow-hidden ${
          collapsed ? 'opacity-0 w-0' : 'opacity-100'
        }`}>
          <span className="block text-sm font-medium truncate max-w-[120px]">
            {session.user.name || "User"}
          </span>
          {session.user.isAdmin && (
            <span className="text-xs" style={{ color: 'var(--spreads-tan)' }}>Admin</span>
          )}
        </span>
        {!collapsed && (
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !collapsed && (
        <div className="absolute bottom-full left-0 right-0 mb-2 py-2 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50"
             style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {session.user.email}
            </p>
          </div>

          {session.user.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin Dashboard
            </Link>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
