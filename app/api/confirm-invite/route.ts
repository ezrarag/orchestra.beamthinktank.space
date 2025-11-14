import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminRole } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prospectId, token, decision, userId, userEmail, userName } = body

    if (!prospectId || !token || !decision) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['confirmed', 'declined'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be "confirmed" or "declined"' },
        { status: 400 }
      )
    }

    // Check if adminDb is initialized
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    // Get prospect document
    const prospectRef = adminDb.collection('prospects').doc(prospectId)
    const prospectDoc = await prospectRef.get()

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

    // Check if already responded
    if (prospectData?.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'This invitation has already been responded to',
          currentStatus: prospectData?.status
        },
        { status: 409 }
      )
    }

    // Update prospect status
    const updateData: any = {
      status: decision,
      updatedAt: Timestamp.now()
    }

    if (decision === 'confirmed') {
      updateData.confirmedAt = Timestamp.now()
      if (userId) updateData.confirmedByUserId = userId
      if (userEmail) updateData.confirmedByEmail = userEmail
    } else {
      updateData.declinedAt = Timestamp.now()
    }

    await prospectRef.update(updateData)

    return NextResponse.json({
      success: true,
      message: `Invitation ${decision} successfully`,
      status: decision
    })

  } catch (error) {
    console.error('Error confirming invite:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}

