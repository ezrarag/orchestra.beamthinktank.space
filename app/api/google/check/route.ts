import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, verifyAdminRole } from '@/lib/firebase-admin'
import { getGoogleTokens } from '@/lib/googleUtils'

/**
 * Check if Google OAuth is connected
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
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Verify admin role
    const isAdmin = await verifyAdminRole(decodedToken.uid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    const tokens = await getGoogleTokens()
    
    return NextResponse.json({
      connected: !!tokens,
      hasAccessToken: !!tokens?.accessToken,
      hasRefreshToken: !!tokens?.refreshToken,
    })

  } catch (error) {
    console.error('Google check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check Google connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

