# Firebase Storage Security Rules - Places

This document describes the security rules for Firebase Storage used in SMARTDCABIAO.

## Storage Rules

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Check if user is admin by looking up Firestore
    function isAdmin() {
      return isSignedIn() && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ========================================
    // PLACE IMAGES
    // ========================================
    
    // Places images: public read, admin-only write/delete
    match /places/{type}/{placeId}/{fileName} {
      allow read: if true;
      allow write: if isAdmin() && 
        request.resource.size < 5 * 1024 * 1024 && // Max 5MB
        request.resource.contentType.matches('image/(jpeg|jpg|png|webp)');
      allow delete: if isAdmin();
    }

    // Business registration photos (List My Business feature)
    match /submissions/{userId}/{fileName} {
      allow read: if true;
      allow write: if isSignedIn()
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|jpg|png|webp)');
      allow delete: if isAdmin() || (isSignedIn() && request.auth.uid == userId);
    }
    
    // ========================================
    // GENERAL
    // ========================================
    
    // Default: deny all
    match /{allPaths=**} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

## Key Rules

1. **Public Read**: Anyone can view place images
2. **Admin Write**: Only admins can upload/delete images
3. **File Validation**:
   - Max size: 5MB
   - Allowed types: jpeg, jpg, png, webp

## Upload Path Structure

```
places/
├── businesses/
│   └── {placeId}/
│       └── {timestamp}-{filename}.jpg
└── destinations/
    └── {placeId}/
        └── {timestamp}-{filename}.jpg
```

## Deploying Rules

Deploy both Firestore and Storage rules from the repo root:

```bash
firebase deploy --only firestore:rules,storage
```

Rule source files: `firestore.rules`, `storage.rules`, configured in `firebase.json`.

## Testing Locally

Use Firebase Emulator:
```bash
firebase emulators:start
```

## Integration with Firestore

The storage rules use a Firestore lookup to check if the user is an admin:

```javascript
exists(/databases/$(database)/documents/admins/$(request.auth.uid))
```

This ensures that:
1. User must be authenticated
2. User must have a document in the `admins` collection
3. The document must have `role: "admin"`

This provides the same security level as Firestore rules - only users with admin rights in Firestore can upload images.

## Client-Side Validation

The client also validates files before upload:

```javascript
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
```

This provides better UX by catching invalid files early, but security is still enforced by the storage rules.
