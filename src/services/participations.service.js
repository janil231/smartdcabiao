import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getQuestById } from './quests.service'
import { addPointsEntry } from './pointsLedger.service'
import { logAudit } from './audit.service'
import { addImpactEntry } from './impactLedger.service'
import { incrementEarnedPoints } from './seasonBalances.service'

const PARTICIPATIONS_COLLECTION = 'participations'
const QUESTS_COLLECTION = 'quests'
const SEASON_USER_STATS_COLLECTION = 'seasonUserStats'

function getParticipationId(questId, uid) {
  return `${questId}_${uid}`
}

export async function getUserParticipation(uid, questId) {
  const participationId = getParticipationId(questId, uid)
  const participationRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snapshot = await getDoc(participationRef)
  
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() }
  }
  
  return null
}

export async function getUserParticipations(uid) {
  const participationsRef = collection(db, PARTICIPATIONS_COLLECTION)
  const q = query(participationsRef, where('uid', '==', uid))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getQuestParticipations(questId) {
  const participationsRef = collection(db, PARTICIPATIONS_COLLECTION)
  const q = query(participationsRef, where('questId', '==', questId))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function countActiveJoinedParticipations(questId) {
  const parts = await getQuestParticipations(questId)
  return parts.filter((p) => p.status === 'joined').length
}

export async function syncQuestReservedCount(questId) {
  const activeJoined = await countActiveJoinedParticipations(questId)
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  await updateDoc(questRef, { reservedCount: activeJoined })
  return activeJoined
}

/** Fix quests whose stored reservedCount drifted above capacity (display + join). */
export async function reconcileOverbookedQuestSlots(quests) {
  return Promise.all(
    quests.map(async (quest) => {
      const capacity = Math.max(0, Number(quest.capacity) || 0)
      const reserved = Math.max(0, Number(quest.reservedCount) || 0)
      if (capacity > 0 && reserved > capacity) {
        const synced = await syncQuestReservedCount(quest.id)
        return { ...quest, reservedCount: synced }
      }
      return quest
    })
  )
}

export async function joinQuest({ uid, questId, userEmail }) {
  const quest = await getQuestById(questId)
  if (!quest) {
    throw new Error('Quest not found')
  }

  if (quest.status === 'inactive') {
    throw new Error('Cannot join an inactive quest')
  }

  const now = new Date()
  const gracePeriodHours = quest.gracePeriodHours || 24
  const expiresAt = new Date(now.getTime() + gracePeriodHours * 60 * 60 * 1000)

  const participationId = getParticipationId(questId, uid)
  const participationRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)

  const existing = await getDoc(participationRef)
  if (existing.exists()) {
    const existingData = existing.data()
    if (existingData.status === 'joined') {
      throw new Error('Already joined this quest')
    }
    if (existingData.status === 'completed') {
      throw new Error('Already completed this quest')
    }
  }

  const capacity = Math.max(0, Number(quest.capacity) || 0)
  const activeJoined = await countActiveJoinedParticipations(questId)

  if (capacity > 0 && activeJoined >= capacity) {
    throw new Error('This quest is full. All slots are taken.')
  }

  const participationData = {
    questId,
    seasonId: quest.seasonId,
    uid,
    userEmail,
    status: 'joined',
    rewardStatus: 'pending',
    joinedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    completedAt: null,
    pointsAwarded: null,
    verificationMethod: null,
    verifiedAt: null,
    verificationData: null,
    autoApproved: false,
    rejectionReason: null,
  }

  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const nextReserved = activeJoined + 1

  const batch = writeBatch(db)
  batch.set(participationRef, participationData, { merge: true })
  batch.update(questRef, { reservedCount: nextReserved })
  await batch.commit()

  return { success: true }
}

export async function cancelQuest({ uid, questId }) {
  const participationId = getParticipationId(questId, uid)
  const participationRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snapshot = await getDoc(participationRef)
  
  if (!snapshot.exists()) {
    throw new Error('Participation not found')
  }
  
  const data = snapshot.data()
  if (data.status !== 'joined') {
    throw new Error('Cannot cancel - participation is not active')
  }

  await updateDoc(participationRef, {
    status: 'cancelled',
    rewardStatus: 'expired',
  })

  await syncQuestReservedCount(questId)

  return { success: true }
}

export async function expireMyStaleParticipations(uid) {
  const participations = await getUserParticipations(uid)
  const now = new Date()
  const expiredIds = []

  for (const p of participations) {
    if (p.status !== 'joined' || !p.expiresAt) continue
    const expiresAt = new Date(p.expiresAt)
    if (expiresAt >= now) continue

    try {
      expiredIds.push(p.id)
      await updateDoc(doc(db, PARTICIPATIONS_COLLECTION, p.id), {
        status: 'expired',
        rewardStatus: 'expired',
      })
      await syncQuestReservedCount(p.questId)
    } catch (err) {
      console.warn('Could not expire participation', p.id, err?.message || err)
    }
  }

  return expiredIds
}

export async function expireAllStaleParticipations() {
  const participationsRef = collection(db, PARTICIPATIONS_COLLECTION)
  const snapshot = await getDocs(participationsRef)
  
  const now = new Date()
  let expiredCount = 0
  const questSlotDeltas = {}
  
  for (const docSnap of snapshot.docs) {
    const p = docSnap.data()
    if (p.status === 'joined' && p.expiresAt) {
      const expiresAt = new Date(p.expiresAt)
      if (expiresAt < now) {
        expiredCount++
        await updateDoc(doc(db, PARTICIPATIONS_COLLECTION, docSnap.id), {
          status: 'expired',
          rewardStatus: 'expired',
        })
        
        if (!questSlotDeltas[p.questId]) {
          questSlotDeltas[p.questId] = 0
        }
        questSlotDeltas[p.questId]++
      }
    }
  }
  
  for (const questId of Object.keys(questSlotDeltas)) {
    await syncQuestReservedCount(questId)
  }
  
  return { expiredCount, freedSlots: expiredCount }
}

async function updateSeasonUserStats({ uid, userEmail, seasonId, points, impactUnit, impactAmount }) {
  if (!uid || !seasonId) return

  const statsDocId = `${seasonId}_${uid}`
  const statsRef = doc(db, SEASON_USER_STATS_COLLECTION, statsDocId)
  const statsSnapshot = await getDoc(statsRef)

  const displayName = userEmail ? userEmail.split('@')[0] : 'Anonymous'

  if (!statsSnapshot.exists()) {
    const initialData = {
      seasonId,
      uid,
      userEmail,
      displayName,
      publicName: displayName,
      showOnLeaderboard: true,
      pointsTotal: points,
      completedQuestsCount: 1,
      impactTotalsByUnit: impactUnit ? { [impactUnit]: impactAmount } : {},
      updatedAt: serverTimestamp(),
    }
    await setDoc(statsRef, initialData)
  } else {
    const updateData = {
      pointsTotal: increment(points),
      completedQuestsCount: increment(1),
      userEmail,
      displayName,
      updatedAt: serverTimestamp(),
    }

    if (impactUnit) {
      updateData[`impactTotalsByUnit.${impactUnit}`] = increment(impactAmount)
    }

    await updateDoc(statsRef, updateData)
  }
}

export async function adminMarkCompleted({ uid, questId, adminUser }) {
  const participationId = getParticipationId(questId, uid)
  const participationRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snapshot = await getDoc(participationRef)
  
  if (!snapshot.exists()) {
    throw new Error('Participation not found')
  }
  
  const participation = snapshot.data()
  if (participation.status === 'completed') {
    throw new Error('Already completed')
  }

  const quest = await getQuestById(questId)
  if (!quest) {
    throw new Error('Quest not found')
  }

  const now = new Date()
  
  await updateDoc(participationRef, {
    status: 'completed',
    rewardStatus: 'released',
    completedAt: now.toISOString(),
    pointsAwarded: quest.points || 0,
  })

  await addPointsEntry({
    uid,
    seasonId: quest.seasonId,
    questId,
    points: quest.points || 0,
    reason: `Completed quest: ${quest.title}`,
  })

  if (quest.impact && quest.impact.unit && quest.impact.amountPerCompletion) {
    await addImpactEntry({
      uid,
      userEmail: participation.userEmail,
      seasonId: quest.seasonId,
      questId,
      questTitle: quest.title,
      unit: quest.impact.unit,
      amount: quest.impact.amountPerCompletion,
      adminUser,
    })
  }

  await syncQuestReservedCount(questId)

  await incrementEarnedPoints(quest.seasonId, { uid, email: participation.userEmail }, quest.points || 0)

  await updateSeasonUserStats({
    uid,
    userEmail: participation.userEmail,
    seasonId: quest.seasonId,
    points: quest.points || 0,
    impactUnit: quest.impact?.unit || null,
    impactAmount: quest.impact?.amountPerCompletion || 0,
  })

  await logAudit({
    action: 'QUEST_COMPLETED_BY_ADMIN',
    targetType: 'participation',
    targetId: participationId,
    details: {
      questId,
      questTitle: quest.title,
      uid,
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      pointsAwarded: quest.points,
    },
  })
  
  return { success: true }
}

export async function markQuestCompletedByUser(uid, questId) {
  const participationId = getParticipationId(questId, uid)
  const participationRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snapshot = await getDoc(participationRef)
  
  if (!snapshot.exists()) {
    throw new Error('Participation not found')
  }
  
  const participation = snapshot.data()
  if (participation.status !== 'joined') {
    throw new Error('Cannot mark as completed - not in joined status')
  }

  const quest = await getQuestById(questId)
  if (!quest) {
    throw new Error('Quest not found')
  }

  const now = new Date()
  
  await updateDoc(participationRef, {
    status: 'completed',
    rewardStatus: 'released',
    completedAt: now.toISOString(),
    pointsAwarded: quest.points || 0,
  })

  await addPointsEntry({
    uid,
    seasonId: quest.seasonId,
    questId,
    points: quest.points || 0,
    reason: `Completed quest: ${quest.title}`,
  })

  await syncQuestReservedCount(questId)

  return { success: true }
}
