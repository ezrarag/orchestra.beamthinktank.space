# Fix: Google OAuth Redirect URI Mismatch Error

## Problem

When orchestra members try to sign in with Google to access project pages (like the Black Diaspora Symphony project), they see this error:

```
Access blocked: project-97317601295's request is invalid
Error 400: redirect_uri_mismatch
```

## Root Cause

Firebase Authentication uses Google Sign-In, which requires an OAuth 2.0 client ID. This client ID needs to have specific authorized redirect URIs configured in Google Cloud Console. The redirect URIs that Firebase uses are:

- `https://[PROJECT_ID].firebaseapp.com/__/auth/handler`
- `https://[AUTH_DOMAIN]/__/auth/handler`

If these URIs aren't configured, Google will reject the authentication request.

## Solution

### Step 1: Find Your Firebase OAuth Client ID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`beam-orchestra-platform` or your project name)
3. Go to **Project Settings** (gear icon ⚙️)
4. Scroll down to **Your apps** section
5. Click on your web app
6. Look for **OAuth redirect domains** or note your **Project ID** and **Auth Domain**

### Step 2: Go to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Make sure you're in the **same project** as your Firebase project
3. Navigate to **APIs & Services → Credentials**

### Step 3: Find the Firebase OAuth Client

1. Look for an OAuth 2.0 Client ID that was automatically created by Firebase
2. It will typically be named something like:
   - `[PROJECT_ID] - Web client (auto created by Google Service)`
   - Or just look for one with "auto created by Google Service" in the name
3. Click on it to edit

### Step 4: Add Authorized Redirect URIs

Add these redirect URIs to the **Authorized redirect URIs** section:

```
https://[PROJECT_ID].firebaseapp.com/__/auth/handler
https://[AUTH_DOMAIN]/__/auth/handler
```

Replace:
- `[PROJECT_ID]` with your Firebase project ID (e.g., `beam-orchestra-platform`)
- `[AUTH_DOMAIN]` with your Firebase auth domain (e.g., `beam-orchestra-platform.firebaseapp.com`)

**Example:**
```
https://beam-orchestra-platform.firebaseapp.com/__/auth/handler
https://beam-orchestra-platform.firebaseapp.com/__/auth/handler
```

**Note:** If your auth domain is different (e.g., a custom domain), add both:
```
https://beam-orchestra-platform.firebaseapp.com/__/auth/handler
https://orchestra.beamthinktank.space/__/auth/handler
```

### Step 5: Add Authorized JavaScript Origins (if needed)

Also add these to **Authorized JavaScript origins**:

```
https://[PROJECT_ID].firebaseapp.com
https://[AUTH_DOMAIN]
https://orchestra.beamthinktank.space
http://localhost:3000
```

### Step 6: Save and Test

1. Click **Save**
2. Wait a few minutes for changes to propagate
3. Have the user try signing in again

## Alternative: Check Firebase Authorized Domains

If the above doesn't work, also verify:

1. Go to Firebase Console → **Authentication → Settings**
2. Scroll to **Authorized domains**
3. Make sure these domains are listed:
   - `localhost` (for development)
   - `orchestra.beamthinktank.space` (your production domain)
   - Any Vercel preview domains you use

## Quick Checklist

- [ ] Found Firebase OAuth client in Google Cloud Console
- [ ] Added `https://[PROJECT_ID].firebaseapp.com/__/auth/handler` to authorized redirect URIs
- [ ] Added `https://[AUTH_DOMAIN]/__/auth/handler` to authorized redirect URIs
- [ ] Added production domain to authorized redirect URIs (if using custom domain)
- [ ] Added authorized JavaScript origins
- [ ] Saved changes
- [ ] Waited a few minutes for propagation
- [ ] Tested sign-in again

## Common Issues

### "I can't find the Firebase OAuth client"
- Make sure you're in the **same Google Cloud project** as your Firebase project
- Look for clients with "auto created by Google Service" in the name
- Check if there are multiple OAuth clients - Firebase might have created a new one

### "Still getting the error after adding URIs"
- Wait 5-10 minutes for Google's changes to propagate
- Clear browser cache and cookies
- Try in an incognito/private window
- Double-check that the URIs match exactly (including `https://` and trailing paths)

### "Different project number in error"
- The error shows `project-97317601295` - this is the Google Cloud project **number**, not the project ID
- You can find your project number in Google Cloud Console → Project Settings
- Make sure you're editing the OAuth client in the correct project

## Verification

After fixing, users should be able to:
1. Click "Sign in with Google" on any page
2. See the Google sign-in popup
3. Successfully authenticate and access project pages

## Need Help?

If you're still having issues:
1. Check the browser console for more detailed error messages
2. Verify your `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` environment variable matches your Firebase project
3. Check Firebase Console → Authentication → Settings for any additional configuration needed

