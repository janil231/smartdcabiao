import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import DOMPurify from 'dompurify'
import { db } from '../lib/firebase'
import { uploadToCloudinary } from '../utils/cloudinary'
import { compressImage } from '../utils/compressImage'
import { isWithinCabiaoBounds } from '../constants/cabiaoGeo'

const SUBMISSIONS_COLLECTION = 'submissions'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE = 3 * 1024 * 1024

function sanitizeDescription(text) {
  if (!text) return ''
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
}

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => {
    const at = a.createdAt?.toDate?.()?.getTime() ?? 0
    const bt = b.createdAt?.toDate?.()?.getTime() ?? 0
    return bt - at
  })
}

export const createSubmission = async (submissionData) => {
  try {
    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
      ...submissionData,
      createdAt: serverTimestamp(),
      status: 'new',
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error creating submission:', error)
    return { success: false, error: error.message }
  }
}

export async function getMyBusinessSubmissions(uid) {
  if (!uid) return []

  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('submittedBy', '==', uid),
      where('type', '==', 'business')
    )
    const snap = await getDocs(q)
    return sortByCreatedDesc(
      snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    )
  } catch (error) {
    console.error('Error fetching business submissions:', error)
    return []
  }
}

export async function getMyBusinessSubmission(uid) {
  const list = await getMyBusinessSubmissions(uid)
  return list[0] || null
}

export async function submitBusinessRegistration(uid, user, formData, photoFiles = []) {
  if (!uid || !user) {
    throw new Error('You must be signed in to submit a business registration')
  }

  const { lat, lng } = formData.location || {}
  if (lat == null || lng == null || !isWithinCabiaoBounds(lat, lng)) {
    throw new Error('Please pin a valid location within Cabiao on the map')
  }

  let photoURLs = []
  const files = Array.isArray(photoFiles) ? photoFiles.filter(Boolean) : []

  if (files.length > 0) {
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Invalid photo type. Allowed: jpg, jpeg, png, webp')
      }
      if (file.size > MAX_PHOTO_SIZE) {
        throw new Error('One or more photos exceed 3MB. Please remove or compress them.')
      }
    }

    try {
      const uploadPromises = files.map(async (file) => {
        const compressed = await compressImage(file, 1024, 0.75)
        return uploadToCloudinary(compressed)
      })
      photoURLs = await Promise.all(uploadPromises)
    } catch (err) {
      console.error('Photo upload failed:', err)
      throw new Error('One or more photos failed to upload. Please try again.')
    }
  }

  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
    type: 'business',
    status: 'pending',
    submittedBy: uid,
    submitterEmail: user.email || '',
    submitterDisplayName: user.displayName || '',
    createdAt: serverTimestamp(),
    businessName: formData.businessName.trim(),
    category: formData.category,
    description: sanitizeDescription(formData.description),
    barangay: formData.barangay,
    address: formData.address.trim(),
    location: { lat, lng },
    contactNumber: formData.contactNumber?.trim() || '',
    facebook: formData.facebook?.trim() || '',
    website: formData.website?.trim() || '',
    photoURLs,
    photoURL: photoURLs[0] || '',
    isOwner: true,
    ownerName: formData.ownerName.trim(),
    ownerContact: formData.ownerContact.trim(),
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    approvedBusinessId: null,
  })

  return docRef.id
}

export async function submitDestinationSuggestion(uid, user, formData, location, photoFiles = []) {
  if (!uid || !user) {
    throw new Error('You must be signed in to suggest a destination')
  }

  const { lat, lng } = location || {}
  if (lat == null || lng == null || !isWithinCabiaoBounds(lat, lng)) {
    throw new Error('Please pin a valid location within Cabiao on the map')
  }

  let photoURLs = []
  const files = Array.isArray(photoFiles) ? photoFiles.filter(Boolean) : []

  if (files.length > 0) {
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Invalid photo type. Allowed: jpg, jpeg, png, webp')
      }
      if (file.size > MAX_PHOTO_SIZE) {
        throw new Error('One or more photos exceed 3MB. Please remove or compress them.')
      }
    }

    try {
      const uploadPromises = files.map(async (file) => {
        const compressed = await compressImage(file, 1024, 0.75)
        return uploadToCloudinary(compressed)
      })
      photoURLs = await Promise.all(uploadPromises)
    } catch (err) {
      console.error('Photo upload failed:', err)
      throw new Error('One or more photos failed to upload. Please try again.')
    }
  }

  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
    type: 'destination',
    status: 'pending',
    submittedBy: uid,
    submitterEmail: user.email || '',
    submitterDisplayName: user.displayName || '',
    createdAt: serverTimestamp(),
    name: formData.name.trim(),
    category: formData.category,
    tagline: formData.tagline?.trim() || '',
    description: sanitizeDescription(formData.description),
    bestTime: formData.bestTime?.trim() || '',
    activities: formData.activities?.trim() || '',
    entranceFee: formData.entranceFee || 'free',
    barangay: formData.barangay,
    landmark: formData.landmark?.trim() || '',
    location: { lat, lng },
    position: [lat, lng],
    photoURLs,
    photoURL: photoURLs[0] || '',
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    approvedDestinationId: null,
  })

  return docRef.id
}

export async function getMyDestinationSubmissions(uid) {
  if (!uid) return []

  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('submittedBy', '==', uid),
      where('type', '==', 'destination')
    )
    const snap = await getDocs(q)
    return sortByCreatedDesc(
      snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    )
  } catch (error) {
    console.error('Error fetching destination submissions:', error)
    return []
  }
}
