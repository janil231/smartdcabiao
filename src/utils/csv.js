import { isWithinCabiaoBounds, CABIAO_CENTER } from '../constants/cabiaoGeo'

const BUSINESS_TYPES = ['restaurant', 'shop', 'market', 'service', 'hotel', 'attraction']
const CATEGORIES = ['restaurant', 'shop', 'attraction', 'service', 'hotel', 'other']

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

export function toBool(value) {
  if (!value) return false
  const lower = String(value).toLowerCase().trim()
  return lower === 'true' || lower === '1' || lower === 'yes'
}

export function toNumber(value) {
  if (!value && value !== 0) return null
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

export function splitImages(value) {
  if (!value) return []
  return value.split('|').map(url => url.trim()).filter(url => url)
}

export function isValidUrl(string) {
  if (!string) return true
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export function normalizeBusinessRow(row) {
  const errors = []
  const lat = toNumber(row.lat)
  const lng = toNumber(row.lng)

  if (!row.name?.trim()) {
    errors.push('Name is required')
  }

  if (!row.description?.trim()) {
    errors.push('Description is required')
  }

  if (!row.type?.trim()) {
    errors.push('Type is required')
  } else if (!BUSINESS_TYPES.includes(row.type.toLowerCase())) {
    errors.push(`Invalid type: ${row.type}. Allowed: ${BUSINESS_TYPES.join(', ')}`)
  }

  if (!row.category?.trim()) {
    errors.push('Category is required')
  } else if (!CATEGORIES.includes(row.category.toLowerCase())) {
    errors.push(`Invalid category: ${row.category}. Allowed: ${CATEGORIES.join(', ')}`)
  }

  if (lat === null || lng === null) {
    errors.push('Valid lat/lng required')
  } else if (!isWithinCabiaoBounds(lat, lng)) {
    errors.push(`Coordinates outside Cabiao bounds (${lat}, ${lng})`)
  }

  if (row.images) {
    const images = splitImages(row.images)
    const invalidUrls = images.filter(url => !isValidUrl(url))
    if (invalidUrls.length > 0) {
      errors.push(`Invalid image URLs: ${invalidUrls.join(', ')}`)
    }
  }

  if (row.name && row.name.length > 200) {
    errors.push('Name too long (max 200 characters)')
  }

  return {
    id: row.id?.trim() || null,
    data: {
      name: row.name?.trim() || '',
      type: row.type?.toLowerCase().trim() || 'shop',
      category: row.category?.toLowerCase().trim() || 'other',
      description: row.description?.trim() || '',
      position: lat !== null && lng !== null ? [lat, lng] : CABIAO_CENTER,
      barangay: row.barangay?.trim() || '',
      address: row.address?.trim() || '',
      phone: row.phone?.trim() || '',
      hours: row.hours?.trim() || '',
      priceRange: row.priceRange?.trim() || '₱',
      website: row.website?.trim() || null,
      facebook: row.facebook?.trim() || null,
      instagram: row.instagram?.trim() || null,
      verified: toBool(row.verified),
      images: splitImages(row.images),
      imagePaths: []
    },
    errors
  }
}

export function normalizeDestinationRow(row) {
  const errors = []
  const lat = toNumber(row.lat)
  const lng = toNumber(row.lng)

  if (!row.name?.trim()) {
    errors.push('Name is required')
  }

  if (!row.description?.trim()) {
    errors.push('Description is required')
  }

  if (!row.category?.trim()) {
    errors.push('Category is required')
  } else if (!CATEGORIES.includes(row.category.toLowerCase())) {
    errors.push(`Invalid category: ${row.category}. Allowed: ${CATEGORIES.join(', ')}`)
  }

  if (lat === null || lng === null) {
    errors.push('Valid lat/lng required')
  } else if (!isWithinCabiaoBounds(lat, lng)) {
    errors.push(`Coordinates outside Cabiao bounds (${lat}, ${lng})`)
  }

  if (row.images) {
    const images = splitImages(row.images)
    const invalidUrls = images.filter(url => !isValidUrl(url))
    if (invalidUrls.length > 0) {
      errors.push(`Invalid image URLs: ${invalidUrls.join(', ')}`)
    }
  }

  if (row.name && row.name.length > 200) {
    errors.push('Name too long (max 200 characters)')
  }

  return {
    id: row.id?.trim() || null,
    data: {
      name: row.name?.trim() || '',
      category: row.category?.toLowerCase().trim() || 'other',
      description: row.description?.trim() || '',
      position: lat !== null && lng !== null ? [lat, lng] : CABIAO_CENTER,
      barangay: row.barangay?.trim() || '',
      address: row.address?.trim() || '',
      verified: toBool(row.verified),
      images: splitImages(row.images),
      imagePaths: []
    },
    errors
  }
}

export function placeToCSVRow(place) {
  return {
    id: place.id || '',
    name: place.name || '',
    type: place.type || '',
    category: place.category || '',
    description: place.description || '',
    lat: place.position?.[0] || '',
    lng: place.position?.[1] || '',
    barangay: place.barangay || '',
    address: place.address || '',
    phone: place.phone || '',
    hours: place.hours || '',
    priceRange: place.priceRange || '',
    website: place.website || '',
    facebook: place.facebook || '',
    instagram: place.instagram || '',
    verified: place.verified ? 'true' : 'false',
    images: place.images?.join('|') || ''
  }
}

export function toCSVString(places) {
  if (places.length === 0) return ''

  const headers = [
    'id', 'name', 'type', 'category', 'description', 
    'lat', 'lng', 'barangay', 'address', 'phone', 
    'hours', 'priceRange', 'website', 'facebook', 'instagram', 
    'verified', 'images'
  ]

  const rows = places.map(place => {
    const row = placeToCSVRow(place)
    return headers.map(h => row[h] || '').join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export const BUSINESS_CSV_TEMPLATE = `id,name,type,category,description,lat,lng,barangay,address,phone,hours,priceRange,website,facebook,instagram,verified,images
new_1,Sample Restaurant,restaurant,restaurant,Delicious local cuisine,15.2345,120.8397,Poblacion,Main Street 123,+63 912 345 6789,9AM-9PM,₱₱₱,https://example.com,https://facebook.com/sample,true,https://example.com/img1.jpg|https://example.com/img2.jpg`

export const DESTINATION_CSV_TEMPLATE = `id,name,category,description,lat,lng,barangay,address,verified,images
new_1,Sample Tourist Spot,attraction,Beautiful scenic location,15.2500,120.8500,Poblacion,Park Avenue,true,https://example.com/img1.jpg`

export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
