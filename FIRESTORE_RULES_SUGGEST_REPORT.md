# Firestore Security Rules for Submissions & Reports

This document contains recommended Firestore security rules for the SMARTDCABIAO submissions and reports collections.

## Security Rules

Copy these rules to your Firebase Console → Firestore → Rules tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Submissions Collection Rules
    match /submissions/{submissionId} {
      allow create: if request.auth != null; // Only authenticated users can create
      allow read: if request.auth != null && request.auth.uid == resource.data.userCreatedByUid; // Only creator or admin can read
      allow update: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can update
      allow delete: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can delete
    }
    
    // Reports Collection Rules
    match /reports/{reportId} {
      allow create: if request.auth != null; // Only authenticated users can create reports
      allow read: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can read
      allow update: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can update
      allow delete: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can delete
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Alternative: Public Access Rules

If you want to allow submissions and reports from everyone (including non-authenticated users), use these rules instead:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Submissions Collection Rules
    match /submissions/{submissionId} {
      allow create; // Anyone can create submissions
      allow read: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can read
      allow update: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can update
      allow delete: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can delete
    }
    
    // Reports Collection Rules
    match /reports/{reportId} {
      allow create; // Anyone can create reports
      allow read: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can read
      allow update: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can update
      allow delete: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true); // Only creator or admin can delete
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Important Notes

### Data Structure Requirements

**Submissions Collection Structure:**
```javascript
{
  name: string,           // Required
  entryType: string,      // "business" | "destination"
  category: string,       // "restaurant" | "shop" | "attraction" | "service" | "other"
  barangay: string,       // Optional
  address: string,        // Optional
  description: string,     // Required (20-1000 chars)
  contact: string,         // Optional (phone number)
  website: string,         // Optional (URL)
  images: array,          // Optional array of image URLs
  position: {             // Optional
    lat: number,
    lng: number
  },
  createdAt: timestamp,     // Auto-added by serverTimestamp()
  status: string,         // Auto-added: "new"
  createdByUid: string,    // Optional (from auth.uid)
  createdByEmail: string   // Optional (from auth.email)
}
```

**Reports Collection Structure:**
```javascript
{
  targetType: string,      // "business" | "destination"
  targetId: string,        // ID of the business/destination being reported
  issueType: string,       // Required (from predefined list)
  message: string,         // Required (10-1000 chars)
  pageUrl: string,         // URL of the page where issue was reported
  createdAt: timestamp,     // Auto-added by serverTimestamp()
  status: string,         // Auto-added: "new"
  createdByUid: string,    // Optional (from auth.uid)
  createdByEmail: string   // Optional (from auth.email)
}
```

## Security Best Practices

1. **Authentication**: Require authentication for create operations to prevent spam
2. **Authorization**: Only allow users to read/update their own submissions/reports
3. **Input Validation**: Client-side validation is good, but server-side rules provide additional security
4. **Admin Access**: Include admin token checks for municipal staff access
5. **Rate Limiting**: Consider implementing additional rate limiting at the Firebase project level

## Implementation Steps

1. Open Firebase Console → Firestore Database
2. Go to "Rules" tab
3. Copy and paste the appropriate rules above
4. Click "Publish"
5. Test with your application to ensure permissions work correctly

## Field Validation Notes

- **Coordinates**: Validate lat/lng ranges (-90 to 90, -180 to 180)
- **URLs**: Use proper URL validation
- **Phone**: Optional, but validate format if provided
- **Text Limits**: Enforce minimum/maximum character limits
- **Required Fields**: Ensure required fields are present before allowing create

## Data Privacy Considerations

- Submissions and reports may contain personal information
- Consider implementing data retention policies
- Ensure compliance with Philippine Data Privacy Act
- Log access for audit purposes