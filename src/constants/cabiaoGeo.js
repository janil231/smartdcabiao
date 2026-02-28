/**
 * Cabiao Geographic Constants
 * Defines the geographic boundaries and defaults for Cabiao, Nueva Ecija
 */

export const CABIAO_CENTER = [15.23450, 120.83965] // Central coordinates for Cabiao (from OpenStreetMap)
export const CABIAO_DEFAULT_ZOOM = 13 // Default zoom level for Cabiao view (from OSM link)
export const CABIAO_BOUNDS = {
  southWest: [15.157636471587702, 120.67794799804689], // Southwest corner of Cabiao (from OSM search bounds)
  northEast: [15.306041821392899, 121.00753784179689]  // Northeast corner of Cabiao (from OSM search bounds)
}

// Helper function to check if coordinates are within Cabiao bounds
export function isWithinCabiaoBounds(lat, lng) {
  return lat >= CABIAO_BOUNDS.southWest[0] && 
         lat <= CABIAO_BOUNDS.northEast[0] && 
         lng >= CABIAO_BOUNDS.southWest[1] && 
         lng <= CABIAO_BOUNDS.northEast[1]
}

// Helper function to generate random coordinates within Cabiao
export function generateCabiaoCoordinates(index = 0, total = 1) {
  // Create a systematic distribution of coordinates within Cabiao bounds
  const latRange = CABIAO_BOUNDS.northEast[0] - CABIAO_BOUNDS.southWest[0]
  const lngRange = CABIAO_BOUNDS.northEast[1] - CABIAO_BOUNDS.southWest[1]
  
  // Use golden ratio for distribution to avoid clustering
  const GOLDEN_ANGLE = 137.50776408443 * (index + 1)
  const radius = Math.sqrt(index / Math.max(total - 1, 1)) * Math.min(latRange, lngRange) * 0.4
  
  const lat = CABIAO_CENTER[0] + radius * Math.cos(GOLDEN_ANGLE * Math.PI / 180)
  const lng = CABIAO_CENTER[1] + radius * Math.sin(GOLDEN_ANGLE * Math.PI / 180)
  
  // Ensure within bounds
  const finalLat = Math.max(CABIAO_BOUNDS.southWest[0], 
                      Math.min(CABIAO_BOUNDS.northEast[0], lat))
  const finalLng = Math.max(CABIAO_BOUNDS.southWest[1], 
                      Math.min(CABIAO_BOUNDS.northEast[1], lng))
  
  return [finalLat, finalLng]
}