# How to Add Partner Admin

This guide explains how to grant partner admin access to users for specific projects (e.g., Black Diaspora Symphony Orchestra's Gmail account).

## Overview

**Partner Admin** (`partner_admin`) is a role that grants limited access to only a specific project. Unlike `beam_admin` who can access all projects, partner admins can only see and manage their assigned project.

## Prerequisites

**⚠️ Important:** Users must sign in at least once with Google before you can set their partner admin role. The user account must exist in Firebase Authentication.

## Methods to Add Partner Admin

### Method 1: Using the Script (Recommended)

Use the `setPartnerAdmin.ts` script to grant partner admin access:

```bash
# Set partner admin for Black Diaspora Symphony Orchestra
ADMIN_EMAIL=blackdiaspora@gmail.com PROJECT_ID=black-diaspora-symphony npx tsx scripts/setPartnerAdmin.ts
```

**What the script does:**
1. Sets Firebase custom claims: `role: 'partner_admin'`, `assignedProjectId: 'black-diaspora-symphony'`
2. Updates Firestore user document: `role: 'partner_admin'`, `assignedProjectId: 'black-diaspora-symphony'`
3. User must sign out and back in to refresh token

**Prerequisites for Script Method:**
- Firebase Admin SDK must be configured (see `docs/firebase-admin-setup.md`)
- User must have signed in at least once with Google
- Run `gcloud auth application-default login` if using Application Default Credentials

### Method 2: Using Admin Settings Page (If You Have Admin Access)

If you have admin access:

1. **Sign in** to the admin portal with an admin account
2. Navigate to **Admin → Settings** (`/admin/settings`)
3. Scroll to the **"User Role Management"** section
4. Enter the user's email address (e.g., `blackdiaspora@gmail.com`)
5. Select **"Partner Admin"** from the role dropdown
6. Click **"Set User Role"**
7. **Important:** You'll also need to manually set the `assignedProjectId` in Firebase Console (see Method 3)

**Note:** The Admin Settings page sets the role but doesn't set `assignedProjectId`. You'll need to use Firebase Console to add the project assignment.

### Method 3: Using Firebase Console (For First Partner Admin)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication → Users**
4. Find the user by email
5. Click on the user → **Custom Claims** tab
6. Add custom claims:
   ```json
   {
     "role": "partner_admin",
     "partner_admin": true,
     "assignedProjectId": "black-diaspora-symphony"
   }
   ```
7. Save changes
8. Go to **Firestore Database**
9. Navigate to `users/{userId}` document
10. Update the document:
    ```json
    {
      "email": "blackdiaspora@gmail.com",
      "role": "partner_admin",
      "assignedProjectId": "black-diaspora-symphony"
    }
    ```
11. User must **sign out and sign back in**

## Available Project IDs

Common project IDs:
- `black-diaspora-symphony` - Black Diaspora Symphony Orchestra
- `atlanta-spring-concert` - Atlanta Spring Concert
- (Add more as projects are created)

## How Partner Admin Works

1. **Automatic Redirect**: When a partner admin logs in, they are automatically redirected to their assigned project page (`/admin/projects/{projectId}`)

2. **Access Control**: 
   - Partner admins can only access their assigned project
   - They cannot see the main dashboard or other projects
   - They have full access within their project (musicians, analytics, budget, ticket reservations, etc.)

3. **Project Page Features**:
   - View project details
   - Manage musicians
   - View ticket reservations for project events
   - View budget and analytics
   - Add musicians manually
   - View attendance
   - Manage media library

## Important Notes

1. **Users must sign in first**: Before you can set a partner admin role, the user must have signed in at least once with Google to create their Firebase Auth account.

2. **Token refresh required**: After setting partner admin privileges, users must **sign out and sign back in** for the changes to take effect. This is because Firebase ID tokens are cached and need to be refreshed.

3. **Project ID must match**: The `assignedProjectId` must exactly match an existing project ID in Firestore.

4. **Both custom claims and Firestore**: The system checks both Firebase custom claims and Firestore user documents, so both should be set for reliability.

## Troubleshooting

### "User not found" Error

- The user hasn't signed in yet. Ask them to sign in to the app at least once.
- Check that the email address is correct and matches their Google account.

### Partner Admin Can't Access Project

- Verify `assignedProjectId` is set correctly in custom claims
- Check Firestore `users/{userId}` document has `assignedProjectId` field
- User must sign out and sign back in to refresh token
- Verify project ID matches exactly (case-sensitive)

### Script Authentication Errors

If you get errors like "invalid_grant" or "reauth related error":

1. Run `gcloud auth application-default login` to refresh credentials
2. Make sure your system time is synced correctly
3. Check that Firebase Admin SDK is configured (see `docs/firebase-admin-setup.md`)
4. Verify service account credentials are valid

## Quick Setup Example

To set partner admin for Black Diaspora Symphony Orchestra's Gmail account:

**Using the script:**
```bash
ADMIN_EMAIL=blackdiaspora@gmail.com PROJECT_ID=black-diaspora-symphony npx tsx scripts/setPartnerAdmin.ts
```

**Or using Admin Settings page + Firebase Console:**
1. Sign in as an existing admin
2. Go to `/admin/settings`
3. Set role to "Partner Admin"
4. Then go to Firebase Console → Authentication → Users → Custom Claims
5. Add `assignedProjectId: "black-diaspora-symphony"`

## Verification

After setting partner admin role:

1. User signs out completely
2. User signs back in
3. User should be automatically redirected to `/admin/projects/black-diaspora-symphony`
4. User should see project dashboard with:
   - Project details
   - Musicians list
   - Ticket reservations (if any)
   - Budget and analytics
   - Quick action links

## Related Documentation

- `docs/how-to-add-admins.md` - How to add beam admins
- `docs/firebase-admin-setup.md` - Firebase Admin SDK setup
- `docs/admin-portal-readme.md` - Admin portal overview
- `docs/project-admin-setup.md` - Additional partner admin details





