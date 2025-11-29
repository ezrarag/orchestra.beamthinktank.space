# Firebase Admin SDK Setup for Vercel

## Issue: "Failed to set role" and "Missing or insufficient permissions" Errors

If you're seeing these errors in production (Vercel):

1. **"Failed to set role"** - When trying to set user roles in `/admin/settings`
2. **"Missing or insufficient permissions"** - When the dashboard tries to fetch stats
3. **500 errors** from `/api/admin/set-role` and `/api/google/check`

This is because the Firebase Admin SDK isn't properly configured in your Vercel environment.

## Solution: Add Firebase Admin Credentials to Vercel

The Admin SDK needs service account credentials to work in Vercel. Here's how to set it up:

### Step 1: Get Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`beam-orchestra-platform`)
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Download the JSON file

### Step 2: Extract Required Values

Open the downloaded JSON file and find these values:

```json
{
  "project_id": "beam-orchestra-platform",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@beam-orchestra-platform.iam.gserviceaccount.com"
}
```

### Step 3: Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these three variables:

```
FIREBASE_ADMIN_PRIVATE_KEY = (paste the entire private_key value, including the BEGIN/END lines)
FIREBASE_ADMIN_CLIENT_EMAIL = (paste the client_email value)
GOOGLE_CLOUD_PROJECT = beam-orchestra-platform
```

**Important Notes:**
- For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the **entire** private key including:
  - `-----BEGIN PRIVATE KEY-----`
  - The key content
  - `-----END PRIVATE KEY-----`
- Keep all newlines (`\n`) in the private key
- The private key should be on a single line in Vercel (it will handle the newlines)

### Step 4: Redeploy

After adding the environment variables:

1. Go to **Deployments** in Vercel
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger a new deployment

### Step 5: Verify It Works

1. Go to `/admin/settings`
2. Try setting a user role
3. You should no longer see the "Admin SDK not configured" error

## Alternative: Using Application Default Credentials (Local Only)

For **local development**, you can use Application Default Credentials instead:

```bash
# Install Google Cloud CLI
brew install google-cloud-sdk  # macOS

# Authenticate
gcloud auth application-default login

# Start dev server
npm run dev
```

This works locally but **not in Vercel** - you still need the service account credentials for production.

## Why This Happens

- **Local**: `applicationDefault()` works because you've authenticated with `gcloud auth application-default login`
- **Vercel**: No default credentials are available, so you need to provide service account credentials via environment variables

## Troubleshooting

### Still Getting Errors?

1. **Check Environment Variables**: Make sure all three variables are set in Vercel
2. **Check Private Key Format**: The private key must include the BEGIN/END markers
3. **Redeploy**: Environment variables only take effect after a new deployment
4. **Check Logs**: Look at Vercel function logs for detailed error messages

### "User must sign out and sign back in"

After setting a user's role, they need to:
1. Sign out of the application
2. Sign back in
3. This refreshes their ID token with the new role claim

The dashboard permission errors will go away once the user refreshes their token.

## Related Files

- `lib/firebase-admin.ts` - Admin SDK initialization
- `app/api/admin/set-role/route.ts` - Role setting endpoint
- `app/api/google/check/route.ts` - Google OAuth check endpoint



