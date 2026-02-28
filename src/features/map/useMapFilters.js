import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function useMapFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Get current filter values from URL
  const currentFilters = useMemo(() => ({
    show: searchParams.get('show') || 'all'
  }), [searchParams])

  // Update filter and sync with URL
  const setFilter = (name, value) => {
    const newParams = new URLSearchParams(searchParams)
    
    if (value === 'all' || value === '') {
      newParams.delete(name)
    } else {
      newParams.set(name, value)
    }
    
    setSearchParams(newParams)
  }

  // Clear all filters
  const clearFilters = () => {
    const newParams = new URLSearchParams()
    setSearchParams(newParams)
  }

  // Helper to check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return currentFilters.show !== 'all'
  }, [currentFilters])

  return {
    filters: currentFilters,
    setFilter,
    clearFilters,
    hasActiveFilters
  }
}