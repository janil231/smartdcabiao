import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isWithinCabiaoBounds } from '../constants/cabiaoGeo'
import { logAudit, AUDIT_ACTIONS } from './audit.service'
import { deletePlaceImage } from './storage.service'

const TYPE_MAP = {
  business: 'businesses',
  businesses: 'businesses',
  destination: 'destinations',
  destinations: 'destinations'
}

function normalizeType(type) {
  return TYPE_MAP[type] || 'businesses'
}

function normalizePosition(position) {
  if (!position) return null
  if (Array.isArray(position) && position.length >= 2) return position
  if (position.lat !== undefined && position.lng !== undefined) return [position.lat, position.lng]
  return null
}

function normalizeImages(images, imagePaths) {
  if (!images) return []
  if (Array.isArray(images)) return images.filter(Boolean)
  return []
}

export async function listPlaces(type = 'businesses') {
  const collectionName = normalizeType(type)
  
  try {
    const q = query(collection(db, collectionName), orderBy('name', 'asc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || null
    }))
  } catch (error) {
    console.error('Error listing places:', error)
    return []
  }
}

export async function getPlace(type, id) {
  const collectionName = normalizeType(type)
  
  try {
    const docRef = doc(db, collectionName, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || null
    }
  } catch (error) {
    console.error('Error getting place:', error)
    return null
  }
}

export async function createPlace(type, payload, { uid, email }) {
  const collectionName = normalizeType(type)
  
  try {
    const position = normalizePosition(payload.position)
    
    if (position) {
      const [lat, lng] = position
      if (!isWithinCabiaoBounds(lat, lng)) {
        return { 
          success: false, 
          error: `Location outside Cabiao bounds. Lat: ${lat}, Lng: ${lng}` 
        }
      }
    }

    const placeData = {
      name: payload.name,
      category: payload.category || 'other',
      description: payload.description,
      position: position || [15.2345, 120.83965],
      images: normalizeImages(payload.images),
      imagePaths: payload.imagePaths || [],
      barangay: payload.barangay || '',
      address: payload.address || '',
      phone: payload.phone || '',
      website: payload.website || null,
      verified: payload.verified !== false,
      type: payload.type || 'shop',
      createdAt: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, collectionName), placeData)

    await logAudit({
      action: AUDIT_ACTIONS.PLACE_CREATED,
      targetType: collectionName,
      targetId: docRef.id,
      adminUid: uid,
      adminEmail: email,
      meta: {
        name: payload.name,
        category: payload.category
      }
    })

    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error creating place:', error)
    return { success: false, error: error.message }
  }
}

export async function updatePlace(type, id, payload, { uid, email }) {
  const collectionName = normalizeType(type)
  
  try {
    const place = await getPlace(type, id)
    if (!place) {
      return { success: false, error: 'Place not found' }
    }

    const position = normalizePosition(payload.position)
    
    if (position) {
      const [lat, lng] = position
      if (!isWithinCabiaoBounds(lat, lng)) {
        return { 
          success: false, 
          error: `Location outside Cabiao bounds. Lat: ${lat}, Lng: ${lng}` 
        }
      }
    }

    const updateData = {
      name: payload.name,
      category: payload.category || 'other',
      description: payload.description,
      position: position || place.position,
      images: normalizeImages(payload.images),
      imagePaths: payload.imagePaths || [],
      barangay: payload.barangay || '',
      address: payload.address || '',
      phone: payload.phone || '',
      website: payload.website || null,
      verified: payload.verified !== false,
      type: payload.type || place.type || 'shop',
      updatedAt: serverTimestamp(),
      updatedBy: { uid, email }
    }

    const docRef = doc(db, collectionName, id)
    await updateDoc(docRef, updateData)

    await logAudit({
      action: AUDIT_ACTIONS.PLACE_UPDATED,
      targetType: collectionName,
      targetId: id,
      adminUid: uid,
      adminEmail: email,
      meta: {
        name: payload.name,
        previousName: place.name
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating place:', error)
    return { success: false, error: error.message }
  }
}

export async function deletePlace(type, id, { uid, email }) {
  const collectionName = normalizeType(type)
  
  try {
    const place = await getPlace(type, id)
    if (!place) {
      return { success: false, error: 'Place not found' }
    }

    if (place.imagePaths && place.imagePaths.length > 0) {
      for (const path of place.imagePaths) {
        await deletePlaceImage(path)
      }
    }

    const docRef = doc(db, collectionName, id)
    await deleteDoc(docRef)

    await logAudit({
      action: AUDIT_ACTIONS.PLACE_DELETED,
      targetType: collectionName,
      targetId: id,
      adminUid: uid,
      adminEmail: email,
      meta: {
        name: place.name
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting place:', error)
    return { success: false, error: error.message }
  }
}

export async function searchPlaces(type, searchTerm) {
  const places = await listPlaces(type)
  
  if (!searchTerm) return places
  
  const term = searchTerm.toLowerCase()
  return places.filter(place => 
    place.name?.toLowerCase().includes(term) ||
    place.category?.toLowerCase().includes(term) ||
    place.barangay?.toLowerCase().includes(term) ||
    place.description?.toLowerCase().includes(term)
  )
}
