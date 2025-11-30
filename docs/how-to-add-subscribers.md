# How to Add Subscribers

This guide explains how to grant subscriber access to users in the BEAM Orchestra platform. Subscribers have access to subscriber-level media content for $5/month.

## Prerequisites

**⚠️ Important:** Users must sign in at least once with Google before you can set their subscriber role. The user account must exist in Firebase Authentication.

## Methods to Add Subscribers

### Method 1: Using Stripe Subscription (Automatic - Recommended)

The recommended way to add subscribers is through the Stripe subscription flow:

1. **User visits** `/subscribe` page
2. **User clicks** "Subscribe" button
3. **User completes** Stripe checkout
4. **Stripe webhook** automatically sets subscriber role
5. **User has access** immediately after payment

This method automatically:
- Creates Stripe customer
- Sets up recurring billing
- Grants subscriber role via webhook
- Updates Firestore user document

**No manual intervention needed** - the webhook handles everything automatically.

### Method 2: Using the Script (Manual - For Testing or Free Access)

Use the `setSubscriber.ts` script to manually grant subscriber access:

```bash
# Set subscriber role for a user
npx tsx scripts/setSubscriber.ts ezra@beamthink.institute
```

**Prerequisites for Script Method:**
- Firebase Admin SDK must be configured (see `docs/firebase-admin-setup.md`)
- User must have signed in at least once with Google
- Service account JSON file must be in project root (`service-account.json`)

**What the script does:**
1. Sets Firebase custom claims: `beam_subscriber: true`, `subscriber: true`
2. Updates Firestore user document: `subscriber: true`
3. User must sign out and back in to refresh token

### Method 3: Using Admin Settings Page (If You Have Admin Access)

If you have admin access:

1. **Sign in** to the admin portal with an admin account
2. Navigate to **Admin → Settings** (`/admin/settings`)
3. Scroll to the **"User Role Management"** section
4. Enter the user's email address
5. Select **"Subscriber"** from the role dropdown
6. Click **"Set User Role"**
7. The user must **sign out and sign back in** to refresh their ID token

**Note:** This method sets the role but doesn't create a Stripe subscription. Use this for testing or free access only.

### Method 4: Using Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication → Users**
4. Find the user by email
5. Click on the user → **Custom Claims** tab
6. Add custom claims:
   ```json
   {
     "beam_subscriber": true,
     "subscriber": true,
     "role": "subscriber"
   }
   ```
7. Save changes
8. Update Firestore user document manually:
   - Go to **Firestore Database**
   - Find `users/{userId}` document
   - Set `subscriber: true`
9. User must **sign out and sign back in**

## Subscriber Access Levels

Subscribers have access to:
- ✅ Media with `access: ['subscriber']`
- ✅ Media with `access: ['public']`
- ✅ Media with `access: ['subscriber', 'public']`
- ❌ Media with `access: ['musician']` only (unless they're also a musician)

## Stripe Integration

### Setting Up Stripe (One-Time Setup)

1. **Create Product in Stripe Dashboard:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to **Products** → **Add Product**
   - Name: "BDSO Community Access"
   - Price: $5.00 USD
   - Billing: Monthly (recurring)
   - Copy the **Price ID** (starts with `price_...`)

2. **Configure Environment Variables:**
   Add to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing
   STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_... for testing
   STRIPE_PRICE_ID=price_XXXXXXXXXXXXXX
   STRIPE_WEBHOOK_SECRET=whsec_... # From webhook setup
   ```

3. **Set Up Webhook:**
   - In Stripe Dashboard → **Developers** → **Webhooks**
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### How Stripe Webhook Works

When a user subscribes:
1. Stripe processes payment
2. Stripe sends webhook to `/api/stripe/webhook`
3. Webhook handler:
   - Verifies webhook signature
   - Sets Firebase custom claims: `beam_subscriber: true`, `subscriber: true`, `role: 'subscriber'`
   - Updates Firestore user document: `subscriber: true`, `stripeCustomerId`, `stripeSubscriptionId`
   - User has access immediately

## Important Notes

1. **Users must sign in first**: Before you can set a subscriber role, the user must have signed in at least once with Google to create their Firebase Auth account.

2. **Token refresh required**: After setting subscriber privileges, users must **sign out and sign back in** for the changes to take effect. This is because Firebase ID tokens are cached and need to be refreshed.

3. **Stripe vs Manual**: 
   - Stripe subscription = automatic billing + role management
   - Manual role setting = no billing, testing/free access only

4. **Subscription Status**: The webhook automatically handles subscription status changes (active, canceled, etc.)

## Troubleshooting

### "User not found" Error

- The user hasn't signed in yet. Ask them to sign in to the app at least once.
- Check that the email address is correct and matches their Google account.

### Subscriber Role Not Working

- User must sign out and sign back in to refresh their ID token.
- Check Firebase Console → Authentication → Users → Custom Claims to verify the role was set.
- Check Firestore `users/{userId}` document has `subscriber: true`.

### Stripe Webhook Not Working

- Verify webhook endpoint is accessible: `https://yourdomain.com/api/stripe/webhook`
- Check webhook secret is correct in environment variables
- Check Stripe Dashboard → Webhooks for delivery logs
- Verify Firebase Admin SDK is configured correctly

### Script Authentication Errors

If you get errors running `setSubscriber.ts`:

1. Make sure `service-account.json` is in project root
2. Verify service account has proper permissions
3. Check Firebase Admin SDK is initialized correctly
4. See `docs/firebase-admin-setup.md` for setup instructions

## Verification

After setting subscriber role:

1. User signs out completely
2. User signs back in
3. User navigates to `/subscriber` page
4. Should see subscriber content (not "Access Denied" message)
5. User can access media with `access: ['subscriber']`

## Related Documentation

- `docs/subscription-access.md` - Subscription access system overview
- `docs/firebase-admin-setup.md` - Firebase Admin SDK setup
- `docs/how-to-add-admins.md` - How to add admins
- `docs/how-to-add-musicians.md` - How to add musicians

