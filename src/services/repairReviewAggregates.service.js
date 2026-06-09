import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { auth } from '../lib/firebase'
import { listBusinesses, isStaticBusiness } from './businesses.service'
import { sanitizeForFirestore } from '../utils/firestoreSanitize'
import { logAudit } from './audit.service'

const TARGET_TYPE = 'business'

export async function repairAllReviewAggregates({ onProgress } = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Must be signed in')

  const result = {
    businessesScanned: 0,
    businessesRepaired: 0,
    businessesSkipped: [],
    businessesUpdated: [],
    errors: [],
  }

  const { data: allBusinesses } = await listBusinesses({ forceRefresh: true })
  console.log('[RepairAggregates] Fetched businesses:', allBusinesses?.length, 'total')

  const realBusinesses = (allBusinesses ?? []).filter(b => !isStaticBusiness(b) && b.isActive !== false)
  console.log('[RepairAggregates] After static+active filter:', realBusinesses.length)

  result.businessesScanned = realBusinesses.length

  for (let bi = 0; bi < realBusinesses.length; bi++) {
    const business = realBusinesses[bi]
    const businessId = String(business.id)
    const businessName = business.name || 'Unknown'

    if (onProgress) {
      onProgress({
        businessIndex: bi + 1,
        totalBusinesses: realBusinesses.length,
        businessName,
      })
    }

    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('targetType', '==', TARGET_TYPE),
        where('targetId', '==', businessId),
        where('status', '==', 'approved')
      )
      const querySnapshot = await getDocs(reviewsQuery)
      const reviews = querySnapshot.docs.map(doc => doc.data())

      const newCount = reviews.length
      let newAvg = 0
      if (newCount > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)
        newAvg = Math.round((totalRating / newCount) * 10) / 10
      }

      const oldRating = business.ratingAvg ?? null
      const oldCount = business.ratingCount ?? null

      const ratingChanged = oldRating !== newAvg || oldCount !== newCount

      if (!ratingChanged && newCount > 0) {
        result.businessesSkipped.push({
          businessId,
          businessName,
          reason: 'Aggregate already correct',
        })
        continue
      }

      if (!ratingChanged && newCount === 0) {
        result.businessesSkipped.push({
          businessId,
          businessName,
          reason: 'No approved reviews found',
        })
        continue
      }

      const updatePayload = sanitizeForFirestore({
        rating: newAvg,
        ratingAvg: newAvg,
        ratingCount: newCount,
        updatedAt: serverTimestamp(),
      })

      await setDoc(doc(db, 'businesses', businessId), updatePayload, { merge: true })

      console.log(`[RepairAggregates] Updated ${businessName}: ${oldRating?.toFixed(1) ?? '0.0'} (${oldCount ?? 0}) → ${newAvg.toFixed(1)} (${newCount})`)

      result.businessesUpdated.push({
        businessId,
        businessName,
        oldRating,
        newRating: newAvg,
        oldCount,
        newCount,
      })
      result.businessesRepaired++

      await logAudit({
        action: 'repair_review_aggregate',
        targetType: 'businesses',
        targetId: businessId,
        adminUid: user.uid,
        adminEmail: user.email,
        meta: { businessName, oldRating, newRating: newAvg, oldCount, newCount },
      })
    } catch (businessError) {
      console.error(`[RepairAggregates] Business ${businessName} FAILED:`, businessError)
      result.errors.push({
        businessId,
        businessName,
        error: businessError.message || String(businessError),
      })
    }
  }

  await logAudit({
    action: 'repair_review_aggregates_all_businesses',
    targetType: 'businesses',
    targetId: 'batch',
    adminUid: user.uid,
    adminEmail: user.email,
    meta: {
      businessesScanned: result.businessesScanned,
      businessesRepaired: result.businessesRepaired,
      businessesSkipped: result.businessesSkipped.length,
      businessesUpdated: result.businessesUpdated.length,
      errors: result.errors.length,
    },
  })

  return result
}
