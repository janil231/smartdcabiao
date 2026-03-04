import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import FavoriteButton from '../components/FavoriteButton'
import {
  BUSINESS_TYPES,
} from '../data'
import { CABIAO_CENTER, CABIAO_DEFAULT_ZOOM } from '../constants/cabiaoGeo'
import useMapFilters from '../features/map/useMapFilters'
import MapFilterBar from '../features/map/MapFilterBar'
import MapResults from '../features/map/MapResults'
import MapUtilities from '../features/map/MapUtilities'
import InvalidateMapSize from '../features/map/InvalidateMapSize'
import MapInitialView from '../features/map/MapInitialView'
import { getAllPlaces } from '../features/map/mapHelpers'
import { getBusinessById } from '../services/businesses.service'
import 'leaflet/dist/leaflet.css'

// Fix default icon in webpack/vite (react-leaflet)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Inline styles for marker icons (Tailwind classes in string HTML may be purged)
const TYPE_STYLES = {
  [BUSINESS_TYPES.restaurant]: { bg: '#f59e0b', border: '#d97706' },
  [BUSINESS_TYPES.shop]: { bg: '#3b82f6', border: '#2563eb' },
  [BUSINESS_TYPES.attraction]: { bg: '#10b981', border: '#059669' },
}

const TYPE_SYMBOL = {
  [BUSINESS_TYPES.restaurant]: '🍽',
  [BUSINESS_TYPES.shop]: '🛒',
  [BUSINESS_TYPES.attraction]: '⭐',
}

const TYPE_COLORS = {
  [BUSINESS_TYPES.restaurant]: { bg: 'bg-amber-500' },
  [BUSINESS_TYPES.shop]: { bg: 'bg-blue-500' },
  [BUSINESS_TYPES.attraction]: { bg: 'bg-emerald-500' },
}

const FOCUS_ZOOM = 17

function getMarkerIcon(type) {
  const style = TYPE_STYLES[type] || TYPE_STYLES[BUSINESS_TYPES.shop]
  const symbol = TYPE_SYMBOL[type] || '•'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="margin-left:-14px;margin-top:-14px;width:28px;height:28px;border-radius:50%;background:${style.bg};border:2px solid ${style.border};box-shadow:0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:white;line-height:1;">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Handle focus parameter from URL
function FocusOnPlace() {
  const [searchParams] = useSearchParams()
  const map = useMap()
  const focusId = searchParams.get('focus')

  useEffect(() => {
    if (!focusId) return
    
    async function findAndFocus() {
      const id = parseInt(focusId, 10)
      const place = await getBusinessById(id)
      if (place?.position) {
        map.flyTo(place.position, FOCUS_ZOOM, { duration: 0.8 })
      }
    }
    findAndFocus()
  }, [focusId, map])

  return null
}

export default function MapPage() {
  const [selectedPOI, setSelectedPOI] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [allPlaces, setAllPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  
  const { filters, setFilter, clearFilters, hasActiveFilters } = useMapFilters()

  useEffect(() => {
    async function loadPlaces() {
      try {
        setLoading(true)
        const places = await getAllPlaces()
        setAllPlaces(places)
      } catch (error) {
        console.error('Error loading places:', error)
        setAllPlaces([])
      } finally {
        setLoading(false)
      }
    }
    loadPlaces()
  }, [])

  // Filter places based on current filters
  const filteredPlaces = useMemo(() => {
    let results = allPlaces

    // Apply show filter (all/business/destination)
    if (filters.show !== 'all') {
      if (filters.show === 'business') {
        results = results.filter(poi => poi.poiType === 'business')
      } else if (filters.show === 'destination') {
        results = results.filter(poi => poi.poiType === 'business' && poi.type === BUSINESS_TYPES.attraction)
      }
    }

    return results
  }, [allPlaces, filters])

  const handlePOISelect = (poi) => {
    setSelectedPOI(poi)
  }

  const handleMapFocus = (poi) => {
    setSelectedPOI(poi)
    // This will be handled by MapUtilities if needed
  }

  const handleLocationFound = () => {
    setLocationMessage('')
  }

  const handleLocationError = (message) => {
    setLocationMessage(message)
    setTimeout(() => setLocationMessage(''), 5000)
  }

  const handleFitToResults = () => {
    setSelectedPOI(null)
    // Trigger fit to results in MapUtilities
    if (window.enableMapFitToResults) {
      window.enableMapFitToResults()
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      {/* Filters */}
      <MapFilterBar
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        resultsCount={filteredPlaces.length}
      />

      {/* Location Message */}
      {locationMessage && (
        <div className="absolute top-20 left-1/2 z-50 -translate-x-1/2 mx-4 max-w-sm rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 shadow-lg">
          {locationMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex">
        {/* Map Container */}
        <div className="flex-1 min-h-0">
          <MapContainer
            center={CABIAO_CENTER}
            zoom={CABIAO_DEFAULT_ZOOM}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {filteredPlaces.map((poi) => (
              <Marker
                key={`${poi.poiType}-${poi.id}`}
                position={poi.position}
                icon={getMarkerIcon(poi.type)}
              >
                <Popup>
                  <div className="min-w-[200px] text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium text-white ${TYPE_COLORS[poi.type]?.bg || 'bg-gray-500'}`}>
                          {poi.category}
                        </span>
                        <h3 className="mt-2 font-semibold text-gray-900">{poi.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">{poi.description}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          📍 {poi.barangay || (poi.address?.split(',')[0] || 'Cabiao')}
                        </p>
                      </div>
                      <FavoriteButton 
                        item={{ ...poi, type: poi.type }}
                        size="sm"
                        className="flex-shrink-0"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePOISelect(poi)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
                      >
                        Select
                      </button>
                      <a
                        href={poi.type === BUSINESS_TYPES.attraction ? `/destinations/${poi.id}` : `/businesses/${poi.id}`}
                        className="inline-flex items-center justify-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Details
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            
            <MapInitialView places={filteredPlaces} />
            <FocusOnPlace />
            <InvalidateMapSize />
            <MapUtilities 
              pois={selectedPOI ? [selectedPOI] : filteredPlaces}
              onLocationFound={handleLocationFound}
              onLocationError={handleLocationError}
            />
          </MapContainer>
        </div>

        {/* Desktop Results List */}
        <aside className="hidden lg:flex lg:w-[380px] h-full border-l border-gray-200 bg-white">
          <div className="h-full flex flex-col w-full">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">
                <span className="text-emerald-600">{filteredPlaces.length}</span>
                <span className="ml-1 text-gray-700">Result{filteredPlaces.length !== 1 ? 's' : ''}</span>
              </h3>
              {filteredPlaces.length > 1 && (
                <button
                  type="button"
                  onClick={handleFitToResults}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  title="Fit to results"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {filteredPlaces.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No places found matching your filters.</p>
                </div>
              ) : (
                filteredPlaces.map((poi) => (
                  <div
                    key={`${poi.poiType}-${poi.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handlePOISelect(poi)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handlePOISelect(poi)
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition cursor-pointer ${
                      selectedPOI?.id === poi.id && selectedPOI?.poiType === poi.poiType
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
                        TYPE_COLORS[poi.type]?.bg || 'bg-gray-500'
                      }`}>
                        <span className="text-sm">{TYPE_SYMBOL[poi.type] || '•'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="truncate font-medium text-gray-900">{poi.name}</h4>
                          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <FavoriteButton 
                              item={{ ...poi, type: poi.type }}
                              size="sm"
                              className="flex-shrink-0"
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{poi.description}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${
                            TYPE_COLORS[poi.type]?.bg || 'bg-gray-500'
                          }`}>
                            {poi.category}
                          </span>
                          <span>📍 {poi.barangay}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Results Drawer */}
      <div className="lg:hidden">
        <div className="fixed bottom-4 right-4 z-30">
          <button
            type="button"
            onClick={() => setShowResults(true)}
            className="rounded-full bg-emerald-600 p-3 text-white shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {filteredPlaces.length > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {filteredPlaces.length}
              </span>
            )}
          </button>
        </div>
        
        <MapResults
          items={filteredPlaces}
          selectedPOI={selectedPOI}
          onPOISelect={handlePOISelect}
          onMapFocus={handleMapFocus}
          isOpen={showResults}
          onClose={() => setShowResults(false)}
        />
      </div>
    </div>
  )
}
