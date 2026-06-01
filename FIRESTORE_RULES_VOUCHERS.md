# Firestore Rules — Vouchers

## Voucher Catalog (`seasons/{seasonId}/vouchers/{voucherId}`)
- **Read**: PUBLIC — anyone can browse the catalog (signed-in or not)
- **Create / Update / Delete**: Admin only

## Voucher Redemptions (`seasons/{seasonId}/voucherRedemptions/{redemptionId}`)
- **Get (single doc)**: Admin sees all; user sees only their own (where `uid == request.auth.uid`)
- **List (query)**: Admin sees all; user can query with `where('uid', '==', <uid>)` filter
- **Create**: Signed-in user, creating their own redemption only
- **Update**: Admin only (to mark used / cancel)
- **Delete**: Admin only

## Rationale
The voucher catalog must be public so unauthenticated tourists can preview rewards before signing up. Redemptions are private to protect user purchase history. Users can only list their own redemptions via a filtered query.

## Query Pattern (Client)
```js
// ✅ Correct — works with security rules:
const q = query(redemptionsRef, where('uid', '==', uid))
const snapshot = await getDocs(q)

// ❌ Wrong — will fail for non-admin users:
const snapshot = await getDocs(redemptionsRef)
snapshot.docs.filter(r => r.uid === uid)
```
