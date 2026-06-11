import { Timestamp } from 'firebase/firestore'

export function toJSDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (value instanceof Timestamp) return value.toDate()
  if (value?.toDate && typeof value.toDate === 'function') return value.toDate()
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'number') return new Date(value)
  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000)
  }
  return null
}

export function formatDate(value, fallback = '—') {
  const date = toJSDate(value)
  if (!date || isNaN(date.getTime())) return fallback
  return date.toLocaleDateString()
}

export function formatDateTime(value, fallback = '—') {
  const date = toJSDate(value)
  if (!date || isNaN(date.getTime())) return fallback
  return date.toLocaleString()
}

export function formatRelativeTime(value, fallback = '—') {
  const date = toJSDate(value)
  if (!date || isNaN(date.getTime())) return fallback

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
