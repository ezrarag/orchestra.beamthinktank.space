import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb, verifyAdminRole } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request (could be in Authorization header or cookie)
    let userId: string | null = null
    
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]
      const { adminAuth } = await import('@/lib/firebase-admin')
      
      if (adminAuth) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(token)
          userId = decodedToken.uid
        } catch (error) {
          // Token verification failed, but we'll allow guest checkout
          console.warn('Token verification failed:', error)
        }
      }
    }
    
    // For now, allow guest checkout - userId will be null
    // In production, you might want to require authentication

    const body = await request.json()
    const { eventId, tierId, quantity } = body

    // Validation
    if (!eventId || !tierId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, tierId, quantity' },
        { status: 400 }
      )
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    // Fetch event from Firestore
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const event = eventDoc.data()!
    
    // Validate event is on sale
    if (!event.onSale) {
      return NextResponse.json(
        { error: 'Tickets are not currently on sale for this event' },
        { status: 400 }
      )
    }

    // Validate ticket provider
    if (event.ticketProvider !== 'stripe') {
      return NextResponse.json(
        { error: 'This event does not use Stripe checkout' },
        { status: 400 }
      )
    }

    // Find the selected tier
    const tier = event.priceTiers?.find((t: any) => t.tierId === tierId)
    
    if (!tier) {
      return NextResponse.json(
        { error: 'Ticket tier not found' },
        { status: 404 }
      )
    }

    // Validate quantity
    if (quantity > tier.quantity) {
      return NextResponse.json(
        { error: `Only ${tier.quantity} tickets available for this tier` },
        { status: 400 }
      )
    }

    // Calculate total
    const totalAmount = tier.price * quantity

    // Create pending order in Firestore
    const orderData = {
      eventId,
      userId: userId || null, // Allow null for guest checkout
      tickets: [
        {
          tierId,
          quantity,
          subtotal: totalAmount,
        },
      ],
      status: 'pending',
      timestamp: Timestamp.now(),
      totalAmount,
    }

    const orderRef = await adminDb.collection('eventOrders').add(orderData)

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title} - ${tier.label}`,
              description: `${event.series} - ${event.venueName}, ${event.city}`,
              images: event.imageUrl ? [event.imageUrl] : undefined,
            },
            unit_amount: tier.price, // amount in cents
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tickets/${eventId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tickets/${eventId}?canceled=true`,
      metadata: {
        eventId,
        orderId: orderRef.id,
        userId: userId || 'guest',
        tierId,
        quantity: quantity.toString(),
        totalAmount: totalAmount.toString(),
      },
      customer_email: undefined, // Will be collected during checkout
    })

    // Update order with session ID
    await orderRef.update({
      stripeSessionId: session.id,
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

