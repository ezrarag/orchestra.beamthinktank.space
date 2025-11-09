# Google Integration (Gmail + Drive) Setup Guide

This guide explains how to set up and use the Gmail and Google Drive integration features in the BEAM Orchestra admin portal.

## Overview

The Google integration allows admins to:
- **Scan Gmail** for musician inquiries and join requests
- **Search Google Drive** for roster documents and audition lists
- Automatically extract musician information from emails
- Cross-reference with existing Firestore data

## Prerequisites

1. **Google Cloud Project** (same as your Firebase project)
2. **Admin access** to the Google Cloud Console
3. **Gmail account** to connect (e.g., black-diaspora-symphony@gmail.com)

## Step 1: Enable Google APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project (`beam-orchestra-platform`)
3. Navigate to **APIs & Services → Library**
4. Enable the following APIs:
   - **Gmail API**
   - **Google Drive API**

## Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **Internal** (if using Google Workspace) or **External**
   - App name: "BEAM Orchestra Admin"
   - Support email: Your email
   - Scopes: Add `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/drive.readonly`
4. Create OAuth client:
   - Application type: **Web application**
   - Name: "BEAM Orchestra Web Client"
   - Authorized redirect URIs:
     ```
     https://orchestra.beamthinktank.space/api/google/oauth2callback
     http://localhost:3000/api/google/oauth2callback (for local development)
     ```
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Environment Variables

Add to your `.env.local` file:

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional: Custom Gmail search query
GMAIL_QUERY=subject:(join OR audition OR play OR BDSO OR orchestra)

# OAuth redirect URI (should match your domain)
GOOGLE_REDIRECT_URI=https://orchestra.beamthinktank.space/api/google/oauth2callback
```

**Important**: Never commit `.env.local` to version control!

## Step 4: Deploy to Vercel

1. Add the same environment variables in Vercel:
   - Go to your project → **Settings → Environment Variables**
   - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`
2. Redeploy your application

## Step 5: Connect Google Account

1. Sign in to the admin portal
2. Go to **Admin Dashboard**
3. In the **Gmail Scan** or **Google Docs** card, click **"Connect Google Account"**
4. A popup window will open asking you to sign in with Google
5. Sign in with the Gmail account you want to connect (e.g., black-diaspora-symphony@gmail.com)
6. Review and approve the permissions:
   - View your email messages
   - View your Google Drive files
7. You'll be redirected back to the admin dashboard
8. The connection status should now show "Connected"

## Using the Features

### Gmail Scan

1. Click **"Scan Gmail for Musicians"** button
2. The system will search for emails matching your query (default: `subject:(join OR audition OR play OR BDSO OR orchestra)`)
3. Results will show:
   - **New** potential musicians (not in Firestore)
   - **Existing** musicians (already in roster)
4. For new candidates:
   - Review extracted information (name, email, phone, instrument)
   - Click **"Add to Roster"** to add them to the project
5. The system automatically extracts:
   - Name from email "From" field
   - Email address
   - Phone numbers (if mentioned)
   - Instrument mentions
   - Email snippet for notes

### Google Docs Search

1. Click **"Search Google Docs"** button
2. The system searches for documents containing:
   - "roster"
   - "audition"
   - "musicians"
   - "BDSO"
3. Results show:
   - Document name
   - File type
   - Last modified date
   - Link to open in Google Drive

## Security & Privacy

- **OAuth Tokens**: Stored securely in Firestore `integrations/google` collection
- **Access Control**: Only admins can access Google integration features
- **Token Refresh**: Tokens automatically refresh when expired
- **Scopes**: Limited to read-only access (Gmail read, Drive read)
- **Data**: Email content is only displayed in the admin interface, not stored permanently

## Troubleshooting

### "Google OAuth not connected"

- Make sure you've completed the OAuth flow
- Check that environment variables are set correctly
- Verify the redirect URI matches your domain

### "Failed to scan Gmail"

- Check that Gmail API is enabled in Google Cloud Console
- Verify the connected account has access to the inbox
- Check browser console for detailed error messages

### "Token expired"

- Tokens automatically refresh, but if issues persist:
  1. Disconnect and reconnect Google account
  2. Check Firestore `integrations/google` document
  3. Verify OAuth credentials are still valid

### "Insufficient permissions"

- Make sure you're signed in as an admin
- Verify your admin role in Firebase Authentication

## API Endpoints

- `GET /api/google/auth` - Initiate OAuth flow
- `GET /api/google/oauth2callback` - OAuth callback handler
- `GET /api/google/check` - Check connection status
- `POST /api/google/gmail` - Scan Gmail inbox
- `POST /api/google/docs` - Search Google Drive

## Customization

### Custom Gmail Query

Edit the search query in the dashboard or set `GMAIL_QUERY` environment variable:

```env
GMAIL_QUERY=subject:(join OR audition) from:example@gmail.com
```

### Custom Docs Search

Modify the search query in the dashboard:

```javascript
{
  query: 'name contains "roster" and modifiedTime > "2024-01-01"',
  maxResults: 100
}
```

## Next Steps

- **Pulse Integration**: Connect OpenAI Pulse to summarize email threads
- **Automated Sync**: Set up scheduled scans (requires Firebase Functions)
- **Email Templates**: Create templates for responding to inquiries
- **Document Parsing**: Extract musician data from Google Docs spreadsheets

## Support

For issues or questions:
1. Check the browser console for errors
2. Review Firestore `integrations/google` document
3. Verify Google Cloud Console API status
4. Contact system administrator

