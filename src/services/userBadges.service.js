import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../lib/firebase'

const USER_BADGES_COLLECTION = 'userBadges'

export async function getPersistedBadges(uid, seasonId) {
  if (!uid || !seasonId) return null
  try {
    const docId = `${seasonId}_${uid}`
    const ref = doc(db, USER_BADGES_COLLECTION, docId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      return snap.data().earnedBadgeIds || []
    }
    return []
  } catch {
    return null
  }
}

export async function persistEarnedBadges(uid, seasonId, earnedBadgeIds) {
  if (!uid || !seasonId || !earnedBadgeIds?.length) return
  try {
    const docId = `${seasonId}_${uid}`
    const ref = doc(db, USER_BADGES_COLLECTION, docId)
    await setDoc(ref, { uid, seasonId, earnedBadgeIds, updatedAt: new Date().toISOString() }, { merge: true })
  } catch (err) {
    console.warn('[userBadges] Failed to persist badges:', err)
  }
}
