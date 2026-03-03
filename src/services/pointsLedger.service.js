import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const POINTS_LEDGER_COLLECTION = 'pointsLedger'

export async function addPointsEntry({ uid, seasonId, questId, points, reason }) {
  const entryId = `${uid}_${questId}_${Date.now()}`
  const entryRef = doc(db, POINTS_LEDGER_COLLECTION, entryId)
  
  await setDoc(entryRef, {
    uid,
    seasonId,
    questId,
    points,
    reason,
    createdAt: new Date().toISOString(),
  })
  
  return { id: entryId, success: true }
}

export async function getUserPointsLedger(uid) {
  const ledgerRef = collection(db, POINTS_LEDGER_COLLECTION)
  const q = query(ledgerRef, where('uid', '==', uid))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getUserPointsForSeason(uid, seasonId) {
  const ledger = await getUserPointsLedger(uid)
  const seasonPoints = ledger.filter(entry => entry.seasonId === seasonId)
  
  return seasonPoints.reduce((total, entry) => total + (entry.points || 0), 0)
}

export async function getUserSeasonPointsSummary(uid, seasonId) {
  const ledger = await getUserPointsLedger(uid)
  const seasonPoints = ledger.filter(entry => entry.seasonId === seasonId)
  
  const totalPoints = seasonPoints.reduce((total, entry) => total + (entry.points || 0), 0)
  const questsCompleted = new Set(seasonPoints.map(entry => entry.questId)).size
  
  return {
    totalPoints,
    questsCompleted,
    entries: seasonPoints,
  }
}
