# Firestore Indexes Required

## eventNotifications Index

**Error:** The query requires an index for `eventNotifications` collection with `email` and `timestamp` fields.

**Index to Create:**
- Collection: `eventNotifications`
- Fields:
  1. `email` (Ascending)
  2. `timestamp` (Descending)

**Quick Fix:**
Click the link in the error message to create the index automatically:
```
https://console.firebase.google.com/v1/r/project/beam-orchestra-platform/firestore/indexes?create_composite=CmJwcm9qZWN0cy9iZWFtLW9yY2hlc3RyYS1wbGF0Zm9ybS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZXZlbnROb3RpZmljYXRpb25zL2luZGV4ZXMvXxABGgkKBWVtYWlsEAEaDQoJdGltZXN0YW1wEAIaDAoIX19uYW1lX18QAg
```

**Manual Creation:**
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `eventNotifications`
4. Add fields:
   - `email` (Ascending)
   - `timestamp` (Descending)
5. Click "Create"

**Note:** The `UserAvatarMenu` component currently queries without `orderBy` and sorts client-side to avoid this index requirement. However, if any other component uses `orderBy('timestamp')` with `where('email', '==', ...)`, this index will be needed.

## projectRehearsalMedia Index

**Recommended Index:**
- Collection: `projectRehearsalMedia`
- Fields:
  1. `projectId` (Ascending)
  2. `date` (Descending)

This index is used by:
- `/studio` page (queries with `where('private', '==', false)` and `orderBy('date', 'desc')`)
- Admin media library (queries with `where('projectId', '==', projectId)` and `orderBy('date', 'desc')`)

**Note:** The admin media library has fallback logic to query without `orderBy` if the index is missing, then sorts client-side.

