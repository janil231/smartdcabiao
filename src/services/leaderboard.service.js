import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore'
import { db } from '../lib/firebase'

const SEASON_USER_STATS_COLLECTION = 'seasonUserStats'

export async function listTopByPoints(seasonId, limit = 10) {
  if (!seasonId) return []

  try {
    const q = query(
      collection(db, SEASON_USER_STATS_COLLECTION),
      where('seasonId', '==', seasonId),
      where('showOnLeaderboard', '==', true),
      orderBy('pointsTotal', 'desc'),
      firestoreLimit(limit)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc, index) => {
      const data = doc.data()
      return {
        rank: index + 1,
        uid: data.uid,
        name: data.publicName || data.displayName || 'Anonymous',
        pointsTotal: data.pointsTotal || 0,
        completedQuestsCount: data.completedQuestsCount || 0,
        impactTotalsByUnit: data.impactTotalsByUnit || {},
      }
    })
  } catch (error) {
    console.error('Error fetching top by points:', error)
    return []
  }
}

export async function listTopByImpact(seasonId, unit = 'trees', limit = 10) {
  if (!seasonId) return []

  try {
    const q = query(
      collection(db, SEASON_USER_STATS_COLLECTION),
      where('seasonId', '==', seasonId),
      where('showOnLeaderboard', '==', true),
      orderBy(`impactTotalsByUnit.${unit}`, 'desc'),
      firestoreLimit(limit)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc, index) => {
      const data = doc.data()
      const impact = data.impactTotalsByUnit?.[unit] || 0
      return {
        rank: index + 1,
        uid: data.uid,
        name: data.publicName || data.displayName || 'Anonymous',
        pointsTotal: data.pointsTotal || 0,
        completedQuestsCount: data.completedQuestsCount || 0,
        impact: impact,
        impactUnit: unit,
        impactTotalsByUnit: data.impactTotalsByUnit || {},
      }
    })
  } catch (error) {
    console.error('Error fetching top by impact:', error)
    return []
  }
}

export async function getUserSeasonStats(uid, seasonId) {
  if (!uid || !seasonId) return null

  try {
    const statsDocId = `${seasonId}_${uid}`
    const { doc: getDocRef } = await import('firebase/firestore')
    const { getDoc } = await import('firebase/firestore')
    const statsRef = getDocRef(db, SEASON_USER_STATS_COLLECTION, statsDocId)
    const snapshot = await getDoc(statsRef)

    if (!snapshot.exists()) return null

    const data = snapshot.data()
    return {
      uid: data.uid,
      name: data.publicName || data.displayName || 'Anonymous',
      pointsTotal: data.pointsTotal || 0,
      completedQuestsCount: data.completedQuestsCount || 0,
      impactTotalsByUnit: data.impactTotalsByUnit || {},
      showOnLeaderboard: data.showOnLeaderboard ?? true,
    }
  } catch (error) {
    console.error('Error fetching user season stats:', error)
    return null
  }
}

export async function updateUserLeaderboardSettings(uid, seasonId, { showOnLeaderboard, publicName }) {
  if (!uid || !seasonId) return { success: false, error: 'Missing uid or seasonId' }

  try {
    const { doc: getDocRef, updateDoc: updateDocRef, getDoc } = await import('firebase/firestore')
    const statsDocId = `${seasonId}_${uid}`
    const statsRef = getDocRef(db, SEASON_USER_STATS_COLLECTION, statsDocId)
    const snapshot = await getDoc(statsRef)

    const updateData = {}
    if (typeof showOnLeaderboard === 'boolean') {
      updateData.showOnLeaderboard = showOnLeaderboard
    }
    if (typeof publicName === 'string') {
      updateData.publicName = publicName
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true }
    }

    if (!snapshot.exists()) {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(statsRef, {
        seasonId,
        uid,
        displayName: publicName || 'Anonymous',
        publicName: publicName || 'Anonymous',
        showOnLeaderboard: showOnLeaderboard ?? true,
        pointsTotal: 0,
        completedQuestsCount: 0,
        impactTotalsByUnit: {},
      })
    } else {
      await updateDocRef(statsRef, updateData)
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating leaderboard settings:', error)
    return { success: false, error: error.message }
  }
}

export const IMPACT_UNITS = [
  { value: 'trees', label: 'Trees', icon: '🌳' },
  { value: 'kg_trash', label: 'Kg Trash', icon: '🧹' },
  { value: 'hours', label: 'Hours', icon: '⏰' },
  { value: 'kg_plastic', label: 'Kg Plastic', icon: '♻️' },
  { value: 'co2_kg', label: 'Kg CO₂', icon: '💨' },
]
