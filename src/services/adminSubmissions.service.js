import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  writeBatch, 
  serverTimestamp,
  addDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isWithinCabiaoBounds } from '../constants/cabiaoGeo'
import { BUSINESS_TYPES } from '../data/businesses'
import { logAudit, AUDIT_ACTIONS } from './audit.service'
import { clearBusinessesCache } from './businesses.service'

const SUBMISSIONS_COLLECTION = 'submissions'
const BUSINESSES_COLLECTION = 'businesses'
const DESTINATIONS_COLLECTION = 'destinations'

export async function listSubmissions({ status = 'new' } = {}) {
  try {
    let q = collection(db, SUBMISSIONS_COLLECTION)
    
    if (status) {
      q = query(q, where('status', '==', status), orderBy('createdAt', 'desc'))
    } else {
      q = query(q, orderBy('createdAt', 'desc'))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }))
  } catch (error) {
    console.error('Error listing submissions:', error)
    return []
  }
}

export async function getSubmissionById(id) {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || null
    }
  } catch (error) {
    console.error('Error getting submission:', error)
    return null
  }
}

export async function updateSubmissionStatus(id, { status, reviewedBy, reviewedByEmail, reviewedAt, notes }) {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, id)
    const updateData = {
      status,
      reviewedBy: reviewedBy || null,
      reviewedByEmail: reviewedByEmail || null,
      reviewedAt: reviewedAt || serverTimestamp(),
      notes: notes || null
    }
    
    const batch = writeBatch(db)
    batch.update(docRef, updateData)
    await batch.commit()
    
    return { success: true }
  } catch (error) {
    console.error('Error updating submission status:', error)
    return { success: false, error: error.message }
  }
}

function normalizePosition(position) {
  if (!position) return null
  if (Array.isArray(position) && position.length >= 2) return position
  if (position.lat !== undefined && position.lng !== undefined) return [position.lat, position.lng]
  return null
}

function normalizeImages(images) {
  if (!images) return []
  if (Array.isArray(images)) return images.filter(Boolean)
  return []
}

export async function approveSubmissionAndPublish(id, { reviewedBy, reviewedByEmail } = {}) {
  try {
    const submission = await getSubmissionById(id)
    if (!submission) {
      return { success: false, error: 'Submission not found' }
    }

    if (!submission.name || !submission.description) {
      return { success: false, error: 'Missing required fields (name, description)' }
    }

    const position = normalizePosition(submission.position)
    if (position) {
      const [lat, lng] = position
      if (!isWithinCabiaoBounds(lat, lng)) {
        return { 
          success: false, 
          error: `Location outside Cabiao bounds. Lat: ${lat}, Lng: ${lng}` 
        }
      }
    }

    const entryType = submission.entryType || 'business'
    const targetCollection = entryType === 'destination' ? DESTINATIONS_COLLECTION : BUSINESSES_COLLECTION

    const publishedData = {
      id: id,
      name: submission.name,
      category: submission.category || 'other',
      description: submission.description,
      position: position || [15.2345, 120.83965],
      images: normalizeImages(submission.images),
      barangay: submission.barangay || '',
      address: submission.address || '',
      phone: submission.contact || '',
      website: submission.website || null,
      verified: true,
      publishedAt: serverTimestamp(),
      sourceSubmissionId: id,
      sourceSubmissionName: submission.name,
      createdByUid: submission.createdByUid || null,
      createdByEmail: submission.createdByEmail || null
    }

    const batch = writeBatch(db)

    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, id)
    batch.update(submissionRef, {
      status: 'approved',
      reviewedBy: reviewedBy || null,
      reviewedByEmail: reviewedByEmail || null,
      reviewedAt: serverTimestamp(),
      publishedTo: targetCollection,
      publishedAt: serverTimestamp()
    })

    const targetRef = doc(db, targetCollection, id)
    batch.set(targetRef, publishedData)

    await batch.commit()

    await logAudit({
      action: AUDIT_ACTIONS.SUBMISSION_APPROVED,
      targetType: 'submission',
      targetId: id,
      adminUid: reviewedBy,
      adminEmail: reviewedByEmail,
      meta: {
        name: submission.name,
        entryType,
        previousStatus: submission.status
      }
    })

    await logAudit({
      action: entryType === 'destination' ? AUDIT_ACTIONS.PUBLISHED_DESTINATION : AUDIT_ACTIONS.PUBLISHED_BUSINESS,
      targetType: targetCollection === DESTINATIONS_COLLECTION ? 'destination' : 'business',
      targetId: id,
      adminUid: reviewedBy,
      adminEmail: reviewedByEmail,
      meta: {
        name: submission.name,
        sourceSubmissionId: id
      }
    })

    return { success: true, targetCollection, publishedId: id }
  } catch (error) {
    console.error('Error approving submission:', error)
    return { success: false, error: error.message }
  }
}

export async function rejectSubmission(id, { reviewedBy, reviewedByEmail, notes, rejectionReason } = {}) {
  const submission = await getSubmissionById(id)
  const reason = rejectionReason || notes || null

  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, id)
    const batch = writeBatch(db)
    batch.update(docRef, {
      status: 'rejected',
      reviewedBy: reviewedBy || null,
      reviewedByEmail: reviewedByEmail || null,
      reviewedAt: serverTimestamp(),
      notes: notes || null,
      rejectionReason: reason,
    })
    await batch.commit()

    await logAudit({
      action: AUDIT_ACTIONS.SUBMISSION_REJECTED,
      targetType: 'submission',
      targetId: id,
      adminUid: reviewedBy,
      adminEmail: reviewedByEmail,
      meta: {
        name: submission?.businessName || submission?.name,
        previousStatus: submission?.status,
        notes: reason,
        type: submission?.type,
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error rejecting submission:', error)
    return { success: false, error: error.message }
  }
}

export async function approveBusinessSubmission(submissionId, submissionData, adminUid, adminEmail) {
  try {
    const submission = submissionData || await getSubmissionById(submissionId)
    if (!submission) {
      return { success: false, error: 'Submission not found' }
    }

    if (submission.type !== 'business') {
      return { success: false, error: 'Not a business registration submission' }
    }

    const location = submission.location
    if (!location?.lat || !location?.lng) {
      return { success: false, error: 'Missing business location' }
    }

    if (!isWithinCabiaoBounds(location.lat, location.lng)) {
      return {
        success: false,
        error: `Location outside Cabiao bounds. Lat: ${location.lat}, Lng: ${location.lng}`,
      }
    }

    const category = submission.category || 'other'
    const type =
      category === 'food_dining'
        ? BUSINESS_TYPES.restaurant
        : category === 'tourism_recreation' || category === 'accommodation'
          ? BUSINESS_TYPES.attraction
          : BUSINESS_TYPES.shop

    const businessData = {
      name: submission.businessName,
      category,
      type,
      description: submission.description,
      barangay: submission.barangay,
      address: submission.address,
      location: submission.location,
      position: [location.lat, location.lng],
      contactNumber: submission.contactNumber || '',
      phone: submission.contactNumber || '',
      facebook: submission.facebook || '',
      website: submission.website || '',
      photos:
        Array.isArray(submission.photoURLs) && submission.photoURLs.length > 0
          ? submission.photoURLs.filter(Boolean)
          : submission.photoURL
            ? [submission.photoURL]
            : [],
      images:
        Array.isArray(submission.photoURLs) && submission.photoURLs.length > 0
          ? submission.photoURLs.filter(Boolean)
          : submission.photoURL
            ? [submission.photoURL]
            : [],
      isActive: true,
      isVerified: false,
      verified: false,
      submittedBy: submission.submittedBy,
      sourceSubmissionId: submissionId,
      createdAt: serverTimestamp(),
      rating: 0,
      reviewCount: 0,
    }

    const businessRef = await addDoc(collection(db, BUSINESSES_COLLECTION), businessData)

    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId)
    const batch = writeBatch(db)
    batch.update(submissionRef, {
      status: 'approved',
      reviewedBy: adminUid || null,
      reviewedByEmail: adminEmail || null,
      reviewedAt: serverTimestamp(),
      approvedBusinessId: businessRef.id,
    })
    await batch.commit()

    await clearBusinessesCache()

    await logAudit({
      action: AUDIT_ACTIONS.SUBMISSION_APPROVED,
      targetType: 'submission',
      targetId: submissionId,
      adminUid,
      adminEmail,
      meta: {
        name: submission.businessName,
        type: 'business',
        previousStatus: submission.status,
        approvedBusinessId: businessRef.id,
      }
    })

    await logAudit({
      action: AUDIT_ACTIONS.PUBLISHED_BUSINESS,
      targetType: 'business',
      targetId: businessRef.id,
      adminUid,
      adminEmail,
      meta: {
        name: submission.businessName,
        sourceSubmissionId: submissionId,
      }
    })

    return { success: true, businessId: businessRef.id }
  } catch (error) {
    console.error('Error approving business submission:', error)
    return { success: false, error: error.message }
  }
}

export async function requestMoreInfoSubmission(id, { reviewedBy, reviewedByEmail, notes } = {}) {
  const submission = await getSubmissionById(id)
  const result = await updateSubmissionStatus(id, {
    status: 'needs_info',
    reviewedBy,
    reviewedByEmail,
    reviewedAt: serverTimestamp(),
    notes
  })
  
  if (result.success) {
    await logAudit({
      action: AUDIT_ACTIONS.SUBMISSION_NEEDS_INFO,
      targetType: 'submission',
      targetId: id,
      adminUid: reviewedBy,
      adminEmail: reviewedByEmail,
      meta: {
        name: submission?.name,
        previousStatus: submission?.status,
        notes
      }
    })
  }
  
  return result
}
