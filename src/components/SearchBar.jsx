import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDestinations } from '../data'

export default function SearchBar({ 
  placeholder = 'Search businesses, destinations...', 
  className = '',
  onSearch,
  defaultValue = ''
}) {
  const [query, setQuery] = useState(defaultValue || '')
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const allDestinations = useMemo(() => getDestinations(), [])

  // Update query when defaultValue changes
  if (defaultValue !== undefined && defaultValue !== query) {
    setQuery(defaultValue)
  }

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    
    const lowercaseQuery = query.toLowerCase()
    return allDestinations.filter((item) => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery)
    ).slice(0, 5) // Limit to 5 results for dropdown
  }, [query, allDestinations])

  const handleResultClick = (result) => {
    setQuery('')
    setIsOpen(false)
    if (result.type === 'business') {
      navigate(`/businesses?focus=${result.id}`)
    } else {
      navigate(`/map?focus=${result.id}`)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim())
      } else {
        navigate(`/businesses?search=${encodeURIComponent(query.trim())}`)
      }
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay to allow click on results
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-emerald-600 transition-all duration-200 ease-out active:scale-[0.95]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {isOpen && searchResults.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleResultClick(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-all duration-200 ease-out"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {result.type === 'restaurant' && <span className="text-amber-500">🍽</span>}
                    {result.type === 'shop' && <span className="text-blue-500">🛒</span>}
                    {result.type === 'attraction' && <span className="text-emerald-500">⭐</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {result.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{result.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {query.trim() && (
            <div className="border-t border-gray-100 px-4 py-2">
              <button
                type="button"
                onClick={() => handleSubmit({ preventDefault: () => {} })}
                className="w-full rounded-md bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-all duration-200 ease-out active:scale-[0.98]"
              >
                View all results for "{query.trim()}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}