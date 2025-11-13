# Subscription Access System

This guide explains the subscription-based media access system for the Black Diaspora Symphony Orchestra platform.

## Overview

The platform supports role-based and subscription-based access to media content:

| Role | Access Level |
|------|-------------|
| **Admin / Board / Musician** | Full access to all media (musician, subscriber, and public) |
| **Subscriber** ($5/month) | Access to subscriber and public content |
| **Public / Guest** | Access to public content only, sees teasers for locked content |

## Access Levels

Media items have three access levels:

1. **`musician`** - Only accessible to logged-in musicians, admins, board members
2. **`subscriber`** - Accessible to subscribers ($5/month) and higher roles
3. **`public`** - Accessible to everyone

## Stripe Setup

### 1. Create Product in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**
3. Create product:
   - **Name:** "BDSO Community Access"
   - **Pricing:** $5.00 USD
   - **Billing period:** Monthly (recurring)
4. Copy the **Price ID** (starts with `price_...`)

### 2. Configure Environment Variables

Add to `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_... for testing
STRIPE_PRICE_ID=price_XXXXXXXXXXXXXX # The Price ID from step 1
STRIPE_WEBHOOK_SECRET=whsec_... # From webhook setup (step 3)
```

### 3. Set Up Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://orchestra.beamthinktank.space/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to environment variables as `STRIPE_WEBHOOK_SECRET`

### 4. Test Mode

For testing, use Stripe test mode:
- Use `sk_test_...` and `pk_test_...` keys
- Use test card: `4242 4242 4242 4242`
- Any future expiry date, any CVC

## How It Works

### Subscription Flow

1. **User clicks "Subscribe"** → Calls `/api/subscribe`
2. **API creates Stripe Checkout session** → Returns checkout URL
3. **User redirected to Stripe** → Completes payment
4. **Stripe webhook fires** → `/api/stripe/webhook` receives event
5. **Webhook updates Firestore** → Sets `subscriber: true` on user document
6. **User redirected to success page** → Can now access subscriber content

### Media Access Logic

The media library page (`/projects/[id]/media`) filters content based on:

```typescript
// User has musician access if:
role === 'beam_admin' || 'partner_admin' || 'board' || 'musician'

// User has subscriber access if:
role === 'subscriber' || hasMusicianAccess

// Accessible media:
- public: everyone
- subscriber: subscribers and above
- musician: musicians and above
```

## Admin Media Management

### Uploading Media

1. Go to `/admin/projects/black-diaspora-symphony/media`
2. Click **Upload Media**
3. Fill in form:
   - **Title:** e.g., "Bonds – 5:08 PM – 11/10/25"
   - **Type:** rehearsal, performance, interview, etc.
   - **Access Level:** musician, subscriber, or public
   - **Rehearsal Date:** YYYY-MM-DD format (optional)
   - **Description:** Optional
   - **File:** Select video/image file
4. Click **Upload**

### Editing Media

1. Click **Edit** button on any media item
2. Update title, type, access level, or description
3. Click **Save Changes**

### Access Level Guidelines

- **Musician:** Internal rehearsal videos, practice recordings
- **Subscriber:** Behind-the-scenes content, interviews, exclusive performances
- **Public:** Promotional videos, public performances, announcements

## User Experience

### For Musicians

- Sign in with Google, Email, or SMS
- Automatically see all media (musician, subscriber, public)
- No subscription needed

### For Community Members

- **Not subscribed:**
  - See public content
  - See teasers for subscriber content
  - See "Subscribe for $5/month" CTA
  
- **Subscribed:**
  - See all subscriber and public content
  - Full access to exclusive videos
  - Can cancel anytime

## Firestore Schema

### `projectMedia` Collection

```typescript
{
  id: string
  projectId: "black-diaspora-symphony"
  title: "Bonds – 5:08 PM – 11/10/25"
  type: "rehearsal" | "performance" | "interview" | "promotional" | "document"
  rehearsalId?: "2025-11-10" // YYYY-MM-DD format
  storagePath: "Black Diaspora Symphony/Music/rehearsal footage/video.mov"
  downloadURL: "https://firebasestorage.googleapis.com/..."
  access: "musician" | "subscriber" | "public"
  uploadedBy: "admin@example.com"
  uploadedAt: Timestamp
  duration?: number // seconds
  thumbnailURL?: string
  description?: string
}
```

### `users` Collection (Updated)

```typescript
{
  uid: string
  email: string
  role: "subscriber" | "musician" | ...
  subscriber: true // Set by webhook when subscription active
  stripeCustomerId: "cus_..." // Set by webhook
}
```

### `subscriptions` Collection

```typescript
{
  id: string // Stripe subscription ID
  userId: string
  userEmail: string
  stripeCustomerId: "cus_..."
  stripeSubscriptionId: "sub_..."
  stripePriceId: "price_..."
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing"
  currentPeriodStart: Timestamp
  currentPeriodEnd: Timestamp
  cancelAtPeriodEnd: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## API Endpoints

### `/api/subscribe` (POST)

Creates a Stripe Checkout session for subscription.

**Headers:**
- `Authorization: Bearer <firebase-id-token>`

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### `/api/stripe/webhook` (POST)

Handles Stripe webhook events:
- `checkout.session.completed` - Activates subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription

**Headers:**
- `stripe-signature: <signature>` (verified by Stripe)

### `/api/media/signed-url` (GET)

Generates signed URLs for Firebase Storage files.

**Query params:**
- `path`: Storage path to file

**Response:**
```json
{
  "url": "https://firebasestorage.googleapis.com/..."
}
```

## Security Rules

### Firestore Rules

Add to `firestore.rules`:

```javascript
// Project Media - Public read, admin write
match /projectMedia/{mediaId} {
  allow read: if true; // Public read (filtered by app logic)
  allow write: if request.auth != null && 
    (request.auth.token.role == 'beam_admin' || 
     request.auth.token.role == 'partner_admin');
}

// Subscriptions - User can read own subscription
match /subscriptions/{subscriptionId} {
  allow read: if request.auth != null && 
    resource.data.userId == request.auth.uid;
  allow write: if false; // Only via webhook
}
```

### Storage Rules

Add to `storage.rules`:

```javascript
// Project media - Admin write, public read
match /b/{bucket}/o {
  match /Black Diaspora Symphony/Music/rehearsal footage/{fileName} {
    allow read: if true; // Public read (filtered by app logic)
    allow write: if request.auth != null && 
      request.auth.token.role in ['beam_admin', 'partner_admin'];
  }
}
```

## Testing

### Test Subscription Flow

1. Use Stripe test mode keys
2. Use test card: `4242 4242 4242 4242`
3. Complete checkout
4. Verify webhook updates Firestore
5. Check user can access subscriber content

### Test Media Access

1. Upload media with different access levels
2. Test as:
   - Guest (not signed in)
   - Regular user (signed in, not subscribed)
   - Subscriber
   - Musician/Admin
3. Verify correct content is shown/hidden

## Troubleshooting

### Subscription Not Activating

- Check webhook is receiving events in Stripe Dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches webhook signing secret
- Check Firestore rules allow webhook to write
- Verify user document exists before webhook runs

### Media Not Loading

- Check Firebase Storage rules allow read access
- Verify `storagePath` is correct
- Check file exists in Firebase Storage
- Verify signed URL generation is working

### Access Control Not Working

- Verify user role is correctly set in Firestore
- Check `subscriber` field is `true` for subscribers
- Ensure `useUserRole` hook is checking subscriber status
- Clear browser cache and refresh

## Next Steps

1. **Set up Stripe product** and get Price ID
2. **Configure webhook** endpoint in Stripe Dashboard
3. **Add environment variables** to `.env.local` and Vercel
4. **Deploy Firestore rules** for `projectMedia` and `subscriptions`
5. **Deploy Storage rules** for media files
6. **Test subscription flow** with test card
7. **Upload first media** via admin panel
8. **Test access control** with different user roles

## Support

For issues:
- Check Stripe Dashboard → Webhooks for event logs
- Check Firebase Console → Firestore for data
- Check browser console for errors
- Verify environment variables are set correctly

