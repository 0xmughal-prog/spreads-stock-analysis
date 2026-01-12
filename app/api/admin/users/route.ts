import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { kv } from "@vercel/kv"

interface StoredUser {
  id: string
  email: string
  name: string | null
  image: string | null
  createdAt: number
  lastLoginAt: number
}

// GET /api/admin/users - List all registered users
export async function GET() {
  try {
    const session = await auth()

    // Verify authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Verify admin access
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    // Get all registered user emails
    const userEmails = await kv.smembers("registered_users")

    if (!userEmails || userEmails.length === 0) {
      return NextResponse.json({
        users: [],
        total: 0,
      })
    }

    // Get user details for each email
    const users: StoredUser[] = []
    for (const email of userEmails) {
      const userData = await kv.hget<StoredUser>("users", email as string)
      if (userData) {
        users.push(userData)
      }
    }

    // Sort by most recent login
    users.sort((a, b) => b.lastLoginAt - a.lastLoginAt)

    return NextResponse.json({
      users,
      total: users.length,
    })

  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users - Remove a user
export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (email === session.user.email) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Remove from users hash and registered_users set
    await kv.hdel("users", email)
    await kv.srem("registered_users", email)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
