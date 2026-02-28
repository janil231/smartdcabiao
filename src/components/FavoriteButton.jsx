import { useFavorites } from '../contexts/FavoritesContext'

export default function FavoriteButton({ item, className = '', size = 'md' }) {
  const { isFavorite, toggleFavorite } = useFavorites()

  const isFavorited = isFavorite(item.id, item.type)
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(item)
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center rounded-full transition-all duration-200 ease-out active:scale-[0.95] ${
        isFavorited
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
      } ${sizeClasses[size]} ${className}`}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className={`${iconSizes[size]} ${isFavorited ? 'fill-current' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}