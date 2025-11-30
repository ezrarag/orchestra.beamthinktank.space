# Integrations Setup Guide

## Overview

The Settings page supports multiple integration types for Pulse to access data from various sources:
- **Gmail** - Google email accounts
- **Outlook** - Microsoft Office 365 / Outlook accounts  
- **WhatsApp Business** - WhatsApp Business API (coming soon)

## Gmail Integration

### Setup

1. **Google Cloud Console Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Enable Gmail API and Google Drive API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `https://orchestra.beamthinktank.space/api/google/oauth2callback`

2. **Environment Variables:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://orchestra.beamthinktank.space/api/google/oauth2callback
   ```

3. **Connect Account:**
   - Go to `/admin/settings`
   - Click "Add Account" under Gmail section
   - Sign in with Google
   - Approve permissions

### Checking Existing Connections

To check if an account (e.g., `blackdiaspora@gmail.com`) is connected:

1. **Via Settings Page:**
   - Go to `/admin/settings`
   - Scroll to "Integrations" section
   - Check Gmail section for connected accounts

2. **Via Firestore:**
   - Go to Firebase Console → Firestore Database
   - Navigate to `integrations` collection
   - Look for documents with `type: 'google'`
   - Check `userEmail` field for `blackdiaspora@gmail.com`
   - Document ID format: `google_blackdiaspora_gmail_com`

3. **Via API:**
   ```bash
   # Get auth token first, then:
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://orchestra.beamthinktank.space/api/integrations?type=google
   ```

## Outlook Integration

### Setup

1. **Azure Portal Setup:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to Azure Active Directory → App registrations
   - Create new registration
   - Add redirect URI: `https://orchestra.beamthinktank.space/api/outlook/oauth2callback`
   - Add API permissions: `Mail.Read`, `Calendars.Read`
   - Create client secret

2. **Environment Variables:**
   ```env
   MICROSOFT_CLIENT_ID=your-azure-app-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_REDIRECT_URI=https://orchestra.beamthinktank.space/api/outlook/oauth2callback
   ```

3. **Connect Account:**
   - Go to `/admin/settings`
   - Click "Add Account" under Outlook section
   - Sign in with Microsoft account
   - Approve permissions

## WhatsApp Business Integration

**Status:** Coming soon

WhatsApp Business API requires:
- WhatsApp Business Account
- Business verification
- API credentials from Meta

Implementation will support:
- Webhook setup for incoming messages
- API access for sending messages
- Message history access

## Data Storage

All integrations are stored in Firestore `integrations` collection:

```typescript
{
  type: 'google' | 'outlook' | 'whatsapp',
  userId: string,              // Admin user who connected it
  userEmail: string,           // Account email
  userName: string,            // Account name
  phoneNumber?: string,        // For WhatsApp
  accessToken: string,        // OAuth access token
  refreshToken: string,        // OAuth refresh token
  expiresAt: Date,            // Token expiration
  scope: string,              // OAuth scopes granted
  createdAt: Date,            // When connected
  updatedAt: Date             // Last updated
}
```

**Document ID Format:**
- Gmail: `google_{normalized_email}`
- Outlook: `outlook_{normalized_email}`
- WhatsApp: `whatsapp_{normalized_phone}`

## Troubleshooting

### Account Not Showing

1. **Check Firestore:**
   - Verify document exists in `integrations` collection
   - Check `type` field matches expected value
   - Verify `userEmail` is correct

2. **Check Token:**
   - Verify `hasAccessToken` and `hasRefreshToken` are true
   - Check `expiresAt` - token may be expired
   - Click "Reconnect" if expired

3. **Refresh Page:**
   - Settings page fetches integrations on load
   - Try refreshing the page
   - Check browser console for errors

### Permission Errors

- Ensure user has `beam_admin` role
- Check Firestore rules allow admin access to `integrations` collection
- Verify Firebase Admin SDK is configured

### OAuth Flow Issues

- Check redirect URIs match exactly in provider console
- Verify environment variables are set correctly
- Check browser console for OAuth errors
- Ensure popup blockers aren't blocking OAuth window

## For Pulse

Pulse can query integrations by:
1. Fetching all integrations from Firestore
2. Filtering by type (google, outlook, whatsapp)
3. Using each account's access token to query APIs
4. Aggregating results across all connected accounts

Example query:
```typescript
// Get all Gmail integrations
const gmailIntegrations = await adminDb.collection('integrations')
  .where('type', '==', 'google')
  .get()

// Use each integration's access token
for (const integration of gmailIntegrations.docs) {
  const tokens = integration.data()
  // Query Gmail API with tokens.accessToken
}
```

