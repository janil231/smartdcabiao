import DOMPurify from 'dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (dirtyHTML) => {
  if (!dirtyHTML) return ''
  
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['class', 'style'],
  }
  
  return DOMPurify.sanitize(dirtyHTML, config)
}

/**
 * Sanitize and validate text input
 */
export const sanitizeText = (text) => {
  if (!text) return ''
  
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '')
  
  // Decode HTML entities
  const div = document.createElement('div')
  div.textContent = cleanText
  return div.innerHTML
}

/**
 * Validate phone number format
 */
export const validatePhone = (phone) => {
  if (!phone) return true
  
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * Validate URL format
 */
export const validateURL = (url) => {
  if (!url) return true
  
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}