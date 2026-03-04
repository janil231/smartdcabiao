import { useEffect } from "react"
import { useMap } from "react-leaflet"

export default function InvalidateMapSize() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 0)
    const t2 = setTimeout(() => map.invalidateSize(), 250)
    return () => { clearTimeout(t1); clearTimeout(t2); }
  }, [map])
  return null
}
