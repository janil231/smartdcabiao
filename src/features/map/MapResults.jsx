import { Fragment } from 'react'
import FavoriteButton from '../../components/FavoriteButton'

const TYPE_COLORS = {
  restaurant: { bg: 'bg-amber-500' },
  shop: { bg: 'bg-blue-500' },
  attraction: { bg: 'bg-emerald-500' },
  destination: { bg: 'bg-purple-500' }
}

const TYPE_SYMBOLS = {
  restaurant: '🍽',
  shop: '🛒',
  attraction: '⭐',
  destination: '🏛️'
}

export default function MapResults({ 
  items = [], 
  selectedPOI, 
  onPOISelect, 
  onMapFocus,
  isOpen, 
  onClose,
  loading = false 
}) {
  const handlePOIClick = (poi) => {
    onPOISelect?.(poi)
    onMapFocus?.(poi)
    onClose?.() // Close drawer on mobile after selection
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] w-full rounded-t-xl border-t border-gray-200 bg-white shadow-xl lg:hidden">
        {/* Handle Bar */}
        <div className="flex items-center justify-center py-2">
          <div className="h-1 w-12 rounded-full bg-gray-300" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">
            {loading ? 'Loading...' : (
              <>
                <span className="text-emerald-600">{items.length}</span>
                <span className="ml-1 text-gray-700">Result{items.length !== 1 ? 's' : ''}</span>
              </>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Results List */}
        <div className="overflow-y-auto pb-4">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 rounded-lg bg-gray-100" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No places found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {items.map((poi) => (
                <div
                  key={`${poi.poiType || 'destination'}-${poi.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePOIClick(poi)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handlePOIClick(poi)
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition cursor-pointer ${
                    selectedPOI?.id === poi.id && selectedPOI?.poiType === poi.poiType
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
                      TYPE_COLORS[poi.poiType === 'business' ? poi.type : poi.destination]?.bg || 'bg-gray-500'
                    }`}>
                      <span className="text-sm">
                        {TYPE_SYMBOLS[poi.poiType === 'business' ? poi.type : poi.destination] || '•'}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate font-medium text-gray-900">{poi.name}</h4>
                        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <FavoriteButton 
                            item={{ ...poi, type: poi.poiType === 'business' ? poi.type : poi.destination }}
                            size="sm"
                            className="flex-shrink-0"
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{poi.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${
                          TYPE_COLORS[poi.poiType === 'business' ? poi.type : poi.destination]?.bg || 'bg-gray-500'
                        }`}>
                          {poi.category}
                        </span>
                        {poi.barangay && (
                          <span>📍 {poi.barangay}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}