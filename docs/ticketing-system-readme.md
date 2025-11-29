# Ticketing System Documentation

## Overview

The BEAM Orchestra ticketing system supports multiple cities, venues, and partners with flexible ticketing options including free events, paid events via Stripe, and external ticket links.

## Features

- **Multi-City Support**: Filter events by city (Milwaukee, Orlando, Tampa, Miami, etc.)
- **Flexible Ticketing**: 
  - Free events with RSVP
  - Paid events via Stripe Checkout
  - External ticket links (university ticket offices, Eventbrite, etc.)
- **Price Tiers**: Multiple ticket types per event (General Admission, Student, VIP, etc.)
- **Admin Management**: Full CRUD interface for event creation and management
- **Public Pages**: Event listing and detail pages with purchase flow

## Data Model

### Events Collection (`events`)

```typescript
{
  id: string
  title: string
  series: string
  projectId?: string
  city: string
  venueName: string
  venueAddress: string
  date: Timestamp
  time: string
  description: string
  imageUrl?: string
  isFree: boolean
  ticketProvider: "stripe" | "external" | "free"
  externalTicketUrl?: string
  onSale: boolean
  priceTiers: PriceTier[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Event Orders Collection (`eventOrders`)

```typescript
{
  id: string
  eventId: string
  userId: string
  userEmail?: string
  userName?: string
  tickets: TicketPurchase[]
  stripeSessionId?: string
  stripePaymentIntentId?: string
  status: "pending" | "paid" | "cancelled"
  timestamp: Timestamp
  totalAmount: number
}
```

### Event RSVPs Collection (`eventRSVPs`)

```typescript
{
  id: string
  eventId: string
  name: string
  email: string
  timestamp: Timestamp
}
```

## Admin Pages

### `/admin/events`
- List all events
- Filter by city
- View event status (on sale, coming soon, past)
- Quick edit links

### `/admin/events/new`
- Create new event
- Upload event poster image
- Configure ticketing (free, Stripe, or external)
- Add price tiers
- Toggle on sale status

### `/admin/events/[id]`
- Edit existing event
- Update all event details
- Preview public page

## Public Pages

### `/tickets`
- List all events (on sale or future)
- Filter by city
- Event cards with:
  - Event poster image
  - Date and time
  - Venue information
  - Price range
  - CTA button (Buy Tickets, Reserve Free Ticket, Get Tickets)

### `/tickets/[eventId]`
- Event detail page
- Full event information
- Ticket purchase flow:
  - **Free Events**: RSVP form (name + email)
  - **Stripe Events**: Tier selector + quantity → Stripe Checkout
  - **External Events**: Link to external ticketing site

## API Endpoints

### `POST /api/tickets/checkout`

Creates a Stripe Checkout session for ticket purchase.

**Request:**
```json
{
  "eventId": "event-id",
  "tierId": "tier-id",
  "quantity": 2
}
```

**Response:**
```json
{
  "sessionId": "cs_test_..."
}
```

**Authentication:** Optional (supports guest checkout)

## Stripe Integration

### Checkout Flow

1. User selects ticket tier and quantity on event detail page
2. Frontend calls `/api/tickets/checkout` with event and tier info
3. API creates pending order in Firestore
4. API creates Stripe Checkout session
5. User redirected to Stripe Checkout
6. After payment, Stripe webhook updates order status to "paid"

### Webhook Handler

The webhook at `/api/stripe/webhook` handles:
- `checkout.session.completed` events for ticket purchases
- Updates `eventOrders` collection with payment status
- Records payment intent ID

## Security Rules

### Firestore Rules

- **Events**: Public read, admin write
- **Event Orders**: Users can read their own orders, create orders; admins can read all
- **Event RSVPs**: Public create, admin read

### Storage Rules

- **Event Posters**: Admin write, public read

## Future Expansion Hooks

The following features are planned but not yet implemented:

### 1. QR Code for Ticket Scanning
- Generate QR codes for purchased tickets
- Admin scanning interface for check-in
- Location: `eventOrders` collection could include QR code data

### 2. Geo Check-in for Musicians
- Allow musicians to check in at venue location
- Integration with attendance system
- Location: Could extend `/app/checkin` page

### 3. Subscription Discounts
- Apply member discounts to ticket prices
- Check user subscription status
- Location: Modify `/api/tickets/checkout` to check subscription

### 4. Media System Integration
- Link events to project media
- Display event photos/videos
- Location: Add `mediaIds` array to event document

### 5. Partner Organization Management
- Allow partner admins to manage their own events
- Organization-scoped event management
- Location: Add `organizationId` to events, update admin pages

## Usage Examples

### Creating a Free Event

1. Navigate to `/admin/events/new`
2. Fill in event details
3. Check "Free Event"
4. Set "On Sale" to true
5. Save event

### Creating a Paid Event with Stripe

1. Navigate to `/admin/events/new`
2. Fill in event details
3. Set ticket provider to "Stripe Checkout"
4. Add price tiers (e.g., General Admission $25, Student $15)
5. Set quantities for each tier
6. Set "On Sale" to true
7. Save event

### Creating an External Link Event

1. Navigate to `/admin/events/new`
2. Fill in event details
3. Set ticket provider to "External Link"
4. Enter external ticket URL
5. Set "On Sale" to true
6. Save event

## Environment Variables

Required Stripe environment variables:
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `NEXT_PUBLIC_BASE_URL`: Base URL for redirects

## Testing

### Test Free Event Flow
1. Create a free event in admin
2. Visit `/tickets/[eventId]`
3. Fill out RSVP form
4. Verify RSVP appears in `eventRSVPs` collection

### Test Stripe Flow
1. Create a paid event with Stripe
2. Visit `/tickets/[eventId]`
3. Select tier and quantity
4. Click "Buy Tickets"
5. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
6. Verify order appears in `eventOrders` with status "paid"

### Test External Link Flow
1. Create an external link event
2. Visit `/tickets/[eventId]`
3. Click "Get Tickets"
4. Verify external URL opens in new tab

