import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { kv } from "@vercel/kv"

// User interface for Vercel KV storage
export interface StoredUser {
  id: string
  email: string
  name: string | null
  image: string | null
  createdAt: number
  lastLoginAt: number
  username?: string              // User's unique username
  usernameLastChanged?: number   // Timestamp of last username change
  // Gamification fields
  totalPoints?: number           // Total points earned (each point fills one square in 7x7 grid)
  lastClaimDate?: string | null  // ISO date string of last claim (UTC), e.g., "2026-01-13"
  streakDays?: number            // Consecutive days claimed (resets to 0 if day missed)
  gridState?: boolean[]          // 49 booleans for 7x7 grid (true = filled, false = empty)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          // Store/update user in Vercel KV
          const existingUser = await kv.hget<StoredUser>("users", user.email)

          const userData: StoredUser = {
            id: user.id || crypto.randomUUID(),
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
            createdAt: existingUser?.createdAt || Date.now(),
            lastLoginAt: Date.now(),
          }

          // Store user by email as key in users hash
          await kv.hset("users", { [user.email]: userData })

          // Add to registered users set for easy enumeration
          await kv.sadd("registered_users", user.email)

        } catch (error) {
          console.error("Failed to store user in KV:", error)
          // Allow sign-in even if KV storage fails
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      // Check if user is admin
      const adminEmail = process.env.ADMIN_EMAIL
      token.isAdmin = token.email === adminEmail
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
})

// Extend the default types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      isAdmin: boolean
    }
  }

  interface JWT {
    id?: string
    isAdmin?: boolean
  }
}
