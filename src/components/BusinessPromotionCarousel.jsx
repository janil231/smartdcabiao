import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBusinessById } from '../data'
import FavoriteButton from './FavoriteButton'
import AppImage from './ui/AppImage'
import { getBusinessImage } from '../utils/placeImages'

const featuredBusinesses = [
  {
    id: 1,
    title: 'Heritage Eatery - Traditional Filipino Cuisine',
    description: 'Experience authentic Filipino flavors passed down through generations. Family-friendly atmosphere with recipes that tell Cabiao\'s story.',
    badge: 'Featured Restaurant',
    badgeColor: 'bg-amber-500',
    cta: 'Reserve a Table',
    image: 'https://source.unsplash.com/1Y_F2iXOnw/1200x675'
  },
  {
    id: 3,
    title: 'Cabiao Pasalubong Center - Local Treasures',
    description: 'Bring home the taste of Cabiao! Authentic local delicacies, handicrafts, and souvenirs made by our community artisans.',
    badge: 'Must-Visit Shop',
    badgeColor: 'bg-blue-500',
    cta: 'Shop Local',
    image: 'https://source.unsplash.com/nA3_5DuTIs/1200x675'
  },
  {
    id: 6,
    title: 'San Roque Parish Church - Historical Gem',
    description: 'Discover the rich heritage of Cabiao at this beautiful historic church. A testament to our community\'s faith and culture.',
    badge: 'Cultural Heritage',
    badgeColor: 'bg-emerald-500',
    cta: 'Learn More',
    image: 'https://source.unsplash.com/rW_aFjaEw/1200x675'
  }
]

export default function BusinessPromotionCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % featuredBusinesses.length)
    }, 5000) // Auto-advance every 5 seconds

    return () => clearInterval(timer)
  }, [])

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + featuredBusinesses.length) % featuredBusinesses.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % featuredBusinesses.length)
  }

  const currentBusiness = featuredBusinesses[currentIndex]
  const businessDetails = getBusinessById(currentBusiness.id)

  if (!businessDetails) return null

  return (
    <section className="relative bg-gradient-to-br from-emerald-600 to-teal-700 py-16 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Spotlight on Local Excellence
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-emerald-100">
            Discover the heart and soul of Cabiao through these featured local businesses that embody our community's spirit.
          </p>
        </div>

        {/* Main Carousel */}
        <div className="relative max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Business Image */}
            <div className="relative h-64 sm:h-80 md:h-96">
              <AppImage
                src={getBusinessImage(businessDetails)}
                alt={businessDetails.name}
                className="w-full h-full"
              />
              
              {/* Overlay Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white ${currentBusiness.badgeColor}`}>
                          {currentBusiness.badge}
                        </span>
                        <FavoriteButton
                          item={{ ...businessDetails, type: businessDetails.type }}
                          size="sm"
                          className="bg-white/90 backdrop-blur-sm"
                        />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        {businessDetails.name}
                      </h3>
                      <p className="text-lg text-white/90 mb-4 max-w-2xl">
                        {currentBusiness.description}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={`/businesses/${businessDetails.id}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-white text-gray-900 px-6 py-3 font-medium hover:bg-gray-100 transition shadow-lg"
                        >
                          {currentBusiness.cta}
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <Link
                          to={`/map?focus=${businessDetails.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border-2 border-white text-white px-6 py-3 font-medium hover:bg-white hover:text-gray-900 transition backdrop-blur-sm"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View on Map
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-gray-900 shadow-lg hover:bg-white transition backdrop-blur-sm"
                aria-label="Previous slide"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-gray-900 shadow-lg hover:bg-white transition backdrop-blur-sm"
                aria-label="Next slide"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {featuredBusinesses.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Link
            to="/businesses"
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition border border-white/20"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Browse All Businesses</h3>
            <p className="text-emerald-100 text-sm">Explore our complete directory of local establishments</p>
          </Link>

          <Link
            to="/favorites"
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition border border-white/20"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Your Favorites</h3>
            <p className="text-emerald-100 text-sm">View and manage your saved places</p>
          </Link>

          <Link
            to="/events"
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition border border-white/20"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Community Events</h3>
            <p className="text-emerald-100 text-sm">Join local activities and celebrations</p>
          </Link>
        </div>
      </div>
    </section>
  )
}