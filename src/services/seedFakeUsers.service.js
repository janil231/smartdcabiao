import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'
import { INTEREST_IDS } from '../constants/interests'

const FAKE_USER_DATA = [
  { firstName: 'Juan', lastName: 'Dela Cruz' },
  { firstName: 'Maria', lastName: 'Santos' },
  { firstName: 'Jose', lastName: 'Reyes' },
  { firstName: 'Ana', lastName: 'Garcia' },
  { firstName: 'Pedro', lastName: 'Mendoza' },
  { firstName: 'Sofia', lastName: 'Cruz' },
  { firstName: 'Miguel', lastName: 'Bautista' },
  { firstName: 'Isabella', lastName: 'Ramos' },
  { firstName: 'Carlos', lastName: 'Flores' },
  { firstName: 'Camila', lastName: 'Torres' },
  { firstName: 'Diego', lastName: 'Aquino' },
  { firstName: 'Valentina', lastName: 'Lim' },
  { firstName: 'Antonio', lastName: 'Tan' },
  { firstName: 'Luna', lastName: 'Castro' },
  { firstName: 'Rafael', lastName: 'Domingo' },
  { firstName: 'Emma', lastName: 'Villanueva' },
  { firstName: 'Mateo', lastName: 'Padilla' },
  { firstName: 'Olivia', lastName: 'Navarro' },
  { firstName: 'Lucas', lastName: 'Pascual' },
  { firstName: 'Mia', lastName: 'Soriano' },
  { firstName: 'Sebastian', lastName: 'Magtanggol' },
  { firstName: 'Aurora', lastName: 'Bonifacio' },
  { firstName: 'Gabriel', lastName: 'Hernandez' },
  { firstName: 'Layla', lastName: 'Mercado' },
  { firstName: 'Adrian', lastName: 'Cabrera' },
]

function randomCabiaoLocation() {
  const baseLat = 15.2522
  const baseLng = 120.8596
  const jitter = 0.025
  return {
    lat: baseLat + (Math.random() - 0.5) * jitter * 2,
    lng: baseLng + (Math.random() - 0.5) * jitter * 2,
  }
}

function randomInterests() {
  const count = 2 + Math.floor(Math.random() * 4)
  const shuffled = [...INTEREST_IDS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function randomDaysAgo(maxDays = 90) {
  const ms = Math.floor(Math.random() * maxDays * 24 * 60 * 60 * 1000)
  return new Date(Date.now() - ms)
}

function generateFakeUid(index) {
  return `seeded_user_${Date.now()}_${String(index).padStart(3, '0')}`
}

export async function seedFakeUsers({ onProgress } = {}) {
  const existingQuery = query(collection(db, 'users'), where('_seeded', '==', true))
  const existingSnap = await getDocs(existingQuery)

  if (existingSnap.size > 0) {
    return {
      skipped: true,
      reason: `${existingSnap.size} seeded users already exist. Run "Reset Phase 2 Data" first.`,
      created: 0,
    }
  }

  const results = { created: 0, errors: [], userIds: [] }

  for (let i = 0; i < FAKE_USER_DATA.length; i++) {
    const userData = FAKE_USER_DATA[i]

    try {
      const uid = generateFakeUid(i)
      const fullName = `${userData.firstName} ${userData.lastName}`
      const email = `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase().replace(/\s/g, '')}@seedeuser.local`
      const createdAt = randomDaysAgo(90)
      const location = randomCabiaoLocation()

      const payload = sanitizeForFirestore({
        uid,
        email,
        emailLower: email.toLowerCase(),
        displayName: fullName,
        displayNameLower: fullName.toLowerCase(),
        photoURL: '',
        interests: randomInterests(),
        interestsSetAt: Timestamp.fromDate(createdAt),
        location,
        showOnLeaderboard: true,
        publicName: fullName,
        providerId: 'seeded',
        createdAt: Timestamp.fromDate(createdAt),
        updatedAt: Timestamp.fromDate(createdAt),
        lastSeenAt: Timestamp.fromDate(randomDaysAgo(7)),
        _seeded: true,
      })

      await setDoc(doc(db, 'users', String(uid)), payload)
      results.created++
      results.userIds.push(uid)

      onProgress?.({ current: i + 1, total: FAKE_USER_DATA.length, name: fullName })
    } catch (err) {
      results.errors.push({ index: i, name: `${userData.firstName} ${userData.lastName}`, error: err.message })
    }
  }

  try {
    await logAudit({
      action: 'seed_fake_users',
      targetType: 'users',
      meta: { count: results.created, errors: results.errors.length },
    })
  } catch (err) {
    console.warn('logAudit failed:', err)
  }

  return results
}

export async function deleteSeededUsers() {
  const q = query(collection(db, 'users'), where('_seeded', '==', true))
  const snap = await getDocs(q)

  let deleted = 0
  for (const docSnap of snap.docs) {
    try {
      await deleteDoc(docSnap.ref)
      deleted++
    } catch (err) {
      console.warn(`Failed to delete user ${docSnap.id}:`, err)
    }
  }

  return { deleted }
}

export async function getSeededUserIds() {
  const q = query(collection(db, 'users'), where('_seeded', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.id)
}
