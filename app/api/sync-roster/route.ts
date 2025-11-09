import { NextRequest, NextResponse } from 'next/server'

/**
 * This endpoint provides a basic permission check.
 * The actual sync happens client-side using Firebase client SDK.
 * Firestore security rules will enforce admin-only writes.
 * 
 * If Admin SDK is not configured, we'll allow the request and rely on Firestore rules.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication token exists
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    
    // Try to verify with Admin SDK if available
    try {
      const { adminAuth, verifyAdminRole } = await import('@/lib/firebase-admin')
      const decodedToken = await adminAuth.verifyIdToken(token)
      
      // Verify admin role
      const isAdmin = await verifyAdminRole(decodedToken.uid)
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Insufficient permissions. Admin role required.' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Admin access verified. Proceed with client-side sync.',
        uid: decodedToken.uid
      })
    } catch (adminError) {
      // If Admin SDK is not configured, allow the request
      // Firestore rules will enforce admin-only access
      console.warn('Admin SDK not available, relying on Firestore rules:', adminError)
      return NextResponse.json({
        success: true,
        message: 'Proceeding with client-side sync. Firestore rules will enforce access.',
        warning: 'Admin SDK verification skipped - relying on Firestore security rules'
      })
    }

  } catch (error) {
    console.error('Sync roster auth error:', error)
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

