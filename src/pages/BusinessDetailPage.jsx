import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FavoriteButton from '../components/FavoriteButton'
import ReportIssueModal from '../components/ReportIssueModal'
import AppImage from '../components/ui/AppImage'
import RatingSummary from '../components/reviews/RatingSummary'
import ReviewsList from '../components/reviews/ReviewsList'
import ReviewForm from '../components/reviews/ReviewForm'
import { useAuth } from '../contexts/AuthContext'
import { getBusinessImage } from '../utils/placeImages'
import { getBusinessById } from '../services/businesses.service'
import { listApprovedReviews, getMyReview } from '../services/reviews.service'
import { BUSINESS_TYPES } from '../data'
import 'leaflet/dist/leaflet.css'

// Fix default icon in webpack/vite (react-leaflet)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const TYPE_STYLES = {
  [BUSINESS_TYPES.restaurant]: { bg: 'bg-amber-500/10 text-amber-700 border-amber-200', mapBg: '#f59e0b', mapBorder: '#d97706' },
  [BUSINESS_TYPES.shop]: { bg: 'bg-blue-500/10 text-blue-700 border-blue-200', mapBg: '#3b82f6', mapBorder: '#2563eb' },
  [BUSINESS_TYPES.attraction]: { bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200', mapBg: '#10b981', mapBorder: '#059669' },
}

const TYPE_SYMBOL = {
  [BUSINESS_TYPES.restaurant]: '🍽',
  [BUSINESS_TYPES.shop]: '🛒',
  [BUSINESS_TYPES.attraction]: '⭐',
}

function getMarkerIcon(type) {
  const style = TYPE_STYLES[type] || TYPE_STYLES[BUSINESS_TYPES.shop]
  const symbol = TYPE_SYMBOL[type] || '•'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="margin-left:-14px;margin-top:-14px;width:28px;height:28px;border-radius:50%;background:${style.mapBg};border:2px solid ${style.mapBorder};box-shadow:0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:white;line-height:1;">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export default function BusinessDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedImage, setSelectedImage] = useState(0)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [myReview, setMyReview] = useState(null)

  const loadReviews = useMemo(() => async () => {
    setReviewsLoading(true)
    try {
      const [approvedReviews, myReviewData] = await Promise.all([
        listApprovedReviews({ targetType: 'business', targetId: id }),
        user ? getMyReview({ targetType: 'business', targetId: id, uid: user.uid }) : Promise.resolve(null)
      ])
      setReviews(approvedReviews)
      setMyReview(myReviewData)
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    async function loadBusiness() {
      try {
        setLoading(true)
        const data = await getBusinessById(id)
        if (data) {
          setBusiness(data)
        } else {
          navigate('/businesses', { replace: true })
        }
      } catch {
        navigate('/businesses', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    loadBusiness()
  }, [id, navigate])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  // Create an images array for gallery - must be called before early returns
  const businessImage = getBusinessImage(business)
  const businessImages = useMemo(() => {
    if (!business) return [businessImage]
    if (business?.images?.length > 0) {
      return business.images
    }
    return [businessImage]
  }, [business, businessImage])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-20 md:pb-0">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200" />
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
              <div className="h-32 bg-gray-200 rounded mb-8" />
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="h-24 bg-gray-200 rounded" />
                  <div className="h-24 bg-gray-200 rounded" />
                </div>
                <div className="space-y-4">
                  <div className="h-20 bg-gray-200 rounded" />
                  <div className="h-32 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Business Not Found</h1>
              <p className="mt-4 text-gray-600">Sorry, we couldn't find the business you're looking for.</p>
              <Link
                to="/businesses"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Back to Businesses
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const categoryStyle = TYPE_STYLES[business.type] || TYPE_STYLES[BUSINESS_TYPES.shop]
  
  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % businessImages.length)
  }
  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + businessImages.length) % businessImages.length)
  }

  const getDirectionsUrl = () => {
    const [lat, lng] = business.position
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link to="/" className="text-gray-500 hover:text-gray-700">
                    Home
                  </Link>
                </li>
                <li>
                  <span className="text-gray-400">/</span>
                </li>
                <li>
                  <Link to="/businesses" className="text-gray-500 hover:text-gray-700">
                    Businesses
                  </Link>
                </li>
                <li>
                  <span className="text-gray-400">/</span>
                </li>
                <li>
                  <span className="text-gray-900 font-medium">{business.name}</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-video overflow-hidden rounded-xl">
                <AppImage
                  src={businessImages[selectedImage]}
                  alt={business.name}
                  className="h-full w-full"
                  fallbackSrc={businessImage}
                />
                {businessImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              {businessImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {businessImages.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                        selectedImage === index ? 'border-emerald-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${business.name} ${index + 1}`}
                        className="h-16 w-24 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Business Information */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`inline-block rounded border px-3 py-1 text-xs font-medium uppercase tracking-wider ${categoryStyle.bg}`}>
                      {business.category}
                    </span>
                    <h1 className="mt-3 text-3xl font-bold text-gray-900">{business.name}</h1>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {business.priceRange}
                      </span>
                      {business.rating && (
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {business.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <FavoriteButton 
                    item={{ ...business, type: business.type }}
                    size="lg"
                    className="bg-white border-2 border-gray-200"
                  />
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed">{business.description}</p>

              {/* Contact Information */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-700">{business.address}</span>
                  </div>
                  {business.phone && (
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-gray-700">{business.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{business.hours}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={getDirectionsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Get Directions
                </a>
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call Now
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Report an Issue
                </button>
              </div>

              {/* Specialties */}
              {business.specialties && business.specialties.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Specialties</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {business.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {business.features && business.features.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Features & Amenities</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {business.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-1 text-sm text-gray-600">
                        <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Media */}
              {(business.website || business.socialMedia?.facebook || business.socialMedia?.instagram) && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Connect</h2>
                  <div className="mt-2 flex gap-3">
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </a>
                    )}
                    {business.socialMedia?.facebook && (
                      <a
                        href={`https://facebook.com/${business.socialMedia.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                    {business.socialMedia?.instagram && (
                      <a
                        href={`https://instagram.com/${business.socialMedia.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
            <div className="h-96 rounded-xl overflow-hidden border border-gray-200">
              <MapContainer
                center={business.position}
                zoom={16}
                className="h-full w-full"
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={business.position}
                  icon={getMarkerIcon(business.type)}
                >
                  <Popup>
                    <div className="min-w-[200px] text-left">
                      <h3 className="font-semibold text-gray-900">{business.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{business.address}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Reviews</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Rating Summary & List */}
              <div>
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-gray-900">
                      {business.ratingAvg ? business.ratingAvg.toFixed(1) : '0.0'}
                    </div>
                    <div>
                      <RatingSummary ratingAvg={business.ratingAvg} ratingCount={business.ratingCount} />
                      <p className="text-sm text-gray-500 mt-1">
                        {business.ratingCount || 0} {business.ratingCount === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>
                </div>
                <ReviewsList reviews={reviews} loading={reviewsLoading} />
              </div>

              {/* Review Form */}
              <div>
                <ReviewForm
                  targetType="business"
                  targetId={id}
                  user={user}
                  existingReview={myReview}
                  placeName={business.name}
                  onReviewSubmitted={loadReviews}
                />
              </div>
            </div>
          </div>

          {/* Related Businesses */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Nearby Businesses</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* You can add related business logic here */}
              <div className="text-center text-gray-500 col-span-full">
                More businesses coming soon...
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="business"
        targetId={business?.id}
        pageUrl={window.location.href}
      />
      
      <Footer />
    </div>
  )
}