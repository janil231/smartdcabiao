import StarRating from './StarRating'

export default function RatingSummary({ ratingAvg, ratingCount, size = 'sm' }) {
  if (!ratingAvg && !ratingCount) {
    return (
      <span className="text-xs text-gray-400">No ratings yet</span>
    )
  }

  const displayValue = ratingAvg ? ratingAvg.toFixed(1) : '0.0'
  const countText = ratingCount === 1 ? '1 review' : `(${ratingCount})`

  return (
    <div className="flex items-center gap-1.5">
      <StarRating rating={ratingAvg || 0} size={size} />
      <span className="text-sm font-medium text-gray-700">{displayValue}</span>
      <span className="text-xs text-gray-500">{countText}</span>
    </div>
  )
}
