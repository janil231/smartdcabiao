import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getUserPointsForSeason } from './pointsLedger.service'
import { listUserImpact, sumImpactByUnit } from './impactLedger.service'
import { getUserParticipations } from './participations.service'
import { getActiveSeason } from './seasons.service'

const REVIEWS_COLLECTION = 'reviews'

const statsCache = new Map()

function getCacheKey(uid, seasonId) {
  return `${uid}_${seasonId}`
}

function setCache(uid, seasonId, data) {
  const key = getCacheKey(uid, seasonId)
  statsCache.set(key, {
    data,
    timestamp: Date.now()
  })
}

function getCache(uid, seasonId) {
  const key = getCacheKey(uid, seasonId)
  const cached = statsCache.get(key)
  
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data
  }
  
  return null
}

export async function getMySeasonStats(uid, seasonId) {
  if (!uid || !seasonId) {
    return {
      pointsTotal: 0,
      completedQuestsCount: 0,
      impactTotalsByUnit: {},
      approvedReviewsCount: 0,
      favoritesCount: 0
    }
  }

  const cached = getCache(uid, seasonId)
  if (cached) {
    return cached
  }

  try {
    const [
      pointsTotal,
      impactEntries,
      participations,
      approvedReviewsCount
    ] = await Promise.all([
      getUserPointsForSeason(uid, seasonId),
      listUserImpact({ uid, seasonId }),
      getUserParticipations(uid),
      getApprovedReviewsCount(uid)
    ])

    const impactTotalsByUnit = sumImpactByUnit(impactEntries)

    const completedQuestsCount = participations.filter(
      p => p.status === 'completed' && p.seasonId === seasonId
    ).length

    const result = {
      pointsTotal,
      completedQuestsCount,
      impactTotalsByUnit,
      approvedReviewsCount
    }

    setCache(uid, seasonId, result)

    return result
  } catch (error) {
    console.error('Error fetching season stats:', error)
    return {
      pointsTotal: 0,
      completedQuestsCount: 0,
      impactTotalsByUnit: {},
      approvedReviewsCount: 0,
      favoritesCount: 0
    }
  }
}

async function getApprovedReviewsCount(uid) {
  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION)
    const q = query(
      reviewsRef,
      where('uid', '==', uid),
      where('status', '==', 'approved')
    )

    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error) {
    console.error('Error getting approved reviews count:', error)
    return 0
  }
}

export async function getUserSeasonWithActive() {
  const activeSeason = await getActiveSeason()
  
  if (!activeSeason) {
    return {
      season: null,
      stats: {
        pointsTotal: 0,
        completedQuestsCount: 0,
        impactTotalsByUnit: {},
        approvedReviewsCount: 0,
        favoritesCount: 0
      }
    }
  }

  return {
    season: activeSeason,
    seasonId: activeSeason.id
  }
}

export function clearStatsCache(uid) {
  if (uid) {
    for (const key of statsCache.keys()) {
      if (key.startsWith(uid)) {
        statsCache.delete(key)
      }
    }
  } else {
    statsCache.clear()
  }
}

export const IMPACT_UNIT_CONFIG = {
  kg_trash: { label: 'Kg of trash collected', short: 'kg trash', icon: '🧹' },
  trees: { label: 'Trees planted', short: 'trees', icon: '🌳' },
  hours: { label: 'Volunteer hours', short: 'hours', icon: '⏰' },
  kg_plastic: { label: 'Kg of plastic removed', short: 'kg plastic', icon: '♻️' },
  co2_kg: { label: 'Kg CO₂ avoided', short: 'kg CO₂', icon: '💨' }
}
