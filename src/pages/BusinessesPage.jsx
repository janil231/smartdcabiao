import { Link, useSearchParams } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SearchBar from '../components/SearchBar'
import FavoriteButton from '../components/FavoriteButton'
import AppImage from '../components/ui/AppImage'
import Reveal from '../components/animations/Reveal'
import { getBusinessImage } from '../utils/placeImages'
import { searchBusinesses } from '../services/businesses.service'
import { BUSINESS_TYPES } from '../data'

const TYPE_STYLES = {
  [BUSINESS_TYPES.restaurant]: 'bg-amber-500/10 text-amber-700 border-amber-200',
  [BUSINESS_TYPES.shop]: 'bg-blue-500/10 text-blue-700 border-blue-200',
  [BUSINESS_TYPES.attraction]: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
}

function BusinessCard({ business }) {
  const categoryStyle = TYPE_STYLES[business.type] || 'bg-gray-100 text-gray-700 border-gray-200'
  const img = getBusinessImage(business)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5">
      <div className="relative aspect-video w-full overflow-hidden">
        <AppImage src={img} alt={business.name} className="h-full w-full" />
        <div className="absolute top-3 right-3">
          <FavoriteButton 
            item={{ ...business, type: business.type }}
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span
          className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${categoryStyle}`}
        >
          {business.category}
        </span>
        <Link
          to={`/businesses/${business.id}`}
          className="mt-2 block"
        >
          <h2 className="text-lg font-semibold text-gray-900 hover:text-emerald-600 transition">{business.name}</h2>
        </Link>
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">{business.description}</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Link
              to={`/businesses/${business.id}`}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 h-11 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
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
            to={`/map?focus=${business.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white h-11 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 ease-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
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

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Businesses' },
  { value: BUSINESS_TYPES.restaurant, label: 'Restaurants' },
  { value: BUSINESS_TYPES.shop, label: 'Shops' },
  { value: BUSINESS_TYPES.attraction, label: 'Attractions' },
]

export default function BusinessesPage() {
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState('all')
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const searchQuery = searchParams.get('search') || ''

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true)
        const data = await searchBusinesses(searchQuery, { type: filter })
        setBusinesses(data)
      } catch (error) {
        console.error('Error loading businesses:', error)
        setBusinesses([])
      } finally {
        setLoading(false)
      }
    }
    loadBusinesses()
  }, [filter, searchQuery])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
          <Reveal delay={0}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Local Businesses
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-2 sm:mt-3 max-w-2xl text-base sm:text-lg text-gray-600">
              Discover shops, restaurants, and attractions in Cabiao. Click "View on Map" to see a
              business location on the interactive map.
            </p>
          </Reveal>

          {/* Search and Filter Section - Sticky on mobile */}
          <Reveal delay={160}>
            <div className="mt-6 sm:mt-8 space-y-4 sticky top-[72px] sm:top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -top-3 sm:top-0">
              <div className="max-w-md">
                <SearchBar placeholder="Search businesses..." />
              </div>
              
              <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] h-11 ${
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
          </Reveal>

          {/* Results Count */}
          <Reveal delay={240}>
            <div className="mt-4 sm:mt-6">
              <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : (
                <>
                  {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} found
                  {searchQuery && ` for "${searchQuery}"`}
                  {filter !== 'all' && ` in ${FILTER_OPTIONS.find(f => f.value === filter)?.label.toLowerCase()}`}
                </>
              )}
              </p>
            </div>
          </Reveal>

          {/* Business Grid */}
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
          ) : businesses.length > 0 ? (
            <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          ) : (
            <div className="mt-6 sm:mt-10 text-center">
              <div className="rounded-lg bg-gray-50 px-6 py-12">
                <p className="text-gray-600">No businesses found matching your criteria.</p>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
