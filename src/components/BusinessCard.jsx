import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'
import PhotoCarousel from './PhotoCarousel'
import { getBusinessImages } from '../utils/placeImages'
import RatingSummary from './reviews/RatingSummary'

const TYPE_STYLES = {
  restaurant: 'bg-amber-500/10 text-amber-700 border-amber-200',
  shop: 'bg-blue-500/10 text-blue-700 border-blue-200',
  attraction: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
}

export default function BusinessCard({ business, className = '' }) {
  const categoryStyle = TYPE_STYLES[business.type] || 'bg-gray-100 text-gray-700 border-gray-200'

  return (
    <article className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 ${className}`}>
      <div className="relative aspect-video w-full bg-gradient-to-br from-emerald-50 to-teal-50">
        <PhotoCarousel
          images={getBusinessImages(business)}
          alt={business.name}
          mode="card"
          className="h-full w-full"
        />
        <div className="absolute top-3 right-3">
          <FavoriteButton 
            item={{ ...business, type: business.type }}
            size="sm"
            className="bg-white/90 backdrop-blur-sm"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span
          className={`inline-block w-fit rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${categoryStyle}`}
        >
          {business.category}
        </span>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{business.name}</h3>
        {(business.ratingAvg || business.ratingCount) && (
          <div className="mt-1">
            <RatingSummary ratingAvg={business.ratingAvg} ratingCount={business.ratingCount} />
          </div>
        )}
        <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-2">
          {business.description}
        </p>
        <Link
          to={`/businesses/${business.id}`}
          className="mt-4 inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-all duration-200 ease-out active:scale-[0.98]"
        >
          View details
          <svg
            className="ml-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </article>
  )
}