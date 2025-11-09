# Complete Firebase Setup Guide

This guide will walk you through setting up Firebase for the BEAM Orchestra platform, including Authentication, Firestore, and Storage.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Enter your project name (e.g., `beam-orchestra-platform`)
4. Follow the setup wizard:
   - Enable Google Analytics (optional but recommended)
   - Accept terms and continue

## Step 2: Get Your Firebase Configuration

1. In your Firebase project, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` to add a web app
5. Register your app:
   - App nickname: `BEAM Orchestra Web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click **"Register app"**
6. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

## Step 3: Enable Firebase Authentication

1. In Firebase Console, go to **"Authentication"** in the left sidebar
2. Click **"Get started"** if you see it (first time setup)
3. Go to the **"Sign-in method"** tab
4. Click on **"Google"** provider
5. Toggle **"Enable"** to ON
6. Enter your **Project support email** (your email address)
7. Click **"Save"**

## Step 4: Configure Authorized Domains

1. Still in Authentication, go to **"Settings"** tab
2. Scroll down to **"Authorized domains"**
3. Add your domains:
   - `localhost` (already there for local development)
   - Your production domain (e.g., `orchestra.beamthinktank.space`)
   - For Vercel deployments, your `*.vercel.app` domain will be added automatically

## Step 5: Set Up Firestore Database

1. In Firebase Console, go to **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll set up security rules next)
4. Select a location for your database (choose closest to your users)
5. Click **"Enable"**

## Step 6: Set Up Firebase Storage

1. In Firebase Console, go to **"Storage"** in the left sidebar
2. Click **"Get started"**
3. Choose **"Start in production mode"** (we'll set up security rules next)
4. Use the same location as Firestore
5. Click **"Done"**

## Step 7: Create Environment Variables File

1. In your project root, create a file named `.env.local` (if it doesn't exist)
2. Copy the contents from `env.example`:
   ```bash
   cp env.example .env.local
   ```

3. Open `.env.local` and replace the Firebase placeholders with your actual values:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

**Important Notes:**
- Replace `your-project-id` with your actual Firebase project ID
- Replace all the placeholder values with the actual values from Step 2
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose these variables to the browser
- Never commit `.env.local` to git (it should already be in `.gitignore`)

## Step 8: Deploy Firestore Security Rules

1. Your project already has `firestore.rules` file
2. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

3. Login to Firebase:
   ```bash
   firebase login
   ```

4. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Use existing `firestore.rules` file
   - Use existing `firestore.indexes.json` file

5. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 9: Deploy Storage Security Rules

1. Your project already has `storage.rules` file
2. Deploy storage rules:
   ```bash
   firebase deploy --only storage
   ```

## Step 10: Verify Configuration

1. Restart your Next.js development server:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart
   npm run dev
   # or
   pnpm dev
   ```

2. Open your browser console and check for:
   - ✅ No "Firebase configuration incomplete" warnings
   - ✅ No "Firebase auth is not initialized" errors

3. Test the sign-in button:
   - Click "Sign In" in the header
   - You should see a Google sign-in popup
   - After signing in, you should be authenticated

## Troubleshooting

### Error: "Firebase configuration incomplete"
- **Solution**: Check that all 6 Firebase environment variables are set in `.env.local`
- Make sure variable names start with `NEXT_PUBLIC_`
- Restart your dev server after changing `.env.local`

### Error: "Firebase auth is not available"
- **Solution**: 
  1. Verify Authentication is enabled in Firebase Console
  2. Check that Google sign-in provider is enabled
  3. Verify your environment variables are correct
  4. Restart your dev server

### Error: "auth/configuration-not-found"
- **Solution**: Authentication hasn't been enabled in Firebase Console. Go to Authentication → Sign-in method → Enable Google provider

### Sign-in popup doesn't appear
- **Solution**: 
  1. Check browser console for errors
  2. Verify `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` matches your Firebase project
  3. Check that your domain is in the authorized domains list

### Environment variables not working
- **Solution**:
  1. Make sure the file is named `.env.local` (not `.env` or `.env.development`)
  2. Restart your Next.js dev server after changing environment variables
  3. Check that variables start with `NEXT_PUBLIC_` for client-side access
  4. Clear browser cache and hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

## For Production Deployment (Vercel)

1. Go to your Vercel project settings
2. Navigate to **"Environment Variables"**
3. Add all 6 Firebase environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. Make sure to add them for **Production**, **Preview**, and **Development** environments
5. Redeploy your application

## Quick Checklist

- [ ] Firebase project created
- [ ] Firebase config values copied
- [ ] `.env.local` file created with all 6 Firebase variables
- [ ] Authentication enabled in Firebase Console
- [ ] Google sign-in provider enabled
- [ ] Authorized domains configured
- [ ] Firestore database created
- [ ] Storage bucket created
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Dev server restarted
- [ ] Sign-in button tested and working

## Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify all environment variables are set correctly
3. Make sure you've restarted your dev server
4. Check Firebase Console to ensure all services are enabled
5. Review the `lib/firebase.ts` file to see how configuration is checked

