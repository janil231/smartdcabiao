/**
 * Destinations Service Layer
 * Backend-ready service for destination management
 * Uses Firestore when VITE_USE_FIRESTORE_DATA=true, falls back to mock data
 */

import { getDocs, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getDestinations as getMockDestinations } from '../data'
import { readCache, writeCache, getCacheMeta, CACHE_KEYS } from './cache.service'

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
      return null
    }
    const destinations = querySnapshot.docs.map(normalizeDestinationDoc)
    return destinations
  } catch {
    return null
  }
}

export async function listDestinations({ forceRefresh = false } = {}) {
  if (USE_FIRESTORE) {
    if (forceRefresh) {
      destinationsCache = null
    }
    
    if (!destinationsCache) {
      const firestoreData = await fetchFromFirestore()
      
      if (firestoreData && firestoreData.length > 0) {
        destinationsCache = firestoreData
        writeCache(CACHE_KEYS.destinations, destinationsCache)
        return { data: destinationsCache, source: 'live' }
      }
      
      const cached = readCache(CACHE_KEYS.destinations)
      if (cached) {
        destinationsCache = cached.data
        return { data: destinationsCache, source: 'cache' }
      }
      
      return { data: getMockDestinations(), source: 'mock' }
    }
    
    return { data: destinationsCache, source: 'live' }
  }
  
  return { data: getMockDestinations(), source: 'mock' }
}

export async function getDestinationById(id) {
  const { data } = await listDestinations()
  return data.find(d => String(d.id) === String(id)) || null
}

export async function getDestinationBarangays() {
  try {
    const { data } = await listDestinations()
    const barangays = [...new Set(data
      .map(d => d.barangay)
      .filter(Boolean)
    )].sort()
    return barangays
  } catch {
    return []
  }
}

export async function searchDestinations(query = '', filters = {}) {
  const { data: results } = await listDestinations()

  let filtered = results

  if (query.trim()) {
    const lowercaseQuery = query.toLowerCase()
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(lowercaseQuery) ||
      d.description?.toLowerCase().includes(lowercaseQuery) ||
      d.address?.toLowerCase().includes(lowercaseQuery) ||
      d.barangay?.toLowerCase().includes(lowercaseQuery) ||
      d.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }

  if (filters.barangay) {
    filtered = filtered.filter(d => d.barangay === filters.barangay)
  }

  if (filters.type) {
    filtered = filtered.filter(d => d.type === filters.type)
  }

  if (filters.verified !== undefined) {
    filtered = filtered.filter(d => d.verified === filters.verified)
  }

  return filtered
}

export function clearDestinationsCache() {
  destinationsCache = null
}

export function getDestinationsLastSynced() {
  const meta = getCacheMeta(CACHE_KEYS.destinations)
  return meta?.savedAt || null
}
