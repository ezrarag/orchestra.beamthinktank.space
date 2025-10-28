# Firebase Authentication Setup Guide

If you're seeing the error `auth/configuration-not-found` when trying to sign in, it means Firebase Authentication hasn't been enabled in your Firebase project yet.

## Steps to Enable Firebase Authentication

### 1. Go to Firebase Console
Visit [https://console.firebase.google.com](https://console.firebase.google.com)

### 2. Select Your Project
Select the project `beam-orchestra-platform` (or create a new one if needed)

### 3. Enable Authentication
1. Click on **Authentication** in the left sidebar
2. If you see a "Get started" button, click it to enable Authentication
3. If Authentication is already enabled, you should see a dashboard with sign-in methods

### 4. Enable Google Sign-In Provider
1. In the Authentication section, go to the **Sign-in method** tab
2. Click on **Google** from the list of providers
3. Toggle the **Enable** switch to ON
4. Enter your project's support email
5. Click **Save**

### 5. Configure Authorized Domains
1. Still in Authentication, go to the **Settings** tab
2. Scroll down to **Authorized domains**
3. Add any domains where your app will run:
   - `localhost` (for local development)
   - Your production domain (e.g., `orchestra.beamthinktank.space`)
   - For Vercel deployments, the domain will be added automatically

### 6. Configure Firestore Security Rules
Make sure your Firestore security rules allow authentication. Update `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add other rules for your collections as needed
  }
}
```

### 7. Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

## After Enabling Authentication

Once Authentication is enabled, your app should work properly. The error message will provide clear guidance if there are any remaining configuration issues.

## Testing

1. Start your development server: `npm run dev`
2. Navigate to a page that uses authentication (e.g., the Musician Profile Modal)
3. Click "Sign in with Google"
4. You should see the Google sign-in popup
5. After successful authentication, you should be signed in

## Common Issues

### Error: "This domain is not authorized"
**Solution**: Add your domain to the Authorized domains list in Firebase Console > Authentication > Settings

### Error: "auth/configuration-not-found"
**Solution**: Make sure Authentication is enabled and Google sign-in method is configured

### Error: "auth/unauthorized-domain"
**Solution**: Add `localhost` for local development or your production domain to authorized domains

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Sign-In Setup](https://firebase.google.com/docs/auth/web/google-signin)
