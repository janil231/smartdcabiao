import { useMemo } from 'react'

const SHOW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'business', label: 'Businesses' },
  { value: 'destination', label: 'Destinations' }
]

export default function MapFilterBar({ 
  filters, 
  setFilter, 
  clearFilters, 
  hasActiveFilters,
  resultsCount = 0,
  loading = false 
}) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Show Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <div className="flex gap-1">
              {SHOW_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter('show', option.value)}
                  disabled={loading}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    filters.show === option.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {loading ? 'Loading...' : (
                <>
                  <span className="font-medium">{resultsCount}</span>
                  <span className="text-gray-500">place{resultsCount !== 1 ? 's' : ''} found</span>
                </>
              )}
            </span>
            
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}