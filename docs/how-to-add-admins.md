# How to Add Admins

This guide explains how to grant admin access to users in the BEAM Orchestra platform.

## Prerequisites

**⚠️ Important:** Users must sign in at least once with Google before you can set their admin role. The user account must exist in Firebase Authentication.

## Methods to Add Admins

### Method 1: Using the Admin Settings Page (Easiest - Requires Existing Admin)

If you already have an admin account:

1. **Sign in** to the admin portal with an existing admin account
2. Navigate to **Admin → Settings** (`/admin/settings`)
3. Scroll to the **"User Role Management"** section
4. Enter the user's email address (e.g., `ezra@beamthink.institute`)
5. Select **"Beam Admin"** from the role dropdown
6. Click **"Set User Role"**
7. The user must **sign out and sign back in** to refresh their ID token

**Note:** If you can't access `/admin/settings` because you don't have admin access yet, use Method 2 or Method 3 below.

### Method 2: Using the Script (For Multiple Users or First Admin)

Use the `setMultipleAdmins.ts` script to set admin roles for multiple users at once:

```bash
# Set multiple admins at once
ADMIN_EMAILS="ezra@beamthink.institute,dayvin@example.com" npx tsx scripts/setMultipleAdmins.ts
```

Or set a single admin:

```bash
# Set a single admin
ADMIN_EMAIL=ezra@beamthink.institute npx tsx scripts/setAdminRole.ts
```

**Prerequisites for Script Method:**
- Firebase Admin SDK must be configured (see `docs/firebase-admin-setup.md`)
- User must have signed in at least once with Google to create their Firebase Auth account
- Run `gcloud auth application-default login` if using Application Default Credentials

**Troubleshooting Script Method:**
- If you get authentication errors, run `gcloud auth application-default login` first
- If you get "user not found", the user must sign in at least once first
- If you get credential errors, check `docs/firebase-admin-setup.md` for setup instructions

### Method 3: Using Firebase Console (For First Admin)

If you don't have any admins yet, you can use Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`beam-orchestra-platform` or your project ID)
3. Navigate to **Authentication → Users**
4. Find the user by email (or ask them to sign in first if they don't exist)
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

**Note:** Some Firebase Console versions may not show Custom Claims UI. If you don't see it, use Method 2 (script) instead.

## Available Admin Roles

- **`beam_admin`**: Full access to all projects and admin features
- **`partner_admin`**: Limited access to only assigned project(s)
- **`board`**: Read-only access to analytics dashboards

## Important Notes

1. **Users must sign in first**: Before you can set a role, the user must have signed in at least once with Google to create their Firebase Auth account.

2. **Token refresh required**: After setting admin privileges, users must **sign out and sign back in** for the changes to take effect. This is because Firebase ID tokens are cached and need to be refreshed.

3. **Email must match**: The email you use must exactly match the email the user signed in with (case-insensitive, but must match the account).

## Troubleshooting

### "User not found" Error

- The user hasn't signed in yet. Ask them to sign in to the app at least once.
- Check that the email address is correct and matches their Google account.

### "Insufficient permissions" Error

- You must be signed in as an existing admin to set roles for other users via the Admin Settings page.
- If you're the first admin, use Firebase Console (Method 3) or the script method (Method 2).

### Role Not Working After Setting

- The user must sign out and sign back in to refresh their ID token.
- Clear browser cache and cookies if issues persist.
- Check Firebase Console → Authentication → Users → Custom Claims to verify the role was set (if available in your Firebase Console version).

### Can't Access Admin Settings Page

- You need an existing admin account to access `/admin/settings`.
- If you're setting up the first admin, use Method 2 (script) or Method 3 (Firebase Console).
- Make sure Firebase Admin SDK is properly configured if using scripts.

### Script Authentication Errors

If you get errors like "invalid_grant" or "reauth related error":

1. Run `gcloud auth application-default login` to refresh credentials
2. Make sure your system time is synced correctly
3. Check that Firebase Admin SDK is configured (see `docs/firebase-admin-setup.md`)
4. Verify service account credentials are valid

## Quick Setup Example

To set admin privileges for `ezra@beamthink.institute`:

**Using the script:**
```bash
ADMIN_EMAILS="ezra@beamthink.institute" npx tsx scripts/setMultipleAdmins.ts
```

**Or using Admin Settings page (if you already have admin access):**
1. Sign in as an existing admin
2. Go to `/admin/settings`
3. Use the "User Role Management" section

## Verification

After setting admin role:

1. User signs out completely
2. User signs back in
3. User navigates to `/admin/dashboard`
4. Should see admin dashboard (not "Access Denied" message)

## Related Documentation

- `docs/firebase-admin-setup.md` - Firebase Admin SDK setup
- `docs/admin-portal-readme.md` - Admin portal overview
- `docs/how-to-add-subscribers.md` - How to add subscribers
- `docs/how-to-add-musicians.md` - How to add musicians

