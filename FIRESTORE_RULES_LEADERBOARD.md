## Firestore rules – `seasonUserStats` collection

This collection stores per-user, per-season aggregate stats used for leaderboards.

Each document:

```json
{
  "seasonId": "season_123",
  "uid": "user uid",
  "userEmail": "user@example.com",
  "displayName": "jane",
  "publicName": "Jane D.",
  "showOnLeaderboard": true,
  "pointsTotal": 125,
  "completedQuestsCount": 4,
  "impactTotalsByUnit": {
    "trees": 3,
    "kg_trash": 12,
    "hours": 5
  },
  "updatedAt": "<server timestamp>"
}
```

### Suggested security rules

```js
match /databases/{database}/documents {
  match /seasonUserStats/{statsId} {
    // Public read (leaderboards are visible to everyone)
    allow get, list: if true;

    // Only admins can write aggregated stats
    allow create, update: if request.auth != null
      && request.auth.token.admin == true;

    // Do not allow deletes to keep history (optional)
    allow delete: if false;
  }
}
```

Adjust the `request.auth.token.admin` condition to match however you mark admin users in your project (e.g. custom claims or another flag).

