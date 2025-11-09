import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, verifyAdminRole } from '@/lib/firebase-admin'
import { searchGmail, extractMusicianInfo } from '@/lib/googleUtils'
import { collection, query, where, getDocs } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'

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
      const existingQuery = query(
        collection(adminDb, 'projectMusicians'),
        where('email', 'in', emailAddresses.slice(0, 10)) // Firestore 'in' query limit is 10
      )
      const existingSnapshot = await getDocs(existingQuery)
      existingSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.email) {
          existingEmails.add(data.email.toLowerCase())
        }
      })
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

