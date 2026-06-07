/**
 * Generate an uppercase voucher code, format CAB-XXXXXXXXXX (10 chars after prefix).
 * Uses crypto.getRandomValues when available.
 */
export function generateVoucherCode() {
  const length = 10
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint32Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < length; i += 1) {
      array[i] = Math.floor(Math.random() * chars.length)
    }
  }

  let suffix = ''
  for (let i = 0; i < length; i += 1) {
    const idx = array[i] % chars.length
    suffix += chars.charAt(idx)
  }
  return `CAB-${suffix}`
}

/**
 * Generate a business reward code, format BIZ-XXXXXXXXXX (10 chars after prefix).
 */
export function generateBusinessRewardCode() {
  const length = 10
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint32Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < length; i += 1) {
      array[i] = Math.floor(Math.random() * chars.length)
    }
  }

  let suffix = ''
  for (let i = 0; i < length; i += 1) {
    const idx = array[i] % chars.length
    suffix += chars.charAt(idx)
  }
  return `BIZ-${suffix}`
}

