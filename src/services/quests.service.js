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
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'

const QUESTS_COLLECTION = 'quests'

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
  const q = query(questsRef, where('seasonId', '==', seasonId), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function listAllQuests() {
  const questsRef = collection(db, QUESTS_COLLECTION)
  const q = query(questsRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createQuest({ seasonId, title, description, category, points, capacity, startAt, endAt, gracePeriodHours }, adminUser) {
  const capacityNum = parseInt(capacity, 10)
  if (capacityNum < 1) {
    throw new Error('Capacity must be at least 1')
  }
  
  const questId = `quest_${Date.now()}`
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  
  await setDoc(questRef, {
    seasonId,
    title,
    description,
    category,
    points: parseInt(points, 10),
    capacity: parseInt(capacity, 10),
    reservedCount: 0,
    startAt,
    endAt,
    gracePeriodHours: parseInt(gracePeriodHours, 10) || 24,
    status: 'active',
    createdAt: new Date().toISOString(),
  })
  
  await logAudit({
    action: 'QUEST_CREATED',
    targetType: 'quest',
    targetId: questId,
    details: { title, seasonId, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
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
  
  await updateDoc(questRef, updateData)
  
  await logAudit({
    action: 'QUEST_UPDATED',
    targetType: 'quest',
    targetId: questId,
    details: { ...updateData, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

export async function activateQuest(questId, adminUser) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const quest = await getQuestById(questId)
  
  if (!quest) {
    throw new Error('Quest not found')
  }
  
  await updateDoc(questRef, { status: 'active' })
  
  await logAudit({
    action: 'QUEST_ACTIVATED',
    targetType: 'quest',
    targetId: questId,
    details: { title: quest.title, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

export async function deactivateQuest(questId, adminUser) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  const quest = await getQuestById(questId)
  
  if (!quest) {
    throw new Error('Quest not found')
  }
  
  await updateDoc(questRef, { status: 'inactive' })
  
  await logAudit({
    action: 'QUEST_DEACTIVATED',
    targetType: 'quest',
    targetId: questId,
    details: { title: quest.title, adminUid: adminUser.uid, adminEmail: adminUser.email },
  })
  
  return { success: true }
}

export async function decrementReservedCount(questId) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  await updateDoc(questRef, {
    reservedCount: increment(-1)
  })
}

export async function incrementReservedCount(questId) {
  const questRef = doc(db, QUESTS_COLLECTION, questId)
  await updateDoc(questRef, {
    reservedCount: increment(1)
  })
}
