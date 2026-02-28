# Admin Setup Guide

This guide explains how to add admins to the SMARTDCABIAO LGU Dashboard.

## Overview

Admin access is now determined by Firestore `admins` collection, not hardcoded email allowlist. This provides:
- Secure, Firestore-enforced admin roles
- Audit logging of all admin actions
- Ability to revoke admin access without code changes

## Adding an Admin

### Step 1: Find the User's UID

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (smartdcabiao)
3. Navigate to **Authentication** → **Users**
4. Find the user you want to make an admin
5. Copy their **User UID** (e.g., `abc123xyz...`)

### Step 2: Create Admin Document

1. In Firebase Console, go to **Firestore Database**
2. Click **Start collection**
3. Enter collection name: `admins`
4. Enter document ID: paste the user's UID
5. Add fields:

| Field | Type | Value |
|-------|------|-------|
| email | string | user's email (e.g., `jannelsuba06242004@gmail.com`) |
| role | string | `admin` |
| createdAt | timestamp | current time |

6. Click **Save**

### Step 3: Verify Access

1. Have the user sign in to the app
2. Navigate to `/lgu`
3. They should now see the LGU Dashboard

## Revoking Admin Access

To revoke admin access, simply delete the admin document:

1. Go to Firestore Database → `admins` collection
2. Find the admin document
3. Click delete

## Manual Setup via Firebase CLI

You can also add admins using Firebase CLI:

```bash
# Get your user's UID from Authentication
firebase auth:users:list

# Or create admin doc directly in Firestore
firebase firestore:documents:create admins/USER_UID \
  --data '{"email": "admin@example.com", "role": "admin"}'
```

## Checking Audit Logs

All admin actions are logged to the `auditLogs` collection. To view:

1. Go to Firestore Database → `auditLogs` collection
2. View entries with fields:
   - `action`: e.g., "submission_approved", "report_resolved"
   - `targetType`: submission, report, business, destination
   - `targetId`: ID of the affected document
   - `adminUid`: UID of the admin who performed the action
   - `adminEmail`: email of the admin
   - `createdAt`: when the action occurred

## Security Rules

Make sure to deploy the updated Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

The rules ensure:
- Only admins can read/write submissions and reports
- Only admins can create/update businesses and destinations
- All admin actions are logged
- Non-admins cannot bypass rules even with direct API calls

## Troubleshooting

### "Not authorized" despite being admin?

1. Check that the admin document exists in Firestore
2. Verify the `role` field is exactly `"admin"` (case-sensitive)
3. Make sure you're signed in with the correct account
4. Check browser console for errors
5. Clear local admin cache: the service caches admin status in memory

### Can't access Firestore?

Make sure you have appropriate Firebase permissions:
- Firebase Admin or Owner role to create admin documents
- Or ask your project admin to add you

## Migration from Email Allowlist

The old email allowlist in `src/config/admin.js` is no longer used. You can keep or remove it - the new system uses Firestore-based admin checking.
