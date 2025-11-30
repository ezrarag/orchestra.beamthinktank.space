# Gmail Integrations Settings

## Overview

The Settings page now includes a **Gmail Integrations** section that allows admins to:
- View all connected Gmail accounts
- Add multiple Gmail account integrations
- Disconnect Gmail accounts
- See connection status and expiration dates

This enables Pulse to access email data from multiple sources for comprehensive analysis.

## Features

### View Connected Accounts
- Lists all connected Gmail accounts
- Shows account name and email
- Displays connection date
- Shows active/expired status
- Indicates if refresh token is available

### Add New Integration
- Click "Add Gmail Account" button
- Opens Google OAuth flow in popup window
- Automatically fetches user email and name
- Stores tokens securely in Firestore
- Supports multiple accounts simultaneously

### Remove Integration
- Click trash icon to disconnect an account
- Confirmation dialog prevents accidental removal
- Removes tokens from Firestore

## Data Structure

### Firestore Collection: `integrations`

Each document structure:
```typescript
{
  type: 'google',
  userId: string,              // Admin user who connected it
  userEmail: string,           // Gmail account email
  userName: string,            // Gmail account name
  accessToken: string,        // OAuth access token
  refreshToken: string,        // OAuth refresh token
  expiresAt: Date,            // Token expiration
  scope: string,              // OAuth scopes granted
  createdAt: Date,            // When connected
  updatedAt: Date             // Last updated
}
```

**Document ID Format:** `google_{email_normalized}`

Example: `google_blackdiaspora_gmail_com`

## API Endpoints

### GET `/api/google/integrations`
Lists all Google integrations for the authenticated admin.

**Response:**
```json
{
  "integrations": [
    {
      "id": "google_blackdiaspora_gmail_com",
      "userEmail": "blackdiaspora@gmail.com",
      "userName": "Black Diaspora Symphony",
      "createdAt": "2025-11-29T...",
      "updatedAt": "2025-11-29T...",
      "hasAccessToken": true,
      "hasRefreshToken": true,
      "expiresAt": "2025-12-29T..."
    }
  ],
  "count": 1
}
```

### DELETE `/api/google/integrations?id={integrationId}`
Removes a Google integration.

## Usage for Pulse

Pulse can now query multiple Gmail accounts by:
1. Fetching all Google integrations from Firestore
2. Using each account's access token to query Gmail
3. Aggregating results across all connected accounts
4. Providing comprehensive email analysis

## Security

- Only `beam_admin` users can manage integrations
- Firestore rules restrict access to admins only
- Tokens are stored securely in Firestore
- Refresh tokens allow automatic token renewal
- Expired tokens are clearly marked

## Migration Notes

**Previous Structure:**
- Single integration stored at `integrations/google`
- No user email/name stored

**New Structure:**
- Multiple integrations stored as separate documents
- Each integration includes user email and name
- Document ID includes normalized email

**Backward Compatibility:**
- Old `integrations/google` document will still work
- New integrations use email-based IDs
- Both can coexist during migration

## Next Steps

1. **Update Pulse API** to query multiple Gmail accounts
2. **Add account selection** in Pulse queries (optional)
3. **Add usage statistics** per account
4. **Add account labels** for easier identification

