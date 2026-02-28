/**
 * Image resolver utilities for businesses, destinations, and activities
 * Provides consistent fallback to placeholder images when no images are available
 */

// Import all placeholder images
import restaurantPlaceholder from '../assets/placeholders/restaurant.svg'
import marketPlaceholder from '../assets/placeholders/market.svg'
import shopPlaceholder from '../assets/placeholders/shop.svg'
import servicePlaceholder from '../assets/placeholders/service.svg'
import landmarkPlaceholder from '../assets/placeholders/landmark.svg'
import parkPlaceholder from '../assets/placeholders/park.svg'
import destinationPlaceholder from '../assets/placeholders/destination.svg'
import eventPlaceholder from '../assets/placeholders/event.svg'
import genericPlaceholder from '../assets/placeholders/generic.svg'

// Import image validation utilities
import { normalizeImageUrl, getFirstValidImage } from './imageUrl'

/**
 * Get appropriate image for a business based on its type and category
 * @param {Object} business - Business object with type, category, images
 * @returns {string} Image URL or placeholder path
 */
export function getBusinessImage(business) {
  // Use the improved image resolution pattern
  const firstValidImage = getFirstValidImage(business?.images) || getFirstValidImage(business?.image)
  if (firstValidImage) {
    return firstValidImage
  }
  
  // Choose placeholder based on business type and category (safe string handling)
  const { type, category } = business || {}
  const categoryText = (category || '').toLowerCase()
  
  // Restaurant types
  if (type === 'restaurant' || categoryText.includes('restaurant')) {
    return restaurantPlaceholder
  }
  
  // Market types
  if (categoryText.includes('market')) {
    return marketPlaceholder
  }
  
  // Shop types
  if (type === 'shop' || categoryText.includes('shop')) {
    return shopPlaceholder
  }
  
  // Service types
  if (categoryText.includes('service')) {
    return servicePlaceholder
  }
  
  // Attraction/Landmark types
  if (type === 'attraction' || categoryText.includes('landmark') || 
      categoryText.includes('attraction') || categoryText.includes('park')) {
    return landmarkPlaceholder
  }
  
  // Default fallback
  return genericPlaceholder
}

/**
 * Get appropriate image for a destination
 * @param {Object} destination - Destination object with images, category
 * @returns {string} Image URL or placeholder path
 */
export function getDestinationImage(destination) {
  // Null-safe: return generic placeholder if destination is null/undefined
  if (!destination) {
    return genericPlaceholder
  }
  
  // Safe destructuring
  const { category } = destination || {}
  const categoryText = (category || '').toLowerCase()
  
  // Use the improved image resolution pattern
  const firstValidImage = getFirstValidImage(destination?.images) || getFirstValidImage(destination?.image)
  if (firstValidImage) {
    return firstValidImage
  }
  
  // Choose placeholder based on destination type/category (safe string handling)
  if (categoryText.includes('park')) {
    return parkPlaceholder
  }
  
  if (categoryText.includes('landmark') || categoryText.includes('attraction')) {
    return landmarkPlaceholder
  }
  
  return destinationPlaceholder
}

/**
 * Get appropriate image for an activity
 * @param {Object} activity - Activity object with images, type
 * @returns {string} Image URL or placeholder path
 */
export function getActivityImage(activity) {
  // Use the improved image resolution pattern
  const firstValidImage = getFirstValidImage(activity?.images) || getFirstValidImage(activity?.image)
  if (firstValidImage) {
    return firstValidImage
  }
  
  // Choose placeholder based on activity type
  const { type } = activity || {}
  if (type === 'cleanup') {
    return servicePlaceholder
  }
  
  if (type === 'tree-planting') {
    return parkPlaceholder
  }
  
  if (type === 'event') {
    return eventPlaceholder
  }
  
  return genericPlaceholder
}

/**
 * Generic image resolver for any item
 * @param {Object} item - Any item with images, type, category
 * @returns {string} Image URL or placeholder path
 */
export function getImage(item) {
  // If item has real images, use the first one
  if (item?.images?.length > 0) {
    const validImage = getFirstValidImage(item.images)
    if (validImage) {
      return validImage
    }
  }
  
  // If item has a single image property
  if (item?.image) {
    const normalizedImage = normalizeImageUrl(item.image)
    if (normalizedImage) {
      return normalizedImage
    }
  }
  
  // Try to detect item type and choose appropriate placeholder
  const { type, category } = item || {}
  const categoryText = (category || '').toLowerCase()
  
  // Business detection
  if (type === 'restaurant' || categoryText.includes('restaurant')) {
    return restaurantPlaceholder
  }
  
  if (type === 'shop' || categoryText.includes('shop')) {
    return shopPlaceholder
  }
  
  if (type === 'attraction' || categoryText.includes('landmark')) {
    return landmarkPlaceholder
  }
  
  // Activity detection
  if (type === 'event' || categoryText.includes('event')) {
    return eventPlaceholder
  }
  
  if (type === 'cleanup' || categoryText.includes('clean')) {
    return servicePlaceholder
  }
  
  return genericPlaceholder
}

// Default fallback for any type
export const getGenericPlaceholder = () => genericPlaceholder