import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FavoriteButton from '../components/FavoriteButton'
import AppImage from '../components/ui/AppImage'
import RatingSummary from '../components/reviews/RatingSummary'
import { getDestinationImage } from '../utils/placeImages'

// Consistent styling with BusinessCard
const TYPE_STYLES = {
  restaurant: 'bg-amber-500/10 text-amber-700 border-amber-200',
  shop: 'bg-blue-500/10 text-blue-700 border-blue-200',
  attraction: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  destination: 'bg-purple-500/10 text-purple-700 border-purple-200',
}

function DestinationCard({ destination }) {
  const categoryStyle = TYPE_STYLES[destination.type] || TYPE_STYLES.destination
  const destinationImage = getDestinationImage(destination)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-video w-full bg-gradient-to-br from-purple-50 to-pink-50">
        <AppImage
          src={destinationImage}
          alt={destination.name}
          className="h-full w-full"
        />
        <div className="absolute top-3 right-3">
          <FavoriteButton 
            item={{ ...destination, type: destination.type || 'destination' }}
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span
          className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${categoryStyle}`}
        >
          {destination.category || 'Destination'}
        </span>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{destination.name}</h3>
        <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {destination.barangay || destination.address?.split(',')[0] || 'Cabiao'}
        </p>
        {(destination.ratingAvg || destination.ratingCount) && (
          <div className="mt-1">
            <RatingSummary ratingAvg={destination.ratingAvg} ratingCount={destination.ratingCount} />
          </div>
        )}
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">
          {destination.description}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Link
            to={`/destinations/${destination.id}`}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 h-11 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            View Details
          </Link>
          <Link
            to={`/map?focus=${destination.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white h-11 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Map
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState([])
  const [barangays, setBarangays] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadDestinations = useCallback(async () => {
    try {
      setLoading(true)
      const { listDestinations: fetchDestinations } = await import('../services/destinations.service')
      const { data } = await fetchDestinations()
      
      setDestinations(data)
      
      const barangaysData = [...new Set(data.map(d => d.barangay).filter(Boolean))].sort()
      setBarangays(barangaysData)
    } catch {
      // Silent fallback
    } finally {
      setLoading(false)
    }
  }, [])

  // Load destinations and barangays
  useEffect(() => {
    loadDestinations()
  }, [loadDestinations])

  // Build filter options
  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Barangays' },
    ...barangays.map(barangay => ({ value: barangay, label: barangay }))
  ], [barangays])

  const filteredDestinations = useMemo(() => {
    let list = destinations

    if (filter !== 'all') {
      list = list.filter(d => d.barangay === filter)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(d => {
        const haystack = [
          d.name,
          d.description,
          d.category,
          d.barangay,
          d.address,
          ...(d.tags || []),
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    return list
  }, [destinations, filter, searchQuery])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-mobile-nav">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Tourist Destinations
            </h1>
            <p className="mt-2 sm:mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
              Explore beautiful destinations and points of interest in Cabiao. Discover natural attractions, historical sites, and local landmarks.
            </p>
          </div>

          {/* Search and Filter Section - Sticky on mobile */}
          <div className="mt-6 sm:mt-8 space-y-4 sticky top-[72px] sm:top-0 z-30 -mx-4 sm:mx-0 px-4 sm:py-0 py-3 bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -top-3 sm:top-0">
            <div className="max-w-md relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations..."
                className="w-full px-4 py-3 pr-10 rounded-2xl border border-emerald-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium transition h-11 active:scale-[0.98] ${
                    filter === option.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 sm:mt-6">
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : (
                <>
                  {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'} found
                  {searchQuery && ` for "${searchQuery}"`}
                  {filter !== 'all' && ` in ${filter}`}
                </>
              )}
            </p>
          </div>

          {/* Destinations Grid */}
          {loading ? (
            <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200">
                    <div className="aspect-video bg-gray-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                      <div className="h-6 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="h-12 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDestinations.length > 0 ? (
            <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDestinations.map((destination) => (
                <DestinationCard key={destination.id} destination={destination} />
              ))}
            </div>
          ) : (
            <div className="mt-6 sm:mt-10 text-center">
              <div className="rounded-lg bg-gray-50 px-6 py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No destinations found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery
                    ? `We couldn't find anything matching "${searchQuery}".`
                    : 'Try adjusting your search or filter criteria.'}
                </p>
                {(searchQuery || filter !== 'all') && (
                  <div className="flex gap-3 justify-center">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Clear search
                      </button>
                    )}
                    {filter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
