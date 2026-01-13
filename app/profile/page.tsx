'use client'

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface ProfileData {
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
    createdAt: number
    lastLoginAt: number
    username?: string
    usernameLastChanged?: number
  }
  canChangeUsername: boolean
  daysUntilChange: number
}

interface UsernameCheck {
  available: boolean
  reason?: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [username, setUsername] = useState("")
  const [checking, setChecking] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheck | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile")
        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }
        const data = await response.json()
        setProfile(data)
        setUsername(data.user.username || "")
      } catch (err) {
        setError("Failed to load profile")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  // Debounced username availability check
  const checkUsername = useCallback(async (value: string) => {
    if (!value || value === profile?.user.username) {
      setUsernameStatus(null)
      return
    }

    setChecking(true)
    try {
      const response = await fetch(`/api/profile/check-username?username=${encodeURIComponent(value)}`)
      const data = await response.json()
      setUsernameStatus(data)
    } catch (err) {
      console.error("Failed to check username:", err)
    } finally {
      setChecking(false)
    }
  }, [profile])

  // Debounce username checking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username !== profile?.user.username) {
        checkUsername(username)
      } else {
        setUsernameStatus(null)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [username, profile, checkUsername])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }

    if (username === profile?.user.username) {
      setError("Username is unchanged")
      return
    }

    if (usernameStatus && !usernameStatus.available) {
      setError(usernameStatus.reason || "Username is not available")
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update username")
      }

      setSuccess("Username updated successfully!")
      setProfile(prev => prev ? {
        ...prev,
        user: data.user,
        canChangeUsername: false,
        daysUntilChange: 7
      } : null)
      setUsernameStatus(null)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update username")
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-off-white dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: 'var(--spreads-green)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!session?.user || !profile) {
    return null
  }

  const canSave = username.trim() &&
                  username !== profile.user.username &&
                  usernameStatus?.available &&
                  profile.canChangeUsername &&
                  !checking

  return (
    <div className="min-h-screen bg-off-white dark:bg-dark-bg">
      <div className="grid-background" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-heading" style={{ color: 'var(--spreads-green)' }}>
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your Spreads account
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
            {profile.user.image ? (
              <img
                src={profile.user.image}
                alt={profile.user.name || "User"}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: 'var(--spreads-tan)', color: 'var(--spreads-green)' }}>
                {profile.user.name?.[0] || profile.user.email[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-heading">
                {profile.user.name || "User"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{profile.user.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Member since {formatDate(profile.user.createdAt)}
              </p>
            </div>
          </div>

          {/* Username Form */}
          <form onSubmit={handleSave} className="mt-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!profile.canChangeUsername || saving}
                className="input-field w-full"
                placeholder="Enter your username"
                autoComplete="off"
              />

              {/* Username Status */}
              <div className="mt-2 min-h-[20px]">
                {checking && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking availability...
                  </p>
                )}
                {!checking && username && username !== profile.user.username && usernameStatus && (
                  <p className={`text-sm flex items-center gap-1 ${usernameStatus.available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {usernameStatus.available ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Available
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {usernameStatus.reason}
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Username Info */}
              <div className="mt-3 space-y-2">
                {profile.user.username && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current username: <span className="font-medium">@{profile.user.username}</span>
                  </p>
                )}
                {profile.user.usernameLastChanged && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Last changed: {formatDate(profile.user.usernameLastChanged)}
                  </p>
                )}
                {!profile.canChangeUsername && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    You can change your username again in {profile.daysUntilChange} day{profile.daysUntilChange !== 1 ? 's' : ''}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={!canSave || saving}
              className="btn-primary mt-6 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
