# Firebase Admin SDK Setup - Quick Start

## 🚀 Ready-to-Use Setup

Your Firebase Admin SDK is now configured with **Application Default Credentials** - no JSON key files needed!

## ✅ What's Been Set Up

1. **`/lib/firebase-admin.ts`** - Secure Admin SDK initialization
2. **`/app/api/test-auth/route.ts`** - Authentication test endpoint
3. **`/firestore.rules`** - Role-based security rules
4. **`/docs/firebase-admin-setup.md`** - Complete setup guide

## 🔧 Environment Variables Needed

Add these to your `.env.local` and Vercel:

```env
# Firebase Admin SDK
GOOGLE_CLOUD_PROJECT=beam-orchestra
FIREBASE_SERVICE_ACCOUNT_EMAIL=beam-orchestra-admin@beam-orchestra.iam.gserviceaccount.com
```

## 🧪 Test Your Setup

### 1. Local Development
```bash
# Install Google Cloud CLI (if needed)
brew install google-cloud-sdk  # macOS
# or download from: https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth application-default login

# Start dev server
npm run dev

# Test basic connection
curl -X POST http://localhost:3000/api/test-auth \
  -H "Content-Type: application/json" \
  -d '{"testType": "firestore"}'
```

### 2. Test with Authentication
```bash
# Get Firebase token from browser console:
# firebase.auth().currentUser.getIdToken().then(console.log)

# Test authenticated endpoint
curl -X GET http://localhost:3000/api/test-auth \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## 🔐 Security Features

- ✅ **No JSON keys** - Uses Application Default Credentials
- ✅ **Role-based access** - Only admins can access sensitive data
- ✅ **Token verification** - All API routes verify Firebase Auth tokens
- ✅ **Fine-grained permissions** - Firestore rules restrict access by role

## 🎯 Next Steps

1. **Deploy Firestore Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Set Admin Role**:
   ```javascript
   // In Firebase Console or Admin SDK
   admin.auth().setCustomUserClaims('USER_UID', { role: 'beam_admin' });
   ```

3. **Test Admin Dashboard**:
   - Visit `/admin/dashboard`
   - Should show authentication required
   - Login with admin account to access

## 🚨 Troubleshooting

**"No credentials found"**:
```bash
gcloud auth application-default login
```

**"Permission denied"**:
- Check service account has `roles/firebase.admin`
- Verify impersonation permissions are set

**"Invalid token"**:
- Ensure user has `beam_admin` role in custom claims
- Check Firebase Auth is configured correctly

## 📚 Full Documentation

See `/docs/firebase-admin-setup.md` for complete setup instructions including:
- Google Cloud Console configuration
- Service account creation
- Impersonation permissions
- Vercel deployment setup
- Troubleshooting guide

Your BEAM Orchestra admin system is now secure and ready for production! 🎻
