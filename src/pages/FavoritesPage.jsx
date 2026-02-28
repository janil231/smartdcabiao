import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FavoriteButton from '../components/FavoriteButton'
import { useFavorites } from '../contexts/FavoritesContext'
import { BUSINESS_TYPES } from '../data'

const TYPE_STYLES = {
  [BUSINESS_TYPES.restaurant]: 'bg-amber-500/10 text-amber-700 border-amber-200',
  [BUSINESS_TYPES.shop]: 'bg-blue-500/10 text-blue-700 border-blue-200',
  [BUSINESS_TYPES.attraction]: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
}

const TYPE_LABELS = {
  [BUSINESS_TYPES.restaurant]: 'Restaurant',
  [BUSINESS_TYPES.shop]: 'Shop',
  [BUSINESS_TYPES.attraction]: 'Attraction',
}

function FavoriteItem({ item }) {
  const categoryStyle = TYPE_STYLES[item.type] || TYPE_STYLES[BUSINESS_TYPES.shop]
  const typeLabel = TYPE_LABELS[item.type] || item.type

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${categoryStyle}`}>
              {item.category}
            </span>
            <span className="text-xs text-gray-500">{typeLabel}</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>
          <div className="flex items-center gap-3">
            <Link
              to={item.type === 'business' ? `/businesses/${item.id}` : `/map?focus=${item.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              View Details
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to={`/map?focus=${item.id}`}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Map
            </Link>
          </div>
        </div>
        <FavoriteButton
          item={item}
          size="sm"
          className="ml-4 flex-shrink-0"
        />
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  const { favorites, clearFavorites } = useFavorites()

  const businesses = favorites.filter(item => item.type === 'business')
  const destinations = favorites.filter(item => item.type !== 'business')

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center sm:text-left mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                My Favorites
              </h1>
              {favorites.length > 0 && (
                <button
                  type="button"
                  onClick={clearFavorites}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
            <p className="max-w-2xl text-lg text-gray-600">
              Save your favorite businesses and destinations in Cabiao for quick access later.
            </p>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
              <p className="text-gray-600 mb-6">
                Start exploring and save your favorite places in Cabiao!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/businesses"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Browse Businesses
                </Link>
                <Link
                  to="/map"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Explore Map
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {businesses.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Favorite Businesses ({businesses.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {businesses.map((item) => (
                      <FavoriteItem key={`${item.type}-${item.id}`} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {destinations.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Favorite Destinations ({destinations.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {destinations.map((item) => (
                      <FavoriteItem key={`${item.type}-${item.id}`} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}