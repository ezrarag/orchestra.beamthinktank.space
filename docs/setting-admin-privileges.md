# Setting Admin Privileges in Firebase

This guide explains how to grant admin access to users in the BEAM Orchestra platform.

## Prerequisites

**Important:** Users must sign in at least once with Google before you can set their admin role. The user account must exist in Firebase Authentication.

## Methods to Set Admin Privileges

### Method 1: Using the Admin Settings Page (Easiest)

1. **Sign in** to the admin portal with an existing admin account
2. Navigate to **Admin → Settings** (`/admin/settings`)
3. Scroll to the **"User Role Management"** section
4. Enter the user's email address (e.g., `ezra@readyaimgo.biz`)
5. Select **"Beam Admin"** from the role dropdown
6. Click **"Set User Role"**
7. The user must **sign out and sign back in** to refresh their ID token

### Method 2: Using the Script (For Multiple Users)

Use the `setMultipleAdmins.ts` script to set admin roles for multiple users at once:

```bash
# Set multiple admins at once
ADMIN_EMAILS="ezra@readyaimgo.biz,blackdiaspora@gmail.com" npx tsx scripts/setMultipleAdmins.ts
```

Or edit the script directly and set the emails array:

```typescript
const emails: string[] = [
  'ezra@readyaimgo.biz',
  'blackdiaspora@gmail.com', // Replace with actual Black Diaspora Gmail
]
```

Then run:
```bash
npx tsx scripts/setMultipleAdmins.ts
```

### Method 3: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`beam-orchestra-platform`)
3. Navigate to **Authentication → Users**
4. Find the user by email
5. Click on the user → **Custom Claims** tab
6. Add custom claims:
   ```json
   {
     "beam_admin": true,
     "role": "beam_admin"
   }
   ```
7. Save changes
8. The user must **sign out and sign back in** to refresh their ID token

## Setting Up Your First Admin

If you don't have any admins yet, you'll need to use one of these methods:

### Option A: Firebase Console (Recommended for First Admin)

1. Sign in to Firebase Console
2. Go to **Authentication → Users**
3. If the user doesn't exist, they must sign in to the app first
4. Once they exist, set custom claims as shown in Method 3 above

### Option B: Using gcloud CLI

If you have Firebase Admin SDK configured locally:

```bash
# First, ensure you're authenticated
gcloud auth application-default login

# Then run the script
ADMIN_EMAILS="ezra@readyaimgo.biz" npx tsx scripts/setMultipleAdmins.ts
```

## Available Roles

- **`beam_admin`**: Full access to all projects and admin features
- **`partner_admin`**: Limited access to only assigned project(s)
- **`board`**: Read-only access to analytics dashboards
- **`musician`**: Musician-level access
- **`subscriber`**: Subscriber-level access
- **`audience`**: Public access only

## Important Notes

1. **Users must sign in first**: Before you can set a role, the user must have signed in at least once with Google to create their Firebase Auth account.

2. **Token refresh required**: After setting admin privileges, users must **sign out and sign back in** for the changes to take effect. This is because Firebase ID tokens are cached and need to be refreshed.

3. **Email must match**: The email you use must exactly match the email the user signed in with (case-insensitive, but must match the account).

## Troubleshooting

### "User not found" Error

- The user hasn't signed in yet. Ask them to sign in to the app at least once.
- Check that the email address is correct and matches their Google account.

### "Insufficient permissions" Error

- You must be signed in as an existing admin to set roles for other users.
- If you're the first admin, use Firebase Console or the script method.

### Role Not Working After Setting

- The user must sign out and sign back in to refresh their ID token.
- Clear browser cache and cookies if issues persist.
- Check Firebase Console → Authentication → Users → Custom Claims to verify the role was set.

## Quick Setup for Your Accounts

To set admin privileges for:
- `ezra@readyaimgo.biz`
- Black Diaspora Gmail account

**Using the script:**
```bash
ADMIN_EMAILS="ezra@readyaimgo.biz,blackdiaspora@gmail.com" npx tsx scripts/setMultipleAdmins.ts
```

(Replace `blackdiaspora@gmail.com` with the actual Black Diaspora Gmail address)

**Or using the Admin Settings page:**
1. Sign in as an existing admin (or use Firebase Console for the first admin)
2. Go to `/admin/settings`
3. Use the "User Role Management" section to set each user's role

