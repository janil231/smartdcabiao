/**
 * Centralized data entry point.
 * Import from here for consistent access; swap implementations for backend later.
 *
 * Usage:
 *   import { businesses, getFeaturedBusinesses } from '../data'
 *   import { getDestinations, MAP_CENTER } from '../data'
 *   import { activities, ACTIVITY_TYPES } from '../data'
 *   import { participation, rewardTotals, REWARD_STATUS } from '../data'
 */

// Businesses
export {
  businesses,
  BUSINESS_TYPES,
  getFeaturedBusinesses,
  getBusinessById,
} from './businesses'

// Cabiao Geo Constants
export { 
  CABIAO_CENTER, 
  CABIAO_DEFAULT_ZOOM, 
  CABIAO_BOUNDS,
  isWithinCabiaoBounds 
} from '../constants/cabiaoGeo'

// Destinations (map markers, POIs)
export { getDestinations } from './destinations'

// Activities
export { activities, ACTIVITY_TYPES } from './activities'

// Rewards / participation
export { participation, rewardTotals, REWARD_STATUS } from './rewards'
