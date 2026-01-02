# Ticket Reservations System

## Overview

The ticket reservation system handles two types of event reservations:
1. **Paid Tickets** - Purchased through Stripe checkout
2. **Free RSVPs** - Reserved for free events

Both types are tracked and displayed on the admin dashboards.

## Data Flow

### Paid Tickets Flow

1. **User clicks "Buy Tickets"** (`/tickets/[eventId]`)
   - Creates a pending order in `eventOrders` collection
   - Status: `pending`
   - Contains: `eventId`, `tickets[]`, `totalAmount` (in cents), `userId` (optional for guest checkout)

2. **Stripe Checkout** (`/api/tickets/checkout`)
   - Creates Stripe checkout session
   - Includes `orderId` in session metadata

3. **Payment Success** (`/api/stripe/webhook`)
   - Stripe webhook updates order status to `paid`
   - Adds `stripePaymentIntentId`, `userEmail`, `paidAt` timestamp

### Free RSVP Flow

1. **User submits RSVP form** (`/tickets/[eventId]`)
   - Creates entry in `eventRSVPs` collection
   - Contains: `eventId`, `name`, `email`, `hasPlusOne`, `plusOneName` (optional), `timestamp`

2. **Notification Created**
   - Creates entry in `eventNotifications` collection
   - Type: `rsvp_confirmed`

## Database Collections

### `eventOrders` Collection

**Structure:**
```typescript
{
  eventId: string
  userId: string | null  // null for guest checkout
  tickets: Array<{
    tierId: string
    quantity: number
    subtotal: number
  }>
  status: 'pending' | 'paid'
  timestamp: Timestamp
  totalAmount: number  // in cents
  stripePaymentIntentId?: string  // added by webhook
  userEmail?: string  // added by webhook
  paidAt?: Timestamp  // added by webhook
}
```

**Query Examples:**
- All paid orders: `where('status', '==', 'paid')`
- Orders for specific event: `where('eventId', '==', eventId)`
- All orders (paid + pending): `where('status', 'in', ['paid', 'pending'])`

### `eventRSVPs` Collection

**Structure:**
```typescript
{
  eventId: string
  name: string
  email: string
  hasPlusOne: boolean
  plusOneName?: string
  timestamp: Timestamp
}
```

**Query Examples:**
- All RSVPs: `collection('eventRSVPs')`
- RSVPs for specific event: `where('eventId', '==', eventId)`

## Admin Dashboard Integration

### Main Admin Dashboard (`/admin/dashboard`)

**Ticket Statistics:**
- **Total Tickets Sold**: Combines paid tickets + RSVP reservations
  - Paid tickets: Counts `tickets[].quantity` from `eventOrders` where `status === 'paid' || 'pending'`
  - RSVPs: Counts `hasPlusOne ? 2 : 1` from `eventRSVPs`
- **Total Ticket Revenue**: Sum of `totalAmount` from paid orders only (converted from cents to dollars)
- **Total RSVPs**: Count of `eventRSVPs` documents
- **Total Reservations**: Sum of all RSVP reservations (including plus ones)

**Code Location:** `app/admin/dashboard/page.tsx` (lines 182-221)

### Project Dashboard (`/admin/projects/[id]`)

**Ticket Statistics:**
- **Tickets Sold**: Aggregated count for all events in the project
  - Fetches all events where `projectId === projectId`
  - Queries `eventOrders` for each event
  - Queries `eventRSVPs` for each event
  - Combines counts: paid tickets + RSVP reservations
- **Ticket Revenue**: Sum of `totalAmount` from paid orders for project events only

**Ticket Reservations Display:**
- Shows both paid orders and RSVPs in a unified list
- Paid orders show: status badge, email, name, ticket count, total amount
- RSVPs show: "RSVP" badge, email, name, plus one info (if applicable), ticket count, "Free Event" label
- Sorted by timestamp (most recent first)
- Limited to 10 most recent reservations

**Code Location:** `app/admin/projects/[id]/page.tsx` (lines 192-263, 788-831)

## Key Implementation Details

### Combining Paid Tickets and RSVPs

Both dashboards now properly combine:
1. **Paid Tickets** from `eventOrders` collection
   - Status: `paid` or `pending`
   - Ticket count: Sum of `tickets[].quantity`
   - Revenue: `totalAmount / 100` (convert cents to dollars)

2. **Free RSVPs** from `eventRSVPs` collection
   - Reservation count: `hasPlusOne ? 2 : 1`
   - Revenue: $0 (free events)

### Display Logic

The project dashboard reservation list handles both types:
- **Type Detection**: `reservation.type === 'rsvp'`
- **Email**: `reservation.userEmail || reservation.email`
- **Name**: `reservation.userName || reservation.name`
- **Ticket Count**: 
  - RSVP: `hasPlusOne ? 2 : 1`
  - Paid: Sum of `tickets[].quantity`
- **Amount**: 
  - RSVP: $0 (shows "Free Event")
  - Paid: `totalAmount / 100`

## Testing

To verify the system is working:

1. **Create a paid event** with Stripe ticketing
   - Purchase tickets through `/tickets/[eventId]`
   - Check `eventOrders` collection for pending order
   - Complete Stripe checkout
   - Verify order status updates to `paid` via webhook

2. **Create a free event** with RSVP
   - Submit RSVP form on `/tickets/[eventId]`
   - Check `eventRSVPs` collection for new entry
   - Verify notification created in `eventNotifications`

3. **Check Admin Dashboards**
   - Main dashboard should show combined ticket count
   - Project dashboard should show project-specific ticket stats
   - Both should display reservations list with both types

## Firestore Security Rules

- **eventOrders**: Admins can read all, users can read their own, webhook can update
- **eventRSVPs**: Admins can read all, public can create (no auth required)

See `firestore.rules` for complete security rules.

## Related Files

- **Ticket Purchase Page**: `app/tickets/[eventId]/page.tsx`
- **Checkout API**: `app/api/tickets/checkout/route.ts`
- **Stripe Webhook**: `app/api/stripe/webhook/route.ts`
- **Main Dashboard**: `app/admin/dashboard/page.tsx`
- **Project Dashboard**: `app/admin/projects/[id]/page.tsx`
- **Firestore Rules**: `firestore.rules`





