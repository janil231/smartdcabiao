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
import { getActiveSeason } from './seasons.service'

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

export async function listAllQuests() {
  const questsRef = collection(db, QUESTS_COLLECTION)
  const q = query(questsRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function createQuest({ seasonId, title, description, category, points, capacity, startAt, endAt, gracePeriodHours, impact }, adminUser) {
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
    impact: impact || null,
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

export async function seedSampleQuestsForActiveSeason() {
  console.log('[Seed] Starting seed...')
  const activeSeason = await getActiveSeason()
  console.log('[Seed] Active season:', activeSeason)
  
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
      startOffsetDays: 1,
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
      startOffsetDays: 3,
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
      startOffsetDays: 7,
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
      startOffsetDays: 10,
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
      startOffsetDays: 14,
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
      startOffsetDays: 5,
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
      startOffsetDays: 8,
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
      startOffsetDays: 12,
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
      startOffsetDays: 15,
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
      startOffsetDays: 18,
      durationDays: 30,
      gracePeriodHours: 72,
      impact: {
        unit: 'trees',
        amountPerCompletion: 1,
        label: 'trees or plots improved'
      }
    }
  ]
  
  const questsToCreate = sampleQuests.map((q) => {
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + q.startOffsetDays)
    
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + q.durationDays)
    
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
      gracePeriodHours: q.gracePeriodHours,
      status: 'active',
      impact: q.impact || null
    }
  })
  
  for (let i = 0; i < questsToCreate.length; i++) {
    const questId = `seed-q${i + 1}`
    const questRef = doc(db, QUESTS_COLLECTION, questId)
    console.log('[Seed] Creating quest:', questId, questsToCreate[i].title)
    await setDoc(questRef, questsToCreate[i], { merge: true })
  }
  
  console.log('[Seed] All quests created successfully')
  
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
