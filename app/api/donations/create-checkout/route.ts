import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const {
      amount,
      donorName,
      donorEmail,
      musicianName,
      musicianEmail,
      message,
      isAnonymous,
    } = await request.json()

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid donation amount' },
        { status: 400 }
      )
    }

    if (!musicianName || !musicianEmail) {
      return NextResponse.json(
        { error: 'Musician information is required' },
        { status: 400 }
      )
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Donation to ${musicianName}`,
              description: message || `Donation to support ${musicianName}'s musical work`,
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/donations/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}?canceled=true`,
      metadata: {
        donorName: isAnonymous ? 'Anonymous' : donorName,
        donorEmail: donorEmail || '',
        musicianName,
        musicianEmail,
        message: message || '',
        isAnonymous: isAnonymous.toString(),
      },
      customer_email: !isAnonymous && donorEmail ? donorEmail : undefined,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

