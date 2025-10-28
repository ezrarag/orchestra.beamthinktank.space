import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    
    try {
      // Save donation to Firestore
      await adminDb.collection('donations').add({
        donor_name: session.metadata?.donorName || 'Anonymous',
        donor_email: session.customer_email || '',
        musician_name: session.metadata?.musicianName || '',
        musician_email: session.metadata?.musicianEmail || '',
        recipientName: session.metadata?.musicianName || '', // For filtering
        amount: session.amount_total ? session.amount_total / 100 : 0,
        message: session.metadata?.message || '',
        anonymous: session.metadata?.isAnonymous === 'true',
        stripe_session_id: session.id,
        created_at: Timestamp.now(),
      })

      console.log('Donation saved to Firestore:', session.id)
    } catch (error) {
      console.error('Error saving donation to Firestore:', error)
      return NextResponse.json(
        { error: 'Failed to save donation' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}

