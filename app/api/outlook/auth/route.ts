import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, verifyAdminRole } from '@/lib/firebase-admin'

/**
 * Initiates Microsoft OAuth 2.0 flow for Outlook/Office 365 access
 * Only accessible to admins
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Authentication service not initialized' },
        { status: 500 }
      )
    }
    
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Verify admin role
    const isAdmin = await verifyAdminRole(decodedToken.uid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://orchestra.beamthinktank.space'}/api/outlook/oauth2callback`
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID in environment variables.' },
        { status: 500 }
      )
    }

    // OAuth 2.0 scopes for Outlook Mail and Calendar
    const scopes = [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
      'offline_access'
    ].join(' ')

    // Generate state token for CSRF protection
    const state = Buffer.from(JSON.stringify({ uid: decodedToken.uid, timestamp: Date.now() })).toString('base64')

    // Build OAuth URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('response_mode', 'query')
    authUrl.searchParams.set('state', state)

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state
    })

  } catch (error) {
    console.error('Microsoft OAuth initiation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}





