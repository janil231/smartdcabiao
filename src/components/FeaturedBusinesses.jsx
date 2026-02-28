import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BusinessCard from './BusinessCard'
import { getFeaturedBusinesses } from '../services/businesses.service'

export default function FeaturedBusinesses() {
  const [featuredBusinesses, setFeaturedBusinesses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFeatured() {
      try {
        const businesses = await getFeaturedBusinesses()
        setFeaturedBusinesses(businesses)
      } catch (error) {
        console.error('Error loading featured businesses:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFeatured()
  }, [])

  return (
    <section id="businesses" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Featured Local Businesses
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Support the local economy. Discover shops, restaurants, and services in Cabiao.
          </p>
        </div>
        {loading ? (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200">
                  <div className="aspect-video bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-20" />
                    <div className="h-6 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featuredBusinesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
              />
            ))}
          </div>
        )}
        <div className="mt-12 text-center">
          <Link
            to="/businesses"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View all businesses
          </Link>
        </div>
      </div>
    </section>
  )
}
