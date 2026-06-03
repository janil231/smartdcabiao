import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FavoriteButton from '../components/FavoriteButton'
import ReportIssueModal from '../components/ReportIssueModal'
import PhotoCarousel from '../components/PhotoCarousel'
import RatingSummary from '../components/reviews/RatingSummary'
import ReviewsList from '../components/reviews/ReviewsList'
import ReviewForm from '../components/reviews/ReviewForm'
import { useAuth } from '../contexts/AuthContext'
import { getDestinationImages } from '../utils/placeImages'
import { getDestinationById } from '../services/destinations.service'
import { listApprovedReviews, getMyReview } from '../services/reviews.service'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default icon in webpack/vite (react-leaflet)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function getDestinationIcon(type = 'destination') {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="margin-left:-14px;margin-top:-14px;width:28px;height:28px;border-radius:50%;background:#8b5cf6;border:2px solid:#7c3aed;box-shadow:0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:white;line-height:1;">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export default function DestinationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [destination, setDestination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shareMessage, setShareMessage] = useState('')
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [myReview, setMyReview] = useState(null)

  const loadReviews = useMemo(() => async () => {
    setReviewsLoading(true)
    try {
      const [approvedReviews, myReviewData] = await Promise.all([
        listApprovedReviews({ targetType: 'destination', targetId: id }),
        user ? getMyReview({ targetType: 'destination', targetId: id, uid: user.uid }) : Promise.resolve(null)
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
    async function loadDestination() {
      try {
        setLoading(true)
        const data = await getDestinationById(id)
        if (data) {
          setDestination(data)
        } else {
          navigate('/destinations', { replace: true })
        }
      } catch (error) {
        console.error('Error loading destination:', error)
        navigate('/destinations', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    loadDestination()
  }, [id, navigate])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: destination.name,
          text: destination.description,
          url: url,
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url)
        setShareMessage('Link copied to clipboard!')
        setTimeout(() => setShareMessage(''), 3000)
      } catch (error) {
        setShareMessage('Failed to copy link')
        setTimeout(() => setShareMessage(''), 3000)
      }
    }
  }

  const getDirections = () => {
    if (destination?.position) {
      const [lat, lng] = destination.position
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-mobile-nav">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200" />
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
              <div className="h-32 bg-gray-200 rounded mb-8" />
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
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

  if (!destination) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-mobile-nav">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Destination Not Found</h1>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
                Sorry, we couldn't find the destination you're looking for. Try browsing our
                <Link to="/destinations" className="text-emerald-600 hover:text-emerald-700">destinations page</Link>
                {' '}to discover amazing places in Cabiao.
              </p>
              <button
                type="button"
                onClick={() => navigate('/destinations')}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
              >
                Browse Destinations
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex text-sm text-gray-500" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/destinations" className="hover:text-gray-700">Destinations</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{destination.name}</span>
          </nav>
        </div>
      </div>

      <main className="flex-1 pb-mobile-nav">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{destination.name}</h1>
                {destination.barangay && (
                  <p className="mt-2 text-lg text-gray-600 flex items-center gap-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {destination.barangay}, Cabiao
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <FavoriteButton 
                  item={{ ...destination, type: destination.type || 'destination' }}
                  size="lg"
                />
                <button
                  onClick={handleShare}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-3 text-gray-700 hover:bg-gray-50 transition"
                  title="Share destination"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Share Message */}
            {shareMessage && (
              <div className="mt-2 text-sm text-emerald-600 animate-fade-in">
                {shareMessage}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              {/* Image Gallery */}
              <PhotoCarousel images={getDestinationImages(destination)} alt={destination.name} mode="detail" className="aspect-video w-full overflow-hidden rounded-xl" />

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About this destination</h2>
                <p className="text-gray-700 leading-relaxed">
                  {destination.description}
                </p>
              </div>

              {/* Tags */}
              {destination.tags && destination.tags.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {destination.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {destination.position && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200">
                    <MapContainer
                      center={destination.position}
                      zoom={16}
                      className="h-full w-full"
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker
                        position={destination.position}
                        icon={getDestinationIcon(destination.type)}
                      >
                        <Popup>
                          <div className="text-center">
                            <strong>{destination.name}</strong>
                            {destination.address && <p className="text-sm text-gray-600 mt-1">{destination.address}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Reviews</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Rating Summary & List */}
                  <div>
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold text-gray-900">
                          {destination.ratingAvg ? destination.ratingAvg.toFixed(1) : '0.0'}
                        </div>
                        <div>
                          <RatingSummary ratingAvg={destination.ratingAvg} ratingCount={destination.ratingCount} />
                          <p className="text-sm text-gray-500 mt-1">
                            {destination.ratingCount || 0} {destination.ratingCount === 1 ? 'review' : 'reviews'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ReviewsList reviews={reviews} loading={reviewsLoading} />
                  </div>

                  {/* Review Form */}
                  <div>
                    <ReviewForm
                      targetType="destination"
                      targetId={id}
                      user={user}
                      existingReview={myReview}
                      placeName={destination.name}
                      onReviewSubmitted={loadReviews}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Info */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Info</h3>
                <div className="space-y-3">
                  {destination.barangay && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Barangay</dt>
                      <dd className="text-sm text-gray-900">{destination.barangay}</dd>
                    </div>
                  )}
                  {destination.address && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      <dd className="text-sm text-gray-900">{destination.address}</dd>
                    </div>
                  )}
                  {destination.category && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Category</dt>
                      <dd className="text-sm text-gray-900">{destination.category}</dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={getDirections}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Get Directions
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Report an Issue
                </button>
                 
                <Link
                  to="/destinations"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Destinations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="destination"
        targetId={destination?.id}
        pageUrl={window.location.href}
      />
      
      <Footer />
    </div>
  )
}