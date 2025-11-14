import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, verifyAdminRole, adminDb } from '@/lib/firebase-admin'
import { searchGmail, extractMusicianInfo } from '@/lib/googleUtils'

/**
 * Scan Gmail for musician-related emails
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
    const searchQuery = body.query || process.env.GMAIL_QUERY || 'subject:(join OR audition OR play OR BDSO OR orchestra)'
    const maxResults = body.maxResults || 50

    // Search Gmail
    const emails = await searchGmail(searchQuery, maxResults)

    // Extract musician info and cross-reference with Firestore
    const candidates = emails.map(email => {
      const info = extractMusicianInfo(email)
      return {
        ...info,
        emailId: email.id,
        subject: email.subject,
        date: email.date,
        snippet: email.snippet,
      }
    })

    // Check which candidates are already in Firestore
    const existingEmails = new Set<string>()
    if (candidates.length > 0) {
      const emailAddresses = candidates.map(c => c.email.toLowerCase())
      // Firestore 'in' query limit is 10, so we need to batch if there are more
      const emailBatches = []
      for (let i = 0; i < emailAddresses.length; i += 10) {
        emailBatches.push(emailAddresses.slice(i, i + 10))
      }
      
      // Check if adminDb is initialized
      if (!adminDb) {
        return NextResponse.json(
          { error: 'Database not initialized' },
          { status: 500 }
        )
      }
      
      // Query each batch
      for (const batch of emailBatches) {
        const existingSnapshot = await adminDb
          .collection('projectMusicians')
          .where('email', 'in', batch)
          .get()
        
        existingSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.email) {
            existingEmails.add(data.email.toLowerCase())
          }
        })
      }
    }

    // Mark which candidates are new vs existing
    const results = candidates.map(candidate => ({
      ...candidate,
      isNew: !existingEmails.has(candidate.email.toLowerCase()),
    }))

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      new: results.filter(r => r.isNew).length,
      existing: results.filter(r => !r.isNew).length,
    })

  } catch (error) {
    console.error('Gmail scan error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to scan Gmail',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

