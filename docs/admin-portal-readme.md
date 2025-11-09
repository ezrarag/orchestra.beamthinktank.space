# 🎼 BDSO Admin Portal

## Overview

The Admin Portal allows authorized staff (Ezra, Dayvin, Dayvin's mom, etc.) to view and manage the Black Diaspora Symphony Orchestra's roster, attendance, and content.

## Access

1. **Admins must log in with Google** (Firebase Auth).

2. **Admin status is stored in Firebase Custom Claims** as `beam_admin: true` or `role: 'beam_admin'`.

3. **Non-admins attempting to visit `/admin/*`** will be redirected with an "Access Denied" message.

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

### Method 1: Using the Script (Recommended)

```bash
# Set ADMIN_EMAIL environment variable
ADMIN_EMAIL=dayvin@example.com npx tsx scripts/setAdminRole.ts

# Or edit scripts/setAdminRole.ts directly and set the email
```

**Important:** After running the script, the user must **sign out and sign back in** to refresh their ID token with the new admin claims.

### Method 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Authentication** → **Users**
3. Find the user you want to make admin
4. Click on the user → **Custom Claims** tab
5. Add custom claim:
   ```json
   {
     "beam_admin": true,
     "role": "beam_admin"
   }
   ```
6. Save changes

### Method 3: Using Firebase Admin SDK

```typescript
import { setUserRole } from '@/lib/firebase-admin'

// Get user UID first, then:
await setUserRole('user_uid', 'beam_admin')
```

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

### `/admin/settings`
- System configuration
- Metadata management

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
1. User doesn't have admin role set
2. User needs to sign out and back in to refresh token
3. Custom claims not properly set

**Solution:**
1. Verify admin role in Firebase Console → Authentication → Users → Custom Claims
2. Have user sign out completely and sign back in
3. Re-run the admin role script if needed

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

**Solution:**
1. Follow setup in `docs/firebase-admin-setup.md`
2. Run `gcloud auth application-default login`
3. Verify service account has `roles/firebase.admin`

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

