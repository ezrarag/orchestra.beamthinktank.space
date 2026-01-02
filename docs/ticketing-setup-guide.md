# Ticketing System Setup Guide

## Quick Start: Adding the Black Diaspora Symphony Concert

The ticketing system is already built and ready to use! Here's how to add the BDSO concert:

### Option 1: Use the Admin Interface (Recommended)

1. **Sign in as admin** at `/admin/events`
2. Click **"New Event"**
3. Fill in the details:
   - **Title**: Black Diaspora Symphony Memorial Concert
   - **Series**: Black Diaspora Symphony Orchestra
   - **Date**: December 14, 2025
   - **Time**: 5:00 PM
   - **City**: Milwaukee
   - **Venue**: Central United Methodist Church
   - **Address**: 639 N 25th St, Milwaukee, WI 53233
   - **Description**: (see script for full description)
   - **Ticket Provider**: Stripe Checkout
   - **Price Tiers**: 
     - General Admission: $25 (200 tickets)
     - Student: $15 (50 tickets)
     - Senior (65+): $20 (50 tickets)
   - **On Sale**: Check this box to make it visible

### Option 2: Use the Script (Faster)

Run the provided script to automatically create the event:

```bash
npx tsx scripts/create-bdso-event.ts
```

Make sure you have these environment variables set:
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

## How the Ticketing System Works

### Architecture Overview

The system uses **Firebase Firestore** for data storage and **Stripe** for payment processing. Here's the flow:

```
User → Event Detail Page → Stripe Checkout → Webhook → Order Confirmed
```

### Data Flow

1. **Event Creation** (Admin)
   - Admin creates event in `/admin/events/new`
   - Event stored in `events` collection
   - Image uploaded to Firebase Storage

2. **Public Discovery** (User)
   - User visits `/tickets` page
   - Events fetched from Firestore
   - Filtered by city and on-sale status

3. **Ticket Purchase** (User)
   - User clicks event → `/tickets/[eventId]`
   - Selects ticket tier and quantity
   - Clicks "Buy Tickets"
   - Frontend calls `/api/tickets/checkout`
   - API creates pending order in `eventOrders` collection
   - API creates Stripe Checkout session
   - User redirected to Stripe

4. **Payment Confirmation** (Stripe → Webhook)
   - Stripe processes payment
   - Stripe sends webhook to `/api/stripe/webhook`
   - Webhook updates order status to "paid"
   - Order now shows in admin dashboard

### Collections Structure

#### `events` Collection
```typescript
{
  id: string
  title: string
  series: string
  city: string
  venueName: string
  date: Timestamp
  time: string
  description: string
  imageUrl?: string
  isFree: boolean
  ticketProvider: "stripe" | "external" | "free"
  priceTiers: PriceTier[]
  onSale: boolean
  // ... other fields
}
```

#### `eventOrders` Collection
```typescript
{
  id: string
  eventId: string
  userId: string
  tickets: TicketPurchase[]
  stripeSessionId: string
  status: "pending" | "paid" | "cancelled"
  totalAmount: number
  timestamp: Timestamp
}
```

#### `eventRSVPs` Collection (for free events)
```typescript
{
  id: string
  eventId: string
  name: string
  email: string
  timestamp: Timestamp
}
```

## Configuration Options

### Ticket Types

1. **Free Events** (`isFree: true`)
   - No payment required
   - RSVP form collects name + email
   - Stored in `eventRSVPs` collection

2. **Stripe Events** (`ticketProvider: "stripe"`)
   - Paid tickets via Stripe Checkout
   - Multiple price tiers supported
   - Automatic order tracking

3. **External Events** (`ticketProvider: "external"`)
   - Links to university ticket offices, Eventbrite, etc.
   - No payment processing
   - Just opens external URL

### Price Tiers

Each event can have multiple ticket types:
- General Admission
- Student
- Senior
- VIP
- Early Bird
- etc.

Each tier has:
- `tierId`: Unique identifier
- `label`: Display name
- `price`: Price in cents (e.g., 2500 = $25.00)
- `quantity`: Total tickets available

## Stripe Setup

### Required Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Admin Features

### Event Management

- **List Events**: `/admin/events`
  - View all events
  - Filter by status
  - Quick edit links

- **Create Event**: `/admin/events/new`
  - Full event creation form
  - Image upload
  - Price tier management
  - On-sale toggle

- **Edit Event**: `/admin/events/[id]`
  - Update all event details
  - Preview public page
  - Change pricing

### Order Management

Orders are stored in `eventOrders` collection. You can:
- Query by `eventId` to see all orders for an event
- Filter by `status` to see pending/paid/cancelled
- View `userId` to see customer info
- Check `stripeSessionId` for Stripe reference

## Public Pages

### `/tickets`
- Lists all events (on sale or future)
- City filter
- Event cards with key info
- Links to detail pages

### `/tickets/[eventId]`
- Full event details
- Purchase flow based on event type
- Responsive design
- Mobile-friendly

## Security

### Firestore Rules
- **Events**: Public read, admin write
- **Event Orders**: Users read own, create own; admins read all
- **Event RSVPs**: Public create, admin read

### Storage Rules
- **Event Posters**: Admin write, public read

Deploy rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Future Enhancements

The system includes hooks for:
- QR code generation for tickets
- Geo check-in for musicians
- Subscription discounts
- Media system integration
- Partner organization management

See `docs/ticketing-system-readme.md` for full documentation.

## Troubleshooting

### Events not showing on `/tickets`
- Check `onSale` is `true`
- Verify date is in the future
- Check Firestore rules allow public read

### Stripe checkout not working
- Verify `STRIPE_SECRET_KEY` is set
- Check webhook is configured
- Test with Stripe test cards
- Check browser console for errors

### Orders not updating to "paid"
- Verify webhook secret matches
- Check webhook is receiving events in Stripe Dashboard
- Verify Firestore rules allow webhook updates

## Support

For questions or issues, check:
- `docs/ticketing-system-readme.md` - Full system documentation
- `lib/types/events.ts` - TypeScript types
- Admin interface at `/admin/events`






