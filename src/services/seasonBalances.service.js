import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const SEASON_BALANCES_COLLECTION = 'seasonBalances'

export async function getMySeasonBalance(seasonId, uid) {
  if (!seasonId || !uid) return null

  const balanceId = `${seasonId}_${uid}`
  const balanceRef = doc(db, SEASON_BALANCES_COLLECTION, balanceId)
  const snapshot = await getDoc(balanceRef)

  if (!snapshot.exists()) {
    return null
  }

  return { id: snapshot.id, ...snapshot.data() }
}

export async function ensureBalanceDoc(seasonId, user) {
  if (!seasonId || !user?.uid) return null

  const balanceId = `${seasonId}_${user.uid}`
  const balanceRef = doc(db, SEASON_BALANCES_COLLECTION, balanceId)
  const snapshot = await getDoc(balanceRef)

  if (!snapshot.exists()) {
    const docData = {
      seasonId,
      uid: user.uid,
      userEmail: user.email || null,
      pointsEarned: 0,
      pointsSpent: 0,
      pointsBalance: 0,
      updatedAt: serverTimestamp(),
    }
    await setDoc(balanceRef, docData)
    return { id: balanceId, ...docData }
  }

  return { id: snapshot.id, ...snapshot.data() }
}

/**
 * Get or create season balance for a user. Returns { pointsEarned, pointsSpent, pointsBalance } (defaults 0).
 */
export async function getOrCreateSeasonBalance(seasonId, user) {
  if (!seasonId || !user?.uid) {
    return { pointsEarned: 0, pointsSpent: 0, pointsBalance: 0 }
  }
  const existing = await getMySeasonBalance(seasonId, user.uid)
  if (existing) {
    return {
      pointsEarned: existing.pointsEarned ?? 0,
      pointsSpent: existing.pointsSpent ?? 0,
      pointsBalance: existing.pointsBalance ?? 0,
    }
  }
  const created = await ensureBalanceDoc(seasonId, user)
  return {
    pointsEarned: created?.pointsEarned ?? 0,
    pointsSpent: created?.pointsSpent ?? 0,
    pointsBalance: created?.pointsBalance ?? 0,
  }
}

export async function incrementEarnedPoints(seasonId, user, amount, meta) {
  if (!seasonId || !user?.uid || !amount) return

  const balanceId = `${seasonId}_${user.uid}`
  const balanceRef = doc(db, SEASON_BALANCES_COLLECTION, balanceId)
  const snapshot = await getDoc(balanceRef)

  if (!snapshot.exists()) {
    await setDoc(balanceRef, {
      seasonId,
      uid: user.uid,
      userEmail: user.email || null,
      pointsEarned: amount,
      pointsSpent: 0,
      pointsBalance: amount,
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(balanceRef, {
      userEmail: user.email || null,
      pointsEarned: increment(amount),
      pointsBalance: increment(amount),
      updatedAt: serverTimestamp(),
    })
  }
}

export async function spendPoints(seasonId, user, amount) {
  if (!seasonId || !user?.uid || !amount) {
    throw new Error('Missing seasonId, user, or amount')
  }

  const balanceId = `${seasonId}_${user.uid}`
  const balanceRef = doc(db, SEASON_BALANCES_COLLECTION, balanceId)
  const snapshot = await getDoc(balanceRef)

  if (!snapshot.exists()) {
    throw new Error('Balance not found')
  }

  const data = snapshot.data()
  const currentBalance = data.pointsBalance || 0
  if (currentBalance < amount) {
    throw new Error('Insufficient points')
  }

  await updateDoc(balanceRef, {
    pointsSpent: increment(amount),
    pointsBalance: increment(-amount),
    updatedAt: serverTimestamp(),
  })
}

