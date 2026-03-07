import StarRating from './StarRating'

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date'
  
  let date
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate()
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp)
  } else {
    return 'Unknown date'
  }

  if (isNaN(date.getTime())) return 'Unknown date'

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function ReviewItem({ review }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0 py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={review.rating} size="sm" />
            {review.rating && (
              <span className="text-sm font-medium text-gray-700">{review.rating}</span>
            )}
          </div>
          
          {review.title && (
            <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
          )}
          
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {review.text}
          </p>

          {review.sustainabilityNote && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-emerald-800">Sustainability Note</p>
                  <p className="text-sm text-emerald-700 mt-0.5">{review.sustainabilityNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span className="font-medium text-gray-700">
          {review.userDisplayName || 'Anonymous'}
        </span>
        <span>•</span>
        <span>{formatDate(review.createdAt)}</span>
      </div>
    </div>
  )
}

export default function ReviewsList({ reviews = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="w-4 h-4 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6 mt-2" />
          </div>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-500">No reviews yet. Be the first to review!</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}
    </div>
  )
}
