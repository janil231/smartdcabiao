/**
 * Favorites Service
 * Helper functions for managing favorites with user-aware storage
 */

import { BUSINESS_TYPES } from '../data'

// Storage keys
const GUEST_FAVORITES_KEY = 'smartdcabiao:favorites:guest'
const USER_FAVORITES_KEY_PREFIX = 'smartdcabiao:favorites:'

/**
 * Get the appropriate storage key for the current user
 */
export function getStorageKey(uid) {
  if (uid) {
    return `${USER_FAVORITES_KEY_PREFIX}${uid}`
  }
  return GUEST_FAVORITES_KEY
}

/**
 * Get all favorites for a user
 */
export function getFavorites(uid) {
  try {
    const key = getStorageKey(uid)
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading favorites:', error)
    return []
  }
}

/**
 * Toggle a favorite item (add or remove)
 */
export function toggleFavorite(uid, type, id, itemData = {}) {
  const favorites = getFavorites(uid)
  const existingIndex = favorites.findIndex(fav => fav.id === id && fav.type === type)
  
  let newFavorites
  if (existingIndex >= 0) {
    // Remove favorite
    newFavorites = favorites.filter((_, index) => index !== existingIndex)
  } else {
    // Add favorite
    const favoriteItem = {
      id,
      type,
      savedAt: new Date().toISOString(),
      ...itemData
    }
    newFavorites = [...favorites, favoriteItem]
  }
  
  // Save to localStorage
  const key = getStorageKey(uid)
  if (newFavorites.length > 0) {
    localStorage.setItem(key, JSON.stringify(newFavorites))
  } else {
    localStorage.removeItem(key)
  }
  
  return newFavorites
}

/**
 * Check if an item is favorited
 */
export function isFavorite(uid, type, id) {
  const favorites = getFavorites(uid)
  return favorites.some(fav => fav.id === id && fav.type === type)
}

/**
 * Get favorites by type
 */
export function getFavoritesByType(uid, type) {
  const favorites = getFavorites(uid)
  return favorites.filter(fav => fav.type === type)
}

/**
 * Migrate guest favorites to user favorites after login
 */
export function migrateGuestFavorites(guestUid, userUid) {
  const guestKey = getStorageKey(guestUid)
  const userKey = getStorageKey(userUid)
  
  try {
    const guestFavorites = localStorage.getItem(guestKey)
    if (guestFavorites) {
      const guestItems = JSON.parse(guestFavorites)
      if (guestItems.length > 0) {
        localStorage.setItem(userKey, guestFavorites)
        localStorage.removeItem(guestKey)
        return guestItems.length
      }
    }
  } catch (error) {
    console.error('Error migrating favorites:', error)
  }
  
  return 0
}