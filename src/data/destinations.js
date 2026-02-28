/**
 * Centralized destinations data for the map and POI lists.
 * Destinations = map-ready places (businesses, attractions, etc.).
 * Load map markers from here. Replace with API when backend is ready.
 * 
 * Note: MAP_CENTER and MAP_ZOOM are now in constants/cabiaoGeo.js
 */

import { businesses } from './businesses'

/**
 * Returns all destinations for map markers (currently businesses with position).
 * Backend: replace with API e.g. getDestinations() or getMapMarkers().
 */
export function getDestinations() {
  return businesses.filter((d) => Array.isArray(d.position) && d.position.length >= 2)
}
