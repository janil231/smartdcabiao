/**
 * Businesses Service Layer
 * Backend-ready service for business management
 * Uses Firestore when VITE_USE_FIRESTORE_DATA=true, falls back to mock data
 */

import { getDocs, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { businesses as mockBusinesses, BUSINESS_TYPES } from '../data'
import { readCache, writeCache, getCacheMeta, CACHE_KEYS } from './cache.service'

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
      return null
    }
    const businesses = querySnapshot.docs.map(normalizeBusinessDoc)
    return businesses
  } catch {
    return null
  }
}

export async function listBusinesses({ forceRefresh = false } = {}) {
  if (USE_FIRESTORE) {
    if (forceRefresh) {
      businessesCache = null
    }
    
    if (!businessesCache) {
      const firestoreData = await fetchFromFirestore()
      
      if (firestoreData && firestoreData.length > 0) {
        businessesCache = firestoreData
        writeCache(CACHE_KEYS.businesses, businessesCache)
        return { data: businessesCache, source: 'live' }
      }
      
      const cached = readCache(CACHE_KEYS.businesses)
      if (cached) {
        businessesCache = cached.data
        return { data: businessesCache, source: 'cache' }
      }
      
      return { data: mockBusinesses, source: 'mock' }
    }
    
    return { data: businessesCache, source: 'live' }
  }
  
  return { data: mockBusinesses, source: 'mock' }
}

export async function getBusinessById(id) {
  const { data } = await listBusinesses()
  return data.find(b => String(b.id) === String(id)) || null
}

export async function searchBusinesses(query = '', filters = {}) {
  const { data: results } = await listBusinesses()

  let filtered = results

  if (query.trim()) {
    const lowercaseQuery = query.toLowerCase()
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(lowercaseQuery) ||
      b.category?.toLowerCase().includes(lowercaseQuery) ||
      b.description?.toLowerCase().includes(lowercaseQuery)
    )
  }

  if (filters.type && filters.type !== 'all') {
    filtered = filtered.filter(b => b.type === filters.type)
  }

  return filtered
}

export async function getFeaturedBusinesses() {
  const { data } = await listBusinesses()
  const FEATURED_IDS = [1, 2, 3]
  return data.filter(b => FEATURED_IDS.includes(b.id))
}

export function clearBusinessesCache() {
  businessesCache = null
}

export function getBusinessesLastSynced() {
  const meta = getCacheMeta(CACHE_KEYS.businesses)
  return meta?.savedAt || null
}
