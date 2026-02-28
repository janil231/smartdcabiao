/**
 * Destinations Service Layer
 * Backend-ready service for destination management
 * Uses Firestore when VITE_USE_FIRESTORE_DATA=true, falls back to mock data
 */

import { getDocs, doc, getDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getDestinations as getMockDestinations } from '../data'

const USE_FIRESTORE = import.meta.env.VITE_USE_FIRESTORE_DATA === 'true'
const DESTINATIONS_COLLECTION = 'destinations'

let destinationsCache = null

function normalizeDestinationDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    name: data.name || '',
    category: data.category || 'Destination',
    type: data.type || 'destination',
    description: data.description || '',
    position: normalizePosition(data.position),
    address: data.address || '',
    barangay: data.barangay || '',
    phone: data.phone || '',
    hours: data.hours || '',
    priceRange: data.priceRange || 'Free',
    specialties: data.specialties || [],
    features: data.features || [],
    images: normalizeImages(data.images),
    website: data.website || null,
    socialMedia: data.socialMedia || {},
    tags: data.tags || [],
    verified: data.verified ?? false,
  }
}

function normalizePosition(position) {
  if (!position) return [15.2345, 120.83965]
  if (Array.isArray(position) && position.length >= 2) return position
  if (position.lat !== undefined && position.lng !== undefined) return [position.lat, position.lng]
  return [15.2345, 120.83965]
}

function normalizeImages(images) {
  if (!images) return []
  if (Array.isArray(images)) return images.filter(Boolean)
  return []
}

async function fetchFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, DESTINATIONS_COLLECTION))
    if (querySnapshot.empty) {
      if (import.meta.env.DEV) {
        console.warn('[Destinations] Firestore collection empty, using mock data')
      }
      return null
    }
    const destinations = querySnapshot.docs.map(normalizeDestinationDoc)
    return destinations
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Destinations] Firestore fetch failed, using mock data:', error.message)
    }
    return null
  }
}

export async function listDestinations() {
  if (USE_FIRESTORE) {
    if (!destinationsCache) {
      destinationsCache = await fetchFromFirestore()
    }
    if (destinationsCache) {
      return destinationsCache
    }
  }
  return getMockDestinations()
}

export async function getDestinationById(id) {
  if (USE_FIRESTORE) {
    if (!destinationsCache) {
      destinationsCache = await fetchFromFirestore()
    }
    if (destinationsCache) {
      return destinationsCache.find(d => String(d.id) === String(id)) || null
    }
  }
  const mockDestinations = getMockDestinations()
  return mockDestinations.find(d => d.id === parseInt(id, 10)) || null
}

export async function getDestinationBarangays() {
  try {
    const destinations = await listDestinations()
    const barangays = [...new Set(destinations
      .map(d => d.barangay)
      .filter(Boolean)
    )].sort()
    return barangays
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[Destinations] Error fetching barangays:', error)
    }
    return []
  }
}

export async function searchDestinations(query = '', filters = {}) {
  let results = await listDestinations()

  if (query.trim()) {
    const lowercaseQuery = query.toLowerCase()
    results = results.filter(d =>
      d.name.toLowerCase().includes(lowercaseQuery) ||
      d.description?.toLowerCase().includes(lowercaseQuery) ||
      d.address?.toLowerCase().includes(lowercaseQuery) ||
      d.barangay?.toLowerCase().includes(lowercaseQuery) ||
      d.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }

  if (filters.barangay) {
    results = results.filter(d => d.barangay === filters.barangay)
  }

  if (filters.type) {
    results = results.filter(d => d.type === filters.type)
  }

  if (filters.verified !== undefined) {
    results = results.filter(d => d.verified === filters.verified)
  }

  return results
}

export function clearDestinationsCache() {
  destinationsCache = null
}
