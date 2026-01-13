import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { kv } from "@vercel/kv"
import type { StoredUser } from "@/auth"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const RESERVED_USERNAMES = ['admin', 'root', 'system', 'spreads', 'official']

// Validate username format
function validateUsernameFormat(username: string): { valid: boolean; error?: string } {
  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: "Username must be 3-20 characters" }
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores" }
  }

  if (username.startsWith('_') || username.endsWith('_')) {
    return { valid: false, error: "Username cannot start or end with underscore" }
  }

  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, error: "This username is reserved" }
  }

  return { valid: true }
}

// Check if user can change username (7-day restriction)
function canChangeUsername(user: StoredUser): { allowed: boolean; daysRemaining?: number } {
  if (!user.usernameLastChanged) {
    return { allowed: true }
  }

  const timeSinceChange = Date.now() - user.usernameLastChanged

  if (timeSinceChange >= SEVEN_DAYS_MS) {
    return { allowed: true }
  }

  const msRemaining = SEVEN_DAYS_MS - timeSinceChange
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))

  return { allowed: false, daysRemaining }
}

// GET /api/profile - Get current user profile
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch user from KV
    const user = await kv.hget<StoredUser>("users", session.user.email)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user can change username
    const changeEligibility = canChangeUsername(user)

    return NextResponse.json({
      user,
      canChangeUsername: changeEligibility.allowed,
      daysUntilChange: changeEligibility.daysRemaining || 0
    })

  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

// POST /api/profile - Update username
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
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    // Trim and validate format
    const trimmedUsername = username.trim()
    const formatValidation = validateUsernameFormat(trimmedUsername)

    if (!formatValidation.valid) {
      return NextResponse.json(
        { error: formatValidation.error },
        { status: 400 }
      )
    }

    // Fetch current user
    const user = await kv.hget<StoredUser>("users", session.user.email)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check 7-day restriction
    const changeEligibility = canChangeUsername(user)

    if (!changeEligibility.allowed) {
      return NextResponse.json(
        { error: `You can change your username again in ${changeEligibility.daysRemaining} days` },
        { status: 400 }
      )
    }

    // Check uniqueness (case-insensitive)
    const usernameLower = trimmedUsername.toLowerCase()
    const existingOwner = await kv.hget<string>("username_to_email", usernameLower)

    if (existingOwner && existingOwner !== session.user.email) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      )
    }

    // If user is changing username (not setting for first time), remove old one from index
    if (user.username) {
      const oldUsernameLower = user.username.toLowerCase()
      await kv.hdel("username_to_email", oldUsernameLower)
    }

    // Update user with new username
    const updatedUser: StoredUser = {
      ...user,
      username: trimmedUsername,
      usernameLastChanged: Date.now()
    }

    // Atomic update: update user and username index
    await kv.hset("users", { [session.user.email]: updatedUser })
    await kv.hset("username_to_email", { [usernameLower]: session.user.email })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error("Error updating username:", error)
    return NextResponse.json(
      { error: "Failed to update username" },
      { status: 500 }
    )
  }
}
