/**
 * Script to create the Black Diaspora Symphony Orchestra Memorial Concert event
 * Run with: npx tsx scripts/create-bdso-event.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// Initialize Firebase Admin
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform'

let app
if (getApps().length === 0) {
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    app = initializeApp({
      credential: cert({
        projectId,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      }),
      projectId,
    })
  } else {
    console.error('Firebase Admin credentials not found. Please set FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL')
    process.exit(1)
  }
} else {
  app = getApps()[0]
}

const db = getFirestore(app)

async function createBDSOEvent() {
  try {
    console.log('Creating Black Diaspora Symphony Orchestra Memorial Concert event...')

    // Event date: December 14, 2025 at 5:00 PM
    const eventDate = new Date('2025-12-14T17:00:00-06:00') // 5:00 PM CST

    const eventData = {
      title: 'Black Diaspora Symphony Memorial Concert',
      series: 'Black Diaspora Symphony Orchestra',
      projectId: 'black-diaspora-symphony',
      city: 'Milwaukee',
      venueName: 'Central United Methodist Church',
      venueAddress: '639 N 25th St, Milwaukee, WI 53233',
      date: Timestamp.fromDate(eventDate),
      time: '5:00 PM',
      description: `Join us for the 2025 Annual Memorial Concert featuring:

• Margaret Bonds' The Montgomery Variations
• Maurice Ravel's Daphnis et Chloé (selected movements)
• Edvard Grieg's Funeral March for Rikard Nordraak

The Black Diaspora Symphony Orchestra celebrates composers of the African diaspora in this powerful memorial concert. Free parking is available at the venue.`,
      imageUrl: '', // You can add an event poster URL here
      isFree: false, // Set to true if free, or configure pricing below
      ticketProvider: 'stripe', // Options: 'stripe', 'external', or 'free'
      externalTicketUrl: '', // Only needed if ticketProvider is 'external'
      onSale: true, // Set to false to hide from public until ready
      priceTiers: [
        {
          tierId: 'general-admission',
          label: 'General Admission',
          price: 2500, // $25.00 in cents
          quantity: 200,
        },
        {
          tierId: 'student',
          label: 'Student',
          price: 1500, // $15.00 in cents
          quantity: 50,
        },
        {
          tierId: 'senior',
          label: 'Senior (65+)',
          price: 2000, // $20.00 in cents
          quantity: 50,
        },
      ],
      createdBy: 'system', // Replace with actual admin UID if available
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    // Check if event already exists
    const eventsRef = db.collection('events')
    const existingEvents = await eventsRef
      .where('title', '==', eventData.title)
      .where('date', '==', eventData.date)
      .get()

    if (!existingEvents.empty) {
      console.log('Event already exists! Updating existing event...')
      const existingEvent = existingEvents.docs[0]
      await existingEvent.ref.update({
        ...eventData,
        updatedAt: Timestamp.now(),
      })
      console.log(`✅ Event updated: ${existingEvent.id}`)
      console.log(`   View at: /tickets/${existingEvent.id}`)
      console.log(`   Admin edit: /admin/events/${existingEvent.id}`)
    } else {
      const docRef = await eventsRef.add(eventData)
      console.log(`✅ Event created successfully!`)
      console.log(`   Event ID: ${docRef.id}`)
      console.log(`   View at: /tickets/${docRef.id}`)
      console.log(`   Admin edit: /admin/events/${docRef.id}`)
    }

    console.log('\n📋 Event Details:')
    console.log(`   Title: ${eventData.title}`)
    console.log(`   Date: ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
    console.log(`   Time: ${eventData.time}`)
    console.log(`   Venue: ${eventData.venueName}`)
    console.log(`   City: ${eventData.city}`)
    console.log(`   Ticket Provider: ${eventData.ticketProvider}`)
    console.log(`   On Sale: ${eventData.onSale ? 'Yes' : 'No'}`)
    console.log(`   Price Tiers: ${eventData.priceTiers.length}`)
    eventData.priceTiers.forEach(tier => {
      console.log(`     - ${tier.label}: $${(tier.price / 100).toFixed(2)} (${tier.quantity} available)`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating event:', error)
    process.exit(1)
  }
}

createBDSOEvent()

