import { createContext, useContext, useEffect, useState } from 'react'

const FavoritesContext = createContext()

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const storedFavorites = localStorage.getItem('cabiao-favorites')
      return storedFavorites ? JSON.parse(storedFavorites) : []
    } catch (error) {
      console.error('Error parsing favorites from localStorage:', error)
      return []
    }
  })

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem('cabiao-favorites', JSON.stringify(favorites))
    } else {
      localStorage.removeItem('cabiao-favorites')
    }
  }, [favorites])

  const addFavorite = (item) => {
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.id === item.id && fav.type === item.type)
      if (!exists) {
        return [...prev, item]
      }
      return prev
    })
  }

  const removeFavorite = (itemId, itemType) => {
    setFavorites((prev) => prev.filter((fav) => !(fav.id === itemId && fav.type === itemType)))
  }

  const isFavorite = (itemId, itemType) => {
    return favorites.some((fav) => fav.id === itemId && fav.type === itemType)
  }

  const toggleFavorite = (item) => {
    if (isFavorite(item.id, item.type)) {
      removeFavorite(item.id, item.type)
    } else {
      addFavorite(item)
    }
  }

  const getFavoriteBusinesses = () => {
    return favorites.filter((fav) => fav.type === 'business')
  }

  const getFavoriteDestinations = () => {
    return favorites.filter((fav) => fav.type === 'destination')
  }

  const clearFavorites = () => {
    setFavorites([])
  }

  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    getFavoriteBusinesses,
    getFavoriteDestinations,
    clearFavorites,
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}