import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  limit,
  orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'

const SEASONS_COLLECTION = 'seasons'

export async function getActiveSeason() {
  const seasonsRef = collection(db, SEASONS_COLLECTION)
  const q = query(seasonsRef, where('isActive', '==', true), limit(1))
  const snapshot = await getDocs(q)
  
  if (!snapshot.empty) {
    const seasonDoc = snapshot.docs[0]
    return { id: seasonDoc.id, ...seasonDoc.data() }
  }
  
  return null
}

export async function getSeasonById(seasonId) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const snapshot = await getDoc(seasonRef)
  
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() }
  }
  
  return null
}

export async function listSeasons() {
  const seasonsRef = collection(db, SEASONS_COLLECTION)
  const q = query(seasonsRef, orderBy('startAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createSeason({ name, startAt, endAt }, adminUser) {
  const seasonId = `season_${Date.now()}`
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  
  await setDoc(seasonRef, {
    name,
    startAt,
    endAt,
    isActive: false,
    createdAt: new Date().toISOString(),
  })
  
  await logAudit({
    action: 'SEASON_CREATED',
    targetType: 'season',
    targetId: seasonId,
    details: { name, startAt, endAt, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { id: seasonId, success: true }
}

export async function activateSeason(seasonId, adminUser) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const season = await getSeasonById(seasonId)
  
  if (!season) {
    throw new Error('Season not found')
  }
  
  const allSeasons = await listSeasons()
  const updates = []
  
  for (const s of allSeasons) {
    if (s.isActive) {
      updates.push(updateDoc(doc(db, SEASONS_COLLECTION, s.id), { isActive: false }))
    }
  }
  
  updates.push(updateDoc(seasonRef, { isActive: true }))
  
  await Promise.all(updates)
  
  await logAudit({
    action: 'SEASON_ACTIVATED',
    targetType: 'season',
    targetId: seasonId,
    details: { name: season.name, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

export async function closeSeason(seasonId, adminUser) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const season = await getSeasonById(seasonId)
  
  if (!season) {
    throw new Error('Season not found')
  }
  
  await updateDoc(seasonRef, { isActive: false })
  
  await logAudit({
    action: 'SEASON_CLOSED',
    targetType: 'season',
    targetId: seasonId,
    details: { name: season.name, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

export async function updateSeason(seasonId, data, adminUser) {
  const seasonRef = doc(db, SEASONS_COLLECTION, seasonId)
  const season = await getSeasonById(seasonId)
  
  if (!season) {
    throw new Error('Season not found')
  }
  
  await updateDoc(seasonRef, data)
  
  await logAudit({
    action: 'SEASON_UPDATED',
    targetType: 'season',
    targetId: seasonId,
    details: { ...data, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}
