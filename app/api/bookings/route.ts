import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { CreateBookingPayload } from '@/lib/types/booking'

interface BookingTransactionResult {
  bookingRequestId: string
  remainingCredits: number
  monthlyAllotment: number
}

function parseNumeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Booking service is not initialized' }, { status: 500 })
    }
    const authService = adminAuth
    const db = adminDb

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await authService.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = (await request.json()) as Partial<CreateBookingPayload>

    const date = typeof body.date === 'string' ? body.date.trim() : ''
    const instrumentation = typeof body.instrumentation === 'string' ? body.instrumentation.trim() : ''
    const location = typeof body.location === 'string' ? body.location.trim() : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
    const creditsToUse = parseNumeric(body.creditsToUse)

    if (!date || !instrumentation || !location) {
      return NextResponse.json({ error: 'Date, location, and instrumentation are required.' }, { status: 400 })
    }

    if (!creditsToUse || creditsToUse <= 0) {
      return NextResponse.json({ error: 'creditsToUse must be greater than 0.' }, { status: 400 })
    }

    const userRef = db.collection('users').doc(uid)

    const result = await db.runTransaction<BookingTransactionResult>(async (transaction) => {
      const userSnapshot = await transaction.get(userRef)
      const userData = userSnapshot.data() || {}

      const isSubscriberClaim = decodedToken.subscriber === true || decodedToken.beam_subscriber === true
      const isSubscriberDoc = userData.subscriber === true || userData.role === 'subscriber'

      if (!isSubscriberClaim && !isSubscriberDoc) {
        throw new Error('FORBIDDEN_SUBSCRIBER_REQUIRED')
      }

      const bookingCredits = parseNumeric(userData.bookingCredits)
      const monthlyCredits = parseNumeric(userData.monthlyCredits)
      const subscriberCredits = parseNumeric(userData.subscriberCredits)

      const availableCredits = bookingCredits ?? monthlyCredits ?? subscriberCredits ?? 0
      if (creditsToUse > availableCredits) {
        throw new Error('INSUFFICIENT_CREDITS')
      }

      const monthlyAllotment =
        parseNumeric(userData.monthlyCreditAllotment) ??
        parseNumeric(userData.monthlyCreditsAllotment) ??
        parseNumeric(userData.monthlyCreditsTotal) ??
        monthlyCredits ??
        bookingCredits ??
        subscriberCredits ??
        availableCredits

      const remainingCredits = availableCredits - creditsToUse

      transaction.set(
        userRef,
        {
          bookingCredits: remainingCredits,
          monthlyCredits: remainingCredits,
          bookingCreditsUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      const bookingDocRef = db.collection('bookingRequests').doc()
      transaction.set(bookingDocRef, {
        userId: uid,
        date,
        location,
        instrumentation,
        notes,
        creditsUsed: creditsToUse,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      })

      return {
        bookingRequestId: bookingDocRef.id,
        remainingCredits,
        monthlyAllotment,
      }
    })

    return NextResponse.json({
      success: true,
      bookingRequestId: result.bookingRequestId,
      remainingCredits: result.remainingCredits,
      monthlyAllotment: result.monthlyAllotment,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN_SUBSCRIBER_REQUIRED') {
        return NextResponse.json({ error: 'Subscriber account required.' }, { status: 403 })
      }
      if (error.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: 'Not enough credits available.' }, { status: 400 })
      }
    }

    console.error('Error creating booking request:', error)
    return NextResponse.json(
      { error: 'Failed to create booking request.' },
      { status: 500 },
    )
  }
}
