import { NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"

const RESERVED_USERNAMES = ['admin', 'root', 'system', 'spreads', 'official']

// Validate username format
function validateUsernameFormat(username: string): { valid: boolean; reason?: string } {
  if (username.length < 3 || username.length > 20) {
    return { valid: false, reason: "Username must be 3-20 characters" }
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, reason: "Only letters, numbers, and underscores allowed" }
  }

  if (username.startsWith('_') || username.endsWith('_')) {
    return { valid: false, reason: "Cannot start or end with underscore" }
  }

  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, reason: "This username is reserved" }
  }

  return { valid: true }
}

// GET /api/profile/check-username?username=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { available: false, reason: "Username is required" },
        { status: 400 }
      )
    }

    // Validate format
    const formatValidation = validateUsernameFormat(username.trim())

    if (!formatValidation.valid) {
      return NextResponse.json({
        available: false,
        reason: formatValidation.reason
      })
    }

    // Check uniqueness (case-insensitive)
    const usernameLower = username.trim().toLowerCase()
    const existingOwner = await kv.hget<string>("username_to_email", usernameLower)

    if (existingOwner) {
      return NextResponse.json({
        available: false,
        reason: "Username is already taken"
      })
    }

    return NextResponse.json({
      available: true
    })

  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json(
      { available: false, reason: "Failed to check availability" },
      { status: 500 }
    )
  }
}
