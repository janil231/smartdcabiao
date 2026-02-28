import { useLocation } from 'react-router-dom'
import { useLayoutEffect } from 'react'

const NAV_OFFSET = 80 // Height of fixed navbar

export default function ScrollManager() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    // Handle hash scrolling
    if (hash) {
      const targetId = hash.slice(1) // Remove '#'
      const scrollToElement = (attempt = 1) => {
        const element = document.getElementById(targetId)
        if (element) {
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
          const offsetPosition = elementPosition - NAV_OFFSET
          
          // Use smooth scrolling with reduced motion support
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          
          if (prefersReducedMotion) {
            window.scrollTo(0, offsetPosition)
          } else {
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            })
          }
        } else if (attempt < 10) {
          // Element might not be rendered yet, retry with exponential backoff
          setTimeout(() => scrollToElement(attempt + 1), attempt * 100)
        }
      }
      scrollToElement()
    } else {
      // Scroll to top on route change
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      
      if (prefersReducedMotion) {
        window.scrollTo(0, 0)
      } else {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
    }
  }, [pathname, hash])

  return null
}