import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  addDoc, query, where, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { generateBusinessRewardCode } from '../utils/voucherCode'
import { createBusinessQuestReward } from './businessQuestRewards.service'
import { logAudit } from './audit.service'

const OWNER_QUESTS_COLLECTION = 'ownerQuests'
const PARTICIPATIONS_COLLECTION = 'ownerQuestParticipations'
const REWARDS_COLLECTION = 'businessQuestRewards'
const BUSINESSES_COLLECTION = 'businesses'

const GEOFENCE_RADIUS_METERS = 150

function getHaversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizeQuestDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    businessId: data.businessId || '',
    businessName: data.businessName || '',
    ownerUid: data.ownerUid || '',
    title: data.title || '',
    description: data.description || '',
    questType: data.questType || 'visit',
    requiredDurationMinutes: data.requiredDurationMinutes || 0,
    verificationMethod: data.verificationMethod || 'location',
    buyVerificationMethod: data.buyVerificationMethod || 'qr',
    qrToken: data.qrToken || null,
    eventCode: data.eventCode || null,
    dailyCode: data.dailyCode || null,
    dailyCodeRotatedAt: data.dailyCodeRotatedAt || null,
    autoRotateDaily: data.autoRotateDaily || false,
    rewardType: data.rewardType || 'discount_percent',
    rewardValue: data.rewardValue || 0,
    rewardItemName: data.rewardItemName || '',
    itemPhotoUrl: data.itemPhotoUrl || null,
    itemDetails: data.itemDetails || null,
    minimumPurchase: data.minimumPurchase || 0,
    quantityRequired: data.quantityRequired || 1,
    conditions: data.conditions || null,
    questInstructions: data.questInstructions || null,
    isActive: data.isActive !== false,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

function normalizeParticipationDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    uid: data.uid || '',
    userEmail: data.userEmail || '',
    questId: data.questId || '',
    businessId: data.businessId || '',
    ownerUid: data.ownerUid || '',
    status: data.status || 'joined',
    joinedAt: data.joinedAt || null,
    questStartedAt: data.questStartedAt || null,
    accumulatedSeconds: data.accumulatedSeconds || 0,
    timerStatus: data.timerStatus || 'idle',
    completedAt: data.completedAt || null,
    verificationMethod: data.verificationMethod || '',
    rewardCodeId: data.rewardCodeId || null,
    verifiedBy: data.verifiedBy || null,
    verifiedAt: data.verifiedAt || null,
    verifiedByMerchantUid: data.verifiedByMerchantUid || null,
  }
}

export async function listOwnerQuestsForBusiness(businessId) {
  if (!businessId) return []
  try {
    const q = query(
      collection(db, OWNER_QUESTS_COLLECTION),
      where('businessId', '==', businessId)
    )
    const snapshot = await getDocs(q)
    const list = snapshot.docs.map(normalizeQuestDoc)
    return list
      .filter(q => q.isActive !== false)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0
        return bTime - aTime
      })
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[ownerQuests] list for business failed:', error)
    return []
  }
}

export async function listAllOwnerQuests() {
  try {
    const q = query(
      collection(db, OWNER_QUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(normalizeQuestDoc)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[ownerQuests] listAll failed:', error)
    return []
  }
}

let questBusinessIdsCache = null
let questBusinessIdsPromise = null

export async function getBusinessIdsWithActiveQuests() {
  if (questBusinessIdsCache) return questBusinessIdsCache
  if (questBusinessIdsPromise) return questBusinessIdsPromise
  questBusinessIdsPromise = (async () => {
    try {
      const q = query(collection(db, OWNER_QUESTS_COLLECTION))
      const snapshot = await getDocs(q)
      const ids = new Set()
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.isActive !== false && data.businessId) {
          ids.add(String(data.businessId))
        }
      })
      questBusinessIdsCache = ids
      return ids
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[ownerQuests] getBusinessIdsWithActiveQuests failed:', error)
      return new Set()
    }
  })()
  return questBusinessIdsPromise
}

export async function listOwnerQuestsByOwner(ownerUid) {
  if (!ownerUid) return []
  try {
    const q = query(
      collection(db, OWNER_QUESTS_COLLECTION),
      where('ownerUid', '==', ownerUid)
    )
    const snapshot = await getDocs(q)
    const list = snapshot.docs.map(normalizeQuestDoc)
    return list.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0
      return bTime - aTime
    })
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[ownerQuests] list by owner failed:', error)
    return []
  }
}

export async function getOwnerQuestById(questId) {
  if (!questId) return null
  try {
    const snap = await getDoc(doc(db, OWNER_QUESTS_COLLECTION, String(questId)))
    if (!snap.exists()) return null
    return normalizeQuestDoc(snap)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[ownerQuests] getById failed:', error)
    return null
  }
}

export async function createOwnerQuest(ownerUid, businessId, businessName, data) {
  if (!businessId) throw new Error('Missing businessId')
  if (!data.title) throw new Error('Title is required')

  const user = auth.currentUser
  if (!user) throw new Error('Must be signed in to create a quest')
  const resolvedOwnerUid = user.uid

  if (import.meta.env.DEV) {
    console.log('[ownerQuests.create] auth.currentUser.uid:', resolvedOwnerUid)
    console.log('[ownerQuests.create] ownerUid param:', ownerUid)
  }

  const questType = data.questType || 'visit'
  const verificationMethod = questType === 'visit' ? 'location' : (data.verificationMethod || 'qr')

  let qrToken = null
  let eventCode = null
  let buyVerificationMethod = null
  let dailyCode = null
  let dailyCodeRotatedAt = null
  let autoRotateDaily = false

  if (questType === 'visit') {
    if (verificationMethod === 'qr') {
      qrToken = generateQRToken()
    } else if (verificationMethod === 'code') {
      eventCode = data.eventCode || generateEventCode()
    }
  } else if (questType === 'buy') {
    buyVerificationMethod = data.buyVerificationMethod || 'qr'
    if (buyVerificationMethod === 'qr') {
      qrToken = generateQRToken()
    } else if (buyVerificationMethod === 'code') {
      dailyCode = generateDailyCode()
      dailyCodeRotatedAt = serverTimestamp()
      autoRotateDaily = data.autoRotateDaily || false
    }
  }

  const questData = sanitizeForFirestore({
    businessId,
    businessName,
    ownerUid: resolvedOwnerUid,
    title: data.title,
    description: data.description || '',
    questType,
    requiredDurationMinutes: questType === 'visit' ? Math.max(1, Math.min(60, parseInt(data.requiredDurationMinutes, 10) || 15)) : 0,
    verificationMethod,
    buyVerificationMethod,
    qrToken,
    eventCode,
    dailyCode,
    dailyCodeRotatedAt,
    autoRotateDaily,
    rewardType: data.rewardType || 'discount_percent',
    rewardValue: parseFloat(data.rewardValue) || 0,
    rewardItemName: data.rewardItemName || '',
    itemPhotoUrl: data.itemPhotoUrl || null,
    itemDetails: data.itemDetails || null,
    minimumPurchase: Number(data.minimumPurchase) || 0,
    quantityRequired: Number(data.quantityRequired) || 1,
    conditions: data.conditions || null,
    questInstructions: data.questInstructions || null,
    isActive: data.isActive !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  if (import.meta.env.DEV) {
    console.log('[ownerQuests.create] Final payload ownerUid:', questData.ownerUid)
  }

  const docRef = await addDoc(collection(db, OWNER_QUESTS_COLLECTION), questData)
  return { id: docRef.id, ...questData }
}

export async function updateOwnerQuest(questId, data) {
  const idStr = String(questId)
  const payload = sanitizeForFirestore({
    ...data,
    updatedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, OWNER_QUESTS_COLLECTION, idStr), payload)
  return { success: true }
}

export async function toggleOwnerQuestActive(questId, isActive) {
  const idStr = String(questId)
  await updateDoc(doc(db, OWNER_QUESTS_COLLECTION, idStr), {
    isActive,
    updatedAt: serverTimestamp(),
  })
  return { success: true }
}

export async function generateOwnerQuestQRToken(questId) {
  const token = generateQRToken()
  const idStr = String(questId)
  await updateDoc(doc(db, OWNER_QUESTS_COLLECTION, idStr), {
    qrToken: token,
    updatedAt: serverTimestamp(),
  })
  return token
}

export async function generateOwnerQuestEventCode(questId) {
  const code = generateEventCode()
  const idStr = String(questId)
  await updateDoc(doc(db, OWNER_QUESTS_COLLECTION, idStr), {
    eventCode: code,
    updatedAt: serverTimestamp(),
  })
  return code
}

export async function joinOwnerQuest(uid, userEmail, questId) {
  if (!uid || !questId) throw new Error('Missing uid or questId')

  const quest = await getOwnerQuestById(questId)
  if (!quest) throw new Error('Quest not found')
  if (!quest.isActive) throw new Error('Quest is not active')

  const participationId = `${uid}_${questId}`
  const existingSnap = await getDoc(doc(db, PARTICIPATIONS_COLLECTION, participationId))
  if (existingSnap.exists()) {
    const existing = existingSnap.data()
    if (existing.status === 'completed') throw new Error('You already completed this quest')
    if (existing.status === 'active' || existing.status === 'joined') throw new Error('You already joined this quest')
  }

  const participation = sanitizeForFirestore({
    uid,
    userEmail: userEmail || '',
    questId,
    businessId: quest.businessId,
    ownerUid: quest.ownerUid,
    status: 'joined',
    joinedAt: serverTimestamp(),
    questStartedAt: null,
    accumulatedSeconds: 0,
    timerStatus: 'idle',
    completedAt: null,
    verificationMethod: quest.verificationMethod,
    rewardCodeId: null,
  })

  await setDoc(doc(db, PARTICIPATIONS_COLLECTION, participationId), participation)
  return { id: participationId, ...participation }
}

export async function getOwnerQuestParticipation(uid, questId) {
  if (!uid || !questId) return null
  try {
    const snap = await getDoc(doc(db, PARTICIPATIONS_COLLECTION, `${uid}_${questId}`))
    if (!snap.exists()) return null
    return normalizeParticipationDoc(snap)
  } catch {
    return null
  }
}

export async function startOwnerQuestTimer(uid, questId) {
  const participationId = `${uid}_${questId}`
  const ref = doc(db, PARTICIPATIONS_COLLECTION, participationId)

  const quest = await getOwnerQuestById(questId)
  if (!quest) throw new Error('Quest not found')
  if (quest.questType !== 'visit') throw new Error('Only visit quests have timers')

  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Participation not found')
  const data = snap.data()
  if (data.status !== 'joined' && data.status !== 'active') throw new Error('Cannot start timer in current status')

  await updateDoc(ref, {
    status: 'active',
    questStartedAt: serverTimestamp(),
    timerStatus: 'running',
  })

  return { success: true }
}

export async function pauseOwnerQuestTimer(uid, questId) {
  const participationId = `${uid}_${questId}`
  const ref = doc(db, PARTICIPATIONS_COLLECTION, participationId)

  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Participation not found')
  const data = snap.data()
  if (data.timerStatus !== 'running') throw new Error('Timer is not running')

  const now = Timestamp.now()
  const startedAt = data.questStartedAt?.toMillis?.() || data.questStartedAt?._seconds * 1000 || Date.now()
  const elapsedSinceStart = Math.floor((now.toMillis() - startedAt) / 1000)
  const newAccumulated = (data.accumulatedSeconds || 0) + Math.max(0, elapsedSinceStart)

  await updateDoc(ref, {
    accumulatedSeconds: newAccumulated,
    questStartedAt: null,
    timerStatus: 'paused',
  })

  return { accumulatedSeconds: newAccumulated }
}

export async function resumeOwnerQuestTimer(uid, questId) {
  const participationId = `${uid}_${questId}`
  const ref = doc(db, PARTICIPATIONS_COLLECTION, participationId)

  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Participation not found')
  const data = snap.data()
  if (data.timerStatus !== 'paused') throw new Error('Timer is not paused')

  await updateDoc(ref, {
    questStartedAt: serverTimestamp(),
    timerStatus: 'running',
  })

  return { success: true }
}

export function getElapsedSeconds(participation) {
  if (!participation) return 0
  const accumulated = participation.accumulatedSeconds || 0
  if (participation.timerStatus === 'running' && participation.questStartedAt) {
    const startedAt = participation.questStartedAt?.toMillis?.() || participation.questStartedAt?._seconds * 1000 || 0
    const now = Date.now()
    return accumulated + Math.floor((now - startedAt) / 1000)
  }
  return accumulated
}

export function getRemainingSeconds(participation, quest) {
  const requiredSeconds = (quest?.requiredDurationMinutes || 0) * 60
  const elapsed = getElapsedSeconds(participation)
  return Math.max(0, requiredSeconds - elapsed)
}

export async function completeOwnerQuest(uid, questId) {
  const participationId = `${uid}_${questId}`
  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)

  const quest = await getOwnerQuestById(questId)
  if (!quest) throw new Error('Quest not found')

  const snap = await getDoc(partRef)
  if (!snap.exists()) throw new Error('Participation not found')
  const participation = snap.data()
  if (participation.status === 'completed') throw new Error('Already completed')

  const reward = await createBusinessQuestReward(uid, participation.userEmail || '', quest, participation)

  await updateDoc(partRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    timerStatus: 'completed',
    rewardCodeId: reward.id,
  })

  return { success: true, reward }
}

export async function verifyOwnerQuestByQR(uid, questId, scannedToken) {
  const quest = await getOwnerQuestById(questId)
  if (!quest) throw new Error('Quest not found')
  if (quest.qrToken !== scannedToken) throw new Error('Invalid QR code')

  const participationId = `${uid}_${questId}`
  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snap = await getDoc(partRef)
  if (!snap.exists()) throw new Error('You have not joined this quest')
  const participation = snap.data()
  if (participation.status === 'completed') throw new Error('Already completed')

  const reward = await createBusinessQuestReward(uid, participation.userEmail || '', quest, participation)

  await updateDoc(partRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    rewardCodeId: reward.id,
  })

  return { success: true, reward }
}

export async function verifyOwnerQuestByCode(uid, questId, enteredCode) {
  const quest = await getOwnerQuestById(questId)
  if (!quest) throw new Error('Quest not found')
  if (!quest.eventCode) throw new Error('This quest does not have an event code')
  if (quest.eventCode.toLowerCase() !== enteredCode.trim().toLowerCase()) throw new Error('Invalid code')

  const participationId = `${uid}_${questId}`
  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snap = await getDoc(partRef)
  if (!snap.exists()) throw new Error('You have not joined this quest')
  const participation = snap.data()
  if (participation.status === 'completed') throw new Error('Already completed')

  const reward = await createBusinessQuestReward(uid, participation.userEmail || '', quest, participation)

  await updateDoc(partRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    rewardCodeId: reward.id,
  })

  return { success: true, reward }
}

export async function getOwnerQuestParticipations(questId) {
  if (!questId) return []
  try {
    const q = query(
      collection(db, PARTICIPATIONS_COLLECTION),
      where('questId', '==', questId)
    )
    const snapshot = await getDocs(q)
    const list = snapshot.docs.map(normalizeParticipationDoc)
    return list.filter(p => p.status === 'completed')
  } catch {
    return []
  }
}

export async function cancelOwnerQuestParticipation(uid, questId) {
  const participationId = `${uid}_${questId}`
  const ref = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Participation not found')
  const data = snap.data()
  if (data.status === 'completed') throw new Error('Cannot cancel a completed quest')

  await updateDoc(ref, {
    status: 'cancelled',
    timerStatus: 'idle',
    questStartedAt: null,
  })

  return { success: true }
}

export async function checkUserWithinGeofence(userLat, userLng, businessId) {
  try {
    const snap = await getDoc(doc(db, BUSINESSES_COLLECTION, String(businessId)))
    if (!snap.exists()) return { within: false, error: 'Business not found' }

    const data = snap.data()
    const pos = data.position || data.location
    if (!pos) return { within: false, error: 'Business has no location' }

    const bizLat = Array.isArray(pos) ? pos[0] : pos.lat
    const bizLng = Array.isArray(pos) ? pos[1] : pos.lng

    const distance = getHaversineDistance(userLat, userLng, bizLat, bizLng)
    return {
      within: distance <= GEOFENCE_RADIUS_METERS,
      distance: Math.round(distance),
      businessLat: bizLat,
      businessLng: bizLng,
    }
  } catch (error) {
    return { within: false, error: error.message }
  }
}

export async function regenerateBuyQuestQRToken(questId) {
  const token = generateQRToken()
  const idStr = String(questId)
  await updateDoc(doc(db, OWNER_QUESTS_COLLECTION, idStr), {
    qrToken: token,
    updatedAt: serverTimestamp(),
  })
  return token
}

export async function rotateBuyQuestDailyCode(questId, ownerUid) {
  const idStr = String(questId)
  const snap = await getDoc(doc(db, OWNER_QUESTS_COLLECTION, idStr))
  if (!snap.exists()) throw new Error('Quest not found')
  const data = snap.data()
  if (data.ownerUid !== ownerUid) throw new Error('Only the business owner can rotate the code')

  const code = generateDailyCode()
  await updateDoc(doc(db, OWNER_QUESTS_COLLECTION, idStr), {
    dailyCode: code,
    dailyCodeRotatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await logAudit({
    action: 'rotate_quest_daily_code',
    targetType: 'ownerQuests',
    targetId: questId,
    adminUid: ownerUid,
    meta: { newCode: code },
  })

  return code
}

export async function verifyBuyQuestByQR(uid, questId, scannedToken, userLocation) {
  if (!uid || !questId) throw new Error('Missing uid or questId')
  if (!scannedToken) throw new Error('QR code is required')
  if (!userLocation?.lat || !userLocation?.lng) throw new Error('Location access required for verification')

  const quest = await getOwnerQuestById(questId)
  if (!quest) throw new Error('Quest not found')
  if (quest.questType !== 'buy') throw new Error('This is not a buy quest')
  if (quest.buyVerificationMethod !== 'qr') throw new Error('This quest does not use QR verification')
  if (!quest.isActive) throw new Error('Quest is not active')
  if (quest.qrToken !== scannedToken) throw new Error('QR code doesn\'t match this quest')

  const bizPos = quest.businessId ? await getBusinessPosition(quest.businessId) : null
  if (bizPos) {
    const distance = getHaversineDistance(userLocation.lat, userLocation.lng, bizPos.lat, bizPos.lng)
    if (distance > GEOFENCE_RADIUS_METERS) {
      const distStr = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`
      throw new Error(`You must be at the business location to verify (you're ${distStr} away)`)
    }
  }

  const participationId = `${uid}_${questId}`
  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snap = await getDoc(partRef)
  if (!snap.exists()) throw new Error('You have not joined this quest')
  const participation = snap.data()
  if (participation.status === 'completed') throw new Error('Quest already completed')
  if (participation.status !== 'joined') throw new Error('Cannot verify in current status')

  const reward = await createBusinessQuestReward(uid, participation.userEmail || '', quest, participation)

  await updateDoc(partRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    rewardCodeId: reward.id,
    verifiedBy: 'qr_scan',
    verifiedAt: serverTimestamp(),
  })

  return { success: true, reward }
}

export async function verifyBuyQuestByCode(uid, questId, enteredCode, userLocation) {
  if (!uid || !questId) throw new Error('Missing uid or questId')
  if (!enteredCode) throw new Error('Code is required')
  if (!userLocation?.lat || !userLocation?.lng) throw new Error('Location access required for verification')

  const quest = await getOwnerQuestById(questId)
  if (!quest) throw new Error('Quest not found')
  if (quest.questType !== 'buy') throw new Error('This is not a buy quest')
  if (quest.buyVerificationMethod !== 'code') throw new Error('This quest does not use code verification')
  if (!quest.isActive) throw new Error('Quest is not active')
  if (!quest.dailyCode) throw new Error('No daily code set for this quest')

  const normalizedEntered = enteredCode.trim().toUpperCase()
  const normalizedStored = quest.dailyCode.trim().toUpperCase()
  if (normalizedEntered !== normalizedStored) throw new Error('Invalid code. Ask staff for today\'s code.')

  const bizPos = quest.businessId ? await getBusinessPosition(quest.businessId) : null
  if (bizPos) {
    const distance = getHaversineDistance(userLocation.lat, userLocation.lng, bizPos.lat, bizPos.lng)
    if (distance > GEOFENCE_RADIUS_METERS) {
      const distStr = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`
      throw new Error(`You must be at the business location to verify (you're ${distStr} away)`)
    }
  }

  const participationId = `${uid}_${questId}`
  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snap = await getDoc(partRef)
  if (!snap.exists()) throw new Error('You have not joined this quest')
  const participation = snap.data()
  if (participation.status === 'completed') throw new Error('Quest already completed')
  if (participation.status !== 'joined') throw new Error('Cannot verify in current status')

  const reward = await createBusinessQuestReward(uid, participation.userEmail || '', quest, participation)

  await updateDoc(partRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    rewardCodeId: reward.id,
    verifiedBy: 'daily_code',
    verifiedAt: serverTimestamp(),
  })

  return { success: true, reward }
}

export async function merchantMarkParticipationComplete(merchantUid, participationId) {
  if (!merchantUid || !participationId) throw new Error('Missing merchantUid or participationId')

  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snap = await getDoc(partRef)
  if (!snap.exists()) throw new Error('Participation not found')

  const participation = snap.data()
  if (participation.status === 'completed') throw new Error('Already completed')
  if (participation.ownerUid !== merchantUid) throw new Error('Only the business owner can complete this')

  const quest = await getOwnerQuestById(participation.questId)
  if (!quest) throw new Error('Quest not found')
  if (quest.ownerUid !== merchantUid) throw new Error('Only the business owner can complete this')

  const reward = await createBusinessQuestReward(participation.uid, participation.userEmail || '', quest, participation)

  await updateDoc(partRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    rewardCodeId: reward.id,
    verifiedBy: 'merchant_manual',
    verifiedAt: serverTimestamp(),
    verifiedByMerchantUid: merchantUid,
  })

  await logAudit({
    action: 'merchant_manual_complete',
    targetType: 'ownerQuestParticipations',
    targetId: participationId,
    adminUid: merchantUid,
    meta: { questId: participation.questId, uid: participation.uid },
  })

  return { success: true, reward }
}

export async function getQuestParticipationsForMerchant(questId, merchantUid) {
  if (!questId || !merchantUid) return []

  const quest = await getOwnerQuestById(questId)
  if (!quest) return []
  if (quest.ownerUid !== merchantUid) return []

  try {
    const q = query(
      collection(db, PARTICIPATIONS_COLLECTION),
      where('questId', '==', questId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(normalizeParticipationDoc)
  } catch {
    return []
  }
}

async function getBusinessPosition(businessId) {
  try {
    const snap = await getDoc(doc(db, BUSINESSES_COLLECTION, String(businessId)))
    if (!snap.exists()) return null
    const data = snap.data()
    const pos = data.position || data.location
    if (!pos) return null
    return {
      lat: Array.isArray(pos) ? pos[0] : pos.lat,
      lng: Array.isArray(pos) ? pos[1] : pos.lng,
    }
  } catch {
    return null
  }
}

function generateQRToken() {
  const length = 32
  const chars = 'abcdef0123456789'
  let result = ''
  const array = new Uint32Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * chars.length)
  }
  for (let i = 0; i < length; i++) result += chars.charAt(array[i] % chars.length)
  return result
}

function generateEventCode() {
  const num = Math.floor(100 + Math.random() * 900)
  return `BIZ-${num}`
}

function generateDailyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const array = new Uint32Array(6)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < 6; i++) array[i] = Math.floor(Math.random() * chars.length)
  }
  for (let i = 0; i < 6; i++) result += chars.charAt(array[i] % chars.length)
  return result
}
