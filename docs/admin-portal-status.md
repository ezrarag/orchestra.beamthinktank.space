# 🎼 Admin Portal Status & Enhancement Plan

## ✅ What Already Exists

### 1. **Admin Infrastructure** (Fully Implemented)

- **Admin Layout** (`app/admin/layout.tsx`)
  - Sidebar navigation with Dashboard, Pulse, Projects, Musicians, Attendance, Settings
  - Role-based access control using `useRequireRole('beam_admin')`
  - Mobile-responsive with hamburger menu
  - Access denied page for non-admins

- **Role-Based Access Control**
  - `useUserRole()` hook - checks Firebase custom claims and Firestore user documents
  - `useRequireRole()` hook - enforces role requirements on routes
  - Supports: `beam_admin`, `partner_admin`, `musician`, `audience`
  - Checks both custom claims (preferred) and Firestore fallback

- **Firebase Admin Setup**
  - `lib/firebase-admin.ts` - Admin SDK initialization
  - `verifyAdminRole()` - Verify admin status
  - `setUserRole()` - Set user roles (admin only)
  - Uses Application Default Credentials (no JSON keys needed)

- **Firestore Security Rules**
  - Admin checks in `firestore.rules`
  - `isAdmin()` helper function
  - All admin routes protected

### 2. **Admin Pages** (Partially Implemented)

- **Dashboard** (`app/admin/dashboard/page.tsx`)
  - ✅ UI structure complete
  - ✅ Stats cards layout
  - ❌ Currently uses **mock data** instead of real Firestore data
  - ❌ Missing BDSO-specific metrics (confirmed musicians, attendance count)

- **Musicians Page** (`app/admin/musicians/page.tsx`)
  - ✅ Fetches from Firestore `users` collection
  - ✅ Search functionality
  - ✅ Role-based access control
  - ⚠️ Shows `users` collection, not `projectMusicians` (BDSO roster)

- **Attendance Page** (`app/admin/attendance/page.tsx`)
  - ✅ Fully implemented (we just created this)
  - ✅ Real-time Firestore data
  - ✅ Filter by rehearsal
  - ✅ CSV export
  - ✅ Summary statistics

- **Projects Page** (`app/admin/projects/page.tsx`)
  - ✅ Exists and functional

- **Settings Page** (`app/admin/settings/page.tsx`)
  - ✅ Exists with role protection

### 3. **User Interface Elements**

- **UserMenu Component** (`components/UserMenu.tsx`)
  - ✅ Shows admin badge when user is admin
  - ✅ Admin Dashboard link (visible but disabled for non-admins)
  - ✅ Role display

- **Footer Component** (`components/Footer.tsx`)
  - ❌ **Missing admin link** - needs to be added

## 🔧 What Needs Enhancement

### Priority 1: Dashboard Real Data Integration

**Current Issue:** Dashboard shows mock data instead of real BDSO statistics.

**Enhancement Needed:**
```typescript
// Replace mock data with real Firestore queries:
- Total musicians in projectMusicians (projectId: 'black-diaspora-symphony')
- Confirmed musicians count (status: 'confirmed')
- Total attendance check-ins from attendance collection
- Recent activity (new sign-ups, check-ins)
```

### Priority 2: Footer Admin Link

**Current Issue:** No discreet admin link in footer.

**Enhancement Needed:**
```tsx
// Add to Footer.tsx
{isAdmin && (
  <Link href="/admin/dashboard" className="text-xs text-orchestra-gold/60 hover:text-orchestra-gold">
    Admin
  </Link>
)}
```

### Priority 3: BDSO-Specific Musicians View

**Current Issue:** Musicians page shows all users, not BDSO project musicians.

**Enhancement Needed:**
- Filter by `projectId: 'black-diaspora-symphony'`
- Show instrument, status, source
- Allow editing musician details
- Add/remove musicians from roster

### Priority 4: Admin Documentation

**Current Issue:** No comprehensive admin documentation.

**Enhancement Needed:**
- How to grant admin access
- How to use each admin page
- Security best practices
- Troubleshooting guide

## 📋 Recommended Implementation Plan

### Step 1: Enhance Dashboard with Real Data

Update `app/admin/dashboard/page.tsx` to:
1. Query `projectMusicians` collection for BDSO project
2. Count confirmed vs pending musicians
3. Query `attendance` collection for check-in stats
4. Show recent activity feed

### Step 2: Add Footer Admin Link

Update `components/Footer.tsx` to:
1. Import `useUserRole` hook
2. Conditionally render admin link
3. Style to be discreet (small, subtle)

### Step 3: Create BDSO Musicians Management

Either:
- Add filter to existing musicians page, OR
- Create dedicated `/admin/projects/black-diaspora-symphony/musicians` page

### Step 4: Write Admin Documentation

Create `docs/admin-portal-readme.md` with:
- Setup instructions
- How to grant admin access
- Feature walkthrough
- Security notes

## 🎯 Quick Wins (Can Implement Now)

1. **Footer Admin Link** - 5 minutes
2. **Dashboard Real Data** - 30 minutes
3. **Admin Documentation** - 20 minutes

## 🔐 Admin Access Setup

**Current Method:**
- Uses Firebase Custom Claims (`beam_admin: true` or `role: 'beam_admin'`)
- Set via `scripts/setAdminRole.ts` or Firebase Admin SDK
- User must sign out and back in to refresh token

**To Grant Admin Access:**
```bash
# Option 1: Use the script
ADMIN_EMAIL=dayvin@example.com npx tsx scripts/setAdminRole.ts

# Option 2: Use Firebase Console
# Go to Authentication → Users → Select user → Custom Claims
# Add: { "beam_admin": true }
```

## 📊 Current Admin Portal Structure

```
/admin
├── layout.tsx          ✅ Role-protected layout
├── dashboard/          ⚠️ Needs real data
│   └── page.tsx
├── musicians/          ⚠️ Needs BDSO filter
│   └── page.tsx
├── attendance/         ✅ Complete
│   └── page.tsx
├── projects/           ✅ Exists
│   └── [id]/
│       └── page.tsx
└── settings/           ✅ Exists
    └── page.tsx
```

## 🚀 Next Steps

1. **Enhance Dashboard** - Replace mock data with real Firestore queries
2. **Add Footer Link** - Discreet admin access
3. **BDSO Musicians View** - Project-specific roster management
4. **Documentation** - Complete admin guide

All infrastructure is in place - we just need to connect the data and add a few UI enhancements!

