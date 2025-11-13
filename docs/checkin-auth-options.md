# Check-In Authentication Options

This guide explains how to enable and use multiple authentication methods for musician check-in at rehearsals.

## Overview

The check-in system supports three authentication methods:
1. **Google Sign-In** - Quick sign-in with Google account
2. **Email Link** - Passwordless email link authentication
3. **SMS** - Phone number verification via SMS

All methods work seamlessly with the QR check-in flow and provide the same access to check-in functionality.

## Enabling Authentication Providers

### Step 1: Enable Providers in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`beam-orchestra-platform`)
3. Navigate to **Authentication → Sign-in method**
4. Enable the following providers:

#### Google Sign-In
- Click on **Google**
- Toggle **Enable** to ON
- Enter your project support email
- Click **Save**

#### Email Link (Passwordless)
- Click on **Email/Password**
- Toggle **Enable** to ON
- **Important**: Enable "Email link (passwordless sign-in)" option
- Click **Save**

#### Phone Number (SMS)
- Click on **Phone**
- Toggle **Enable** to ON
- Configure reCAPTCHA verification (required for SMS)
- Click **Save**

### Step 2: Configure Authorized Domains

1. Still in Authentication, go to **Settings** tab
2. Scroll to **Authorized domains**
3. Ensure these domains are listed:
   - `localhost` (for development)
   - `orchestra.beamthinktank.space` (production)
   - Any Vercel preview domains

### Step 3: Set Up reCAPTCHA for SMS

SMS authentication requires reCAPTCHA verification:

1. Firebase automatically handles reCAPTCHA setup
2. The reCAPTCHA widget will appear when users select SMS sign-in
3. No additional configuration needed

## Using Authentication at QR Check-In Stations

### For Musicians

When musicians scan a QR code or visit a check-in link, they'll see three sign-in options:

#### Option 1: Sign in with Google
1. Click "Sign in with Google"
2. Select Google account
3. Grant permissions
4. Automatically signed in and can check in

#### Option 2: Sign in with Email
1. Click "Sign in with Email"
2. Enter email address
3. Click "Send sign-in link"
4. Check email inbox for sign-in link
5. Click the link in the email
6. Automatically signed in and redirected to check-in page

#### Option 3: Sign in with SMS
1. Click "Sign in with SMS"
2. Enter phone number (with area code)
3. Click "Send verification code"
4. Complete reCAPTCHA if prompted
5. Enter 6-digit code received via SMS
6. Click "Verify code"
7. Automatically signed in and can check in

### Mobile-Friendly Design

The authentication UI is optimized for mobile devices:
- Large, easy-to-tap buttons
- Minimal friction at rehearsal venues
- Clear error messages if sign-in fails
- Works offline (once authenticated)

## Troubleshooting

### Email Link Not Working
- Check spam/junk folder
- Ensure email link hasn't expired (links expire after 1 hour)
- Verify email address is correct
- Check Firebase Console → Authentication → Settings for email configuration

### SMS Code Not Received
- Verify phone number format (include country code, e.g., +1 for US)
- Check phone has signal/reception
- Wait up to 2 minutes for code delivery
- Try requesting a new code
- Ensure reCAPTCHA was completed

### Google Sign-In Popup Blocked
- Check browser popup settings
- Try signing in in a new tab
- Clear browser cache and cookies
- Verify authorized domains in Firebase Console

### "This domain is not authorized" Error
- Add your domain to Firebase Console → Authentication → Settings → Authorized domains
- Wait a few minutes for changes to propagate
- Clear browser cache

## Security Notes

- All authentication methods use Firebase Authentication
- Email links expire after 1 hour
- SMS codes expire after 10 minutes
- Session tokens are automatically managed by Firebase
- No passwords are stored (email link and SMS are passwordless)

## Testing

Admins can test check-in functionality at `/admin/checkin-test`:
- Generate QR codes for upcoming rehearsals
- Test check-in with different authentication methods
- Verify Firestore writes are working correctly

## Support

If musicians encounter issues:
1. Try a different authentication method
2. Contact a coordinator for manual check-in
3. Check the browser console for error messages
4. Verify internet connection

