import { useState, useRef, useEffect } from 'react'

export default function HelpTooltip({
  steps,
  title = 'How it works',
  variant = 'light',
  ariaLabel = 'Show instructions',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ vertical: 'top', horizontal: 'center' })
  const wrapperRef = useRef(null)
  const iconRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = () => setIsOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !iconRef.current) return

    const rect = iconRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const popoverWidth = 256

    const vertical = rect.top > 200 ? 'top' : 'bottom'

    let horizontal = 'center'
    if (rect.right + popoverWidth / 2 > viewportWidth - 16) {
      horizontal = 'right'
    } else if (rect.left - popoverWidth / 2 < 16) {
      horizontal = 'left'
    }

    setPosition({ vertical, horizontal })
  }, [isOpen])

  const iconClasses = variant === 'dark'
    ? 'bg-white/20 text-white hover:bg-white/30'
    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'

  const popoverClasses = variant === 'dark'
    ? 'bg-gray-900 text-white'
    : 'bg-white border border-gray-200 text-gray-700'

  return (
    <div ref={wrapperRef} className="relative inline-block shrink-0">
      <button
        ref={iconRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer animate-pulse-slow ${iconClasses}`}
      >
        ?
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-20 w-64 p-3 rounded-lg shadow-lg text-xs ${popoverClasses} ${
            position.vertical === 'top'
              ? 'bottom-full mb-2'
              : 'top-full mt-2'
          } ${
            position.horizontal === 'right'
              ? 'right-0'
              : position.horizontal === 'left'
              ? 'left-0'
              : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {title && (
            <div className={`font-semibold mb-1.5 ${variant === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </div>
          )}
          <ol className="list-decimal list-inside space-y-1">
            {steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
