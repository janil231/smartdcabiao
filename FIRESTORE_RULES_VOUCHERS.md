## Firestore rules – vouchers and season balances

This app-only design uses Firestore rules to guard the voucher store as much as possible without Cloud Functions.

### Collections

- `seasons/{seasonId}/vouchers/{voucherId}`
- `seasons/{seasonId}/voucherRedemptions/{voucherId}_{uid}`
- `seasonBalances/{seasonId}_{uid}`

---

### Vouchers

```js
match /databases/{database}/documents {
  match /seasons/{seasonId}/vouchers/{voucherId} {
    // Anyone can read vouchers
    allow get, list: if true;

    // Only admins can create/update vouchers
    allow create, update: if request.auth != null
      && request.auth.token.admin == true;

    // Optional: prevent deletes (or restrict to admins)
    allow delete: if false;
  }
}
```

If you want to allow client-side stock decrement from users instead of using a transaction, you can strengthen `update`:

```js
// Allow non-admin update ONLY for stockRemaining decrement by 1
allow update: if request.auth != null
  && (
    request.auth.token.admin == true ||
    (
      // user redemption: only stockRemaining may change
      request.resource.data.diff(resource.data).changedKeys().hasOnly(['stockRemaining']) &&
      request.resource.data.stockRemaining == resource.data.stockRemaining - 1
    )
  );
```

---

### Season balances (`seasonBalances/{seasonId_uid}`)

```js
match /seasonBalances/{balanceId} {
  function isOwner() {
    return request.auth != null
      && balanceId.split('_')[1] == request.auth.uid;
  }

  // Users can read their own balance
  allow get: if isOwner();

  // Admins can read all
  allow list: if request.auth != null && request.auth.token.admin == true;

  // Admins can create/update earned points
  allow create, update: if request.auth != null
    && request.auth.token.admin == true;

  // Optional stricter user-side spending guard (if users are allowed to call spendPoints directly):
  // Users may only decrease pointsBalance and increase pointsSpent.
  /*
  allow update: if isOwner()
    && request.resource.data.seasonId == resource.data.seasonId
    && request.resource.data.pointsEarned == resource.data.pointsEarned
    && request.resource.data.pointsBalance <= resource.data.pointsBalance
    && request.resource.data.pointsSpent >= resource.data.pointsSpent;
  */

  allow delete: if false;
}
```

---

### Voucher redemptions

```js
match /seasons/{seasonId}/voucherRedemptions/{redemptionId} {
  function isOwner() {
    return request.auth != null
      && redemptionId.split('_')[1] == request.auth.uid;
  }

  // Users can read their own redemptions
  allow get, list: if isOwner();

  // Admins can read all
  allow get, list: if request.auth != null && request.auth.token.admin == true;

  // Users can create only their own redemption doc
  allow create: if isOwner()
    && request.resource.data.uid == request.auth.uid;

  // Only admins can mark vouchers as used / change status
  allow update: if request.auth != null
    && request.auth.token.admin == true;

  // No deletes
  allow delete: if false;
}
```

> Note: For a production deployment, Cloud Functions would be ideal to fully enforce atomic stock, balance, and redemption logic on the server. These rules provide a reasonable guardrail when using only client + Firestore. 

