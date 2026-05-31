/**
 * Businesses Service Layer
 * Loads from Firestore when available and merges with local mock data for demos.
 */

import { getDocs, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { businesses as mockBusinesses, BUSINESS_TYPES } from '../data'
import { readCache, writeCache, getCacheMeta, CACHE_KEYS } from './cache.service'

const USE_FIRESTORE = import.meta.env.VITE_USE_FIRESTORE_DATA === 'true'
const BUSINESSES_COLLECTION = 'businesses'

let businessesCache = null

function mapCategoryToType(category) {
  switch (category) {
    case 'food_dining':
      return BUSINESS_TYPES.restaurant
    case 'tourism_recreation':
    case 'accommodation':
      return BUSINESS_TYPES.attraction
    case 'retail_shopping':
    case 'services':
    case 'agriculture':
    case 'other':
    default:
      return BUSINESS_TYPES.shop
  }
}

function normalizeBusinessDoc(docSnap) {
  const data = docSnap.data()
  const category = data.category || ''
  return {
    id: docSnap.id,
    name: data.name || '',
    category: category,
    type: data.type || mapCategoryToType(category),
    description: data.description || '',
    position: normalizePosition(data.position || data.location),
    barangay: data.barangay || '',
    address: data.address || '',
    phone: data.phone || data.contactNumber || '',
    hours: data.hours || '',
    priceRange: data.priceRange || '₱',
    specialties: data.specialties || [],
    features: data.features || [],
    images: normalizeImages(data.images || data.photos),
    website: data.website || null,
    socialMedia: data.socialMedia || data.facebook ? { facebook: data.facebook } : {},
    isActive: data.isActive !== false,
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

function mergeWithMock(firestoreList) {
  const live = firestoreList || []
  const firestoreIds = new Set(live.map(b => String(b.id)))
  const mockOnly = mockBusinesses.filter(b => !firestoreIds.has(String(b.id)))
  return [...live, ...mockOnly]
}

async function fetchFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, BUSINESSES_COLLECTION))
    if (querySnapshot.empty) {
      return []
    }
    return querySnapshot.docs
      .map(normalizeBusinessDoc)
      .filter(b => b.isActive !== false)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[businesses] Firestore fetch failed:', error)
    }
    return null
  }
}

async function clearMapPlacesCache() {
  try {
    const { clearPlacesCache } = await import('../features/map/mapHelpers')
    clearPlacesCache()
  } catch {
    // ignore circular import edge cases
  }
}

export async function listBusinesses({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    businessesCache = null
    await clearMapPlacesCache()
  }

  if (!businessesCache) {
    const firestoreData = await fetchFromFirestore()

    if (firestoreData === null) {
      const cached = readCache(CACHE_KEYS.businesses)
      if (cached?.data?.length) {
        businessesCache = cached.data
        return { data: businessesCache, source: 'cache' }
      }
      businessesCache = mockBusinesses
      return { data: mockBusinesses, source: 'mock' }
    }

    if (firestoreData.length > 0 || USE_FIRESTORE) {
      const merged = mergeWithMock(firestoreData)
      businessesCache = merged
      writeCache(CACHE_KEYS.businesses, merged)
      const source =
        firestoreData.length === 0
          ? 'mock'
          : merged.length > firestoreData.length
            ? 'mixed'
            : 'live'
      return { data: merged, source }
    }

    businessesCache = mockBusinesses
    return { data: mockBusinesses, source: 'mock' }
  }

  return {
    data: businessesCache,
    source: businessesCache.length > mockBusinesses.length ? 'live' : 'mock',
  }
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
  const featured = data.filter(b => FEATURED_IDS.includes(b.id))
  if (featured.length > 0) return featured
  return data.slice(0, 3)
}

export async function clearBusinessesCache() {
  businessesCache = null
  await clearMapPlacesCache()
}

export function getBusinessesLastSynced() {
  const meta = getCacheMeta(CACHE_KEYS.businesses)
  return meta?.savedAt || null
}
