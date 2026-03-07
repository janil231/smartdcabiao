import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const USERS_COLLECTION = 'users'

export async function getUserSettings(uid) {
  if (!uid) return null

  try {
    const userRef = doc(db, USERS_COLLECTION, uid)
    const snapshot = await getDoc(userRef)

    if (!snapshot.exists()) {
      return null
    }

    return snapshot.data()
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return null
  }
}

export async function hasUserSeenOnboarding(uid, seasonId) {
  if (!uid || !seasonId) return false

  const settings = await getUserSettings(uid)
  if (!settings) return false

  return settings.hasSeenOnboardingBySeason?.[seasonId] === true
}

export async function setSeenOnboarding(uid, seasonId) {
  if (!uid || !seasonId) return

  try {
    const userRef = doc(db, USERS_COLLECTION, uid)
    const snapshot = await getDoc(userRef)

    const updateData = {
      hasSeenOnboardingBySeason: {
        [seasonId]: true
      },
      updatedAt: serverTimestamp()
    }

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        uid,
        hasSeenOnboardingBySeason: { [seasonId]: true },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } else {
      await updateDoc(userRef, updateData)
    }

    return true
  } catch (error) {
    console.error('Error setting onboarding flag:', error)
    return false
  }
}

export async function getUserLocation(uid) {
  if (!uid) return null

  const settings = await getUserSettings(uid)
  if (!settings) return null

  return settings.location || null
}

export async function setUserLocation(uid, location) {
  if (!uid || !location) return false

  try {
    const userRef = doc(db, USERS_COLLECTION, uid)
    const snapshot = await getDoc(userRef)

    const updateData = {
      location,
      updatedAt: serverTimestamp()
    }

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        uid,
        location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } else {
      await updateDoc(userRef, updateData)
    }

    return true
  } catch (error) {
    console.error('Error setting user location:', error)
    return false
  }
}
