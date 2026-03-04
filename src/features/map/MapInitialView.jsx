import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import { useSearchParams } from "react-router-dom"
import L from "leaflet"
import { CABIAO_CENTER, CABIAO_DEFAULT_ZOOM } from "../../constants/cabiaoGeo"

export default function MapInitialView({ places }) {
  const map = useMap()
  const [searchParams] = useSearchParams()

  const didFit = useRef(false)
  const didSetFallback = useRef(false)

  useEffect(() => {
    if (didFit.current) return

    const focus = searchParams.get("focus")
    if (focus) {
      didFit.current = true
      return
    }

    const pts = (places || [])
      .map((p) => p?.position)
      .filter((pos) => Array.isArray(pos) && pos.length === 2)

    if (pts.length === 0) {
      if (!didSetFallback.current) {
        map.setView(CABIAO_CENTER, CABIAO_DEFAULT_ZOOM, { animate: false })
        didSetFallback.current = true
      }
      return
    }

    const bounds = L.latLngBounds(pts)

    map.fitBounds(bounds, {
      paddingTopLeft: [200, -1500],
      paddingBottomRight: [30, 120],
      maxZoom: 13,
      animate: false,
    })

    didFit.current = true
  }, [map, places, searchParams])

  return null
}
