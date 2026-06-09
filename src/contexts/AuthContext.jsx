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
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { upsertUserProfile, getUserProfile } from '../services/users.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)

  const isOAuth = user?.providerData?.some(
    p => p.providerId === 'google.com' || p.providerId === 'facebook.com'
  )
  const grandfatheredUnverified = !!(!user?.emailVerified && userProfile?.interestsSetAt && !isOAuth)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)
      if (u) {
        try {
          await upsertUserProfile(u)
          const profile = await getUserProfile(u.uid)
          setUserProfile(profile)
        } catch (err) {
          console.warn('[Auth] Profile error:', err)
        }
      } else {
        setUserProfile(null)
      }
    })
    return unsub
  }, [])

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const signUp = async (email, password, displayName) => {
    let userCredential
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      console.error('[signUp] Account creation failed:', err)
      throw err
    }

    if (displayName) {
      try {
        await updateProfile(userCredential.user, { displayName })
      } catch (err) {
        console.warn('[signUp] Failed to set displayName:', err)
      }
    }

    try {
      await upsertUserProfile(userCredential.user)
    } catch (err) {
      console.warn('[signUp] Failed to upsert profile:', err)
    }

    try {
      await sendEmailVerification(userCredential.user)
      console.log('[signUp] Verification email sent successfully to', email)
    } catch (emailError) {
      console.error('[signUp] Failed to send verification email:', emailError)
      userCredential._verificationEmailError = emailError.message || emailError.code || 'Unknown error'
    }

    return userCredential
  }

  const logout = () => {
    setUserProfile(null)
    return signOut(auth)
  }

  const signInWithGoogle = () =>
    signInWithPopup(auth, new GoogleAuthProvider())

  const signInWithFacebook = () =>
    signInWithPopup(auth, new FacebookAuthProvider())

  const resetPassword = (email) =>
    sendPasswordResetEmail(auth, email)

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('Not signed in')
    if (auth.currentUser.emailVerified) throw new Error('Email already verified')

    const lastSent = localStorage.getItem('smartdcabiao:last_verification_send')
    if (lastSent) {
      const elapsed = Date.now() - parseInt(lastSent, 10)
      if (elapsed < 60000) {
        const remaining = Math.ceil((60000 - elapsed) / 1000)
        throw new Error(`Please wait ${remaining}s before resending`)
      }
    }

    try {
      await sendEmailVerification(auth.currentUser)
      localStorage.setItem('smartdcabiao:last_verification_send', Date.now().toString())
      console.log('[resendVerificationEmail] Sent successfully')
    } catch (error) {
      console.error('[resendVerificationEmail] Failed:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload()
      setUser({ ...auth.currentUser })
    }
  }

  const needsSignupWizard = async (u) => {
    if (!u) return false

    const oauth = u.providerData?.some(
      p => p.providerId === 'google.com' || p.providerId === 'facebook.com'
    )
    if (oauth) {
      const profile = await getUserProfile(u.uid)
      return !profile?.interestsSetAt
    }

    if (!u.emailVerified) return true

    const profile = await getUserProfile(u.uid)
    return !profile?.interestsSetAt
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && auth.currentUser && !auth.currentUser.emailVerified) {
        auth.currentUser.reload().then(() => {
          setUser({ ...auth.currentUser })
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const value = {
    user,
    userProfile,
    loading,
    login,
    signUp,
    logout,
    signInWithGoogle,
    signInWithFacebook,
    resetPassword,
    resendVerificationEmail,
    refreshUser,
    needsSignupWizard,
    isAuthenticated: !!user,
    emailVerified: user?.emailVerified ?? false,
    isOAuth,
    grandfatheredUnverified,
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