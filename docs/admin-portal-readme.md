# 🎼 BDSO Admin Portal

## Overview

The Admin Portal allows authorized staff (Ezra, Dayvin, Dayvin's mom, etc.) to view and manage the Black Diaspora Symphony Orchestra's roster, attendance, and content.

## Access

1. **Admins must log in with Google** (Firebase Auth).

2. **Admin status is stored in Firebase Authentication Custom Claims** as `beam_admin: true` or `role: 'beam_admin'`. These claims are set using the **Firebase Admin SDK** (not through the Firebase Console UI).

3. **Non-admins attempting to visit `/admin/*`** will be redirected with an "Access Denied" message.

4. **Board members** have read-only access to analytics dashboards via `/admin/board` and `/admin/projects/[id]/board`.

## Dashboard

The admin dashboard (`/admin/dashboard`) provides:

- **BDSO Statistics:**
  - Total musicians in the project
  - Confirmed musicians count
  - Pending/interested musicians count
  - Total attendance check-ins

- **Quick Links:**
  - `/admin/attendance` - Review attendance logs
  - `/admin/musicians` - Manage roster entries
  - `/admin/projects` - View all projects
  - `/admin/settings` - System settings

## How to Grant Admin Access

**Important:** Admin roles are granted using **Firebase Authentication Custom Claims**, which must be set using the Firebase Admin SDK. Custom claims cannot be set directly through the Firebase Console UI - they require server-side code with admin privileges.

### Method 1: Using the Admin Settings Page (Easiest - Requires Existing Admin)

If you already have an admin account:

1. **Sign in** to the admin portal with an existing admin account
2. Navigate to **Admin → Settings** (`/admin/settings`)
3. Scroll to the **"User Role Management"** section
4. Enter the user's email address
5. Select **"Beam Admin"** from the role dropdown
6. Click **"Set User Role"**
7. The user must **sign out and sign back in** to refresh their ID token

### Method 2: Using the Script (Recommended for First Admin or Multiple Users)

Use the `setMultipleAdmins.ts` script to set admin roles for one or more users:

```bash
# Set multiple admins at once
ADMIN_EMAILS="ezra@readyaimgo.biz,dayvin@example.com" npx tsx scripts/setMultipleAdmins.ts

# Or set a single admin
ADMIN_EMAIL=dayvin@example.com npx tsx scripts/setAdminRole.ts
```

**Prerequisites:**
- Firebase Admin SDK must be configured (see `docs/firebase-admin-setup.md`)
- User must have signed in at least once with Google to create their Firebase Auth account
- Run `gcloud auth application-default login` if using Application Default Credentials

**Important:** After running the script, the user must **sign out and sign back in** to refresh their ID token with the new admin claims.

### Method 3: Using Firebase Admin SDK Programmatically

If you're building custom tooling or need to set roles programmatically:

```typescript
import { getAuth } from 'firebase-admin/auth'

const auth = getAuth()
const user = await auth.getUserByEmail('user@example.com')

// Preserve existing claims and add admin role
const existing = (user.customClaims || {}) as Record<string, unknown>
await auth.setCustomUserClaims(user.uid, {
  ...existing,
  beam_admin: true,
  role: 'beam_admin',
})
```

**Note:** This requires Firebase Admin SDK to be initialized with proper credentials.

## How to Grant Board Access

Board members have read-only access to analytics dashboards. They cannot edit roster data or make changes.

**Important:** Board roles are granted using **Firebase Authentication Custom Claims**, which must be set using the Firebase Admin SDK. Custom claims cannot be set directly through the Firebase Console UI.

### Method 1: Using the Admin Settings Page (Easiest - Requires Existing Admin)

1. **Sign in** to the admin portal with an existing admin account
2. Navigate to **Admin → Settings** (`/admin/settings`)
3. Scroll to the **"User Role Management"** section
4. Enter the user's email address
5. Select **"Board"** from the role dropdown
6. Click **"Set User Role"**
7. The user must **sign out and sign back in** to refresh their ID token

### Method 2: Using Firebase Admin SDK

You can create a script similar to `setAdminRole.ts` but for board members:

```typescript
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
})

const email = process.env.USER_EMAIL || 'user@example.com'
const user = await getAuth().getUserByEmail(email)

const existing = (user.customClaims || {}) as Record<string, unknown>
await getAuth().setCustomUserClaims(user.uid, {
  ...existing,
  role: 'board',
  board: true,
})
```

Or use the Admin Settings page API endpoint programmatically (requires admin authentication).

**Important:** After setting board role, the user must **sign out and sign back in** to refresh their ID token.

### What Board Members Can See

- **Board Dashboard** (`/admin/board`):
  - Total registered musicians
  - Breakdown by instrument (needed vs confirmed vs checked-in)
  - Attendance summary (total check-ins, transportation requests)
  - Budget summary (total budget, projected payouts)

- **Project Board View** (`/admin/projects/[id]/board`):
  - Project-specific analytics
  - Same metrics as board dashboard, filtered by project

### What Board Members Cannot Do

- ❌ Add, edit, or delete musicians
- ❌ Modify roster data
- ❌ Access admin-only pages (dashboard, settings, etc.)
- ❌ Export or modify data
- ✅ Read-only access to analytics only

## Admin Pages

### `/admin/dashboard`
- Overview of BDSO statistics
- Real-time data from Firestore
- Quick access to all admin features

### `/admin/musicians`
- View all musicians in the BEAM ecosystem
- Search by name or email
- Currently shows `users` collection (can be filtered by project)

### `/admin/attendance`
- View all rehearsal check-ins
- Filter by rehearsal date
- Export to CSV
- Summary statistics

### `/admin/projects`
- Manage all BEAM projects
- View project details
- Manage project invites

### `/admin/board`
- Read-only board dashboard for stakeholders
- Shows analytics: registered musicians, instrument breakdown, attendance, budget
- Accessible to board members, partner admins, and beam admins
- Board members see read-only badge

### `/admin/projects/[id]/board`
- Project-specific board view
- Same analytics as board dashboard, filtered by project
- Read-only access for board members

### `/admin/checkin-test`
- Admin-only utility for testing QR check-in functionality
- Generate QR codes for upcoming rehearsals
- Test check-in with different authentication methods
- Verify Firestore writes are working correctly

## Security

### Firestore Rules

All admin routes are protected by Firestore security rules:

```javascript
function isAdmin() {
  return isAuthenticated() && request.auth.token.role == 'beam_admin';
}
```

### Route Protection

All `/admin/*` routes use the `useRequireRole('beam_admin')` hook which:
- Checks Firebase custom claims
- Falls back to Firestore user document
- Redirects non-admins with access denied message

### Best Practices

1. **Never share admin credentials**
2. **Use strong passwords** for Google accounts
3. **Review admin access regularly** - remove access when no longer needed
4. **Use the discreet footer link** - don't publicly advertise admin routes
5. **Monitor Firestore access logs** in Firebase Console

## Discreet Access Link

An **"Admin"** link appears in the footer **only when an admin is logged in**.

The link is styled to be subtle:
- Small text (`text-xs`)
- Low opacity (`text-orchestra-gold/60`)
- Only visible to admins

Example:
```tsx
{isAdmin && (
  <Link href="/admin/dashboard" className="text-xs text-orchestra-gold/60 hover:text-orchestra-gold">
    Admin
  </Link>
)}
```

## Troubleshooting

### "Access Denied" Message

**Possible causes:**
1. User doesn't have admin role set via custom claims
2. User needs to sign out and back in to refresh token
3. Custom claims not properly set using Admin SDK

**Solution:**
1. Verify admin role was set using one of the methods above (Admin Settings page, script, or Admin SDK)
2. Note: You cannot verify custom claims in Firebase Console UI - they're only visible in ID tokens
3. Have user sign out completely and sign back in to refresh their ID token
4. Re-run the admin role script or use Admin Settings page if needed
5. Check that Firebase Admin SDK is properly configured if using scripts

### Dashboard Shows Zero Data

**Possible causes:**
1. Firestore not initialized
2. No data in `projectMusicians` collection
3. Network/permission issues

**Solution:**
1. Check Firebase configuration in `.env.local`
2. Verify data exists in Firestore Console
3. Check browser console for errors
4. Ensure Firestore rules allow admin read access

### Can't Set Admin Role

**Possible causes:**
1. Firebase Admin SDK not configured
2. Missing service account credentials
3. Insufficient permissions
4. User hasn't signed in yet (account doesn't exist in Firebase Auth)

**Solution:**
1. Ensure the user has signed in at least once with Google to create their Firebase Auth account
2. Follow setup in `docs/firebase-admin-setup.md` to configure Admin SDK
3. Run `gcloud auth application-default login` if using Application Default Credentials
4. Verify service account has `roles/firebase.admin` role
5. If using scripts, ensure environment variables are set correctly
6. Use the Admin Settings page (`/admin/settings`) if you already have an admin account

## Managing Roster Data

### Adding Musicians

Currently, musicians are added via:
1. **Migration script** - Syncs from `data.ts` to Firestore
2. **Manual entry** - Through Firebase Console
3. **User sign-up** - When musicians create profiles

### Updating Musician Status

1. Go to `/admin/musicians` (or Firebase Console)
2. Find the musician
3. Update the `status` field:
   - `confirmed` - Musician is confirmed for the project
   - `pending` - Awaiting confirmation
   - `interested` - Expressed interest
   - `open` - Position open

### Syncing from data.ts

Run the migration script to sync roster data:

```bash
npx tsx scripts/migrate-roster-data.ts
```

**Note:** Requires Firebase Admin credentials to be configured.

## Next Steps

1. **Configure Firebase Admin credentials** (see `docs/firebase-admin-setup.md`)
2. **Set admin roles** for Ezra, Dayvin, and Dayvin's mom
3. **Test admin access** - Sign in and verify dashboard loads
4. **Review Firestore rules** - Ensure they're deployed
5. **Train admins** - Show them how to use each page

## Support

For issues or questions:
- Check `docs/admin-portal-status.md` for current implementation status
- Review Firebase Console logs
- Check browser console for errors
- Verify Firestore rules are deployed

---

**Last Updated:** Based on current codebase implementation
**Status:** ✅ Core functionality implemented, ready for credential setup

