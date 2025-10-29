import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const prospectId = searchParams.get('prospectId')
    const token = searchParams.get('token')

    if (!prospectId || !token) {
      return NextResponse.json(
        { error: 'Missing prospectId or token' },
        { status: 400 }
      )
    }

    // Get prospect document
    const prospectDoc = await adminDb.collection('prospects').doc(prospectId).get()

    if (!prospectDoc.exists) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const prospectData = prospectDoc.data()

    // Verify token matches
    if (prospectData?.confirmationToken !== token) {
      return NextResponse.json(
        { error: 'Invalid confirmation token' },
        { status: 401 }
      )
    }

    // Check if expired
    if (prospectData?.expiresAt?.toDate() < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      )
    }

    // Check if already responded
    if (prospectData?.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'This invitation has already been responded to',
          status: prospectData?.status
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      prospect: {
        id: prospectDoc.id,
        ...prospectData,
        expiresAt: prospectData?.expiresAt?.toDate().toISOString(),
        invitedAt: prospectData?.invitedAt?.toDate().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching prospect:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}

