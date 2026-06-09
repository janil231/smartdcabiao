const CABIAO_LAT = 15.2522
const CABIAO_LNG = 120.8596
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  )
}

function lng2tile(lng, zoom) {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
}

function getTileUrls() {
  const urls = []
  const zooms = [12, 13, 14]

  for (const z of zooms) {
    const centerX = lng2tile(CABIAO_LNG, z)
    const centerY = lat2tile(CABIAO_LAT, z)

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const url = TILE_URL_TEMPLATE
          .replace('{z}', z)
          .replace('{x}', centerX + dx)
          .replace('{y}', centerY + dy)
        urls.push(url)
      }
    }
  }

  return urls
}

export function preloadCabiaoTiles() {
  if (typeof window === 'undefined') return

  if (window.__cabiaoTilesPreloaded) return
  window.__cabiaoTilesPreloaded = true

  const urls = getTileUrls()

  urls.forEach((url) => {
    const img = new Image()
    img.src = url
  })

  console.log(`[tilePreloader] Started preloading ${urls.length} Cabiao tiles in background`)
}

export function schedulePreloadTiles() {
  if (typeof window === 'undefined') return

  const start = () => preloadCabiaoTiles()

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 2000 })
  } else {
    setTimeout(start, 2000)
  }
}
