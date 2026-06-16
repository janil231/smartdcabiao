import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  orderBy,
  increment,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'
import { getQuestSlotInfo } from '../utils/questSlots'
import { getActiveSeason, getSeasonById } from './seasons.service'
import { listBusinesses } from './businesses.service'
import { listDestinations } from './destinations.service'
import { bumpDataVersion } from './appMeta.service'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { generateCabiaoCoordinates } from '../constants/cabiaoGeo'
import {
  buildQuestVerificationFields,
  generateQRToken,
  buildQRPayload,
  getEffectiveVerificationMethod,
  questNeedsVerificationTokens,
  generateEventCode,
} from './questVerification.service'
import { inferQuestTags } from '../utils/tagMapping'

const QUESTS_COLLECTION = 'quests'

const QUEST_BARANGAY_ROTATION = [
  'San Jose',
  'San Isidro',
  'San Juan',
  'Santa Rita',
  'Santa Isabel',
  'San Vicente',
  'San Fernando',
  'San Roque',
  'Niño Jesus',
  'Concepcion',
  'San Gregorio',
  'Santa Cruz',
]

export async function listActiveQuests(seasonId) {
  const questsRef = collection(db, QUESTS_COLLECTION)
  
  const q = query(
    questsRef,
    where('seasonId', '==', seasonId),
    where('status', '==', 'active')
  )
  
  const snapshot = await getDocs(q)
  
  const now = new Date()
  const quests = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(quest => {
      const startAt = quest.startAt ? new Date(quest.startAt) : null
      const endAt = quest.endAt ? new Date(quest.endAt) : null
      
      if (startAt && startAt > now) return false
      
      if (endAt && endAt < now) return false
      
      return true
    })
  
  return quests
}

export async function getQuestById(questId) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const snapshot = await getDoc(questRef)
  
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() }
  }
  
  return null
}

export async function listQuestsBySeason(seasonId) {
  const questsRef = collection(db, QUESTS_COLLECTION)
  const q = query(questsRef, where('seasonId', '==', seasonId))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function listActiveQuestsBySeason(seasonId) {
  if (!seasonId) return [];
  const sid = String(seasonId);

  try {
    const q = query(
      collection(db, QUESTS_COLLECTION),
      where('seasonId', '==', sid),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    const quests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`[Quests] Loaded ${quests.length} active quests for season ${sid}`);
    return quests;
  } catch (err) {
    console.error(`[Quests] Failed to fetch quests for season ${sid}:`, err);
    throw err;
  }
}

export async function listAllQuests() {
  const questsRef = collection(db, QUESTS_COLLECTION)
  const q = query(questsRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createQuest(
  {
    seasonId,
    title,
    description,
    category,
    questType,
    points,
    capacity,
    startAt,
    endAt,
    gracePeriodHours,
    impact,
    verificationMethod,
    autoApprove,
    requirePhoto,
    geofenceRadiusMeters,
    position,
  },
  adminUser
) {
  const capacityNum = parseInt(capacity, 10)
  if (capacityNum < 1) {
    throw new Error('Capacity must be at least 1')
  }

  if (endAt && seasonId) {
    const season = await getSeasonById(seasonId)
    if (season && season.endAt) {
      const questEnd = typeof endAt === 'string' ? new Date(endAt) : (endAt.toDate ? endAt.toDate() : new Date(endAt))
      const seasonEnd = season.endAt.toDate ? season.endAt.toDate() : new Date(season.endAt)
      if (questEnd > seasonEnd) {
        throw new Error(`Quest deadline cannot be after the season end date`)
      }
    }
  }

  const questId = `quest_${Date.now()}`

  const verificationFields = buildQuestVerificationFields(questId, {
    questType,
    category,
    verificationMethod,
    autoApprove,
    requirePhoto,
    geofenceRadiusMeters,
  })

  const questForTags = { questType, category, impact, ...verificationFields }

  const resolvedEndAt = endAt
    ? (typeof endAt === 'string' ? Timestamp.fromDate(new Date(endAt)) : endAt)
    : null

  const payload = sanitizeForFirestore({
    seasonId,
    title,
    description,
    category,
    questType: questType || category || 'participate',
    points: parseInt(points, 10),
    capacity: parseInt(capacity, 10),
    reservedCount: 0,
    startAt: startAt || serverTimestamp(),
    endAt: resolvedEndAt,
    gracePeriodHours: parseInt(gracePeriodHours, 10) || 24,
    impact: impact || null,
    position: position || null,
    status: 'active',
    isActive: true,
    createdAt: serverTimestamp(),
    tags: inferQuestTags(questForTags),
    ...verificationFields,
  })

  await setDoc(doc(db, QUESTS_COLLECTION, String(questId)), payload)
  
  await logAudit({
    action: 'QUEST_CREATED',
    targetType: 'quest',
    targetId: questId,
    details: { title, seasonId, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })

  try {
    await bumpDataVersion()
  } catch (err) {
    console.warn('[createQuest] Failed to bump data version:', err)
  }

  return { id: questId, success: true }
}

export async function updateQuest(questId, data, adminUser) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const quest = await getQuestById(questId)
  
  if (!quest) {
    throw new Error('Quest not found')
  }
  
  if (data.capacity !== undefined) {
    const newCapacity = parseInt(data.capacity, 10)
    const reservedCount = quest.reservedCount || 0
    if (newCapacity < reservedCount) {
      throw new Error(`Capacity cannot be lower than currently reserved slots (reservedCount = ${reservedCount}).`)
    }
  }
  
  const updateData = { ...data }
  if (data.points) updateData.points = parseInt(data.points, 10)
  if (data.capacity) updateData.capacity = parseInt(data.capacity, 10)
  if (data.gracePeriodHours) updateData.gracePeriodHours = parseInt(data.gracePeriodHours, 10)
  if (data.endAt && typeof data.endAt === 'string') {
    updateData.endAt = Timestamp.fromDate(new Date(data.endAt))
  }
  if (data.startAt && typeof data.startAt === 'string') {
    updateData.startAt = Timestamp.fromDate(new Date(data.startAt))
  }

  if (
    data.verificationMethod != null &&
    data.verificationMethod !== quest.verificationMethod
  ) {
    Object.assign(
      updateData,
      buildQuestVerificationFields(questId, {
        questType: data.questType ?? quest.questType,
        category: data.category ?? quest.category,
        verificationMethod: data.verificationMethod,
        autoApprove: data.autoApprove ?? quest.autoApprove,
        requirePhoto: data.requirePhoto ?? quest.requirePhoto,
        geofenceRadiusMeters: data.geofenceRadiusMeters ?? quest.geofenceRadiusMeters,
      })
    )
  } else {
    const merged = { ...quest, ...updateData }
    if (questNeedsVerificationTokens(merged)) {
      const method = getEffectiveVerificationMethod(merged)
      if (!merged.verificationMethod) updateData.verificationMethod = method
      if (method === 'qr' && !merged.qrPayload) {
        const qrToken = generateQRToken()
        updateData.qrToken = qrToken
        updateData.qrPayload = buildQRPayload(questId, qrToken)
        updateData.geofenceRadiusMeters = merged.geofenceRadiusMeters ?? 200
      } else if (method === 'code' && !merged.eventCode) {
        updateData.eventCode = generateEventCode()
        updateData.eventCodeUpdatedAt = new Date().toISOString()
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, quest }
  }

  await updateDoc(questRef, sanitizeForFirestore(updateData))

  await logAudit({
    action: 'QUEST_UPDATED',
    targetType: 'quest',
    targetId: questId,
    details: { ...updateData, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })

  const updatedQuest = await getQuestById(questId)
  try {
    await bumpDataVersion()
  } catch (err) {
    console.warn('[updateQuest] Failed to bump data version:', err)
  }
  return { success: true, quest: updatedQuest }
}

export async function activateQuest(questId, adminUser) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const quest = await getQuestById(questId)
  
  if (!quest) {
    throw new Error('Quest not found')
  }
  
  await updateDoc(questRef, { status: 'active', isActive: true })
  
  await logAudit({
    action: 'QUEST_ACTIVATED',
    targetType: 'quest',
    targetId: questId,
    details: { title: quest.title, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })

  try {
    await bumpDataVersion()
  } catch (err) {
    console.warn('[activateQuest] Failed to bump data version:', err)
  }

  return { success: true }
}

export async function deactivateQuest(questId, adminUser) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const quest = await getQuestById(questId)
  
  if (!quest) {
    throw new Error('Quest not found')
  }
  
  await updateDoc(questRef, { status: 'inactive', isActive: false })
  
  await logAudit({
    action: 'QUEST_DEACTIVATED',
    targetType: 'quest',
    targetId: questId,
    details: { title: quest.title, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })

  try {
    await bumpDataVersion()
  } catch (err) {
    console.warn('[deactivateQuest] Failed to bump data version:', err)
  }

  return { success: true }
}

export async function adjustQuestReservedCount(questId, delta) {
  const quest = await getQuestById(questId)
  if (!quest) {
    throw new Error('Quest not found')
  }
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const next = Math.max(0, (quest.reservedCount || 0) + delta)
  await updateDoc(questRef, { reservedCount: next })
}

export async function decrementReservedCount(questId) {
  return adjustQuestReservedCount(questId, -1)
}

export async function incrementReservedCount(questId) {
  return adjustQuestReservedCount(questId, 1)
}

export async function updateQuestActive(questId, isActive) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const quest = await getQuestById(questId)

  if (!quest) {
    throw new Error('Quest not found')
  }

  await updateDoc(questRef, {
    status: isActive ? 'active' : 'inactive',
    isActive: !!isActive,
  })

  await logAudit({
    action: isActive ? 'QUEST_ACTIVATED' : 'QUEST_DEACTIVATED',
    targetType: 'quest',
    targetId: questId,
    details: { title: quest.title, isActive },
  })

  return { success: true }
}

export async function repairQuestActiveFlags() {
  const questsSnap = await getDocs(collection(db, QUESTS_COLLECTION))

  let repairedCount = 0
  const repairs = []

  for (const questDoc of questsSnap.docs) {
    const data = questDoc.data()
    if (data.status === 'active' && !data.isActive) {
      await updateDoc(doc(db, QUESTS_COLLECTION, questDoc.id), {
        isActive: true,
      })
      repairedCount++
      repairs.push({
        questId: questDoc.id,
        title: data.title,
      })
    }
  }

  await logAudit({
    action: 'REPAIR_QUEST_ACTIVE_FLAGS',
    targetType: 'quests',
    targetId: 'all',
    details: { repairedCount, repairs },
  })

  try {
    await bumpDataVersion()
  } catch (err) {
    console.warn('[repairQuestActiveFlags] Failed to bump data version:', err)
  }

  return { repairedCount, repairs }
}

export async function repairQuestReservedCounts(seasonId) {
  const questsSnap = await getDocs(
    query(collection(db, QUESTS_COLLECTION), where('seasonId', '==', seasonId))
  )

  let repairedCount = 0
  const repairs = []

  for (const questDoc of questsSnap.docs) {
    const questId = questDoc.id
    const currentCount = questDoc.data().reservedCount || 0

    const partsSnap = await getDocs(
      query(
        collection(db, 'participations'),
        where('questId', '==', questId),
        where('status', '==', 'joined')
      )
    )
    const actualCount = partsSnap.size

    if (actualCount !== currentCount) {
      await updateDoc(doc(db, QUESTS_COLLECTION, questId), {
        reservedCount: actualCount,
      })
      repairedCount++
      repairs.push({
        questId,
        title: questDoc.data().title,
        before: currentCount,
        after: actualCount,
      })
    }
  }

  await logAudit({
    action: 'REPAIR_QUEST_RESERVED_COUNTS',
    targetType: 'season',
    targetId: seasonId,
    details: { repairedCount, repairs },
  })

  return { repairedCount, repairs }
}

export async function seedSampleQuestsForActiveSeason() {
  const activeSeason = await getActiveSeason()
  
  if (!activeSeason) {
    throw new Error('No active season found. Please create and activate a season first.')
  }
  
  const seasonId = activeSeason.id
  const now = new Date()
  
  const sampleQuests = [
    {
      title: 'Community Clean-up Drive',
      description: 'Join us for a community clean-up in your barangay. Bring gloves and bags. Help keep Cabiao clean and beautiful!',
      category: 'cleanup',
      points: 50,
      capacity: 50,
      durationDays: 14,
      gracePeriodHours: 24,
      impact: {
        unit: 'kg_trash',
        amountPerCompletion: 2,
        label: 'kg of waste collected'
      }
    },
    {
      title: 'Tree Planting & Seedling Care',
      description: 'Participate in planting native trees at the municipal park. Learn proper seedling care techniques and help green our town.',
      category: 'treePlanting',
      points: 75,
      capacity: 30,
      durationDays: 21,
      gracePeriodHours: 48,
      impact: {
        unit: 'trees',
        amountPerCompletion: 1,
        label: 'trees planted'
      }
    },
    {
      title: 'Plastic-Free Market Challenge',
      description: 'Challenge yourself to shop at the public market without single-use plastics for one week. Use reusable bags and containers.',
      category: 'event',
      points: 40,
      capacity: 100,
      durationDays: 7,
      gracePeriodHours: 24,
      impact: {
        unit: 'kg_plastic',
        amountPerCompletion: 1,
        label: 'kg of plastic avoided'
      }
    },
    {
      title: 'Bike-to-Tour Day',
      description: 'Explore Cabiao heritage sites on bicycle. Promote eco-friendly transportation while discovering local history.',
      category: 'event',
      points: 60,
      capacity: 25,
      durationDays: 7,
      gracePeriodHours: 36,
      impact: {
        unit: 'co2_kg',
        amountPerCompletion: 1.5,
        label: 'kg of CO₂ emissions avoided'
      }
    },
    {
      title: 'Eco-Walk Heritage Tour',
      description: 'Join a guided walking tour of Cabiao heritage sites. Learn about local history while practicing sustainable tourism.',
      category: 'event',
      points: 35,
      capacity: 20,
      durationDays: 7,
      gracePeriodHours: 24,
      impact: {
        unit: 'hours',
        amountPerCompletion: 1,
        label: 'hours of eco-walk participation'
      }
    },
    {
      title: 'Waste Segregation Workshop',
      description: 'Attend a workshop on proper waste segregation. Learn how to reduce, reuse, and recycle effectively in your home.',
      category: 'event',
      points: 45,
      capacity: 40,
      durationDays: 14,
      gracePeriodHours: 24,
      impact: {
        unit: 'hours',
        amountPerCompletion: 1,
        label: 'hours of sustainability learning'
      }
    },
    {
      title: 'Bring Your Own Tumbler Campaign',
      description: 'Commit to using a reusable tumbler for all drinks for one month. Reduce single-use cup waste in our community.',
      category: 'event',
      points: 30,
      capacity: 80,
      durationDays: 30,
      gracePeriodHours: 48,
      impact: {
        unit: 'kg_plastic',
        amountPerCompletion: 0.5,
        label: 'kg of single-use cups avoided'
      }
    },
    {
      title: 'Riverbank Monitoring & Reporting',
      description: 'Help monitor the Cabiao Riverbank. Report illegal dumping and participate in water quality awareness activities.',
      category: 'cleanup',
      points: 55,
      capacity: 35,
      durationDays: 21,
      gracePeriodHours: 48,
      impact: {
        unit: 'kg_trash',
        amountPerCompletion: 2,
        label: 'kg of riverbank waste monitored or removed'
      }
    },
    {
      title: 'Local Products Support Day (Buy Local)',
      description: 'Support local farmers and artisans by purchasing local products. Document your purchases and share the benefits of buying local.',
      category: 'event',
      points: 25,
      capacity: 100,
      durationDays: 7,
      gracePeriodHours: 24,
      impact: {
        unit: 'co2_kg',
        amountPerCompletion: 1,
        label: 'kg of emissions reduced by buying local'
      }
    },
    {
      title: 'Barangay Greening Contest Participation',
      description: 'Participate in your barangay greening contest. Plant flowers, vegetables, or ornamental plants in public spaces.',
      category: 'treePlanting',
      points: 80,
      capacity: 50,
      durationDays: 30,
      gracePeriodHours: 72,
      impact: {
        unit: 'trees',
        amountPerCompletion: 1,
        label: 'trees or plots improved'
      }
    }
  ]
  
  const questsToCreate = sampleQuests.map((q, index) => {
    const startDate = new Date(now)
    // Stagger quests into the future so they are not expired
    startDate.setDate(startDate.getDate() + index * 3)
    
    const endDate = new Date(startDate)
    const durationDays = q.durationDays || 7
    endDate.setDate(endDate.getDate() + durationDays)

    const [lat, lng] = generateCabiaoCoordinates(index, sampleQuests.length)
    const barangay = QUEST_BARANGAY_ROTATION[index % QUEST_BARANGAY_ROTATION.length]
    
    const questForTags = { questType: q.category, category: q.category, impact: q.impact || null }

    return {
      seasonId,
      title: q.title,
      description: q.description,
      category: q.category,
      points: q.points,
      capacity: q.capacity,
      reservedCount: 0,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      durationDays,
      gracePeriodHours: q.gracePeriodHours,
      status: 'active',
      isActive: true,
      impact: q.impact || null,
      position: [lat, lng],
      barangay,
      tags: inferQuestTags(questForTags),
    }
  })
  
  for (let i = 0; i < questsToCreate.length; i++) {
    const questId = `seed-q${i + 1}`
    const questRef = doc(db, QUESTS_COLLECTION, questId)
    const base = questsToCreate[i]
    const verificationFields = buildQuestVerificationFields(questId, {
      questType: base.category,
      category: base.category,
    })
    await setDoc(questRef, sanitizeForFirestore({
      ...base,
      ...verificationFields,
      questType: base.category,
    }), { merge: true })
  }

  await logAudit({
    action: 'SEED_SAMPLE_QUESTS',
    targetType: 'season',
    targetId: seasonId,
    details: { 
      count: questsToCreate.length, 
      seasonId,
      seasonName: activeSeason.name,
      questIds: questsToCreate.map((_, i) => `seed-q${i + 1}`)
    },
  })

  return { success: true, count: questsToCreate.length }
}

export async function backfillQuestLocationsForSeason(seasonId, adminUser) {
  if (!seasonId) {
    throw new Error('Season ID is required')
  }

  const questsRef = collection(db, QUESTS_COLLECTION)
  const qRef = query(questsRef, where('seasonId', '==', seasonId))
  const snapshot = await getDocs(qRef)

  if (snapshot.empty) {
    return { success: true, updated: 0 }
  }

  const docs = snapshot.docs

  const questsMissingLocation = docs.filter((docSnap) => {
    const data = docSnap.data()
    const pos = data.position
    if (!pos) return true
    if (Array.isArray(pos)) {
      return pos.length !== 2
    }
    if (typeof pos === 'object') {
      return typeof pos.lat !== 'number' || typeof pos.lng !== 'number'
    }
    return true
  })

  if (questsMissingLocation.length === 0) {
    return { success: true, updated: 0 }
  }

  const batch = writeBatch(db)
  const total = questsMissingLocation.length

  questsMissingLocation.forEach((docSnap, index) => {
    const [lat, lng] = generateCabiaoCoordinates(index, total)
    const data = docSnap.data()
    const barangayFallback = QUEST_BARANGAY_ROTATION[index % QUEST_BARANGAY_ROTATION.length]

    batch.update(docSnap.ref, {
      position: [lat, lng],
      barangay: data.barangay || barangayFallback,
    })
  })

  await batch.commit()

  await logAudit({
    action: 'quest_locations_backfilled',
    targetType: 'season',
    targetId: seasonId,
    details: {
      seasonId,
      updated: questsMissingLocation.length,
      adminUid: adminUser?.uid ?? null,
      adminEmail: adminUser?.email ?? null,
    },
  })

  return { success: true, updated: questsMissingLocation.length }
}

export async function rescheduleDemoQuestsForSeason(seasonId, adminUser) {
  if (!seasonId) {
    throw new Error('Season ID is required')
  }

  const questsRef = collection(db, QUESTS_COLLECTION)
  const qRef = query(questsRef, where('seasonId', '==', seasonId))
  const snapshot = await getDocs(qRef)

  if (snapshot.empty) {
    return { success: true, updated: 0 }
  }

  const allDocs = snapshot.docs
  const seedDocs = allDocs.filter((docSnap) => docSnap.id.startsWith('seed-q'))

  if (seedDocs.length === 0) {
    return { success: true, updated: 0 }
  }

  const batch = writeBatch(db)
  const now = new Date()

  seedDocs.forEach((docSnap, index) => {
    const data = docSnap.data()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + index * 3)

    const endDate = new Date(startDate)
    const durationDays = typeof data.durationDays === 'number' ? data.durationDays : 10
    endDate.setDate(endDate.getDate() + durationDays)

    batch.update(docSnap.ref, {
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      status: 'active',
      isActive: true,
    })
  })

  await batch.commit()

  await logAudit({
    action: 'quest_dates_rescheduled',
    targetType: 'season',
    targetId: seasonId,
    details: {
      seasonId,
      updated: seedDocs.length,
      questIds: seedDocs.map((d) => d.id),
      adminUid: adminUser?.uid ?? null,
      adminEmail: adminUser?.email ?? null,
    },
  })

  return { success: true, updated: seedDocs.length }
}

export async function ensureQuestVerificationTokensAdmin(questId, adminUser) {
  const quest = await getQuestById(questId)
  if (!quest || !questNeedsVerificationTokens(quest)) {
    return quest
  }
  const { quest: updated } = await updateQuest(questId, {}, adminUser)
  return updated || quest
}

export async function backfillQuestVerificationTokensForSeason(seasonId, adminUser) {
  if (!seasonId) throw new Error('Season ID is required')

  const questsRef = collection(db, QUESTS_COLLECTION)
  const qRef = query(questsRef, where('seasonId', '==', seasonId))
  const snapshot = await getDocs(qRef)

  let updated = 0
  for (const docSnap of snapshot.docs) {
    const quest = { id: docSnap.id, ...docSnap.data() }
    if (!questNeedsVerificationTokens(quest)) continue
    await ensureQuestVerificationTokensAdmin(docSnap.id, adminUser)
    updated++
  }

  if (updated > 0) {
    await logAudit({
      action: 'QUEST_VERIFICATION_TOKENS_BACKFILL',
      targetType: 'season',
      targetId: seasonId,
      details: { updated, adminUid: adminUser?.uid, adminEmail: adminUser?.email },
    })
  }

  return { success: true, updated }
}

export function recommendQuests({ quests, participations, limit = 2 }) {
  if (!quests || quests.length === 0) return []
  
  const now = new Date()
  
  const completedQuestIds = new Set(
    participations
      .filter(p => p.status === 'completed')
      .map(p => p.questId)
  )
  
  const joinedQuestIds = new Set(
    participations
      .filter(p => p.status === 'joined')
      .map(p => p.questId)
  )
  
  const activeQuests = quests.filter(quest => {
    if (quest.status !== 'active') return false
    
    const startAt = quest.startAt ? new Date(quest.startAt) : null
    if (startAt && startAt > now) return false
    
    const endAt = quest.endAt ? new Date(quest.endAt) : null
    if (endAt && endAt < now) return false
    
    if (completedQuestIds.has(quest.id)) return false
    
    const { slotsLeft, isFull } = getQuestSlotInfo(quest)
    if (isFull || slotsLeft <= 0) return false

    return true
  })

  const scoredQuests = activeQuests.map(quest => {
    let score = 0
    
    score += (quest.points || 0) * 0.5
    
    if (quest.impact?.unit) {
      score += 20
    }
    
    if (joinedQuestIds.has(quest.id)) {
      score -= 100
    }
    
    const endAt = quest.endAt ? new Date(quest.endAt) : null
    if (endAt) {
      const daysLeft = Math.ceil((endAt - now) / (1000 * 60 * 60 * 24))
      if (daysLeft <= 3) {
        score += 15
      } else if (daysLeft <= 7) {
        score += 10
      }
    }
    
    const { slotsLeft } = getQuestSlotInfo(quest)
    if (slotsLeft <= 10) {
      score += 10
    }
    
    return { quest, score }
  })
  
  scoredQuests.sort((a, b) => b.score - a.score)
  
  return scoredQuests.slice(0, limit).map(s => s.quest)
}

const VISIT_REQUIRED_MINUTES = [10, 15, 20, 30, 45, 60]
const BUY_PRODUCTS = [
  'Local meal',
  'Fresh produce',
  'Pasalubong',
  'Handicraft',
  'Local snack',
  'Fresh fruits',
  'Vegetables',
  'Coconut products',
  'Rice products',
  'Local beverage',
]

export async function seedVisitAndBuyQuestsForActiveSeason(adminUser) {
  const activeSeason = await getActiveSeason()
  
  if (!activeSeason) {
    throw new Error('No active season found. Please create and activate a season first.')
  }
  
  const seasonId = activeSeason.id
  const now = new Date()
  
  const { data: businesses } = await listBusinesses()
  const { data: destinations } = await listDestinations()
  
  const allPlaces = [
    ...businesses.map(b => ({ ...b, placeType: 'business' })),
    ...destinations.map(d => ({ ...d, placeType: 'destination' })),
  ]
  
  const visitQuests = []
  const buyQuests = []
  
  for (let i = 0; i < 10; i++) {
    const placeIndex = i % allPlaces.length
    const place = allPlaces[placeIndex]
    
    const requiredMinutes = VISIT_REQUIRED_MINUTES[i % VISIT_REQUIRED_MINUTES.length]
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + i * 2)
    
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 10)
    
    const position = place.position && Array.isArray(place.position) && place.position.length === 2
      ? place.position
      : generateCabiaoCoordinates(i, 20)
    
    const questId = `seed_visit_${String(i + 1).padStart(2, '0')}`
    const qrToken = generateQRToken()
    
    const visitQuestForTags = { questType: 'visit', category: 'visit', impact: { unit: 'hours' } }

    visitQuests.push({
      seasonId,
      questType: 'visit',
      title: `Visit ${place.name || 'Local Place'} for ${requiredMinutes} minutes`,
      description: `Stay at the location for at least ${requiredMinutes} minutes to complete this quest and earn QP.`,
      category: 'visit',
      points: 30 + (i * 5),
      capacity: 100,
      reservedCount: 0,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      gracePeriodHours: 24,
      status: 'active',
      isActive: true,
      verificationMethod: 'qr',
      qrToken,
      qrPayload: buildQRPayload(questId, qrToken),
      autoApprove: true,
      requirePhoto: false,
      geofenceRadiusMeters: 200,
      position,
      barangay: place.barangay || null,
      visit: {
        targetType: place.placeType,
        targetId: String(place.id),
        targetName: place.name || 'Local Place',
        requiredMinutes,
      },
      impact: {
        unit: 'hours',
        amountPerCompletion: requiredMinutes / 60,
        label: `${requiredMinutes} minutes of exploration`,
      },
      tags: inferQuestTags(visitQuestForTags),
      createdAt: now.toISOString(),
    })
    
    const questRef = doc(db, QUESTS_COLLECTION, questId)
    await setDoc(questRef, sanitizeForFirestore(visitQuests[i]), { merge: true })
  }
  
  for (let i = 0; i < 10; i++) {
    const businessIndex = i % Math.max(businesses.length, 1)
    const business = businesses[businessIndex] || { name: 'Local Business', id: i + 1 }
    
    const productName = BUY_PRODUCTS[i % BUY_PRODUCTS.length]
    const minSpend = [50, 100, 150, null, null][i % 5]
    
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + i * 2 + 1)
    
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 10)
    
    const position = business.position && Array.isArray(business.position) && business.position.length === 2
      ? business.position
      : generateCabiaoCoordinates(i + 10, 20)
    
    const questId = `seed_buy_${String(i + 1).padStart(2, '0')}`
    const buyQrToken = generateQRToken()
    
    const buyQuestForTags = { questType: 'buy', category: 'buy', impact: { unit: 'co2_kg' } }

    const questData = {
      seasonId,
      questType: 'buy',
      title: `Buy ${productName} at ${business.name || 'Local Business'}`,
      description: `Support local businesses. Purchase ${productName.toLowerCase()} to complete the quest and earn QP.${minSpend ? ` Minimum spend: ₱${minSpend}.` : ''}`,
      category: 'buy',
      points: 40 + (i * 6),
      capacity: 100,
      reservedCount: 0,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      gracePeriodHours: 24,
      status: 'active',
      isActive: true,
      verificationMethod: 'qr',
      qrToken: buyQrToken,
      qrPayload: buildQRPayload(questId, buyQrToken),
      autoApprove: true,
      requirePhoto: false,
      geofenceRadiusMeters: 200,
      position,
      barangay: business.barangay || null,
      buy: {
        businessId: String(business.id),
        businessName: business.name || 'Local Business',
        productName,
        minQuantity: null,
        minSpend,
      },
      impact: {
        unit: 'co2_kg',
        amountPerCompletion: 0.5,
        label: 'Support for local economy',
      },
      tags: inferQuestTags(buyQuestForTags),
      createdAt: now.toISOString(),
    }
    
    const questRef = doc(db, QUESTS_COLLECTION, questId)
    await setDoc(questRef, sanitizeForFirestore(questData), { merge: true })
    
    buyQuests.push(questData)
  }
  
  await logAudit({
    action: 'seed_visit_buy_quests',
    targetType: 'season',
    targetId: seasonId,
    details: {
      seasonId,
      visitCount: 10,
      buyCount: 10,
      adminUid: adminUser?.uid ?? null,
      adminEmail: adminUser?.email ?? null,
    },
  })
  
  return { success: true, visitCount: 10, buyCount: 10 }
}
