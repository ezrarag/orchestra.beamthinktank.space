# User Management Guide

This directory contains comprehensive guides for managing different types of users in the BEAM Orchestra platform.

## Quick Links

- **[How to Add Admins](./how-to-add-admins.md)** - Grant admin access to users
- **[How to Add Subscribers](./how-to-add-subscribers.md)** - Grant subscriber access ($5/month)
- **[How to Add Musicians](./how-to-add-musicians.md)** - Add musicians to project rosters

## User Roles Overview

| Role | Access Level | How to Add |
|------|-------------|------------|
| **beam_admin** | Full platform access | [Add Admins Guide](./how-to-add-admins.md) |
| **partner_admin** | Project-specific admin | [Add Admins Guide](./how-to-add-admins.md) |
| **board** | Read-only analytics | [Add Admins Guide](./how-to-add-admins.md) |
| **subscriber** | Subscriber content ($5/month) | [Add Subscribers Guide](./how-to-add-subscribers.md) |
| **musician** | Musician content | [Add Musicians Guide](./how-to-add-musicians.md) |
| **audience** | Public access | Default role |

## Common Prerequisites

**⚠️ Important for all roles:** Users must sign in at least once with Google before you can set their role. The user account must exist in Firebase Authentication.

## Quick Start

### First Time Setup

1. **Set up Firebase Admin SDK** - See [`firebase-admin-setup.md`](./firebase-admin-setup.md)
2. **Create your first admin** - See [How to Add Admins](./how-to-add-admins.md)
3. **Add musicians to projects** - See [How to Add Musicians](./how-to-add-musicians.md)
4. **Set up Stripe for subscribers** - See [How to Add Subscribers](./how-to-add-subscribers.md)

### Common Workflows

**Adding a new admin:**
```bash
# Method 1: Using script (if Firebase Admin SDK is configured)
ADMIN_EMAILS="ezra@beamthink.institute" npx tsx scripts/setMultipleAdmins.ts

# Method 2: Using Admin Settings page (if you already have admin access)
# Go to /admin/settings → User Role Management
```

**Adding a subscriber:**
```bash
# Method 1: User subscribes via Stripe (automatic)
# User visits /subscribe and completes checkout

# Method 2: Manual (for testing)
npx tsx scripts/setSubscriber.ts ezra@beamthink.institute
```

**Adding a musician:**
```bash
# Method 1: Via Admin Dashboard
# Go to /admin/dashboard → Add Musician or Scan Gmail

# Method 2: Via Project Page
# Go to /admin/projects/[projectId] → Add Musician
```

## Troubleshooting

### "User not found" Error

- User must sign in at least once with Google first
- Check email address is correct
- Verify user exists in Firebase Console → Authentication → Users

### Role Not Working After Setting

- User must sign out and sign back in to refresh ID token
- Clear browser cache and cookies
- Check Firebase Console → Authentication → Users → Custom Claims

### Can't Access Admin Pages

- Verify admin role was set correctly
- User must sign out and back in after role is set
- Check Firebase Admin SDK is configured (for scripts)

## Related Documentation

- [`firebase-admin-setup.md`](./firebase-admin-setup.md) - Firebase Admin SDK setup
- [`admin-portal-readme.md`](./admin-portal-readme.md) - Admin portal overview
- [`subscription-access.md`](./subscription-access.md) - Subscription system details
- [`admin-portal-status.md`](./admin-portal-status.md) - Current implementation status

## Support

For issues or questions:
- Check the specific guide for your use case
- Review Firebase Console logs
- Check browser console for errors
- Verify Firestore rules are deployed

