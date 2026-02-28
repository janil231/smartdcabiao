import { useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function PageTransition({ children }) {
  const location = useLocation()
  const containerRef = useRef(null)

  useEffect(() => {
    // Reset animation class
    const container = containerRef.current
    if (container) {
      container.classList.remove('page-enter')
      
      // Force reflow to ensure animation triggers
      void container.offsetWidth
      
      // Add animation class
      container.classList.add('page-enter')
    }
  }, [location.pathname])

  return (
    <div ref={containerRef} className="page-enter">
      {children}
    </div>
  )
}