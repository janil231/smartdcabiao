import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { logAudit } from './audit.service'

const REVIEWS_COLLECTION = 'reviews'
const BUSINESSES_COLLECTION = 'businesses'
const DESTINATIONS_COLLECTION = 'destinations'

function getReviewId(targetType, targetId, uid) {
  return `${targetType}_${targetId}_${uid}`
}

export async function createOrUpdateReview({ 
  targetType, 
  targetId, 
  uid, 
  user, 
  rating, 
  title, 
  text, 
  sustainabilityNote 
}) {
  if (!targetType || !targetId || !uid || !rating || !text) {
    return { success: false, error: 'Missing required fields' }
  }

  if (text.length < 20) {
    return { success: false, error: 'Review must be at least 20 characters' }
  }

  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }

  const reviewId = getReviewId(targetType, targetId, uid)
  const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId)

  try {
    const existingDoc = await getDoc(reviewRef)
    const now = serverTimestamp()

    const reviewData = {
      targetType,
      targetId: String(targetId),
      uid,
      userEmail: user?.email || null,
      userDisplayName: user?.displayName || user?.email?.split('@')[0] || null,
      rating: Number(rating),
      title: title || null,
      text,
      sustainabilityNote: sustainabilityNote || null,
      status: 'pending',
      createdAt: existingDoc.exists() ? existingDoc.data().createdAt : now,
      updatedAt: now,
      reviewedAt: null,
      reviewedByUid: null,
      reviewedByEmail: null
    }

    await setDoc(reviewRef, reviewData, { merge: true })

    return { success: true, id: reviewId }
  } catch (error) {
    console.error('Error creating/updating review:', error)
    return { success: false, error: error.message }
  }
}

export async function getMyReview({ targetType, targetId, uid }) {
  if (!targetType || !targetId || !uid) {
    return null
  }

  const reviewId = getReviewId(targetType, targetId, uid)
  const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId)

  try {
    const docSnap = await getDoc(reviewRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error getting my review:', error)
    return null
  }
}

export async function listApprovedReviews({ targetType, targetId, limit = 20 }) {
  if (!targetType || !targetId) {
    return []
  }

  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION)
    const q = query(
      reviewsRef,
      where('targetType', '==', targetType),
      where('targetId', '==', String(targetId)),
      where('status', '==', 'approved')
    )

    const querySnapshot = await getDocs(q)
    const reviews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    reviews.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateB - dateA
    })

    return reviews.slice(0, limit)
  } catch (error) {
    console.error('Error listing approved reviews:', error)
    return []
  }
}

export async function listPendingReviews({ limit = 50 }) {
  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION)
    const q = query(
      reviewsRef,
      where('status', '==', 'pending')
    )

    const querySnapshot = await getDocs(q)
    const reviews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    reviews.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateA - dateB
    })

    return reviews.slice(0, limit)
  } catch (error) {
    console.error('Error listing pending reviews:', error)
    return []
  }
}

export async function setReviewStatus({ reviewId, status, adminUser }) {
  if (!reviewId || !status || !['approved', 'rejected'].includes(status)) {
    return { success: false, error: 'Invalid parameters' }
  }

  if (!adminUser?.uid) {
    return { success: false, error: 'Admin user required' }
  }

  const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId)

  try {
    const docSnap = await getDoc(reviewRef)
    if (!docSnap.exists()) {
      return { success: false, error: 'Review not found' }
    }

    const reviewData = docSnap.data()
    const now = serverTimestamp()

    await updateDoc(reviewRef, {
      status,
      reviewedAt: now,
      reviewedByUid: adminUser.uid,
      reviewedByEmail: adminUser.email
    })

    const auditAction = status === 'approved' ? 'review_approved' : 'review_rejected'
    await logAudit({
      action: auditAction,
      targetType: reviewData.targetType,
      targetId: reviewData.targetId,
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      meta: { reviewId, rating: reviewData.rating }
    })

    await recomputeAggregatesForTarget({
      targetType: reviewData.targetType,
      targetId: reviewData.targetId
    })

    return { success: true }
  } catch (error) {
    console.error('Error setting review status:', error)
    return { success: false, error: error.message }
  }
}

export async function recomputeAggregatesForTarget({ targetType, targetId }) {
  if (!targetType || !targetId) {
    return { success: false, error: 'Missing targetType or targetId' }
  }

  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION)
    const q = query(
      reviewsRef,
      where('targetType', '==', targetType),
      where('targetId', '==', String(targetId)),
      where('status', '==', 'approved')
    )

    const querySnapshot = await getDocs(q)
    const reviews = querySnapshot.docs.map(doc => doc.data())

    const ratingCount = reviews.length
    let ratingAvg = 0

    if (ratingCount > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)
      ratingAvg = Math.round((totalRating / ratingCount) * 10) / 10
    }

    console.log(`[recomputeAggregates] ${targetType}/${targetId}: ${ratingCount} approved reviews, avg ${ratingAvg.toFixed(2)}`)

    const targetCollection = targetType === 'business' ? BUSINESSES_COLLECTION : DESTINATIONS_COLLECTION
    const targetRef = doc(db, targetCollection, String(targetId))

    const targetDoc = await getDoc(targetRef)
    if (targetDoc.exists()) {
      await updateDoc(targetRef, {
        ratingAvg,
        ratingCount,
        updatedAt: serverTimestamp()
      })
    }

    await logAudit({
      action: 'review_aggregate_updated',
      targetType,
      targetId,
      adminUid: 'system',
      adminEmail: null,
      meta: { ratingAvg, ratingCount }
    })

    return { success: true, ratingAvg, ratingCount }
  } catch (error) {
    console.error('Error recomputing aggregates:', error)
    return { success: false, error: error.message }
  }
}

export async function getReviewsForTarget({ targetType, targetId }) {
  if (!targetType || !targetId) {
    return []
  }

  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION)
    const q = query(
      reviewsRef,
      where('targetType', '==', targetType),
      where('targetId', '==', String(targetId))
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting reviews for target:', error)
    return []
  }
}
