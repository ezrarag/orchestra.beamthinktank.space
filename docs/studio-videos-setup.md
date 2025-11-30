# Studio Videos Setup Guide

This guide explains how to populate videos in the `/studio` page from Firebase Storage.

## Problem

The `/studio` page queries the `projectRehearsalMedia` Firestore collection to display videos. If videos aren't showing up, it's likely because:

1. **No documents exist** in the `projectRehearsalMedia` collection
2. **Firestore rules were blocking access** (now fixed)
3. **Missing required fields** in documents (url, private, date, etc.)
4. **Expired Firebase Storage URLs** (if using download URLs with tokens)

## Solution: Multiple Ways to Add Videos

### Method 1: Admin Interface (Recommended - Easiest!)

**The easiest way is to use the admin interface:**

1. Go to `/admin/studio` (requires admin access)
2. Click "Choose File" and select your video
3. Fill in the form:
   - **Title**: Auto-filled from filename (you can edit it)
   - **Project**: Select which project this belongs to
   - **Date & Time**: When the rehearsal/video was recorded
   - **Instrument Group**: Optional (Strings, Winds, Full Orchestra, etc.)
   - **Private**: Check if this is subscription-only content
4. Click "Upload Video"

**What happens automatically:**
- ✅ Video uploads to Firebase Storage
- ✅ Download URL is generated automatically
- ✅ Firestore document is created in `projectRehearsalMedia` collection
- ✅ Video appears on `/studio` page immediately (for subscribers/admins)

**No manual Firestore entries needed!** Everything is handled automatically.

### Method 2: Use the Script

If you prefer command-line or have existing videos in Storage:

```bash
npx tsx scripts/add-studio-media.ts
```

**How it works:**
- The script reads video URLs from `scripts/add-studio-media.ts`
- Creates Firestore documents in `projectRehearsalMedia` collection
- Automatically skips duplicates

**To add more videos:**
1. Upload videos to Firebase Storage
2. Get the download URL (right-click file → "Get download URL")
3. Edit `scripts/add-studio-media.ts` and add to the `mediaItems` array:

```typescript
{
  title: 'Your Video Title',
  url: 'https://firebasestorage.googleapis.com/...', // Full download URL
  date: '2025-11-10', // YYYY-MM-DD
  time: '17:08', // 24-hour format
  instrumentGroup: 'Full Orchestra' as const,
}
```

4. Run the script again

### Method 3: Firebase Console (Manual)

**Only use this if you need to manually edit existing documents:**

1. Go to Firebase Console → Firestore Database
2. Navigate to `projectRehearsalMedia` collection
3. Click "Add document"
4. Add these fields:

```
projectId: "black-diaspora-symphony" (or "uwm-afro-caribbean-jazz")
title: "Your Video Title"
date: [Timestamp] (click calendar icon, select date/time)
instrumentGroup: "Full Orchestra" (optional)
url: "https://firebasestorage.googleapis.com/..." (full download URL)
thumbnailUrl: "" (optional)
private: false (set to true for subscription-only content)
createdAt: [Timestamp] (current time)
updatedAt: [Timestamp] (current time)
```

### Method 4: Check What's Currently in Firestore

To see what videos are already in the collection:

```bash
npx tsx scripts/check-studio-media.ts
```

This will show:
- All documents in `projectRehearsalMedia`
- Which ones have missing fields
- Which ones are marked as private
- Summary statistics

### Method 4: Use Storage Paths Instead of URLs (Advanced)

If you want to use Firebase Storage paths instead of download URLs (for better security and automatic URL generation), you can:

1. Store `storagePath` instead of `url` in Firestore
2. Use the signed URL API to generate URLs dynamically

**Example document structure:**
```json
{
  "projectId": "black-diaspora-symphony",
  "title": "Video Title",
  "storagePath": "Black Diaspora Symphony/Music/rehearsal footage/video.mov",
  "date": [Timestamp],
  "private": false
}
```

Then update the `/studio` page to fetch signed URLs via `/api/media/signed-url?path=...`

## Required Document Fields

Each document in `projectRehearsalMedia` must have:

- ✅ `projectId` (string): "black-diaspora-symphony" or "uwm-afro-caribbean-jazz"
- ✅ `title` (string): Display title for the video
- ✅ `url` (string): Full Firebase Storage download URL
- ✅ `date` (Timestamp): Date/time of the rehearsal
- ✅ `private` (boolean): `false` for public videos, `true` for subscription-only
- ✅ `createdAt` (Timestamp): When document was created
- ✅ `updatedAt` (Timestamp): When document was last updated

**Optional fields:**
- `description` (string): Additional description
- `instrumentGroup` (string): "Strings", "Winds", "Brass", "Percussion", "Full Orchestra", "Choir", "Rhythm Section", "Other"
- `thumbnailUrl` (string): Preview image URL

## How Videos Are Filtered

The `/studio` page:
1. Queries `projectRehearsalMedia` where `private == false`
2. Orders by `date` descending
3. Filters by `projectFilter` and `groupFilter` (client-side)
4. Only shows videos to authenticated subscribers/admins

## Troubleshooting

### Videos not showing up?

1. **Check Firestore rules** - Make sure `projectRehearsalMedia` collection has read access (already fixed)
2. **Check browser console** - Look for errors in the Network tab or Console
3. **Verify documents exist** - Run `npx tsx scripts/check-studio-media.ts`
4. **Check required fields** - Make sure `url`, `private`, and `date` are set correctly
5. **Check user access** - User must be authenticated and have subscriber/admin role
6. **Check Firestore index** - If you see "index required" error, create the composite index:
   - Collection: `projectRehearsalMedia`
   - Fields: `private` (Ascending), `date` (Descending)

### Video URLs expired?

Firebase Storage download URLs with tokens can expire. Solutions:

1. **Regenerate URLs** - Get new download URLs from Firebase Storage console
2. **Use signed URLs** - Store `storagePath` and generate URLs dynamically via API
3. **Make storage public** - Update storage rules to allow public read (less secure)

### Firestore Index Missing?

If you see this error: "The query requires an index"

1. Click the error link in the browser console (it will take you to Firebase Console)
2. Click "Create Index"
3. Wait for index to build (usually 1-2 minutes)

Or create manually in `firestore.indexes.json`:

```json
{
  "collectionGroup": "projectRehearsalMedia",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "private", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}
```

Then deploy: `firebase deploy --only firestore:indexes`

## Next Steps

1. ✅ Firestore rules updated - videos should now be readable
2. **Use the admin interface**: Go to `/admin/studio` and upload videos directly
3. Or run `npx tsx scripts/check-studio-media.ts` to see current state
4. Check `/studio` page - videos should now appear!

## Quick Start Guide

**For new uploads (recommended):**
1. Sign in as admin
2. Go to `/admin/studio`
3. Upload video file
4. Fill in metadata
5. Click "Upload Video"
6. Done! Video appears on `/studio` page automatically.

**No manual Firestore entries needed!** 🎉

