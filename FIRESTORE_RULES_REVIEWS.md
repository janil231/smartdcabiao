# Firestore Rules for Reviews

This document provides recommended Firestore security rules for the Reviews system.

## Collection: reviews

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Reviews collection
    match /reviews/{reviewId} {
      // Anyone can read approved reviews
      allow read: if resource.data.status == 'approved'
        // Or users can read their own review
        || request.auth != null && resource.data.uid == request.auth.uid;
      
      // Authenticated users can create their own review
      // They cannot set status, reviewedBy, or reviewedAt fields
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.uid
        && request.resource.data.status == 'pending'
        && request.resource.data.reviewedByUid == null
        && request.resource.data.reviewedByEmail == null
        && request.resource.data.reviewedAt == null;
      
      // Users can update their own review
      // Only pending reviews can be updated
      allow update: if request.auth != null
        && resource.data.uid == request.auth.uid
        && resource.data.status == 'pending'
        && request.resource.data.status == 'pending'
        && request.resource.data.reviewedByUid == null
        && request.resource.data.reviewedByEmail == null
        && request.resource.data.reviewedAt == null;
      
      // Admin users can approve/reject reviews
      allow update: if request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid))
        && request.auth.uid == resource.data.reviewedByUid
        && request.auth.email == resource.data.reviewedByEmail
        && (request.resource.data.status == 'approved' || request.resource.data.status == 'rejected')
        && request.resource.data.reviewedAt != null;
      
      // Deny delete
      allow delete: if false;
    }
    
    // Businesses collection - for reading rating aggregates
    match /businesses/{businessId} {
      allow read: if true;
      allow write: if request.auth != null 
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Destinations collection - for reading rating aggregates
    match /destinations/{destinationId} {
      allow read: if true;
      allow write: if request.auth != null 
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}
```

## Key Security Points

1. **Read Access**:
   - Anyone can read approved reviews
   - Users can read their own review (regardless of status)

2. **Create Access**:
   - Only authenticated users can create reviews
   - Users can only create reviews for themselves
   - New reviews are automatically set to `pending` status
   - Users cannot set admin-only fields (status, reviewedBy*, reviewedAt)

3. **Update Access**:
   - Users can update their own pending reviews
   - Admins can approve/reject reviews (set status, reviewedBy*, reviewedAt)
   - Users cannot change their review status directly

4. **Delete Access**:
   - Denied for everyone (reviews should remain for audit trail)

5. **Aggregate Updates**:
   - Only admins can write to businesses/destinations documents to update ratingAvg/ratingCount

## Implementation Notes

- The `reviewId` format is `${targetType}_${targetId}_${uid}` which enforces one review per user per place
- The Firestore rules prevent users from circumventing the moderation flow
- All admin actions are logged via the audit service

## Testing the Rules

```bash
# Test as unauthenticated user (should only read approved reviews)
firebase emulators:exec --only firestore "npm test"

# Test as regular user (should create/own pending reviews)
# Test as admin (should approve/reject reviews)
```

## Migration

If you have existing review data without the new structure, run a migration script to:

1. Add `status: 'pending'` to all existing reviews
2. Compute and add `ratingAvg` and `ratingCount` to businesses/destinations
