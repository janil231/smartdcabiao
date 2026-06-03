import { useState, useEffect, useCallback, useRef } from 'react'

const AUTO_ROTATE_INTERVAL = 4000

export default function PhotoCarousel({ images = [], alt = '', mode = 'card', className = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef(null)
  const touchEndX = useRef(null)

  const total = images.length

  const goTo = useCallback((index) => {
    if (total === 0) return
    setCurrentIndex(((index % total) + total) % total)
  }, [total])

  const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])

  useEffect(() => {
    if (mode !== 'card' || total <= 1) return
    const id = setInterval(next, AUTO_ROTATE_INTERVAL)
    return () => clearInterval(id)
  }, [mode, total, next])

  useEffect(() => {
    if (mode !== 'detail' || total <= 1) return
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, total, prev, next])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50
    if (Math.abs(diff) > threshold) {
      if (diff > 0) next()
      else prev()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  if (total === 0) return null

  const showArrows = mode === 'detail' && total > 1
  const showDots = total > 1
  const showCounter = mode === 'detail' && total > 1

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onTouchStart={mode === 'detail' ? handleTouchStart : undefined}
      onTouchMove={mode === 'detail' ? handleTouchMove : undefined}
      onTouchEnd={mode === 'detail' ? handleTouchEnd : undefined}
    >
      <div className="h-full w-full relative">
        {images.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`${alt} ${index + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            loading="lazy"
          />
        ))}
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); prev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition z-10"
            aria-label="Previous image"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); next() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition z-10"
            aria-label="Next image"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {showCounter && (
        <div className="absolute top-3 right-3 z-10 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white">
          {currentIndex + 1} / {total}
        </div>
      )}

      {showDots && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition ${
                index === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 w-2 hover:bg-white/70'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
