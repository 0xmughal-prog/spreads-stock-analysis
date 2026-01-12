import { NextResponse } from "next/server"

// Temporary debug endpoint - remove after fixing auth
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || ""
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ""
  const authSecret = process.env.AUTH_SECRET || ""
  const authUrl = process.env.AUTH_URL || ""

  return NextResponse.json({
    hasClientId: !!clientId,
    clientIdLength: clientId.length,
    clientIdPrefix: clientId.substring(0, 15) + "...",
    clientIdSuffix: "..." + clientId.substring(clientId.length - 20),
    hasClientSecret: !!clientSecret,
    secretLength: clientSecret.length,
    secretPrefix: clientSecret.substring(0, 10) + "...",
    hasAuthSecret: !!authSecret,
    authSecretLength: authSecret.length,
    authUrl: authUrl,
    nodeEnv: process.env.NODE_ENV,
  })
}
