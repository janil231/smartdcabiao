# Firestore Security Rules - LGU Dashboard

> **Important:** Admin access is now determined by Firestore `admins/{uid}` collection, not hardcoded allowlist.

## Security Rules

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isSignedIn() && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ========================================
    // PUBLIC READ-ONLY COLLECTIONS
    // ========================================
    
    // Businesses - public read
    match /businesses/{businessId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    // Destinations - public read
    match /destinations/{destinationId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    // ========================================
    // SUBMISSIONS
    // ========================================
    
    // Anyone can submit, only admins can read/update
    match /submissions/{submissionId} {
      allow read: if isAdmin();
      allow create: if true;
      allow update, delete: if isAdmin();
    }
    
    // ========================================
    // REPORTS
    // ========================================
    
    // Anyone can report, only admins can read/update
    match /reports/{reportId} {
      allow read: if isAdmin();
      allow create: if true;
      allow update, delete: if isAdmin();
    }
    
    // ========================================
    // ADMIN COLLECTION
    // ========================================
    
    // Only admins can read admins collection, no writes from client
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if false;
    }
    
    // ========================================
    // AUDIT LOGS
    // ========================================
    
    // Only admins can read/create audit logs
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if false;
    }
    
    // ========================================
    // USER-SPECIFIC DATA
    // ========================================
    
    // User favorites (if using Firestore for favorites)
    match /users/{userId}/favorites/{favoriteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User participation/rewards
    match /users/{userId}/participation/{participationId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Key Changes

1. **Admin access via Firestore**: Check `admins/{uid}` document with `role: "admin"`
2. **Admin-only writes**: businesses, destinations, submissions updates, reports updates
3. **Audit logging**: All admin actions are logged to `auditLogs` collection
4. **Public submissions/reports**: Anyone can create, only admins can read/update

## Testing Rules

Deploy rules and test:
```bash
firebase deploy --only firestore:rules
```

Use Firebase Emulator for local testing:
```bash
firebase emulators:start
```
