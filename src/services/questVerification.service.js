import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  increment,
  setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getQuestById } from './quests.service'
import { syncQuestReservedCount } from './participations.service'
import { addPointsEntry } from './pointsLedger.service'
import { incrementEarnedPoints } from './seasonBalances.service'
import { addImpactEntry } from './impactLedger.service'
import { logAudit } from './audit.service'
import { adminMarkCompleted } from './participations.service'

const PARTICIPATIONS_COLLECTION = 'participations'
const SEASON_USER_STATS_COLLECTION = 'seasonUserStats'

function getParticipationId(questId, uid) {
  return `${questId}_${uid}`
}

export function generateQRToken() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateEventCode() {
  const num = Math.floor(100 + Math.random() * 900)
  return `CABIAO-${num}`
}

export function buildQRPayload(questId, qrToken) {
  return `CABIAO|QUEST|${questId}|${qrToken}`
}

export function parseQRPayload(payload) {
  const parts = String(payload || '').trim().split('|')
  if (parts.length !== 4 || parts[0] !== 'CABIAO' || parts[1] !== 'QUEST') {
    return null
  }
  return { questId: parts[2], qrToken: parts[3] }
}

export function getEffectiveVerificationMethod(quest) {
  if (quest?.verificationMethod) return quest.verificationMethod
  const qt = quest?.questType || quest?.category
  if (qt === 'visit' || qt === 'buy') return 'qr'
  if (qt === 'participate' || qt === 'event' || qt === 'cleanup' || qt === 'treePlanting') {
    return 'code'
  }
  return 'manual'
}

export function questNeedsVerificationTokens(quest) {
  const method = getEffectiveVerificationMethod(quest)
  if (method === 'qr') return !quest?.qrPayload || !quest?.qrToken
  if (method === 'code') return !quest?.eventCode
  return false
}

/** Create QR payload or event code when missing (does not rotate existing tokens). */
export async function ensureQuestVerificationTokens(questId) {
  const quest = await getQuestById(questId)
  if (!quest || !questNeedsVerificationTokens(quest)) {
    return quest
  }

  const method = getEffectiveVerificationMethod(quest)
  const updates = {
    verificationMethod: quest.verificationMethod || method,
  }

  if (method === 'qr') {
    const qrToken = generateQRToken()
    updates.qrToken = qrToken
    updates.qrPayload = buildQRPayload(questId, qrToken)
    updates.eventCode = null
    updates.eventCodeUpdatedAt = null
    updates.geofenceRadiusMeters = quest.geofenceRadiusMeters ?? 200
    if (quest.autoApprove == null) updates.autoApprove = true
    if (quest.requirePhoto == null) updates.requirePhoto = false
  } else if (method === 'code') {
    updates.eventCode = generateEventCode()
    updates.eventCodeUpdatedAt = new Date().toISOString()
    updates.qrToken = null
    updates.qrPayload = null
    if (quest.requirePhoto == null) updates.requirePhoto = true
    if (quest.autoApprove == null) updates.autoApprove = true
  }

  await updateDoc(doc(db, 'quests', questId), updates)
  return { ...quest, ...updates }
}

export function inferVerificationDefaults({ questType, category, verificationMethod }) {
  if (verificationMethod) return verificationMethod
  if (questType === 'visit' || questType === 'buy') return 'qr'
  if (questType === 'participate') return 'code'
  if (category === 'event' || category === 'cleanup' || category === 'treePlanting') {
    return 'code'
  }
  return 'manual'
}

export function getQRImageURL(payload, size = 300) {
  const encoded = encodeURIComponent(payload)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
}

export async function downloadQRAsPNG(questId, payload) {
  const url = getQRImageURL(payload, 600)
  const response = await fetch(url)
  const blob = await response.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `quest-${questId}-qr.png`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function printQRPoster(quest) {
  const title = quest.title || quest.name || 'Quest'
  const payload = quest.qrPayload || ''
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`
    <html>
      <head>
        <title>QR Poster - ${title}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          h1 { color: #047857; margin-bottom: 8px; }
          h2 { color: #374151; margin-top: 0; }
          .qr { margin: 30px auto; }
          .instructions { font-size: 18px; color: #4b5563; margin-top: 20px; }
          .footer { margin-top: 40px; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <h1>SMARTDCABIAO Quest</h1>
        <h2>${title}</h2>
        <img class="qr" src="${getQRImageURL(payload, 500)}" alt="Quest QR" />
        <p class="instructions">📱 Scan this QR code with the SMARTDCABIAO app to verify your quest!</p>
        <p class="footer">Earn ${quest.points || 0} QP · Cabiao Tourism</p>
      </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => win.print(), 500)
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function updateSeasonUserStats({ uid, userEmail, seasonId, points, impactUnit, impactAmount }) {
  if (!uid || !seasonId) return

  const statsDocId = `${seasonId}_${uid}`
  const statsRef = doc(db, SEASON_USER_STATS_COLLECTION, statsDocId)
  const statsSnapshot = await getDoc(statsRef)
  const displayName = userEmail ? userEmail.split('@')[0] : 'Anonymous'

  if (!statsSnapshot.exists()) {
    await setDoc(statsRef, {
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
    })
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

async function creditQuestRewards(uid, questId, quest, participation, method, actorUid) {
  const points = quest.points || 0
  const now = new Date().toISOString()
  const participationId = getParticipationId(questId, uid)
  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)

  await updateDoc(partRef, {
    status: 'completed',
    rewardStatus: 'released',
    completedAt: now,
    pointsAwarded: points,
  })

  await addPointsEntry({
    uid,
    seasonId: quest.seasonId,
    questId,
    points,
    reason: `Completed quest: ${quest.title} (via ${method})`,
  })

  if (quest.impact?.unit && quest.impact?.amountPerCompletion) {
    await addImpactEntry({
      uid,
      userEmail: participation.userEmail,
      seasonId: quest.seasonId,
      questId,
      questTitle: quest.title,
      unit: quest.impact.unit,
      amount: quest.impact.amountPerCompletion,
      adminUser: actorUid ? { uid: actorUid, email: participation.userEmail } : null,
    })
  }

  await syncQuestReservedCount(questId)
  await incrementEarnedPoints(
    quest.seasonId,
    { uid, email: participation.userEmail },
    points
  )

  await updateSeasonUserStats({
    uid,
    userEmail: participation.userEmail,
    seasonId: quest.seasonId,
    points,
    impactUnit: quest.impact?.unit || null,
    impactAmount: quest.impact?.amountPerCompletion || 0,
  })

  await logAudit({
    action: 'QUEST_SELF_VERIFIED',
    targetType: 'participation',
    targetId: participationId,
    adminUid: actorUid || uid,
    adminEmail: participation.userEmail,
    meta: { questId, method, points, autoApproved: true },
  })
}

export async function verifyQuestByQR(uid, scannedPayload, userLocation) {
  const parsed = parseQRPayload(scannedPayload)
  if (!parsed) {
    throw new Error("Invalid QR code. This doesn't look like a SMARTDCABIAO quest code.")
  }

  const quest = await getQuestById(parsed.questId)
  if (!quest) {
    throw new Error('Quest not found.')
  }

  if (quest.qrToken !== parsed.qrToken) {
    throw new Error('This QR code is no longer valid. Ask the venue for an updated code.')
  }

  const partRef = doc(db, PARTICIPATIONS_COLLECTION, getParticipationId(parsed.questId, uid))
  const partSnap = await getDoc(partRef)
  if (!partSnap.exists()) {
    throw new Error("You haven't joined this quest yet. Join it first, then come back to scan.")
  }
  const part = partSnap.data()

  if (part.status === 'completed') {
    throw new Error('You already completed this quest. ✅')
  }
  if (part.status !== 'joined') {
    throw new Error(`This quest is ${part.status}. You can't verify it anymore.`)
  }

  let distance = null
  if (quest.geofenceRadiusMeters && quest.position && userLocation) {
    distance = distanceMeters(
      userLocation.lat,
      userLocation.lng,
      quest.position[0],
      quest.position[1]
    )
    if (distance > quest.geofenceRadiusMeters) {
      throw new Error(
        `You're too far from the venue (${Math.round(distance)}m away). Move closer and try again.`
      )
    }
  }

  const now = new Date().toISOString()
  const verificationData = {
    qrScannedAt: now,
    scannedLat: userLocation?.lat ?? null,
    scannedLng: userLocation?.lng ?? null,
    distanceFromQuestMeters: distance,
  }

  const autoApprove = quest.autoApprove !== false

  await updateDoc(partRef, {
    verificationMethod: 'qr',
    verifiedAt: now,
    verificationData,
    autoApproved: autoApprove,
    ...(autoApprove
      ? {}
      : {
          status: 'joined',
          rewardStatus: 'pending',
        }),
  })

  if (autoApprove) {
    await creditQuestRewards(uid, parsed.questId, quest, part, 'qr', uid)
  } else {
    await logAudit({
      action: 'QUEST_VERIFICATION_SUBMITTED',
      targetType: 'participation',
      targetId: getParticipationId(parsed.questId, uid),
      adminUid: uid,
      meta: { questId: parsed.questId, method: 'qr', autoApproved: false },
    })
  }

  return {
    autoApproved: autoApprove,
    questName: quest.title,
    points: quest.points || 0,
  }
}

export async function verifyQuestByCode(uid, questId, code, photoURL, userLocation) {
  const quest = await getQuestById(questId)
  if (!quest) throw new Error('Quest not found.')

  const normalizedInput = code.trim().toUpperCase()
  const normalizedExpected = (quest.eventCode || '').trim().toUpperCase()

  if (!normalizedExpected || normalizedInput !== normalizedExpected) {
    throw new Error("That code doesn't match. Double-check with the LGU staff at the event.")
  }

  if (quest.requirePhoto !== false && !photoURL) {
    throw new Error('Please upload a photo to verify your attendance.')
  }

  const partRef = doc(db, PARTICIPATIONS_COLLECTION, getParticipationId(questId, uid))
  const partSnap = await getDoc(partRef)
  if (!partSnap.exists()) {
    throw new Error("You haven't joined this quest yet.")
  }
  const part = partSnap.data()

  if (part.status === 'completed') {
    throw new Error('You already completed this quest. ✅')
  }
  if (part.status !== 'joined') {
    throw new Error(`This quest is ${part.status}. You can't verify it anymore.`)
  }

  const now = new Date().toISOString()
  const verificationData = {
    codeSubmitted: normalizedInput,
    photoURL: photoURL || null,
    submittedLat: userLocation?.lat ?? null,
    submittedLng: userLocation?.lng ?? null,
  }

  const autoApprove = quest.autoApprove !== false

  await updateDoc(partRef, {
    verificationMethod: 'code',
    verifiedAt: now,
    verificationData,
    autoApproved: autoApprove,
    ...(autoApprove
      ? {}
      : {
          status: 'joined',
          rewardStatus: 'pending',
        }),
  })

  if (autoApprove) {
    await creditQuestRewards(uid, questId, quest, part, 'code', uid)
  } else {
    await logAudit({
      action: 'QUEST_VERIFICATION_SUBMITTED',
      targetType: 'participation',
      targetId: getParticipationId(questId, uid),
      adminUid: uid,
      meta: { questId, method: 'code', autoApproved: false },
    })
  }

  return {
    autoApproved: autoApprove,
    questName: quest.title,
    points: quest.points || 0,
  }
}

export async function rotateEventCode(questId) {
  const newCode = generateEventCode()
  await updateDoc(doc(db, 'quests', questId), {
    eventCode: newCode,
    eventCodeUpdatedAt: new Date().toISOString(),
  })
  return newCode
}

export async function rotateQRToken(questId) {
  const newToken = generateQRToken()
  const payload = buildQRPayload(questId, newToken)
  await updateDoc(doc(db, 'quests', questId), {
    qrToken: newToken,
    qrPayload: payload,
  })
  return { qrToken: newToken, qrPayload: payload }
}

export async function listPendingSelfVerifications(seasonId) {
  const participationsRef = collection(db, PARTICIPATIONS_COLLECTION)
  const q = seasonId
    ? query(participationsRef, where('seasonId', '==', seasonId))
    : query(participationsRef)
  const snapshot = await getDocs(q)

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(
      (p) =>
        p.status === 'joined' &&
        p.rewardStatus === 'pending' &&
        p.verifiedAt &&
        (p.verificationMethod === 'qr' || p.verificationMethod === 'code')
    )
}

export async function approvePendingVerification({ uid, questId, adminUser }) {
  return adminMarkCompleted({ uid, questId, adminUser })
}

export async function rejectPendingVerification({ uid, questId, adminUser, reason }) {
  const participationId = getParticipationId(questId, uid)
  const partRef = doc(db, PARTICIPATIONS_COLLECTION, participationId)
  const snap = await getDoc(partRef)
  if (!snap.exists()) throw new Error('Participation not found')

  await updateDoc(partRef, {
    rejectionReason: reason || 'Rejected by LGU',
    verifiedAt: null,
    verificationData: null,
    verificationMethod: null,
    autoApproved: false,
    rewardStatus: 'pending',
    lguReviewedBy: adminUser?.uid || null,
    lguReviewedAt: new Date().toISOString(),
  })

  await logAudit({
    action: 'QUEST_VERIFICATION_REJECTED',
    targetType: 'participation',
    targetId: participationId,
    adminUid: adminUser?.uid,
    adminEmail: adminUser?.email,
    meta: { questId, uid, reason },
  })

  return { success: true }
}

export function buildQuestVerificationFields(questId, data) {
  const method = inferVerificationDefaults({
    questType: data.questType,
    category: data.category,
    verificationMethod: data.verificationMethod,
  })

  const fields = {
    verificationMethod: method,
    autoApprove: data.autoApprove !== false,
    requirePhoto: data.requirePhoto !== false,
    geofenceRadiusMeters:
      data.geofenceRadiusMeters != null && data.geofenceRadiusMeters !== ''
        ? parseInt(data.geofenceRadiusMeters, 10)
        : method === 'qr'
          ? 200
          : null,
  }

  if (method === 'qr') {
    const qrToken = generateQRToken()
    fields.qrToken = qrToken
    fields.qrPayload = buildQRPayload(questId, qrToken)
    fields.eventCode = null
    fields.eventCodeUpdatedAt = null
  } else if (method === 'code') {
    fields.eventCode = generateEventCode()
    fields.eventCodeUpdatedAt = new Date().toISOString()
    fields.qrToken = null
    fields.qrPayload = null
  } else {
    fields.qrToken = null
    fields.qrPayload = null
    fields.eventCode = null
    fields.eventCodeUpdatedAt = null
    fields.autoApprove = false
    fields.geofenceRadiusMeters = null
  }

  return fields
}
