const CACHE_PREFIX = 'smartdcabiao:cache:'

function readCache(key) {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key)
    if (!item) return null
    const parsed = JSON.parse(item)
    if (!parsed || typeof parsed.savedAt !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    const item = JSON.stringify({
      savedAt: Date.now(),
      data: data
    })
    localStorage.setItem(CACHE_PREFIX + key, item)
  } catch {
    // Storage full or unavailable
  }
}

function getCacheMeta(key) {
  const cached = readCache(key)
  if (!cached) return null
  return { savedAt: cached.savedAt }
}

function clearCache(key) {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch {
    // Ignore
  }
}

export const CACHE_KEYS = {
  businesses: 'businesses',
  destinations: 'destinations',
}

export { readCache, writeCache, getCacheMeta, clearCache }
