# Photo Upload Implementation

## Overview
Photos uploaded or taken in the MusicianProfileModal are now saved to Firebase Storage and linked to the user's profile.

## Where Photos Are Stored

### 1. Firebase Storage
**Path**: `musician-profiles/{filename}`
- **Uploaded files**: `profile_{userId}_{timestamp}.{extension}`
- **Camera photos**: `profile_{userId}_{timestamp}.png`

**Example**: `musician-profiles/profile_abc123xyz_1704067200000.png`

### 2. Firestore Database
**Collection**: `users`
**Document**: `{userId}`
**Field**: `headshotUrl` (contains the Firebase Storage download URL)

**Example Document**:
```json
{
  "uid": "abc123xyz",
  "email": "musician@example.com",
  "headshotUrl": "https://firebasestorage.googleapis.com/.../profile_abc123xyz_1704067200000.png",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

## Upload Flow

### For File Uploads:
1. User selects a file
2. File is uploaded to Firebase Storage at `musician-profiles/`
3. Download URL is retrieved
4. URL is saved to user's Firestore document
5. Profile picture displays automatically

### For Camera Capture:
1. User takes a photo
2. Photo is captured from camera as canvas image
3. Canvas is converted to PNG blob
4. Blob is uploaded to Firebase Storage
5. Download URL is retrieved
6. URL is saved to user's Firestore document
7. Profile picture displays automatically

## Security Rules Required

You'll need to add Firebase Security Rules to allow uploads:

### Firebase Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /musician-profiles/{userId}/{fileName} {
      // Allow authenticated users to upload their own photos
      allow write: if request.auth != null && fileName.matches('profile_' + request.auth.uid + '_.*');
      // Allow public read access
      allow read: if true;
    }
  }
}
```

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow users to update their own profile
      allow update: if request.auth != null && request.auth.uid == userId;
      // Allow read access to profile data
      allow read: if true;
    }
  }
}
```

## Features
- ✅ Automatic file naming with user ID and timestamp
- ✅ Unique filenames prevent overwrites
- ✅ Both upload and camera capture supported
- ✅ URL stored in Firestore for easy retrieval
- ✅ Error handling with user feedback
- ✅ Loading states during upload

## Next Steps
1. Deploy Firebase Storage security rules
2. Deploy Firestore security rules
3. Test upload functionality
4. Optionally add progress indicators
5. Add success/error toast notifications

