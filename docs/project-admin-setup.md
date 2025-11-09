# Project-Specific Admin Setup

This guide explains how to set up project-specific admins (like Dayvin for Black Diaspora Symphony Orchestra) who can only access their assigned project.

## Overview

- **beam_admin**: Full access to all projects and admin features
- **partner_admin**: Limited access to only their assigned project(s)

## Setting Up a Project Admin

### Option 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Authentication → Users**
3. Find the user (e.g., Dayvin's email)
4. Click on the user → **Custom Claims** tab
5. Add the following claims:
   ```json
   {
     "role": "partner_admin",
     "assignedProjectId": "black-diaspora-symphony"
   }
   ```
6. Save changes

### Option 2: Using Firestore

1. Go to **Firestore Database**
2. Navigate to `users/{userId}` collection
3. Create or update the user document with:
   ```json
   {
     "email": "dayvin@example.com",
     "role": "partner_admin",
     "assignedProjectId": "black-diaspora-symphony"
   }
   ```

### Option 3: Using Admin Script (if Admin SDK is configured)

Create a script `scripts/setPartnerAdmin.ts`:

```typescript
import admin from 'firebase-admin'
import { initializeApp } from 'firebase-admin/app'

// Initialize Firebase Admin
if (!admin.apps.length) {
  initializeApp()
}

const email = process.env.ADMIN_EMAIL
const projectId = process.env.PROJECT_ID || 'black-diaspora-symphony'

if (!email) {
  console.error('ADMIN_EMAIL environment variable required')
  process.exit(1)
}

async function setPartnerAdmin() {
  try {
    const user = await admin.auth().getUserByEmail(email)
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'partner_admin',
      assignedProjectId: projectId
    })
    
    // Also update Firestore
    await admin.firestore().collection('users').doc(user.uid).set({
      email,
      role: 'partner_admin',
      assignedProjectId: projectId
    }, { merge: true })
    
    console.log(`✅ Set ${email} as partner_admin for project ${projectId}`)
  } catch (error) {
    console.error('Error setting partner admin:', error)
  }
}

setPartnerAdmin()
```

Run with:
```bash
ADMIN_EMAIL=dayvin@example.com PROJECT_ID=black-diaspora-symphony npx tsx scripts/setPartnerAdmin.ts
```

## How It Works

1. **Partner Admin Login**: When a partner_admin logs in, they are automatically redirected to their assigned project page (`/admin/projects/{projectId}`)

2. **Access Control**: 
   - Partner admins can only access their assigned project
   - They cannot see the main dashboard or other projects
   - They have full access within their project (musicians, analytics, budget, etc.)

3. **Project Page Features**:
   - View project details
   - Manage musicians
   - View budget and analytics
   - Add musicians manually
   - View attendance

## Testing

1. Sign in as the partner admin
2. You should be automatically redirected to `/admin/projects/black-diaspora-symphony`
3. You should NOT see the main dashboard or other projects
4. All project features should be accessible

## Notes

- After setting custom claims, the user must **sign out and sign back in** for changes to take effect
- Custom claims are cached in the ID token, so token refresh may be needed
- Firestore user document serves as a fallback if custom claims aren't available

