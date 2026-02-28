import { useEffect, useRef, useState } from 'react'
import { useMap, MapContainer } from 'react-leaflet'
import L from 'leaflet'
import { CABIAO_CENTER, CABIAO_BOUNDS, CABIAO_DEFAULT_ZOOM } from '../../constants/cabiaoGeo'

// Component to handle fitting map bounds to filtered results
export function FitBounds({ pois, enabled = false }) {
  const map = useMap()
  
  useEffect(() => {
    // Only auto-fit when explicitly enabled (user clicks "Fit to results")
    // Never auto-fit on initial load
    if (!enabled || pois.length === 0) return
    
    const poisWithPosition = pois.filter(poi => 
      Array.isArray(poi.position) && poi.position.length >= 2
    )
    
    if (poisWithPosition.length > 0) {
      try {
        const bounds = L.latLngBounds(poisWithPosition.map(poi => poi.position))
        
        // Ensure bounds are within Cabiao limits
        const clampedBounds = {
          southWest: [
            Math.max(bounds.getSouth(), CABIAO_BOUNDS.southWest[0]),
            Math.max(bounds.getWest(), CABIAO_BOUNDS.southWest[1])
          ],
          northEast: [
            Math.min(bounds.getNorth(), CABIAO_BOUNDS.northEast[0]),
            Math.min(bounds.getEast(), CABIAO_BOUNDS.northEast[1])
          ]
        }
        
        const clampedLatLngBounds = L.latLngBounds([
          clampedBounds.southWest,
          clampedBounds.northEast
        ])
        
        if (import.meta.env.DEV) {
          console.log('🎯 Fitting to bounds:', { 
            pois: poisWithPosition.length,
            bounds: clampedBounds 
          })
        }
        
        map.fitBounds(clampedLatLngBounds, { padding: [50, 50] })
      } catch (error) {
        console.warn('Could not fit bounds:', error)
        // Fallback to Cabiao center if bounds fail
        map.setView(CABIAO_CENTER, CABIAO_DEFAULT_ZOOM)
      }
    }
  }, [enabled, pois, map])
  
  return null
}

// Component to handle resetting to Cabiao
export function ResetToCabiao() {
  const map = useMap()
  
  const handleResetClick = () => {
    map.flyTo(CABIAO_CENTER, CABIAO_DEFAULT_ZOOM, { duration: 1 })
  }
  
  // Create a control container
  useEffect(() => {
    const ResetControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        L.DomEvent.disableClickPropagation(container)
        
        const button = L.DomUtil.create('button', '', container)
        button.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: white; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1v-3m-6 3l2-2m0 0l-2-2m0 0l-2 2" />
            </svg>
            <span>Reset to Cabiao</span>
          </div>
        `
        
        button.title = 'Reset view to Cabiao'
        button.style.border = 'none'
        button.style.outline = 'none'
        
        L.DomEvent.on(button, 'click', handleResetClick, this)
        
        return container
      }
    })
    
    const resetControl = new ResetControl()
    map.addControl(resetControl)
    
    return () => {
      map.removeControl(resetControl)
    }
  }, [map, handleResetClick])
  
  return null
}

// Component to handle locating user
export function LocateMe({ onLocationFound, onLocationError }) {
  const map = useMap()
  const userMarkerRef = useRef(null)
  
  const handleLocateClick = () => {
    if (!navigator.geolocation) {
      onLocationError?.('Geolocation is not supported by your browser')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const userLocation = [latitude, longitude]
        
        // Remove existing user marker if any
        if (userMarkerRef.current) {
          map.removeLayer(userMarkerRef.current)
        }
        
        // Create new user location marker
        const userIcon = L.divIcon({
          html: `<div style="margin-left:-8px;margin-top:-8px;width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: 'user-location-div'
        })
        
        userMarkerRef.current = L.marker(userLocation, { icon: userIcon }).addTo(map)
        
        // Center map on user location
        map.flyTo(userLocation, 16, { duration: 1 })
        
        onLocationFound?.(userLocation)
      },
      (error) => {
        let message = 'Could not get your location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            message = 'Location request timed out.'
            break
        }
        
        onLocationError?.(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }
  
  // Create a control container
  useEffect(() => {
    const LocateControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        L.DomEvent.disableClickPropagation(container)
        
        const button = L.DomUtil.create('button', '', container)
        button.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: white; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Locate Me</span>
          </div>
        `
        
        button.title = 'Find my location'
        button.style.border = 'none'
        button.style.outline = 'none'
        
        L.DomEvent.on(button, 'click', handleLocateClick, this)
        
        return container
      }
    })
    
    const locateControl = new LocateControl()
    map.addControl(locateControl)
    
    return () => {
      map.removeControl(locateControl)
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current)
      }
    }
  }, [map, handleLocateClick])
  
  return null
}

// Combine both utilities in one component for easier usage
export default function MapUtilities({ pois, onLocationFound, onLocationError }) {
  const [fitToResultsEnabled, setFitToResultsEnabled] = useState(false)
  
  // Expose fit function to parent via ref or callback
  const enableFitToResults = () => {
    setFitToResultsEnabled(true)
    setTimeout(() => setFitToResultsEnabled(false), 100) // Reset after animation
  }
  
  // Store the function in a ref for parent access
  useEffect(() => {
    window.enableMapFitToResults = enableFitToResults
  }, [enableFitToResults])
  
  return (
    <>
      <ResetToCabiao />
      <FitBounds pois={pois} enabled={fitToResultsEnabled} />
      <LocateMe onLocationFound={onLocationFound} onLocationError={onLocationError} />
    </>
  )
}