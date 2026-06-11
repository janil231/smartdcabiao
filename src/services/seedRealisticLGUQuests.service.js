import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'
import { generateQRToken, generateEventCode } from './questVerification.service'
import { CABIAO_BARANGAYS } from '../constants/cabiaoBarangays'
import { bumpDataVersion } from './appMeta.service'

const QUEST_TEMPLATES = [
  { type: 'visit', category: 'tour', title: 'Discover Cabiao Heritage Walk', description: 'Take a guided walk through historic Cabiao landmarks and learn about our town\'s rich cultural past.', points: 200, capacity: 30, impactUnit: 'visits', impactAmount: 1 },
  { type: 'visit', category: 'tour', title: 'River Trail Exploration', description: 'Explore the scenic river trails of Cabiao with our community guides.', points: 250, capacity: 20, impactUnit: 'visits', impactAmount: 1 },
  { type: 'visit', category: 'culture', title: 'Visit San Roque Parish Church', description: 'Visit the historic San Roque Parish Church and learn about its century-old architecture.', points: 150, capacity: 50, impactUnit: 'visits', impactAmount: 1 },
  { type: 'visit', category: 'nature', title: 'Cabiao Eco Park Tour', description: 'Explore the natural beauty of Cabiao Eco Park and learn about local biodiversity.', points: 300, capacity: 25, impactUnit: 'visits', impactAmount: 1 },
  { type: 'visit', category: 'culture', title: 'Municipal Heritage Center Tour', description: 'Tour the heritage center showcasing Cabiao\'s history and notable figures.', points: 180, capacity: 40, impactUnit: 'visits', impactAmount: 1 },

  { type: 'buy', category: 'local-business', title: 'Support Local Eats', description: 'Buy from any local Cabiao food business to support our community entrepreneurs.', points: 150, capacity: 100, impactUnit: 'transactions', impactAmount: 1 },
  { type: 'buy', category: 'local-business', title: 'Local Market Shopper', description: 'Make a purchase at any Cabiao public market vendor.', points: 100, capacity: 200, impactUnit: 'transactions', impactAmount: 1 },
  { type: 'buy', category: 'local-business', title: 'Artisan Craft Buyer', description: 'Purchase a handmade product from a local Cabiao artisan or craft shop.', points: 250, capacity: 50, impactUnit: 'transactions', impactAmount: 1 },
  { type: 'buy', category: 'local-business', title: 'Farm-to-Table Champion', description: 'Buy fresh produce directly from a Cabiao farm or farmer\'s stand.', points: 200, capacity: 80, impactUnit: 'transactions', impactAmount: 1 },
  { type: 'buy', category: 'local-business', title: 'Pasalubong Hunter', description: 'Buy Cabiao-made pasalubong to share with friends and family.', points: 175, capacity: 60, impactUnit: 'transactions', impactAmount: 1 },

  { type: 'participate', category: 'festival', title: 'Town Fiesta Volunteer', description: 'Volunteer at the annual Cabiao town fiesta and help make it memorable.', points: 500, capacity: 50, impactUnit: 'volunteer_hours', impactAmount: 4 },
  { type: 'participate', category: 'workshop', title: 'Sustainability Workshop', description: 'Attend our community workshop on sustainable tourism and eco-friendly practices.', points: 300, capacity: 40, impactUnit: 'participants', impactAmount: 1 },
  { type: 'participate', category: 'event', title: 'Cultural Night Performance', description: 'Attend or perform at the monthly cultural night showcasing Cabiao talent.', points: 250, capacity: 100, impactUnit: 'participants', impactAmount: 1 },
  { type: 'participate', category: 'sports', title: 'Community Fun Run', description: 'Join the monthly Cabiao community fun run promoting health and fitness.', points: 400, capacity: 150, impactUnit: 'participants', impactAmount: 1 },
  { type: 'participate', category: 'workshop', title: 'Local History Lecture', description: 'Attend a lecture on Cabiao\'s rich history by local historians.', points: 200, capacity: 60, impactUnit: 'participants', impactAmount: 1 },

  { type: 'participate', category: 'eco-challenge', title: 'Riverside Cleanup Drive', description: 'Help clean up our Cabiao rivers and waterways. Bring gloves and water.', points: 500, capacity: 40, impactUnit: 'trash_kg', impactAmount: 5 },
  { type: 'participate', category: 'eco-challenge', title: 'Tree Planting Day', description: 'Plant trees in designated Cabiao reforestation zones. All tools provided.', points: 600, capacity: 30, impactUnit: 'trees', impactAmount: 3 },
  { type: 'participate', category: 'eco-challenge', title: 'Plastic-Free Challenge', description: 'Pledge to go plastic-free for a week and document your journey.', points: 350, capacity: 100, impactUnit: 'plastic_kg', impactAmount: 2 },
]

const BARANGAY_SAMPLE = [
  'Bagong Sikat', 'Concepcion', 'Entablado', 'Maligaya', 'Mangga', 'Polilio', 'Sta. Rita Mataas', 'San Antonio'
]

function randomCabiaoPosition() {
  const baseLat = 15.2522
  const baseLng = 120.8596
  const jitter = 0.015
  return {
    lat: baseLat + (Math.random() - 0.5) * jitter * 2,
    lng: baseLng + (Math.random() - 0.5) * jitter * 2,
  }
}

function randomVerificationMethod(index) {
  const methods = ['qr', 'code', 'manual']
  return methods[index % 3]
}

function randomDaysAgo(maxDays = 90) {
  const ms = Math.floor(Math.random() * maxDays * 24 * 60 * 60 * 1000)
  return new Date(Date.now() - ms)
}

export async function seedRealisticLGUQuests({ onProgress } = {}) {
  const existingQuery = query(collection(db, 'quests'), where('_seeded', '==', true))
  const existingSnap = await getDocs(existingQuery)

  if (existingSnap.size > 0) {
    return {
      skipped: true,
      reason: `${existingSnap.size} seeded LGU quests already exist. Run "Reset Seeded Data" first.`,
      created: 0,
    }
  }

  const seasonsSnap = await getDocs(collection(db, 'seasons'))
  const allSeasons = seasonsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const activeSeasons = allSeasons.filter(s => s.isActive === true)
  const endedSeasons = allSeasons.filter(s => s.isActive === false)

  if (activeSeasons.length === 0) {
    return {
      skipped: true,
      reason: 'No active season found. Create and activate a season first.',
      created: 0,
    }
  }

  const activeSeason = activeSeasons[0]

  const results = { created: 0, errors: [] }
  const totalQuests = QUEST_TEMPLATES.length

  for (let i = 0; i < totalQuests; i++) {
    const template = QUEST_TEMPLATES[i]

    try {
      let seasonId = activeSeason.id
      if (i >= 12 && endedSeasons.length > 0) {
        seasonId = endedSeasons[i % endedSeasons.length].id
      }

      const verificationMethod = randomVerificationMethod(i)
      const position = randomCabiaoPosition()
      const barangay = BARANGAY_SAMPLE[i % BARANGAY_SAMPLE.length]
      const createdAt = randomDaysAgo(90)

      const questId = `seeded_lgu_${Date.now()}_${i}`

      const payload = sanitizeForFirestore({
        title: template.title,
        description: template.description,
        questType: template.type,
        category: template.category,
        seasonId: seasonId,
        capacity: template.capacity,
        reservedCount: 0,
        points: template.points,
        impactUnit: template.impactUnit,
        impactAmount: template.impactAmount,
        verificationMethod,
        autoApprove: verificationMethod === 'qr',
        geofenceRadius: verificationMethod === 'qr' ? 100 : null,
        qrToken: verificationMethod === 'qr' ? generateQRToken() : null,
        eventCode: verificationMethod === 'code' ? generateEventCode() : null,
        requirePhoto: verificationMethod === 'code',
        startAt: Timestamp.fromDate(createdAt),
        endAt: null,
        isActive: true,
        status: 'active',
        position: position,
        barangay,
        createdAt: Timestamp.fromDate(createdAt),
        updatedAt: Timestamp.fromDate(createdAt),
        _seeded: true,
      })

      await setDoc(doc(db, 'quests', String(questId)), payload)
      results.created++

      onProgress?.({ current: i + 1, total: totalQuests, title: template.title })
    } catch (err) {
      results.errors.push({ index: i, title: template.title, error: err.message })
    }
  }

  try {
    await bumpDataVersion()
  } catch (err) {
    console.warn('bumpDataVersion failed:', err)
  }

  try {
    await logAudit({
      action: 'seed_realistic_lgu_quests',
      targetType: 'quests',
      meta: { count: results.created, errors: results.errors.length },
    })
  } catch (err) {
    console.warn('logAudit failed:', err)
  }

  return results
}

export async function deleteSeededLGUQuests() {
  const q = query(collection(db, 'quests'), where('_seeded', '==', true))
  const snap = await getDocs(q)

  let deleted = 0
  for (const docSnap of snap.docs) {
    try {
      await deleteDoc(docSnap.ref)
      deleted++
    } catch (err) {
      console.warn(`Failed to delete ${docSnap.id}:`, err)
    }
  }

  return { deleted }
}
