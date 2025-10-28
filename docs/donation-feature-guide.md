# Donation Feature Guide

## Overview

The donation feature allows supporters to make financial contributions directly to individual musicians through the platform. The system integrates Stripe for secure payment processing and Firebase for data storage.

## Features Implemented

### 1. Donation Modal Component
- **Location**: `components/DonationModal.tsx`
- **Features**:
  - Preset amount buttons ($10, $25, $50, $100, $250, $500)
  - Custom amount input field
  - Donor information form (optional)
  - Anonymous donation option
  - Message/note field for the musician
  - Beautiful gradient UI with animations
  - Integrated with Stripe Checkout

### 2. Stripe Integration
- **API Endpoints**:
  - `/api/donations/create-checkout` - Creates Stripe Checkout session
  - `/api/donations/verify` - Verifies payment success
  - `/api/donations/webhook` - Handles Stripe webhook events

### 3. Firebase Storage
- Donations are saved to Firestore `donations` collection
- Metadata includes:
  - Donor name (or "Anonymous")
  - Musician name and email
  - Donation amount
  - Personal message
  - Timestamp
  - Stripe session ID

### 4. Success Page
- **Location**: `app/donations/success/page.tsx`
- Displays payment confirmation
- Shows donation details
- Provides navigation back to home

### 5. Musician Profile Integration
- **Location**: `components/MusicianProfileModal.tsx`
- Added "Donate" button in donations tab
- Displays recent donations from Firebase
- Auto-refreshes when new donations arrive

## How It Works

### Flow Diagram

```
User clicks "Donate" 
  ↓
Donation Modal Opens
  ↓
User enters amount and info
  ↓
Creates Stripe Checkout Session
  ↓
Redirects to Stripe Checkout
  ↓
User completes payment
  ↓
Redirects to Success Page
  ↓
Webhook saves to Firebase
  ↓
Donations tab updates
```

### User Experience

1. **Open Musician Profile**: Click on any musician in the roster
2. **Navigate to Donations Tab**: Click the "Donations" tab
3. **Click Donate Button**: Purple gradient button at top right
4. **Choose Amount**: Select preset or enter custom amount
5. **Add Information**: Name, email (optional), message
6. **Anonymous Option**: Check box to donate anonymously
7. **Submit**: Redirected to Stripe for secure payment
8. **Success**: Confirmed with receipt and details

### Admin Experience

- Donations automatically appear in musician's profile
- Accessible via Firestore for reports and analysis
- Stripe Dashboard for payment management
- Email receipts sent automatically by Stripe

## Setup Instructions

### 1. Stripe Configuration

#### Get Your Stripe Keys

1. **Create Stripe Account**: [https://stripe.com](https://stripe.com)
2. **Get API Keys**: Dashboard → Developers → API Keys
3. **Add to Environment**:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

#### Webhook Setup (Required)

1. **Go to Webhooks**: Dashboard → Developers → Webhooks
2. **Add Endpoint**: 
   - URL: `https://your-domain.com/api/donations/webhook`
   - Events: `checkout.session.completed`
3. **Get Secret**: Copy the webhook signing secret
4. **Add to Environment**:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Firebase Setup

Ensure your Firestore has a `donations` collection with the following structure:

```typescript
{
  donor_name: string
  donor_email: string
  musician_name: string
  musician_email: string
  recipientName: string  // Used for filtering
  amount: number
  message: string
  anonymous: boolean
  stripe_session_id: string
  created_at: Timestamp
}
```

### 3. Environment Variables

Update `.env.local`:

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # or your production URL

# Firebase (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... etc
```

## Security Considerations

### 1. Payment Processing
- All payments processed by Stripe (PCI-compliant)
- No sensitive card data touches your servers
- Webhook signature verification required

### 2. Data Privacy
- Anonymous option for donors
- Optional email collection (for receipts only)
- Data encrypted in Firebase

### 3. Access Control
- Musicians see only their donations
- Admin access to all data via Firebase

## Testing

### Test Mode

1. Use Stripe test keys (starts with `pk_test_` and `sk_test_`)
2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date
   - Any CVC

### Local Development

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Forward Stripe webhooks locally (optional)
stripe listen --forward-to localhost:3000/api/donations/webhook
```

### Production Checklist

- [ ] Switch to production Stripe keys
- [ ] Set `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Test complete donation flow
- [ ] Verify Firebase permissions
- [ ] Set up error monitoring

## Monitoring & Analytics

### Stripe Dashboard
- Payment success rate
- Revenue analytics
- Failed payment analysis
- Customer insights

### Firebase Console
- Donation count per musician
- Total revenue tracking
- Message analytics
- Anonymous vs. identified donations

### Custom Metrics
You can add custom analytics in the webhook handler:
- Daily/weekly/monthly revenue
- Top musicians by donations
- Average donation amount
- Peak donation times

## API Reference

### Create Checkout Session

**Endpoint**: `POST /api/donations/create-checkout`

**Body**:
```json
{
  "amount": 2500,  // in cents ($25.00)
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "musicianName": "Musician Name",
  "musicianEmail": "musician@example.com",
  "message": "Great performance!",
  "isAnonymous": false
}
```

**Response**:
```json
{
  "sessionId": "cs_test_..."
}
```

### Verify Donation

**Endpoint**: `GET /api/donations/verify?session_id=cs_test_...`

**Response**:
```json
{
  "amount": "25.00",
  "musicianName": "Musician Name",
  "donorName": "John Doe",
  "message": "Great performance!",
  "isAnonymous": false
}
```

### Webhook Handler

**Endpoint**: `POST /api/donations/webhook`

**Headers**:
```
stripe-signature: t=1234567890,v1=...
```

Automatically saves donations to Firebase when Stripe sends `checkout.session.completed` events.

## Extensions & Customization

### Add Payment Methods
Edit `app/api/donations/create-checkout/route.ts`:

```typescript
payment_method_types: ['card', 'us_bank_account', 'klarna'],
```

### Customize Success Page
Edit `app/donations/success/page.tsx` to add:
- Social sharing buttons
- Related musicians
- Suggested actions
- Thank you video/image

### Email Notifications
Add email notifications in webhook handler:

```typescript
import nodemailer from 'nodemailer'

// Send thank you to donor
await sendDonorThankYou(donorEmail, donationDetails)

// Notify musician
await sendMusicianNotification(musicianEmail, donationDetails)
```

## Troubleshooting

### Issue: "Payment processing error"
- **Check**: Stripe API keys are valid
- **Check**: Base URL is correct
- **Solution**: Use Stripe dashboard to verify keys

### Issue: Donations not appearing
- **Check**: Webhook is configured
- **Check**: Firebase permissions
- **Check**: Console logs for errors
- **Solution**: Test webhook with Stripe CLI

### Issue: "Invalid signature" error
- **Check**: Webhook secret is correct
- **Check**: Webhook endpoint is accessible
- **Solution**: Re-configure webhook in Stripe Dashboard

## Code Locations

- **Donation Modal**: `components/DonationModal.tsx`
- **Musician Profile**: `components/MusicianProfileModal.tsx`
- **Stripe Checkout API**: `app/api/donations/create-checkout/route.ts`
- **Verification API**: `app/api/donations/verify/route.ts`
- **Webhook Handler**: `app/api/donations/webhook/route.ts`
- **Success Page**: `app/donations/success/page.tsx`

## Cost Considerations

### Stripe Fees
- **Online**: 2.9% + $0.30 per transaction
- **In-person**: 2.7% + $0.05 per transaction
- **International**: Additional fees may apply

### Firebase
- **Firestore**: First 50K reads/writes free per month
- **Storage**: First 5GB free per month

## Support

For issues or questions:
- Stripe Support: [https://support.stripe.com](https://support.stripe.com)
- Firebase Support: [https://firebase.google.com/support](https://firebase.google.com/support)
- Project Issues: Contact Dayvin or Ethan

