const SHOW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'business', label: 'Businesses' },
  { value: 'destination', label: 'Spots' },
]

export default function MapFilterBar({
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  resultsCount = 0,
  loading = false,
}) {
  return (
    <>
      {/* Mobile: compact pill toggle (overlaid on map from MapPage) */}
      <div className="sm:hidden absolute top-3 left-3 right-3 z-[400] pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-full shadow-lg border border-gray-200 flex items-center p-1">
          {SHOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter('show', option.value)}
              disabled={loading}
              className={`flex-1 py-2.5 px-2 rounded-full text-xs font-semibold transition min-h-[44px] ${
                filters.show === option.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50'
              }`}
            >
              {option.label}
              {option.value === 'all' && !loading ? ` (${resultsCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: unchanged sticky bar */}
      <div className="hidden sm:block sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Show:</span>
              <div className="flex gap-1">
                {SHOW_OPTIONS.map((option) => (
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

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    <span className="font-medium">{resultsCount}</span>
                    <span className="text-gray-500">
                      {' '}
                      place{resultsCount !== 1 ? 's' : ''} found
                    </span>
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
    </>
  )
}
