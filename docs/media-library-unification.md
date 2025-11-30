# Media Library Unification

## Overview

All media libraries now use the same Firestore collection: `projectRehearsalMedia`

This ensures consistency across:
- `/studio` page (rehearsal gallery)
- Admin media library (`/admin/projects/[id]/media`)
- Partner admin media library

## Collection Structure

**Collection:** `projectRehearsalMedia`

**Document Structure:**
```typescript
{
  projectId: string                    // e.g., "black-diaspora-symphony"
  title: string                       // Display title
  description?: string                 // Optional description
  date: Timestamp                     // Date of rehearsal/performance
  url: string                         // Firebase Storage download URL or external URL
  thumbnailUrl?: string               // Optional thumbnail image URL
  private: boolean                    // false = public, true = subscription-only
  instrumentGroup?: string            // Optional: "Strings", "Winds", "Brass", etc.
  createdAt: Timestamp               // When document was created
  updatedAt: Timestamp                // When document was last updated
  uploadedBy?: string                 // User email or UID
}
```

## Access Control

- **`private: false`** - Visible to all subscribers and admins (public)
- **`private: true`** - Only visible to musicians, board members, and admins (subscription-only)

## Query Patterns

### Studio Page (`/studio`)
```typescript
query(
  collection(db, 'projectRehearsalMedia'),
  where('private', '==', false),
  orderBy('date', 'desc')
)
```

### Admin Media Library (`/admin/projects/[id]/media`)
```typescript
query(
  collection(db, 'projectRehearsalMedia'),
  where('projectId', '==', projectId),
  orderBy('date', 'desc')
)
```

## Migration Notes

Previously, the admin media library used `projectMedia` collection with a different structure:
- Used `downloadURL` instead of `url`
- Used `uploadedAt` instead of `date`
- Used `access` array instead of `private` boolean

**All admin media operations now use `projectRehearsalMedia`** with the unified structure.

## Benefits

1. **Single Source of Truth** - All media in one collection
2. **Consistent Access Control** - Same `private` field logic everywhere
3. **Easier Maintenance** - One collection to manage
4. **Better Performance** - Fewer collections to query

