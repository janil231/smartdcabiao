import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

const ADMINS_COLLECTION = 'admins'

const adminCache = new Map()

export async function isAdmin(uid) {
  if (!uid) return false
  
  if (adminCache.has(uid)) {
    return adminCache.get(uid)
  }
  
  try {
    const docRef = doc(db, ADMINS_COLLECTION, uid)
    const docSnap = await getDoc(docRef)
    const isAdmin = docSnap.exists() && docSnap.data()?.role === 'admin'
    adminCache.set(uid, isAdmin)
    return isAdmin
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export async function getAdminDoc(uid) {
  if (!uid) return null
  
  try {
    const docRef = doc(db, ADMINS_COLLECTION, uid)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() }
  } catch (error) {
    console.error('Error getting admin doc:', error)
    return null
  }
}

export function clearAdminCache(uid) {
  if (uid) {
    adminCache.delete(uid)
  } else {
    adminCache.clear()
  }
}
