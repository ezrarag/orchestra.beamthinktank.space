import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { CreateCommunityBookingInterestPayload } from '@/lib/types/booking'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Booking service is not initialized' }, { status: 500 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = (await request.json()) as Partial<CreateCommunityBookingInterestPayload>
    const orchestraId = typeof body.orchestraId === 'string' ? body.orchestraId.trim() : ''
    const orchestraName = typeof body.orchestraName === 'string' ? body.orchestraName.trim() : ''
    const instrument = typeof body.instrument === 'string' ? body.instrument.trim() : ''

    if (!orchestraId || !orchestraName || !instrument) {
      return NextResponse.json(
        { error: 'orchestraId, orchestraName, and instrument are required.' },
        { status: 400 },
      )
    }

    const bookingDocRef = adminDb.collection('bookingRequests').doc()
    await bookingDocRef.set({
      userId: uid,
      type: 'community_orchestra_interest',
      orchestraId,
      orchestraName,
      instrument,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      bookingRequestId: bookingDocRef.id,
    })
  } catch (error) {
    console.error('Error creating community booking request:', error)
    return NextResponse.json(
      { error: 'Failed to create community booking request.' },
      { status: 500 },
    )
  }
}
