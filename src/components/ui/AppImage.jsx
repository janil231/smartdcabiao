import { useState, useEffect } from 'react'
import genericPlaceholder from '../../assets/placeholders/generic.svg'

/**
 * Reusable image component with fallback handling
 * Prevents broken image states and provides consistent styling
 */
export default function AppImage({ 
  src, 
  alt = '', 
  className = '', 
  fallbackSrc,
  loading = 'lazy',
  decoding = 'async'
}) {
  // Normalize src (trim strings, handle falsy values)
  const normalizedSrc = (src && src.trim() !== '') ? src : null
  const effectiveFallback = fallbackSrc || genericPlaceholder
  
  // State to track current image and error status
  const [imageSrc, setImageSrc] = useState(effectiveFallback)
  const [hasError, setHasError] = useState(!normalizedSrc)

  // Update image source when props change
  useEffect(() => {
    const newSrc = normalizedSrc || effectiveFallback
    setImageSrc(newSrc)
    setHasError(!newSrc)
  }, [normalizedSrc, effectiveFallback])

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      setImageSrc(effectiveFallback)
    }
  }

  const handleLoad = () => {
    setHasError(false)
  }

  // Default className for proper image filling
  const defaultClassName = 'block h-full w-full object-cover object-center'

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className || defaultClassName}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      onLoad={handleLoad}
      referrerPolicy="no-referrer"
      style={{
        objectFit: 'cover',
        objectPosition: 'center'
      }}
    />
  )
}