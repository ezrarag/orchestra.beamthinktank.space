# Access Control Audit

This document provides a comprehensive audit of where content is accessible for different user roles across the BEAM Orchestra platform.

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **beam_admin** | Full platform administrator | Highest - all access |
| **partner_admin** | Project-specific administrator | High - project admin access |
| **board** | Board member (read-only) | Medium - read-only analytics |
| **musician** | Confirmed orchestra musician | Medium - musician content |
| **subscriber** | Paid community member ($5/month) | Low - subscriber content |
| **public/guest** | Unauthenticated visitor | Lowest - public content only |

## Access Hierarchy

```
beam_admin > partner_admin > board > musician > subscriber > public
```

Higher roles automatically inherit access from lower roles.

---

## Media Library (`/projects/[id]/media`)

### Access Control Logic

Media items can have **multiple access levels** (array):
- `['musician']` - Only musicians and above
- `['subscriber']` - Subscribers and above
- `['public']` - Everyone
- `['musician', 'subscriber']` - Both musicians AND subscribers
- `['subscriber', 'public']` - Both subscribers AND public
- `['musician', 'subscriber', 'public']` - All three groups

### Who Can See What

| User Role | Can See Media With Access Level |
|-----------|--------------------------------|
| **beam_admin** | All media (musician, subscriber, public) |
| **partner_admin** | All media (musician, subscriber, public) |
| **board** | All media (musician, subscriber, public) |
| **musician** | All media (musician, subscriber, public) |
| **subscriber** | Media with `subscriber` OR `public` access |
| **public/guest** | Only media with `public` access |

### Examples

1. **Media with `access: ['musician']`**
   - ✅ Visible to: beam_admin, partner_admin, board, musician
   - ❌ Not visible to: subscriber, public

2. **Media with `access: ['subscriber']`**
   - ✅ Visible to: beam_admin, partner_admin, board, musician, subscriber
   - ❌ Not visible to: public

3. **Media with `access: ['public']`**
   - ✅ Visible to: Everyone

4. **Media with `access: ['musician', 'subscriber']`**
   - ✅ Visible to: beam_admin, partner_admin, board, musician, subscriber
   - ❌ Not visible to: public

5. **Media with `access: ['subscriber', 'public']`**
   - ✅ Visible to: Everyone except public guests (but public guests see teaser)

---

## Admin Media Management (`/admin/projects/[id]/media`)

### Who Can Access

| User Role | Can Access Admin Media Page |
|-----------|----------------------------|
| **beam_admin** | ✅ Yes - Full access |
| **partner_admin** | ✅ Yes - Full access to their project |
| **board** | ❌ No - Read-only, no media management |
| **musician** | ❌ No |
| **subscriber** | ❌ No |
| **public** | ❌ No |

### What Admins Can Do

- ✅ Upload files to Firebase Storage
- ✅ Add media via external URL
- ✅ Set multiple access levels (checkboxes)
- ✅ Edit media metadata
- ✅ Delete media items
- ✅ View all media regardless of access level

---

## Board Dashboard (`/admin/board`)

### Who Can Access

| User Role | Can Access Board Dashboard |
|-----------|---------------------------|
| **beam_admin** | ✅ Yes |
| **partner_admin** | ✅ Yes |
| **board** | ✅ Yes - Read-only |
| **musician** | ❌ No |
| **subscriber** | ❌ No |
| **public** | ❌ No |

### What Board Members Can See

- ✅ Total registered musicians
- ✅ Instrument breakdown (needed vs confirmed vs checked-in)
- ✅ Attendance summary
- ✅ Budget summary
- ❌ Cannot edit roster
- ❌ Cannot add/remove musicians
- ❌ Cannot modify project settings

---

## Project Board View (`/admin/projects/[id]/board`)

### Who Can Access

| User Role | Can Access Project Board View |
|-----------|-----------------------------|
| **beam_admin** | ✅ Yes |
| **partner_admin** | ✅ Yes |
| **board** | ✅ Yes - Read-only |
| **musician** | ❌ No |
| **subscriber** | ❌ No |
| **public** | ❌ No |

### What They Can See

Same as board dashboard, but filtered to specific project.

---

## Check-In System (`/checkin`)

### Who Can Access

| User Role | Can Check In |
|-----------|--------------|
| **beam_admin** | ✅ Yes |
| **partner_admin** | ✅ Yes |
| **board** | ✅ Yes |
| **musician** | ✅ Yes |
| **subscriber** | ✅ Yes |
| **public** | ✅ Yes (after signing in) |

### Authentication Required

- ✅ Must sign in (Google, Email, or SMS)
- ✅ Any authenticated user can check in
- ✅ No role restrictions for check-in

---

## Project Detail Pages (`/training/contract-projects/black-diaspora-symphony`)

### Who Can Access

| User Role | Can View Project Page |
|-----------|----------------------|
| **beam_admin** | ✅ Yes |
| **partner_admin** | ✅ Yes |
| **board** | ✅ Yes |
| **musician** | ✅ Yes |
| **subscriber** | ✅ Yes |
| **public** | ✅ Yes |

### What They Can See

- ✅ Public project information
- ✅ Roster visualization (public data)
- ✅ Rehearsal schedule
- ✅ FAQ section
- ✅ Public media (if any)

---

## Admin Dashboard (`/admin/dashboard`)

### Who Can Access

| User Role | Can Access Admin Dashboard |
|-----------|--------------------------|
| **beam_admin** | ✅ Yes - Full access |
| **partner_admin** | ✅ Yes - Limited to their project |
| **board** | ❌ No |
| **musician** | ❌ No |
| **subscriber** | ❌ No |
| **public** | ❌ No |

---

## Project Management (`/admin/projects/[id]`)

### Who Can Access

| User Role | Can Access Project Management |
|-----------|------------------------------|
| **beam_admin** | ✅ Yes - All projects |
| **partner_admin** | ✅ Yes - Only their assigned project |
| **board** | ❌ No |
| **musician** | ❌ No |
| **subscriber** | ❌ No |
| **public** | ❌ No |

### What They Can Do

- ✅ View project details
- ✅ Manage musicians roster
- ✅ View analytics
- ✅ Manage media library
- ✅ Send invites
- ✅ View board dashboard

---

## Firestore Collections Access

### `projectMedia` Collection

| User Role | Read Access | Write Access |
|-----------|------------|--------------|
| **beam_admin** | ✅ All | ✅ All |
| **partner_admin** | ✅ All (in their project) | ✅ All (in their project) |
| **board** | ✅ All (in their project) | ❌ None |
| **musician** | ✅ Filtered by access | ❌ None |
| **subscriber** | ✅ Filtered by access | ❌ None |
| **public** | ✅ Filtered by access | ❌ None |

**Filtering Logic:**
- Users see media where their role matches ANY access level in the `access` array
- Example: If `access: ['musician', 'subscriber']`, both musicians and subscribers can see it

### `projectMusicians` Collection

| User Role | Read Access | Write Access |
|-----------|------------|--------------|
| **beam_admin** | ✅ All | ✅ All |
| **partner_admin** | ✅ Their project | ✅ Their project |
| **board** | ✅ Their project | ❌ None |
| **musician** | ✅ Public read | ✅ Own profile updates |
| **subscriber** | ✅ Public read | ❌ None |
| **public** | ✅ Public read | ❌ None |

### `attendance` Collection

| User Role | Read Access | Write Access |
|-----------|------------|--------------|
| **beam_admin** | ✅ All | ✅ All |
| **partner_admin** | ✅ Their project | ✅ Their project |
| **board** | ✅ Their project | ❌ None |
| **musician** | ✅ Own check-ins | ✅ Own check-ins |
| **subscriber** | ✅ Own check-ins | ✅ Own check-ins |
| **public** | ✅ Own check-ins (after sign-in) | ✅ Own check-ins (after sign-in) |

### `subscriptions` Collection

| User Role | Read Access | Write Access |
|-----------|------------|--------------|
| **beam_admin** | ✅ All | ❌ None (webhook only) |
| **partner_admin** | ❌ None | ❌ None |
| **board** | ❌ None | ❌ None |
| **musician** | ✅ Own subscription | ❌ None |
| **subscriber** | ✅ Own subscription | ❌ None |
| **public** | ❌ None | ❌ None |

---

## Summary Tables

### Media Access Matrix

| Media Access Level | beam_admin | partner_admin | board | musician | subscriber | public |
|-------------------|------------|---------------|-------|----------|------------|--------|
| `['musician']` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `['subscriber']` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `['public']` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `['musician', 'subscriber']` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `['subscriber', 'public']` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `['musician', 'subscriber', 'public']` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Page Access Matrix

| Page | beam_admin | partner_admin | board | musician | subscriber | public |
|------|------------|---------------|-------|----------|------------|--------|
| `/projects/[id]/media` | ✅ All | ✅ All | ✅ All | ✅ All | ✅ Filtered | ✅ Filtered |
| `/admin/projects/[id]/media` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/board` | ✅ | ✅ | ✅ (read-only) | ❌ | ❌ | ❌ |
| `/admin/projects/[id]/board` | ✅ | ✅ | ✅ (read-only) | ❌ | ❌ | ❌ |
| `/admin/dashboard` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/projects/[id]` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/checkin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (after sign-in) |
| `/projects/[id]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Key Points

1. **Multiple Access Levels**: Media can have multiple access levels simultaneously (e.g., `['musician', 'subscriber']` means both groups can access)

2. **Inheritance**: Higher roles automatically get access to content for lower roles:
   - Musicians can see subscriber content
   - Subscribers can see public content
   - Admins can see everything

3. **Board Members**: Have read-only access to analytics and media viewing, but cannot manage content

4. **Public Content**: Always visible to everyone, regardless of authentication status

5. **Subscriber Content**: Requires active subscription (`subscriber: true` in Firestore)

6. **Musician Content**: Requires musician role or higher (admin, board, partner_admin)

---

## Testing Checklist

- [ ] Upload media with `['musician']` access - verify only musicians+ can see
- [ ] Upload media with `['subscriber']` access - verify subscribers+ can see
- [ ] Upload media with `['public']` access - verify everyone can see
- [ ] Upload media with `['musician', 'subscriber']` - verify both groups can see
- [ ] Test board member access - should see all media but cannot edit
- [ ] Test subscriber access - should see subscriber and public media
- [ ] Test public access - should only see public media + teasers
- [ ] Test URL upload vs file upload - both should work
- [ ] Test multiple access level selection in admin panel

