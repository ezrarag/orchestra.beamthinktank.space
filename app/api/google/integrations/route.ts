import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminRole } from '@/lib/firebase-admin'

/**
 * GET: List all Google integrations (backward compatibility)
 * DELETE: Remove a Google integration (backward compatibility)
 * 
 * Note: This route is kept for backward compatibility.
 * New code should use /api/integrations?type=google
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

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    // Fetch all Google integrations (backward compatibility)
    const integrationsSnapshot = await adminDb.collection('integrations')
      .where('type', '==', 'google')
      .get()

    const integrations = integrationsSnapshot.docs.map(doc => ({
      id: doc.id,
      userEmail: doc.data().userEmail || 'Unknown',
      userName: doc.data().userName || 'Unknown',
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      hasAccessToken: !!doc.data().accessToken,
      hasRefreshToken: !!doc.data().refreshToken,
      expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || doc.data().expiresAt,
    }))

    return NextResponse.json({
      integrations,
      count: integrations.length
    })

  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch integrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get('id')

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID required' },
        { status: 400 }
      )
    }

    // Delete the integration
    await adminDb.collection('integrations').doc(integrationId).delete()

    return NextResponse.json({
      success: true,
      message: 'Integration removed successfully'
    })

  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

