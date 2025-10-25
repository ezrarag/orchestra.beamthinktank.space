# Firebase Admin SDK Setup Instructions

## 🔐 Secure Keyless Authentication Setup

This guide sets up Firebase Admin SDK with **Application Default Credentials** instead of service account JSON keys, ensuring compliance with Google Cloud's security policies.

## Prerequisites

- Google Cloud Project with Firebase enabled
- Firebase project ID: `beam-orchestra` (or your project ID)
- Admin access to Google Cloud Console

## Step 1: Enable Required APIs

In Google Cloud Console → APIs & Services, enable:

- ✅ Cloud Resource Manager API
- ✅ IAM API  
- ✅ Service Account Credentials API
- ✅ Firebase Management API
- ✅ Firestore API
- ✅ Cloud Storage API

## Step 2: Create Admin Service Account

1. Go to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name: `beam-orchestra-admin`
4. Description: `BEAM Orchestra Admin Service Account`
5. Click **Create and Continue**

### Assign Roles:
- `roles/firebase.admin`
- `roles/datastore.user`
- `roles/iam.serviceAccountTokenCreator`

6. Click **Done**
7. **Copy the service account email** (e.g., `beam-orchestra-admin@beam-orchestra.iam.gserviceaccount.com`)

## Step 3: Configure Impersonation Permissions

Run these commands in Cloud Shell or locally with `gcloud` CLI:

```bash
# Replace with your actual service account email
SERVICE_ACCOUNT_EMAIL="beam-orchestra-admin@beam-orchestra.iam.gserviceaccount.com"

# Grant your user account permission to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding $SERVICE_ACCOUNT_EMAIL \
  --member="user:youremail@gmail.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# Optional: Grant Vercel runtime permission (for CI/CD)
gcloud iam service-accounts add-iam-policy-binding $SERVICE_ACCOUNT_EMAIL \
  --member="serviceAccount:vercel-deploy@vercel-prod.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

## Step 4: Local Development Setup

### Install Google Cloud CLI (if not already installed)

```bash
# macOS
brew install google-cloud-sdk

# Windows
# Download from: https://cloud.google.com/sdk/docs/install

# Linux
curl https://sdk.cloud.google.com | bash
```

### Authenticate for Application Default Credentials

```bash
gcloud auth application-default login
```

This creates credentials at `~/.config/gcloud/application_default_credentials.json` that the Firebase Admin SDK will automatically use.

## Step 5: Environment Variables

### Local Development (.env.local)

```env
# Firebase Web SDK (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=beam-orchestra.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=beam-orchestra
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=beam-orchestra.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (new)
GOOGLE_CLOUD_PROJECT=beam-orchestra
FIREBASE_SERVICE_ACCOUNT_EMAIL=beam-orchestra-admin@beam-orchestra.iam.gserviceaccount.com
```

### Vercel Deployment

In Vercel Dashboard → Project Settings → Environment Variables:

```env
GOOGLE_CLOUD_PROJECT=beam-orchestra
FIREBASE_SERVICE_ACCOUNT_EMAIL=beam-orchestra-admin@beam-orchestra.iam.gserviceaccount.com
```

**Note**: Vercel automatically provides Application Default Credentials through OpenID Connect, so no JSON key files are needed.

## Step 6: Test the Setup

### Start Development Server

```bash
npm run dev
```

### Test API Endpoints

1. **Basic Admin SDK Test** (no auth required):
   ```bash
   curl -X POST http://localhost:3000/api/test-auth \
     -H "Content-Type: application/json" \
     -d '{"testType": "firestore"}'
   ```

2. **Authenticated Test** (requires Firebase Auth token):
   ```bash
   # First, get a Firebase Auth token from your frontend
   # Then test with the token:
   curl -X GET http://localhost:3000/api/test-auth \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
   ```

### Expected Responses

**Success Response:**
```json
{
  "success": true,
  "message": "Firebase Admin SDK authentication successful",
  "user": {
    "uid": "user_uid",
    "email": "admin@beamorchestra.org",
    "role": "beam_admin"
  },
  "data": {
    "organizations": { "count": 0, "docs": [] },
    "projects": { "count": 0, "docs": [] },
    "musicians": { "count": 0, "docs": [] },
    "users": { "count": 1, "users": [...] }
  }
}
```

## Step 7: Deploy Firestore Security Rules

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login and initialize:
   ```bash
   firebase login
   firebase init firestore
   ```

3. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 8: Set Up User Roles

### Create Admin User

Use Firebase Console → Authentication → Users to create your admin account, then set custom claims:

```javascript
// Run in Firebase Console → Functions (or use Admin SDK)
const admin = require('firebase-admin');
admin.auth().setCustomUserClaims('USER_UID', { role: 'beam_admin' });
```

### Or use the Admin SDK in your app:

```typescript
import { setUserRole } from '@/lib/firebase-admin'

// Set user as admin
await setUserRole('user_uid', 'beam_admin')
```

## Troubleshooting

### Common Issues

1. **"No credentials found"**
   - Run `gcloud auth application-default login`
   - Check `GOOGLE_CLOUD_PROJECT` environment variable

2. **"Permission denied"**
   - Verify service account has correct roles
   - Check impersonation permissions are set

3. **"Invalid token"**
   - Ensure Firebase Auth is properly configured
   - Check custom claims are set correctly

### Debug Commands

```bash
# Check current credentials
gcloud auth list

# Check application default credentials
gcloud auth application-default print-access-token

# Test Firestore access
gcloud firestore databases list

# Check service account permissions
gcloud projects get-iam-policy beam-orchestra
```

## Security Benefits

✅ **No JSON key files** - Complies with Google Cloud security policies  
✅ **Automatic token rotation** - No manual key management  
✅ **Fine-grained permissions** - Revoke access anytime  
✅ **Environment consistency** - Same auth locally and in production  
✅ **Audit trail** - All actions logged in Cloud Console  

## Next Steps

Once this setup is complete, you can:

1. **Deploy to Vercel** with confidence
2. **Build BEAM Coin APIs** that mint and transfer tokens
3. **Integrate OpenAI Pulse** for AI-powered insights
4. **Create partner organization portals** with secure data access
5. **Scale to multiple cities** with the same authentication system

The admin dashboard at `/admin/dashboard` and `/admin/pulse` will now work seamlessly with this secure backend!
