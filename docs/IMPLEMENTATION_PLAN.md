# SMARTDCABIAO – Auth, Participation & Rewards Implementation Plan

## 1. Overview

- **Goal:** Make the app interactive with real users: auth (email/password + Google OAuth), persistent event participation (“Join”), and real rewards/points per user.
- **Backend choice (recommended):** **Firebase** (Auth + Firestore) for a single, hosted backend with minimal setup. Alternative: **Node/Express + JSON DB** (e.g. `lowdb`) for full control and simple file storage.

---

## 2. Step-by-Step Implementation Plan

### Phase 1: Backend & config
1. Create a Firebase project (or Express API) and get config/keys.
2. Add env vars (e.g. `VITE_FIREBASE_*`) and a `.env.example`.
3. Add Firebase SDK (or `fetch` base URL for Express) in the app.

### Phase 2: Authentication
4. Implement **AuthContext** (current user, login, logout, signup, Google sign-in).
5. Wrap the app with `AuthProvider`.
6. Add **Login/Signup UI** (modal or `/login` page) with email+password and “Sign in with Google”.
7. Update **Navbar**: show “Login” when signed out, user menu (email + Logout) when signed in.
8. Optionally protect routes (e.g. Rewards only when signed in).

### Phase 3: Persistent participation
9. Define Firestore (or API) shape: e.g. `users/{uid}` with `joinedActivityIds`, `participationHistory`, `rewardPoints`, `voucherCount`.
10. Implement **API layer**: `joinActivity(uid, activityId)`, `leaveActivity(uid, activityId)`, `getUserParticipation(uid)`.
11. **Community Activities page:** On load, fetch `joinedActivityIds` for current user; “Join”/“Leave” call API and refresh state.
12. When user joins, append to `participationHistory` and update points/vouchers (e.g. +50 points per activity, voucher for every 2nd).

### Phase 4: Real rewards in UI
13. **Rewards page:** If not signed in, show “Sign in to see your rewards.” If signed in, fetch `participationHistory`, `rewardPoints`, `voucherCount` from backend and render.
14. Optionally show a loading state and error state.

### Phase 5: Polish
15. Add loading/error states where needed.
16. Optional: protected route for `/rewards` (redirect to login if not authenticated).

---

## 3. Backend Options

### Option A: Firebase (recommended for speed)
- **Auth:** Email/password + Google OAuth out of the box.
- **DB:** Firestore for `users/{uid}` (profile, `joinedActivityIds`, `participationHistory`, `rewardPoints`, `voucherCount`).
- **Pros:** No server to host; scales; real-time possible.  
- **Cons:** Vendor lock-in; Firestore pricing at scale.

**Firestore shape (example):**
```
users / {uid}
  - email, displayName, photoURL
  - joinedActivityIds: [1, 2, 5]
  - rewardPoints: 125
  - voucherCount: 1
  - participationHistory: [
      { activityId, activityName, date, rewardStatus, rewardLabel, rewardDetail }
    ]
```

### Option B: Node/Express + JSON DB (e.g. lowdb)
- **Auth:** Use JWT or sessions; Google OAuth via Passport or similar.
- **DB:** `lowdb` or a single JSON file for users and participations.
- **Pros:** Full control; simple file backup.  
- **Cons:** You host the server; no built-in OAuth (need to wire it).

**API sketch:**
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /users/:uid/participation`, `POST /users/:uid/join/:activityId`, `DELETE /users/:uid/join/:activityId`
- Frontend uses `fetch(BASE_URL + path)` with token in header.

---

## 4. Suggested Folder Structure (after changes)

```
src/
  api/                    # Backend calls (replace with real API later)
    auth.js               # (optional) if using Express; Firebase auth in context
    participation.js      # joinActivity, leaveActivity, getUserParticipation
    rewards.js            # getUserRewards (or merged into participation)
  components/
    Auth/                 # Auth-related UI
      LoginModal.jsx      # or LoginPage.jsx
      AuthGuard.jsx       # optional: redirect to login if not signed in
  contexts/
    AuthContext.jsx       # currentUser, login, logout, signUp, signInWithGoogle
  data/                   # Keep for static/catalog data (businesses, activities list)
    businesses.js
    activities.js
    destinations.js
    rewards.js            # static reward config (points per activity, voucher rules)
    index.js
  lib/
    firebase.js           # Firebase app init
  hooks/
    useParticipation.js   # optional: joinedIds, join, leave, loading
  pages/
    ...
```

- **Data layer:** `src/data` stays the source for **catalog** data (list of activities, businesses). User-specific data (joined, rewards) comes from **API/Firestore** via `src/api` and context/hooks.
- **Auth:** All auth state and methods live in `AuthContext`; components use `useAuth()`.

---

## 5. Example Code Snippets

### 5.1 Auth context (Firebase)

```jsx
// contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const auth = getAuth()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false) })
    return unsub
  }, [auth])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)
  const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider())

  const value = { user, loading, login, signUp, logout, signInWithGoogle }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

### 5.2 Joining an event (Firestore)

```js
// api/participation.js
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'

const db = getFirestore()

export async function getJoinedActivityIds(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid))
  return userDoc.exists() ? userDoc.data().joinedActivityIds || [] : []
}

export async function joinActivity(uid, activity) {
  const userRef = doc(db, 'users', uid)
  const rewardEntry = { activityId: activity.id, activityName: activity.name, date: activity.date, rewardStatus: 'points', rewardLabel: '50 points earned', rewardDetail: 'Earned for participating.' }
  await updateDoc(userRef, {
    joinedActivityIds: arrayUnion(activity.id),
    participationHistory: arrayUnion(rewardEntry),
    rewardPoints: increment(50),
  })
}

export async function leaveActivity(uid, activityId) {
  const userRef = doc(db, 'users', uid)
  // Remove from joinedActivityIds; optionally remove from participationHistory
  await updateDoc(userRef, { joinedActivityIds: arrayRemove(activityId) })
}
```

### 5.3 Community Activities page (using auth + API)

```jsx
// In CommunityActivitiesPage.jsx
const { user, loading: authLoading } = useAuth()
const [joinedIds, setJoinedIds] = useState(new Set())
const [loading, setLoading] = useState(true)

useEffect(() => {
  if (!user) { setJoinedIds(new Set()); setLoading(false); return }
  getJoinedActivityIds(user.uid).then(ids => setJoinedIds(new Set(ids))).finally(() => setLoading(false))
}, [user])

const toggleJoin = async (activity) => {
  if (!user) return // or open login modal
  const isJoined = joinedIds.has(activity.id)
  try {
    if (isJoined) await leaveActivity(user.uid, activity.id)
    else await joinActivity(user.uid, activity)
    setJoinedIds(prev => { const next = new Set(prev); isJoined ? next.delete(activity.id) : next.add(activity.id); return next })
  } catch (e) { /* toast error */ }
}
```

### 5.4 Rewards page (real data)

```jsx
// In RewardsPreviewPage.jsx
const { user } = useAuth()
const [rewards, setRewards] = useState(null)

useEffect(() => {
  if (!user) { setRewards(null); return }
  getUserRewards(user.uid).then(setRewards)
}, [user])

if (!user) return <div>Sign in to see your rewards.</div>
if (!rewards) return <div>Loading...</div>
// Render rewards.participationHistory, rewards.rewardPoints, rewards.voucherCount
```

---

## 6. Environment variables

Create `.env` (and `.env.example` without values):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

For Express alternative, e.g. `VITE_API_URL=https://your-api.com`.

---

## 7. Summary

| Item | Action |
|------|--------|
| Auth | Firebase Auth (email + Google) in AuthContext; Login/Signup UI; Navbar shows user or Login |
| Participation | Firestore `users/{uid}` with `joinedActivityIds` + `participationHistory`; API: join/leave/get |
| Rewards | Same doc: `rewardPoints`, `voucherCount`, `participationHistory`; Rewards page reads from Firestore when signed in |
| Data layer | Keep `src/data` for businesses/activities catalog; user data from `src/api` + Firestore |
| Optional | AuthGuard for `/rewards`, loading/error states, toast on join error |

After this, the app will have real auth and persistent, per-user participation and rewards that you can later replace or extend (e.g. real vouchers, admin panel).
