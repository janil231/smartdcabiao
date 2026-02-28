import { createContext, useContext, useEffect, useState } from 'react'
import { getFavorites, toggleFavorite as toggleFav, isFavorite as checkIsFavorite } from '../services/favorites.service'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext()

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid || 'guest'
  const [favorites, setFavorites] = useState(() => getFavorites(uid))

  useEffect(() => {
    setFavorites(getFavorites(uid))
  }, [uid])

  const addFavorite = (item) => {
    const newFavorites = toggleFav(uid, item.type, item.id, item)
    setFavorites(newFavorites)
  }

  const removeFavorite = (itemId, itemType) => {
    const newFavorites = toggleFav(uid, itemType, itemId)
    setFavorites(newFavorites)
  }

  const isFavorite = (itemId, itemType) => {
    return checkIsFavorite(uid, itemType, itemId)
  }

  const toggleFavorite = (item) => {
    const newFavorites = toggleFav(uid, item.type, item.id, item)
    setFavorites(newFavorites)
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