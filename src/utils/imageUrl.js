// Image URL utilities for SMARTDCABIAO app
// Provides validation and normalization for image URLs

// Simplified versions that accept more image sources
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  // Accept all direct image URLs including Picsum
  return true
}

export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return null
  }
  
  const u = url.trim()
  
  // Convert Unsplash photo pages to direct images
  if (u.includes('unsplash.com/photos/')) {
    const match = u.match(/unsplash\.com\/photos\/[^\/]*\/?([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://source.unsplash.com/${match[1]}/1200x675`
    }
  }
  
  return u
}

export function getFirstValidImage(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return null
  }
  
  // Return first image directly (no over-validation that rejects valid URLs)
  return images[0] || null
}

// Simplified resolver functions - no complex validation
export function getBusinessImage(business) {
  // Return first available image or placeholder
  return business?.images?.length > 0 ? business.images[0] : (business?.image ? normalizeImageUrl(business.image) : getGenericPlaceholder())
}

export function getDestinationImage(destination) {
  // Return first available image or placeholder
  return destination?.images?.length > 0 ? destination.images[0] : getGenericPlaceholder()
}

export function getActivityImage(activity) {
  // Return first available image or placeholder
  return activity?.images?.length > 0 ? activity.images[0] : getGenericPlaceholder()
}

export function getImage(item) {
  // Return first available image or placeholder
  return item?.images?.length > 0 ? item.images[0] : getGenericPlaceholder()
}

// Generic placeholder function
export function getGenericPlaceholder() {
  // Return a simple SVG placeholder as data URL
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
}