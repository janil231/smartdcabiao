import { useState, useEffect, useCallback } from 'react'
import AppImage from './ui/AppImage'

export default function HeroBackgroundCarousel({ 
  images, 
  intervalMs = 5000,
  onSlideChange
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  // Auto-advance slideshow
  useEffect(() => {
    if (prefersReducedMotion || isPaused || images.length <= 1) {
      return
    }
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % images.length
        onSlideChange?.(next)
        return next
      })
    }, intervalMs)
    
    return () => clearInterval(interval)
  }, [intervalMs, images.length, prefersReducedMotion, isPaused, onSlideChange])
  
  const goToSlide = useCallback((index) => {
    setActiveIndex(index)
    onSlideChange?.(index)
  }, [onSlideChange])
  

  
  if (!images || images.length === 0) {
    return null
  }
  
  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Image Stack */}
      <div className="relative w-full h-full">
        {images.map((src, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <AppImage 
              src={src}
              alt={`Hero slide ${index + 1}`}
              className="w-full h-full object-cover object-center"
              loading="eager"
              decoding="sync"
            />
          </div>
        ))}
      </div>
      
      {/* Dot Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'bg-white w-8' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}