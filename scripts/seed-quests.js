import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function seedData() {
  console.log('Seeding data...')

  const seasonId = 'season1'
  await setDoc(doc(db, 'seasons', seasonId), {
    name: 'Cabiao Green Season 2026',
    startAt: '2026-01-01T00:00:00Z',
    endAt: '2026-12-31T23:59:59Z',
    isActive: true
  })
  console.log('Created season')

  const quests = [
    {
      title: 'Cabiao Riverbank Clean-up',
      description: 'Join us for a community clean-up at the Cabiao Riverbank. Help keep our town beautiful!',
      category: 'cleanup',
      points: 50,
      capacity: 20,
      reservedCount: 0,
      startAt: '2026-03-01T00:00:00Z',
      endAt: '2026-03-31T23:59:59Z',
      gracePeriodHours: 24,
      status: 'active'
    },
    {
      title: 'Tree Planting Day',
      description: 'Help plant trees in the municipal garden. Bring gloves and sunscreen!',
      category: 'treePlanting',
      points: 75,
      capacity: 15,
      reservedCount: 0,
      startAt: '2026-03-15T00:00:00Z',
      endAt: '2026-04-15T23:59:59Z',
      gracePeriodHours: 48,
      status: 'active'
    },
    {
      title: 'Barangay Fiesta Event',
      description: 'Participate in the annual barangay fiesta activities.',
      category: 'event',
      points: 100,
      capacity: 50,
      reservedCount: 0,
      startAt: '2026-04-01T00:00:00Z',
      endAt: '2026-04-07T23:59:59Z',
      gracePeriodHours: 72,
      status: 'active'
    },
    {
      title: 'Coastal Beach Clean-up',
      description: 'Help clean up Polilio beach and surrounding coastal areas.',
      category: 'cleanup',
      points: 60,
      capacity: 25,
      reservedCount: 0,
      startAt: '2026-03-20T00:00:00Z',
      endAt: '2026-03-25T23:59:59Z',
      gracePeriodHours: 24,
      status: 'active'
    },
    {
      title: 'School Garden Project',
      description: 'Plant vegetables and flowers at the local school garden.',
      category: 'treePlanting',
      points: 40,
      capacity: 10,
      reservedCount: 0,
      startAt: '2026-03-10T00:00:00Z',
      endAt: '2026-03-20T23:59:59Z',
      gracePeriodHours: 36,
      status: 'active'
    },
    {
      title: 'Town Heritage Walk',
      description: 'Guide tourists through Cabiao heritage sites and share local history.',
      category: 'event',
      points: 80,
      capacity: 8,
      reservedCount: 0,
      startAt: '2026-04-05T00:00:00Z',
      endAt: '2026-04-06T23:59:59Z',
      gracePeriodHours: 48,
      status: 'active'
    }
  ]

  for (let i = 0; i < quests.length; i++) {
    const questId = `quest${i + 1}`
    await setDoc(doc(db, 'quests', questId), {
      seasonId,
      ...quests[i]
    })
    console.log(`Created quest: ${quests[i].title}`)
  }

  console.log('Done! Created 1 season and 6 quests.')
}

seedData().catch(console.error)
