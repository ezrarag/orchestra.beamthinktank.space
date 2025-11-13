import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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

  try {
    // Handle subscription events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        
        const userId = session.metadata?.userId
        const userEmail = session.customer_email || session.metadata?.userEmail || ''
        
        if (!userId) {
          console.error('No userId in session metadata')
          return NextResponse.json({ received: true })
        }

        // Update user document with subscriber status
        await adminDb.collection('users').doc(userId).set({
          subscriber: true,
          stripeCustomerId: subscription.customer as string,
          updatedAt: Timestamp.now(),
        }, { merge: true })

        // Create subscription document
        await adminDb.collection('subscriptions').doc(subscription.id).set({
          userId,
          userEmail,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id || '',
          status: subscription.status,
          currentPeriodStart: Timestamp.fromMillis(subscription.current_period_start * 1000),
          currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })

        console.log('Subscription activated for user:', userId)
      }
    }

    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      
      const subscriptionDoc = await adminDb
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get()

      if (!subscriptionDoc.empty) {
        const doc = subscriptionDoc.docs[0]
        const subscriptionData = doc.data()
        
        // Update subscription document
        await doc.ref.update({
          status: subscription.status,
          currentPeriodStart: Timestamp.fromMillis(subscription.current_period_start * 1000),
          currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: Timestamp.now(),
        })

        // Update user subscriber status
        const isActive = subscription.status === 'active' || subscription.status === 'trialing'
        await adminDb.collection('users').doc(subscriptionData.userId).set({
          subscriber: isActive,
          updatedAt: Timestamp.now(),
        }, { merge: true })

        console.log('Subscription updated:', subscription.id, 'Status:', subscription.status)
      }
    }

    // Handle subscription cancellations/deletions
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      
      const subscriptionDoc = await adminDb
        .collection('subscriptions')
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get()

      if (!subscriptionDoc.empty) {
        const doc = subscriptionDoc.docs[0]
        const subscriptionData = doc.data()
        
        // Update subscription document
        await doc.ref.update({
          status: 'canceled',
          updatedAt: Timestamp.now(),
        })

        // Remove subscriber status from user
        await adminDb.collection('users').doc(subscriptionData.userId).set({
          subscriber: false,
          updatedAt: Timestamp.now(),
        }, { merge: true })

        console.log('Subscription canceled for user:', subscriptionData.userId)
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

