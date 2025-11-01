# Firestore Rules Update Required

## Critical: Deploy Updated Firestore Rules

The roster page requires **public read access** to the `projectMusicians` collection. The rules have been updated in `firestore.rules`, but you need to **deploy them** to Firebase.

### Quick Deploy

```bash
# If using Firebase CLI
firebase deploy --only firestore:rules

# Or deploy via Firebase Console:
# 1. Go to Firebase Console → Firestore Database → Rules
# 2. Copy the updated rules from firestore.rules
# 3. Click "Publish"
```

### Updated Rule (Lines 67-81 in firestore.rules)

```javascript
// Project Musicians - Public read for project pages, write requires admin
match /projectMusicians/{pmId} {
  // Allow public read access (for roster pages)
  allow read: if true;
  
  // Admins can write
  allow write: if isAdmin();
  
  // Allow partner admins to write project musicians for their projects
  allow write: if isPartnerAdmin() && 
    resource.data.projectId in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.organizationId == request.auth.token.organizationId;
  
  // Allow musicians to update their own project musician entry
  allow update: if isAuthenticated() && resource.data.musicianId == request.auth.uid;
}
```

### Why This Change?

The roster page needs to display musicians to **all visitors** (even unauthenticated users), so public read access is required. Write operations still require admin authentication.

---

**After deploying these rules, refresh the roster page and you should see the musicians load successfully!**

