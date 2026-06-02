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

export async function upsertUserProfile(firebaseUser) {
  if (!firebaseUser?.uid) return

  const userRef = doc(db, 'users', firebaseUser.uid)
  const existing = await getDoc(userRef)

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

  if (!existing.exists()) {
    profileData.createdAt = serverTimestamp()
    await setDoc(userRef, profileData)
  } else {
    await setDoc(userRef, profileData, { merge: true })
  }
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
