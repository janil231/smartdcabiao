import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { INTEREST_IDS } from '../constants/interests'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'

export async function upsertUserProfile(firebaseUser) {
  if (!firebaseUser?.uid) return

  const userRef = doc(db, 'users', firebaseUser.uid)
  const existing = await getDoc(userRef)

  const activeData = existing.exists() ? existing.data() : {}

  const profileData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
    providerId: firebaseUser.providerData?.[0]?.providerId || 'password',
    lastSeenAt: serverTimestamp(),
    emailLower: (firebaseUser.email || '').toLowerCase(),
    displayNameLower: (firebaseUser.displayName || '').toLowerCase(),
  }

  if (activeData.interests) {
    profileData.interests = activeData.interests
  }

  if (!existing.exists()) {
    profileData.createdAt = serverTimestamp()
    await setDoc(userRef, profileData)
  } else {
    await setDoc(userRef, profileData, { merge: true })
  }
}

export async function updateUserInterests(uid, interestsArray) {
  if (!uid) throw new Error('Missing uid')

  const valid = new Set(INTEREST_IDS)
  const normalized = [...new Set(
    (interestsArray || [])
      .map(t => String(t).toLowerCase().trim())
      .filter(t => valid.has(t))
  )].slice(0, 8)

  const payload = sanitizeForFirestore({ interests: normalized, interestsSetAt: serverTimestamp() })
  await setDoc(doc(db, 'users', String(uid)), payload, { merge: true })
  return normalized
}

export async function markInterestsSkipped(uid) {
  if (!uid) return
  const payload = sanitizeForFirestore({ interestsSetAt: serverTimestamp() })
  await setDoc(doc(db, 'users', String(uid)), payload, { merge: true })
}

export async function listAllUsers() {
  const q = query(collection(db, 'users'), orderBy('lastSeenAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getUserProfile(uid) {
  if (!uid) return null
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}
