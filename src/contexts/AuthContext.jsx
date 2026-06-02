import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { upsertUserProfile } from '../services/users.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)
      if (u) {
        try {
          await upsertUserProfile(u)
          console.log('[Auth] User profile upserted:', u.email)
        } catch (err) {
          console.warn('[Auth] Failed to upsert user profile:', err)
        }
      }
    })
    return unsub
  }, [])

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const signUp = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password)

  const logout = () => signOut(auth)

  const signInWithGoogle = () =>
    signInWithPopup(auth, new GoogleAuthProvider())

  const signInWithFacebook = () =>
    signInWithPopup(auth, new FacebookAuthProvider())

  const resetPassword = (email) =>
    sendPasswordResetEmail(auth, email)

  const value = {
    user,
    loading,
    login,
    signUp,
    logout,
    signInWithGoogle,
    signInWithFacebook,
    resetPassword,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}