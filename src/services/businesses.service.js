/**
 * Businesses Service Layer
 * Backend-ready service for business management
 * Uses Firestore when VITE_USE_FIRESTORE_DATA=true, falls back to mock data
 */

import { getDocs, doc, getDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { businesses as mockBusinesses, BUSINESS_TYPES } from '../data'

const USE_FIRESTORE = import.meta.env.VITE_USE_FIRESTORE_DATA === 'true'
const BUSINESSES_COLLECTION = 'businesses'

let businessesCache = null

function normalizeBusinessDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    name: data.name || '',
    category: data.category || '',
    type: data.type || BUSINESS_TYPES.shop,
    description: data.description || '',
    position: normalizePosition(data.position),
    address: data.address || '',
    phone: data.phone || '',
    hours: data.hours || '',
    priceRange: data.priceRange || '₱',
    specialties: data.specialties || [],
    features: data.features || [],
    images: normalizeImages(data.images),
    website: data.website || null,
    socialMedia: data.socialMedia || {},
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
    const querySnapshot = await getDocs(collection(db, BUSINESSES_COLLECTION))
    if (querySnapshot.empty) {
      if (import.meta.env.DEV) {
        console.warn('[Businesses] Firestore collection empty, using mock data')
      }
      return null
    }
    const businesses = querySnapshot.docs.map(normalizeBusinessDoc)
    return businesses
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Businesses] Firestore fetch failed, using mock data:', error.message)
    }
    return null
  }
}

export async function listBusinesses() {
  if (USE_FIRESTORE) {
    if (!businessesCache) {
      businessesCache = await fetchFromFirestore()
    }
    if (businessesCache) {
      return businessesCache
    }
  }
  return mockBusinesses
}

export async function getBusinessById(id) {
  if (USE_FIRESTORE) {
    if (!businessesCache) {
      businessesCache = await fetchFromFirestore()
    }
    if (businessesCache) {
      return businessesCache.find(b => String(b.id) === String(id)) || null
    }
  }
  const numericId = parseInt(id, 10)
  return mockBusinesses.find(b => b.id === numericId) || null
}

export async function searchBusinesses(query = '', filters = {}) {
  let results = await listBusinesses()

  if (query.trim()) {
    const lowercaseQuery = query.toLowerCase()
    results = results.filter(b =>
      b.name.toLowerCase().includes(lowercaseQuery) ||
      b.category?.toLowerCase().includes(lowercaseQuery) ||
      b.description?.toLowerCase().includes(lowercaseQuery)
    )
  }

  if (filters.type && filters.type !== 'all') {
    results = results.filter(b => b.type === filters.type)
  }

  return results
}

export async function getFeaturedBusinesses() {
  const allBusinesses = await listBusinesses()
  const FEATURED_IDS = [1, 2, 3]
  return allBusinesses.filter(b => FEATURED_IDS.includes(b.id))
}

export function clearBusinessesCache() {
  businessesCache = null
}
