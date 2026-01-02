# Deploy Firestore Rules

## Quick Deploy

The Firestore rules have been updated to allow partner admins to read ticket data. You need to deploy them to Firebase.

### Option 1: Firebase CLI (Recommended)

```bash
# Make sure you're logged in
firebase login

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

### Option 2: Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `beam-orchestra-platform`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

### Verify Deployment

After deploying, check the console for:
- ✅ "Rules published successfully"
- Check the timestamp shows recent update

### What Changed?

The updated rules allow:
- **Partner admins** to read `eventOrders` for events in their assigned project
- **Partner admins** to read `eventRSVPs` for events in their assigned project

This fixes the "Missing or insufficient permissions" error on partner admin dashboards.

### After Deployment

1. Partner admin users should **sign out and sign back in** to refresh their ID token
2. The partner admin dashboard should now load ticket data without errors





