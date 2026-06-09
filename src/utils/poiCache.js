const CACHE_KEY = 'smartdcabiao:poi_cache_v1'
const VERSION_KEY = 'smartdcabiao:poi_cache_version'
const TIMESTAMP_KEY = 'smartdcabiao:poi_cache_timestamp'
const MAX_AGE_MS = 60 * 60 * 1000

export function getCachedPOIs(currentVersion) {
  try {
    const cachedVersion = parseInt(localStorage.getItem(VERSION_KEY) || '-1', 10)
    const cachedTimestamp = parseInt(localStorage.getItem(TIMESTAMP_KEY) || '0', 10)

    if (cachedVersion !== currentVersion) return null

    const age = Date.now() - cachedTimestamp
    if (age > MAX_AGE_MS) return null

    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    return JSON.parse(raw)
  } catch (err) {
    console.warn('[getCachedPOIs] Failed:', err)
    return null
  }
}

export function setCachedPOIs(data, version) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    localStorage.setItem(VERSION_KEY, String(version))
    localStorage.setItem(TIMESTAMP_KEY, String(Date.now()))
  } catch (err) {
    console.warn('[setCachedPOIs] Failed:', err)
  }
}

export function clearPOICache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(VERSION_KEY)
  localStorage.removeItem(TIMESTAMP_KEY)
}

export function getCacheTimestamp() {
  const ts = parseInt(localStorage.getItem(TIMESTAMP_KEY) || '0', 10)
  return ts > 0 ? ts : null
}
