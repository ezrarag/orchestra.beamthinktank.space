import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminRole } from '@/lib/firebase-admin'

/**
 * OAuth 2.0 callback handler
 * Exchanges authorization code for access/refresh tokens
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/admin/settings?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/settings?error=missing_code_or_state', request.url)
      )
    }

    // Decode state to get user ID
    let stateData: { uid: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/admin/settings?error=invalid_state', request.url)
      )
    }

    // Verify admin role
    const isAdmin = await verifyAdminRole(stateData.uid)
    if (!isAdmin) {
      return NextResponse.redirect(
        new URL('/admin/settings?error=unauthorized', request.url)
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://orchestra.beamthinktank.space'}/api/google/oauth2callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/admin/settings?error=oauth_not_configured', request.url)
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange error:', errorData)
      return NextResponse.redirect(
        new URL(`/admin/settings?error=${encodeURIComponent(errorData.error || 'token_exchange_failed')}`, request.url)
      )
    }

    const tokens = await tokenResponse.json()

    // Store tokens in Firestore
    await adminDb.collection('integrations').doc('google').set({
      userId: stateData.uid,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
      scope: tokens.scope,
      updatedAt: new Date(),
    }, { merge: true })

    return NextResponse.redirect(
      new URL('/admin/settings?success=google_connected', request.url)
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/admin/settings?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, request.url)
    )
  }
}

