# How to Add Musicians

This guide explains how to add musicians to projects in the BEAM Orchestra platform. Musicians are added to the `projectMusicians` collection in Firestore.

## Prerequisites

- Admin access to the platform (see `docs/how-to-add-admins.md`)
- User must have signed in at least once with Google (if adding via email)

## Methods to Add Musicians

### Method 1: Using Admin Dashboard (Easiest - Recommended)

1. **Sign in** as an admin
2. Navigate to **Admin → Dashboard** (`/admin/dashboard`)
3. **Option A: Add from Gmail Scan**
   - Click "Connect Google Account" (if not connected)
   - Click "Scan Gmail for Musicians"
   - Review results in modal
   - Click "Add to Roster" for each musician
   
4. **Option B: Add Manually**
   - Use the "Add Musician" button (if available)
   - Fill in musician details:
     - Name (required)
     - Email (optional but recommended)
     - Phone (optional)
     - Instrument
     - Status: `pending`, `confirmed`, or `interested`
     - Notes (optional)
     - Source: e.g., "Manual Entry", "Gmail", "Audition"

### Method 2: Using Project Detail Page

1. **Sign in** as an admin
2. Navigate to **Admin → Projects** (`/admin/projects`)
3. Click on a project (e.g., "Black Diaspora Symphony Orchestra")
4. Click **"Add Musician"** button
5. Fill in the form:
   - Name (required)
   - Email (optional)
   - Phone (optional)
   - Instrument
   - Status: `pending`, `confirmed`, or `interested`
   - Notes (optional)
   - Source
6. Click **"Add Musician"**

### Method 3: Using Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database**
4. Go to `projectMusicians` collection
5. Click **"Add Document"**
6. Set document ID (format: `{email_or_name}_{projectId}`)
   - Example: `ezra_beamthink_institute_black-diaspora-symphony`
7. Add fields:
   ```json
   {
     "projectId": "black-diaspora-symphony",
     "name": "Ezra Haugabrook",
     "email": "ezra@beamthink.institute",
     "phone": "+1234567890",
     "instrument": "Violin",
     "status": "confirmed",
     "role": "musician",
     "source": "Manual Entry",
     "joinedAt": "2024-01-15T00:00:00Z",
     "updatedAt": "2024-01-15T00:00:00Z"
   }
   ```
8. Save document

### Method 4: Using Import Script (Bulk Import)

For importing from Google Sheets or CSV:

1. **Prepare your data** in Google Sheets or CSV format with columns:
   - Name (required)
   - Email (optional)
   - Phone (optional)
   - Instrument
   - Status
   - Notes (optional)

2. **Run import script:**
   ```bash
   npx tsx scripts/import-sheets-to-firestore.ts
   ```
   
   Or use the migration script:
   ```bash
   npx tsx scripts/migrate-roster-data.ts
   ```

**Note:** Check script files for required format and configuration.

### Method 5: Using Admin Settings - Roster Sync

1. **Sign in** as an admin
2. Navigate to **Admin → Settings** (`/admin/settings`)
3. Scroll to **"Roster Data Sync"** section
4. Click **"Sync Roster Data"**
5. This syncs data from `data.ts` to Firestore `projectMusicians` collection

## Musician Data Structure

Musicians are stored in the `projectMusicians` collection with this structure:

```typescript
{
  projectId: string,           // e.g., "black-diaspora-symphony"
  name: string,                 // Required
  email: string | null,         // Optional but recommended
  phone: string | null,         // Optional
  instrument: string,           // e.g., "Violin", "Cello", "Flute"
  status: string,              // "confirmed", "pending", "interested", "open"
  role: string,                // Usually "musician"
  notes: string | null,         // Optional notes
  source: string,              // e.g., "Manual Entry", "Gmail", "Audition"
  joinedAt: Timestamp,         // When added to roster
  updatedAt: Timestamp         // Last update time
}
```

## Document ID Format

Document IDs follow this pattern:
```
{email_or_name_normalized}_{projectId}
```

Examples:
- `ezra_beamthink_institute_black-diaspora-symphony` (from email)
- `john_doe_black-diaspora-symphony` (from name)

The system automatically normalizes emails/names by:
- Converting to lowercase
- Replacing special characters with underscores
- Removing spaces

## Musician Status Values

- **`confirmed`**: Musician is confirmed for the project
- **`pending`**: Awaiting confirmation
- **`interested`**: Expressed interest but not confirmed
- **`open`**: Position is open (no musician assigned)

## Musician Roles

- **`musician`**: Standard musician role (most common)
- **`board`**: Board member (read-only analytics access)

## Important Notes

1. **Email vs Name**: If email is provided, use email for document ID. Otherwise, use name.

2. **Project ID**: Must match an existing project ID. Common project IDs:
   - `black-diaspora-symphony` (Black Diaspora Symphony Orchestra)
   - `atlanta-spring-concert` (Atlanta Spring Concert)

3. **Duplicate Prevention**: The system uses email/name + projectId to prevent duplicates. Adding the same musician twice will update the existing document.

4. **User Account Not Required**: Musicians can be added to the roster even if they haven't signed in yet. However, they'll need to sign in to access musician-only content.

## Bulk Operations

### Adding Multiple Musicians

**Using Admin Dashboard:**
- Scan Gmail and add multiple musicians at once
- Each musician is added individually via the modal

**Using Import Script:**
- Prepare CSV or Google Sheets file
- Run import script to bulk import
- See `scripts/import-sheets-to-firestore.ts` for details

### Updating Musician Status

1. Go to **Admin → Projects → [Project Name]**
2. Find musician in the roster list
3. Click to edit (if edit functionality available)
4. Update status field
5. Save changes

Or update directly in Firebase Console:
1. Go to Firestore Database
2. Find `projectMusicians/{musicianId}`
3. Edit `status` field
4. Save

## Troubleshooting

### "Permission Denied" Error

- Make sure you're signed in as an admin
- Check Firebase Admin SDK is configured
- Verify Firestore security rules allow admin writes

### Musician Not Appearing

- Check that `projectId` matches exactly
- Verify document was created in `projectMusicians` collection
- Refresh the page
- Check browser console for errors

### Duplicate Musicians

- The system should prevent duplicates based on email/name + projectId
- If duplicates exist, manually delete one in Firebase Console
- Use consistent email format to avoid duplicates

### Import Script Errors

- Verify data format matches expected structure
- Check that projectId is correct
- Ensure Firebase Admin SDK is configured
- Check script logs for specific errors

## Verification

After adding a musician:

1. Go to **Admin → Projects → [Project Name]**
2. Check roster list for the musician
3. Verify all fields are correct
4. Check Firestore Console → `projectMusicians` collection
5. Document should exist with correct data

## Related Documentation

- `docs/how-to-add-admins.md` - How to add admins
- `docs/how-to-add-subscribers.md` - How to add subscribers
- `docs/admin-portal-readme.md` - Admin portal overview
- `docs/firebase-admin-setup.md` - Firebase Admin SDK setup

