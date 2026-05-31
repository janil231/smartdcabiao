import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import LoginModal from '../components/Auth/LoginModal'
import FavoriteButton from '../components/FavoriteButton'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  BUSINESS_TYPES,
} from '../data'
import { CABIAO_CENTER, CABIAO_DEFAULT_ZOOM } from '../constants/cabiaoGeo'
import useMapFilters from '../features/map/useMapFilters'
import MapFilterBar from '../features/map/MapFilterBar'
import MapUtilities from '../features/map/MapUtilities'
import InvalidateMapSize from '../features/map/InvalidateMapSize'
import { getAllPlaces, clearPlacesCache } from '../features/map/mapHelpers'
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

/** Same view as mobile ↻ reset and desktop reset fallback (CABIAO_CENTER + CABIAO_DEFAULT_ZOOM). */
const DEFAULT_MAP_VIEW = {
  center: CABIAO_CENTER,
  zoom: CABIAO_DEFAULT_ZOOM,
}

/** Sets initial map view once; does not refit when places load (avoids bad fitBounds zoom-out). */
function ApplyDefaultMapView() {
  const map = useMap()
  const [searchParams] = useSearchParams()
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current) return
    if (searchParams.get('focus')) {
      applied.current = true
      return
    }
    map.setView(DEFAULT_MAP_VIEW.center, DEFAULT_MAP_VIEW.zoom, { animate: false })
    applied.current = true
  }, [map, searchParams])

  return null
}

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

function MapFlyTo({ target, zoom = 16 }) {
  const map = useMap()
  useEffect(() => {
    if (target && Array.isArray(target) && target.length >= 2) {
      map.flyTo(target, zoom, { duration: 0.8 })
    }
  }, [target, zoom, map])
  return null
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const timer1 = setTimeout(() => map.invalidateSize(), 100)
    const timer2 = setTimeout(() => map.invalidateSize(), 500)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      window.removeEventListener('resize', onResize)
    }
  }, [map])
  return null
}

export default function MapPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [selectedPOI, setSelectedPOI] = useState(null)
  const [locationMessage, setLocationMessage] = useState('')
  const [allPlaces, setAllPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [flyTarget, setFlyTarget] = useState(null)
  const isMobile = useIsMobile()

  const { filters, setFilter, clearFilters, hasActiveFilters } = useMapFilters()

  useEffect(() => {
    async function loadPlaces() {
      try {
        setLoading(true)
        clearPlacesCache()
        const places = await getAllPlaces({ forceRefresh: true })
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

  const handleAddPlace = () => {
    if (user) {
      navigate('/register-business')
    } else {
      setAuthModalOpen(true)
    }
  }

  const handleMobileLocate = () => {
    if (!navigator.geolocation) {
      handleLocationError('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTarget([pos.coords.latitude, pos.coords.longitude])
        handleLocationFound()
      },
      () => handleLocationError('Could not get your location. Please enable location access.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleMobileReset = () => {
    setFlyTarget(DEFAULT_MAP_VIEW.center)
    setSelectedPOI(null)
  }

  const detailPath = (poi) =>
    poi.type === BUSINESS_TYPES.attraction ? `/destinations/${poi.id}` : `/businesses/${poi.id}`

  const filterBarProps = {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    resultsCount: filteredPlaces.length,
    loading,
  }

  return (
    <div className="flex flex-col min-h-0 h-[100dvh] max-h-[100dvh] overflow-hidden sm:h-screen sm:max-h-screen">
      <Navbar />

      <div className="hidden sm:block shrink-0 relative">
        <MapFilterBar {...filterBarProps} />
        <button
          type="button"
          onClick={handleAddPlace}
          className="hidden sm:inline-flex lg:hidden absolute right-4 top-1/2 z-20 -translate-y-1/2 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[40px]"
        >
          {t('registerBusiness.addAPlace')}
        </button>
      </div>

      {locationMessage && (
        <div className="pointer-events-none fixed top-20 left-1/2 z-[600] -translate-x-1/2 mx-4 max-w-sm sm:absolute">
          <p className="pointer-events-auto rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 shadow-lg">
            {locationMessage}
          </p>
        </div>
      )}

      <div className="relative flex min-h-0 w-full flex-1 h-[calc(100dvh-8rem)] sm:h-auto">
        <div className="absolute inset-0 sm:relative sm:flex-1 sm:min-h-0 sm:h-full sm:w-full map-mobile-chrome">
          <div className="sm:hidden absolute inset-0 z-[400] pointer-events-none">
            <MapFilterBar {...filterBarProps} />
          </div>

          <MapContainer
            center={DEFAULT_MAP_VIEW.center}
            zoom={DEFAULT_MAP_VIEW.zoom}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {!isMobile && <ZoomControl position="topright" />}

            {filteredPlaces.map((poi) => (
              <Marker
                key={`${poi.poiType}-${poi.id}`}
                position={poi.position}
                icon={getMarkerIcon(poi.type)}
                eventHandlers={{
                  click: () => {
                    if (isMobile) handlePOISelect(poi)
                  },
                }}
              >
                {!isMobile && (
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
                )}
              </Marker>
            ))}

            <MapFlyTo
              target={flyTarget}
              zoom={
                flyTarget &&
                flyTarget[0] === DEFAULT_MAP_VIEW.center[0] &&
                flyTarget[1] === DEFAULT_MAP_VIEW.center[1]
                  ? DEFAULT_MAP_VIEW.zoom
                  : 16
              }
            />
            <ApplyDefaultMapView />
            <FocusOnPlace />
            <InvalidateMapSize />
            <MapResizer />
            <MapUtilities
              pois={selectedPOI ? [selectedPOI] : filteredPlaces}
              onLocationFound={handleLocationFound}
              onLocationError={handleLocationError}
              showLeafletControls={!isMobile}
            />
          </MapContainer>

          <div className="absolute bottom-4 right-3 z-[400] flex flex-col gap-2 sm:hidden">
            <button
              type="button"
              onClick={handleMobileLocate}
              className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-lg hover:bg-gray-50"
              aria-label="Locate me"
            >
              📍
            </button>
            <button
              type="button"
              onClick={handleMobileReset}
              className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-lg hover:bg-gray-50"
              aria-label="Reset to Cabiao"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={handleAddPlace}
              className="w-14 h-14 bg-emerald-600 rounded-full shadow-xl flex items-center justify-center text-white text-2xl hover:bg-emerald-700"
              aria-label="Add a place"
            >
              +
            </button>
          </div>

          {isMobile && selectedPOI && (
            <>
              <div
                className="fixed inset-0 z-[450] bg-black/30 sm:hidden"
                onClick={() => setSelectedPOI(null)}
                aria-hidden
              />
              <div className="fixed inset-x-0 bottom-16 z-[500] bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 max-h-[58vh] overflow-y-auto animate-slide-up-sheet pb-[env(safe-area-inset-bottom)] sm:hidden">
                <div className="sticky top-0 bg-white pt-3 pb-2 flex justify-center">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPOI(null)}
                  className="absolute top-3 right-3 w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"
                  aria-label="Close"
                >
                  ✕
                </button>
                <div className="px-4 pb-5 pt-1">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${
                      TYPE_COLORS[selectedPOI.type]?.bg || 'bg-gray-500'
                    }`}
                  >
                    {selectedPOI.category}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-2 pr-10">{selectedPOI.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{selectedPOI.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    📍 {selectedPOI.barangay || selectedPOI.address?.split(',')[0] || 'Cabiao'}
                  </p>
                  <Link
                    to={detailPath(selectedPOI)}
                    onClick={() => setSelectedPOI(null)}
                    className="mt-4 block w-full text-center bg-emerald-600 text-white py-3 min-h-[44px] rounded-xl font-semibold hover:bg-emerald-700"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop Results List */}
        <aside className="hidden lg:flex lg:w-[380px] shrink-0 min-h-0 h-full border-l border-gray-200 bg-white">
          <div className="flex h-full min-h-0 w-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">
                <span className="text-emerald-600">{filteredPlaces.length}</span>
                <span className="ml-1 text-gray-700">Result{filteredPlaces.length !== 1 ? 's' : ''}</span>
              </h3>
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddPlace}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {t('registerBusiness.addAPlace')}
              </button>
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
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3">
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

      <LoginModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}
