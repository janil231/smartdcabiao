export default function StarRating({ 
  rating = 0, 
  onRatingChange, 
  maxStars = 5, 
  size = 'md',
  interactive = false,
  showValue = false 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const starSize = sizeClasses[size] || sizeClasses.md

  const handleClick = (value) => {
    if (interactive && onRatingChange) {
      onRatingChange(value)
    }
  }

  const handleKeyDown = (e, value) => {
    if (interactive && onRatingChange) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onRatingChange(value)
      }
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1
        const isFilled = starValue <= rating
        const isHalfFilled = !isFilled && starValue - 0.5 <= rating

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(starValue)}
            onKeyDown={(e) => handleKeyDown(e, starValue)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded ${!interactive ? 'pointer-events-none' : ''}`}
            aria-label={`Rate ${starValue} out of ${maxStars} stars`}
          >
            <svg
              className={`${starSize} ${isFilled ? 'text-yellow-400' : isHalfFilled ? 'text-yellow-300' : 'text-gray-300'}`}
              fill={isFilled ? 'currentColor' : isHalfFilled ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        )
      })}
      {showValue && rating > 0 && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
