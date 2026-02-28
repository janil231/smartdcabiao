import { useEffect, useRef } from 'react'

export default function Reveal({ 
  children, 
  delay = 0, 
  as = 'div', 
  className = '',
  style = {}
}) {
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    if (element) {
      // Set CSS custom property for delay
      element.style.setProperty('--delay', `${delay}ms`)
      
      // Add reveal class
      element.classList.add('reveal')
      
      // Force reflow to ensure animation triggers
      void element.offsetWidth
    }
  }, [delay])

  const Component = as
  const mergedStyle = {
    ...style,
    '--delay': `${delay}ms`
  }

  return (
    <Component 
      ref={elementRef} 
      className={`reveal ${className}`}
      style={mergedStyle}
    >
      {children}
    </Component>
  )
}