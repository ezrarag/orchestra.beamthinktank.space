import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminRole } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1]
    
    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Verify admin role
    const isAdmin = await verifyAdminRole(uid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    // Check if adminDb is initialized
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    // Test Firestore access
    const organizationsSnapshot = await adminDb.collection('organizations').limit(5).get()
    const projectsSnapshot = await adminDb.collection('projects').limit(5).get()
    const musiciansSnapshot = await adminDb.collection('musicians').limit(5).get()

    // Test Auth access
    const usersSnapshot = await adminAuth.listUsers(5)

    return NextResponse.json({
      success: true,
      message: 'Firebase Admin SDK authentication successful',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'unknown'
      },
      data: {
        organizations: {
          count: organizationsSnapshot.size,
          docs: organizationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        },
        projects: {
          count: projectsSnapshot.size,
          docs: projectsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        },
        musicians: {
          count: musiciansSnapshot.size,
          docs: musiciansSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        },
        users: {
          count: usersSnapshot.users.length,
          users: usersSnapshot.users.map(user => ({
            uid: user.uid,
            email: user.email,
            role: user.customClaims?.role || 'unknown',
            lastSignIn: user.metadata.lastSignInTime
          }))
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test auth error:', error)
    
    // Handle specific Firebase errors
    if (error instanceof Error && error.message.includes('auth/invalid-token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    if (error instanceof Error && error.message.includes('auth/token-expired')) {
      return NextResponse.json(
        { error: 'Authentication token expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}

// Optional: Test endpoint that doesn't require authentication (for debugging)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType } = body

    switch (testType) {
      case 'firestore':
        // Test Firestore connection without auth
        const snapshot = await adminDb.collection('organizations').limit(1).get()
        return NextResponse.json({
          success: true,
          message: 'Firestore connection successful',
          count: snapshot.size
        })

      case 'auth':
        // Test Auth service without user verification
        const users = await adminAuth.listUsers(1)
        return NextResponse.json({
          success: true,
          message: 'Auth service connection successful',
          userCount: users.users.length
        })

      default:
        return NextResponse.json({
          success: true,
          message: 'Firebase Admin SDK initialized successfully',
          projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          environment: process.env.NODE_ENV
        })
    }

  } catch (error) {
    console.error('Firebase Admin SDK test error:', error)
    return NextResponse.json(
      { 
        error: 'Firebase Admin SDK test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
