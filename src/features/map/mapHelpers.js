/**
 * Helper functions for Map feature to aggregate businesses and destinations
 */

import { listBusinesses } from '../../services/businesses.service'
import { listDestinations } from '../../services/destinations.service'
import { getDataVersion } from '../../services/appMeta.service'
import { getCachedPOIs, setCachedPOIs } from '../../utils/poiCache'

let cachedPlaces = null

function unwrapList(result) {
  if (Array.isArray(result)) return result
  if (result && Array.isArray(result.data)) return result.data
  return []
}

export async function getAllPlaces({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedPlaces) {
    return cachedPlaces
  }

  const currentVersion = await getDataVersion()

  if (!forceRefresh) {
    const cached = getCachedPOIs(currentVersion)
    if (cached) {
      cachedPlaces = cached
      return cached
    }
  }

  try {
    const [businessesResult, destinationsResult] = await Promise.all([
      listBusinesses({ forceRefresh: true }),
      listDestinations({ forceRefresh: true })
    ])

    const businesses = unwrapList(businessesResult)
    const destinations = unwrapList(destinationsResult)

    const businessPlaces = businesses
      .filter(place => place.position && Array.isArray(place.position))
      .map(place => ({
        ...place,
        poiType: 'business',
        originalType: place.type
      }))

    const destinationPlaces = destinations
      .filter(place => place.position && Array.isArray(place.position))
      .map(place => ({
        ...place,
        poiType: 'destination',
        originalType: place.type
      }))

    cachedPlaces = [...businessPlaces, ...destinationPlaces]
    setCachedPOIs(cachedPlaces, currentVersion)
    return cachedPlaces
  } catch (error) {
    console.error('Error loading places:', error)
    return []
  }
}

export function clearPlacesCache() {
  cachedPlaces = null
}
