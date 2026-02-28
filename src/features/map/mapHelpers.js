/**
 * Helper functions for Map feature to aggregate businesses and destinations
 */

import { listBusinesses } from '../../services/businesses.service'
import { listDestinations } from '../../services/destinations.service'

let cachedPlaces = null

export async function getAllPlaces() {
  if (cachedPlaces) {
    return cachedPlaces
  }

  try {
    const [businesses, destinations] = await Promise.all([
      listBusinesses(),
      listDestinations()
    ])

    const businessPlaces = businesses.map(place => ({
      ...place,
      poiType: 'business',
      originalType: place.type
    }))

    const destinationPlaces = destinations.map(place => ({
      ...place,
      poiType: 'destination',
      originalType: place.type
    }))

    cachedPlaces = [...businessPlaces, ...destinationPlaces]
    return cachedPlaces
  } catch (error) {
    console.error('Error loading places:', error)
    return []
  }
}

export function clearPlacesCache() {
  cachedPlaces = null
}
