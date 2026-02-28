# Firestore Security Rules for Public Data (Businesses & Destinations)

This document contains recommended Firestore security rules for public read access to businesses and destinations collections, while maintaining write access control for administrators.

## Security Rules

Copy these rules to your Firebase Console → Firestore → Rules tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==============================
    // PUBLIC READ COLLECTIONS
    // ==============================
    
    // Businesses Collection - Public read, admin only write
    match /businesses/{businessId} {
      allow read: if true; // Public read access
      allow write: if request.auth != null && request.auth.token.admin == true; // Admin only
    }
    
    // Destinations Collection - Public read, admin only write
    match /destinations/{destinationId} {
      allow read: if true; // Public read access
      allow write: if request.auth != null && request.auth.token.admin == true; // Admin only
    }
    
    // ==============================
    // USER-GENERATED CONTENT
    // (Requires Authentication)
    // ==============================
    
    // Submissions Collection Rules
    match /submissions/{submissionId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true);
      allow update: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true);
      allow delete: if request.auth != null && (request.auth.token.admin == true);
    }
    
    // Reports Collection Rules
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true);
      allow update: if request.auth != null && (request.auth.token.admin == true);
      allow delete: if request.auth != null && (request.auth.token.admin == true);
    }
    
    // ==============================
    // DENY ALL OTHER ACCESS
    // ==============================
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Alternative: Allow Public Submissions/Reports

If you want to allow anyone (including non-authenticated users) to submit places or reports:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==============================
    // PUBLIC READ COLLECTIONS
    // ==============================
    
    match /businesses/{businessId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    match /destinations/{destinationId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // ==============================
    // PUBLIC CREATE, AUTH READ
    // ==============================
    
    match /submissions/{submissionId} {
      allow create: if true; // Public can submit
      allow read: if request.auth != null && (request.auth.uid == resource.data.userCreatedByUid || request.auth.token.admin == true);
      allow update, delete: if request.auth != null && request.auth.token.admin == true;
    }
    
    match /reports/{reportId} {
      allow create: if true; // Public can report
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow update, delete: if request.auth != null && request.auth.token.admin == true;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Data Structure for Businesses

For the app to work correctly, Firestore documents should match this structure:

```javascript
{
  id: string,              // Document ID (auto-generated or numeric)
  name: string,            // Required - Business name
  category: string,        // Required - "Restaurant", "Shop", "Market", "Landmark", etc.
  type: string,           // Required - "restaurant" | "shop" | "attraction"
  description: string,     // Required - Business description
  position: [lat, lng],   // Required - Array [latitude, longitude]
  address: string,         // Optional - Full address
  barangay: string,        // Optional - Barangay name
  phone: string,          // Optional - Contact number
  hours: string,          // Optional - Operating hours
  priceRange: string,     // Optional - "₱", "₱₱", "₱₱₱"
  specialties: string[],  // Optional - Array of specialty items
  features: string[],     // Optional - Array of features/amenities
  images: string[],       // Optional - Array of image URLs
  website: string | null, // Optional - Website URL
  socialMedia: {          // Optional - Social media links
    facebook: string,
    instagram: string
  }
}
```

## Data Structure for Destinations

```javascript
{
  id: string,              // Document ID
  name: string,           // Required - Destination name
  category: string,       // Required - "Destination", "Attraction", etc.
  type: string,           // Required - "destination" | "attraction"
  description: string,     // Required - Description
  position: [lat, lng],   // Required - Array [latitude, longitude]
  address: string,        // Optional - Full address
  barangay: string,       // Optional - Barangay name
  phone: string,          // Optional - Contact number
  hours: string,          // Optional - Operating hours
  priceRange: string,     // Optional - "Free", "₱", etc.
  images: string[],      // Optional - Array of image URLs
  tags: string[],        // Optional - Array of tags
  verified: boolean,      // Optional - Verification status
  website: string | null, // Optional - Website URL
  socialMedia: {          // Optional - Social media links
    facebook: string,
    instagram: string
  }
}
```

## Implementation Steps

1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to your project → Firestore Database
3. Click the "Rules" tab
4. Copy and paste the appropriate rules above
5. Click "Publish"
6. Test the application to ensure:
   - Businesses and destinations load correctly
   - Map markers display properly
   - Search and filters work

## Setting Up Admin Access

To enable admin-only write access, you'll need to set custom claims on user accounts:

```javascript
// Cloud Function to grant admin access
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.makeAdmin = functions.https.onCall(async (data, context) => {
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can grant admin access.'
    );
  }
  
  await admin.auth().setCustomUserClaims(data.uid, { admin: true });
  return { message: `Success! ${data.uid} is now an admin.` };
});
```

## Important Notes

1. **Fallback Behavior**: When Firestore is empty or unavailable, the app automatically falls back to mock data (defined in `src/data/businesses.js` and `src/data/destinations.js`)

2. **Environment Variable**: Set `VITE_USE_FIRESTORE_DATA=true` in your `.env.local` to enable Firestore data loading

3. **Data Migration**: You can populate Firestore manually via Firebase Console or use a migration script

4. **Index Requirements**: No special indexes required for basic read operations

5. **Performance**: For best performance, ensure your businesses and destinations have proper geolocation data (position field)
