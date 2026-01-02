import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminRole } from '@/lib/firebase-admin'

/**
 * Microsoft OAuth 2.0 callback handler
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

    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://orchestra.beamthinktank.space'}/api/outlook/oauth2callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/admin/settings?error=oauth_not_configured', request.url)
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
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
        scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Calendars.Read offline_access'
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

    // Check if adminDb is initialized
    if (!adminDb) {
      return NextResponse.redirect(
        new URL('/admin/settings?error=database_not_initialized', request.url)
      )
    }

    // Fetch user info from Microsoft Graph to get email and name
    let userEmail = 'Unknown'
    let userName = 'Unknown'
    try {
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      })
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json()
        userEmail = userInfo.mail || userInfo.userPrincipalName || 'Unknown'
        userName = userInfo.displayName || userInfo.mail || 'Unknown'
      }
    } catch (error) {
      console.warn('Could not fetch user info from Microsoft Graph:', error)
    }

    // Generate unique ID for this integration (use email as part of ID)
    const integrationId = `outlook_${userEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`

    // Store tokens in Firestore with user info
    await adminDb.collection('integrations').doc(integrationId).set({
      type: 'outlook',
      userId: stateData.uid,
      userEmail: userEmail,
      userName: userName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
      scope: tokens.scope,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true })

    return NextResponse.redirect(
      new URL(`/admin/settings?success=connected&email=${encodeURIComponent(userEmail)}&type=outlook`, request.url)
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/admin/settings?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, request.url)
    )
  }
}





