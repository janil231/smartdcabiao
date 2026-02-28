import { Link } from 'react-router-dom'

export default function MapPreview() {
  return (
    <section id="map" className="bg-gray-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Explore on the Map
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Find businesses and points of interest across Cabiao on our interactive map.
          </p>
        </div>
        <div className="mt-12 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm">
          <Link
            to="/map"
            className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 transition hover:from-emerald-100 hover:to-teal-100"
          >
            <div className="flex flex-col items-center gap-4 text-gray-500">
              <svg
                className="h-16 w-16 text-emerald-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <span className="text-sm font-medium">Open interactive map</span>
              <span className="text-xs">View businesses and attractions on Leaflet map</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
