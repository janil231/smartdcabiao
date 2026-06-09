import { collection, getDocs, query, where, addDoc, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { auth } from '../lib/firebase'
import { listBusinesses, isStaticBusiness } from './businesses.service'
import { recomputeAggregatesForTarget } from './reviews.service'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'

const FAKE_USERS = [
  {
    uid: 'seeded-demo-maria-santos',
    email: 'maria.santos@cabiaodemo.local',
    displayName: 'Maria Santos',
  },
  {
    uid: 'seeded-demo-juan-dela-cruz',
    email: 'juan.delacruz@cabiaodemo.local',
    displayName: 'Juan Dela Cruz',
  },
  {
    uid: 'seeded-demo-andrea-reyes',
    email: 'andrea.reyes@cabiaodemo.local',
    displayName: 'Andrea Reyes',
  },
  {
    uid: 'seeded-demo-marco-villanueva',
    email: 'marco.villanueva@cabiaodemo.local',
    displayName: 'Marco Villanueva',
  },
  {
    uid: 'seeded-demo-bianca-cruz',
    email: 'bianca.cruz@cabiaodemo.local',
    displayName: 'Bianca Cruz',
  },
]

const RATING_SPREAD = [5, 4, 4, 3, 5]

const REVIEW_TEMPLATES_FOOD_DINING = [
  { rating: 5, title: 'Best find in Cabiao!', text: 'The food here is consistently excellent. Service was friendly and quick. Will definitely come back with family next weekend.', sustainabilityNote: 'They serve drinks in glass cups for dine-in customers — love that they avoid plastic.' },
  { rating: 4, title: 'Great ambiance, solid food', text: 'Cozy atmosphere perfect for hanging out with friends. Coffee was great, food portions are generous. Wifi is fast too.', sustainabilityNote: '' },
  { rating: 5, title: 'Highly recommend!', text: 'Amazing local spot. The staff are warm and accommodating. Tried their signature dish and it did not disappoint. Worth every peso!', sustainabilityNote: 'Locally sourced ingredients — supporting our farmers.' },
  { rating: 4, title: 'Nice place to relax', text: 'Spent a quiet afternoon here working remotely. Comfortable seating, decent prices, and the snacks are tasty. Will visit again soon.', sustainabilityNote: '' },
  { rating: 3, title: 'Good but room to improve', text: 'Food was decent and service was okay. Took a bit long to get our orders but the staff was apologetic. Might give them another try later on.', sustainabilityNote: '' },
  { rating: 5, title: 'My new favorite!', text: 'Discovered this place last month and have been coming back weekly. Everything on the menu I have tried has been great. Clean and welcoming.', sustainabilityNote: 'They actively segregate waste — visible bins for biodegradable and recyclables.' },
  { rating: 4, title: 'Solid choice for breakfast', text: 'Came here for breakfast with my mom. The pancakes and brewed coffee hit the spot. Reasonable prices and good portions.', sustainabilityNote: '' },
  { rating: 5, title: 'Cant beat the value', text: 'Affordable, delicious, and the staff treats you like family. This is what local Cabiao food should be. Bringing my friends here next time.', sustainabilityNote: '' },
]

const REVIEW_TEMPLATES_SERVICES = [
  { rating: 5, title: 'Reliable and honest', text: 'Brought my car in for a check-up and the team was thorough and transparent about the issue. Fair pricing too. Highly recommended for locals.', sustainabilityNote: 'They properly dispose of used oil and old parts — important for our barangay.' },
  { rating: 4, title: 'Good service overall', text: 'Got my motorbike serviced here. Quick turnaround and the work seems solid so far. Will know more after a few weeks of use but optimistic.', sustainabilityNote: '' },
  { rating: 5, title: 'Excellent workmanship', text: 'Been coming here for years. They know what they are doing and never overcharge. Trust them with all my vehicle maintenance needs.', sustainabilityNote: '' },
  { rating: 4, title: 'Fair pricing, decent quality', text: 'Affordable rates compared to other shops in town. The mechanics explain things in a way you can actually understand. Good local business.', sustainabilityNote: '' },
  { rating: 3, title: 'Mixed experience', text: 'Service was okay but had to come back once for a re-check. They handled it without extra charges though, which I appreciated. Improving slowly.', sustainabilityNote: '' },
  { rating: 5, title: 'Five star service', text: 'Quick, professional, and reasonably priced. The owner is hands-on and ensures quality. Cabiao needs more businesses like this one.', sustainabilityNote: 'They use rags instead of disposable wipes — small thing but adds up.' },
]

const REVIEW_TEMPLATES_GENERIC = [
  { rating: 5, title: 'Great local business', text: 'Friendly service and good quality. Supporting local businesses like this one keeps our community strong. Will be back for sure.', sustainabilityNote: '' },
  { rating: 4, title: 'Worth a visit', text: 'Solid experience overall. The staff was helpful and the place was clean. Would recommend to friends and family who live nearby.', sustainabilityNote: '' },
  { rating: 4, title: 'Pleasant experience', text: 'Nothing fancy but they get the job done well. Honest pricing and you can tell they care about their customers. Local pride right here.', sustainabilityNote: '' },
]

function getTemplatesForBusiness(business) {
  const category = (business.category || business.type || '').toLowerCase()
  if (category === 'food_dining' || category === 'food' || category === 'dining') {
    return REVIEW_TEMPLATES_FOOD_DINING
  }
  if (category === 'services' || category === 'service') {
    return REVIEW_TEMPLATES_SERVICES
  }
  return REVIEW_TEMPLATES_GENERIC
}

function pickTemplatesForBusiness(templates) {
  const selected = []
  for (const desiredRating of RATING_SPREAD) {
    const idx = templates.findIndex((t, i) => t.rating === desiredRating && !selected.includes(i))
    if (idx !== -1) {
      selected.push(idx)
    } else {
      const fallbackIdx = templates.findIndex((t, i) => !selected.includes(i))
      if (fallbackIdx !== -1) {
        selected.push(fallbackIdx)
      } else {
        selected.push(0)
      }
    }
  }
  return selected.map(idx => ({
    ...templates[idx],
    rating: templates[idx].rating,
  }))
}

export async function seedSampleReviewsForAllBusinesses({ onProgress } = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Must be signed in')

  const result = {
    businessesScanned: 0,
    businessesSeeded: 0,
    businessesSkipped: [],
    reviewsCreated: 0,
    usersCreated: 0,
    usersReused: 0,
    errors: [],
    businessesSeededList: [],
  }

  // Phase 1 — Ensure fake users exist
  const now = serverTimestamp()
  for (const fakeUser of FAKE_USERS) {
    const userRef = doc(db, 'users', fakeUser.uid)
    const existingDoc = await getDoc(userRef)
    const isNew = !existingDoc.exists()

    const payload = sanitizeForFirestore({
      email: fakeUser.email,
      displayName: fakeUser.displayName,
      photoURL: null,
      isSeededDemo: true,
      createdAt: now,
      updatedAt: now,
    })

    await setDoc(userRef, { ...payload, createdAt: existingDoc.exists() ? existingDoc.data().createdAt : now, updatedAt: now }, { merge: true })

    if (isNew) {
      result.usersCreated++
    } else {
      result.usersReused++
    }
  }

  // Phase 2 — Fetch businesses
  const { data: allBusinesses } = await listBusinesses({ forceRefresh: true })
  console.log('[SeedReviews] Fetched businesses:', allBusinesses?.length, 'total')

  const realBusinesses = (allBusinesses ?? []).filter(b => !isStaticBusiness(b) && b.isActive !== false)
  console.log('[SeedReviews] After static+active filter:', realBusinesses.length)

  result.businessesScanned = realBusinesses.length

  // Phase 3 — Per business
  for (let bi = 0; bi < realBusinesses.length; bi++) {
    const business = realBusinesses[bi]
    const businessId = String(business.id)
    const businessName = business.name || 'Unknown'

    try {
      // Check if business already has approved reviews
      const existingReviewsQuery = query(
        collection(db, 'reviews'),
        where('targetType', '==', 'business'),
        where('targetId', '==', businessId),
        where('status', '==', 'approved')
      )
      const existingSnap = await getDocs(existingReviewsQuery)

      if (!existingSnap.empty) {
        result.businessesSkipped.push({
          businessId,
          businessName,
          reason: 'Already has reviews',
        })
        continue
      }

      // Pick templates
      const templates = getTemplatesForBusiness(business)
      const selectedTemplates = pickTemplatesForBusiness(templates)

      let reviewsCreatedForThisBusiness = 0

      for (let ri = 0; ri < selectedTemplates.length; ri++) {
        const template = selectedTemplates[ri]
        const fakeUser = FAKE_USERS[ri % FAKE_USERS.length]

        if (onProgress) {
          onProgress({
            businessIndex: bi + 1,
            totalBusinesses: realBusinesses.length,
            businessName,
            reviewIndex: ri + 1,
            totalReviews: selectedTemplates.length,
          })
        }

        try {
          const reviewPayload = sanitizeForFirestore({
            targetType: 'business',
            targetId: businessId,
            uid: fakeUser.uid,
            userEmail: fakeUser.email,
            userDisplayName: fakeUser.displayName,
            rating: template.rating,
            title: template.title || null,
            text: template.text,
            sustainabilityNote: template.sustainabilityNote || null,
            status: 'approved',
            isSeededDemo: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          await addDoc(collection(db, 'reviews'), reviewPayload)
          reviewsCreatedForThisBusiness++

          await logAudit({
            action: 'seed_sample_review_created',
            targetType: 'reviews',
            targetId: businessId,
            adminUid: user.uid,
            adminEmail: user.email,
            meta: { businessId, businessName, rating: template.rating, fakeUserUid: fakeUser.uid },
          })
        } catch (reviewError) {
          console.error(`[SeedReviews] Review ${ri + 1}/${selectedTemplates.length} for ${businessName} FAILED:`, reviewError)
        }
      }

      // After all 5 reviews for this business, recompute aggregates
      if (reviewsCreatedForThisBusiness > 0) {
        await recomputeAggregatesForTarget({ targetType: 'business', targetId: businessId })

        result.businessesSeededList.push({
          businessId,
          businessName,
          reviewsCreated: reviewsCreatedForThisBusiness,
        })
        result.businessesSeeded++
      }

      result.reviewsCreated += reviewsCreatedForThisBusiness
    } catch (businessError) {
      console.error(`[SeedReviews] Business ${businessName} FAILED:`, businessError)
      result.errors.push({
        businessId,
        businessName,
        error: businessError.message || String(businessError),
      })
    }
  }

  // Phase 4 — Summary audit log
  await logAudit({
    action: 'seed_sample_reviews_all_businesses',
    targetType: 'reviews',
    targetId: 'batch',
    adminUid: user.uid,
    adminEmail: user.email,
    meta: {
      businessesScanned: result.businessesScanned,
      businessesSeeded: result.businessesSeeded,
      businessesSkipped: result.businessesSkipped.length,
      reviewsCreated: result.reviewsCreated,
      usersCreated: result.usersCreated,
      usersReused: result.usersReused,
      errors: result.errors.length,
    },
  })

  return result
}
