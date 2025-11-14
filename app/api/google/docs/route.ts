import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, verifyAdminRole } from '@/lib/firebase-admin'
import { searchGoogleDocs } from '@/lib/googleUtils'

/**
 * Search Google Drive for relevant documents
 */
export async function POST(request: NextRequest) {
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
    
    // Check if adminAuth is initialized
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

    const body = await request.json()
    const searchQuery = body.query || 'name contains "roster" or name contains "audition" or name contains "musicians" or name contains "BDSO"'
    const maxResults = body.maxResults || 50

    // Search Google Drive
    const docs = await searchGoogleDocs(searchQuery, maxResults)

    return NextResponse.json({
      success: true,
      results: docs,
      total: docs.length,
    })

  } catch (error) {
    console.error('Google Docs search error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search Google Docs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

