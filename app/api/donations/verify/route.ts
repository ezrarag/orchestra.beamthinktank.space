import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Extract metadata
    const metadata = session.metadata || {}
    
    // Format the amount for display
    const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00'

    return NextResponse.json({
      amount,
      musicianName: metadata.musicianName,
      donorName: metadata.donorName,
      message: metadata.message,
      isAnonymous: metadata.isAnonymous === 'true',
    })
  } catch (error) {
    console.error('Error verifying donation:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify donation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

