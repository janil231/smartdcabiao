## Firestore rules – `impactLedger` collection

This collection tracks sustainability impact released when quests are completed.

Each document shape:

```json
{
  "uid": "user uid",
  "userEmail": "user@example.com",
  "seasonId": "season_123",
  "questId": "quest_123",
  "questTitle": "Community Clean-up Drive",
  "unit": "kg_trash",
  "amount": 2,
  "createdAt": <server timestamp>,
  "reason": "quest_completed",
  "createdByUid": "admin uid",
  "createdByEmail": "admin@example.com"
}
```

### Suggested security rules

```js
match /databases/{database}/documents {
  match /impactLedger/{entryId} {
    // Users can read their own entries
    allow get, list where request.auth != null
      && resource.data.uid == request.auth.uid;

    // Admins can read all entries
    allow get, list where request.auth != null
      && request.auth.token.admin == true;

    // Only admins can create impact entries
    allow create where request.auth != null
      && request.auth.token.admin == true;

    // No updates or deletes – ledger is append-only
    allow update, delete: if false;
  }
}
```

Adapt the `request.auth.token.admin` check to however you mark admins in your project (custom claims or a different flag).

