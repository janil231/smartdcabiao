import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginModal({ isOpen, onClose }) {
  const { login, signUp, signInWithGoogle, signInWithFacebook, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const reset = () => {
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await signUp(email, password)
      }
      handleClose()
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      handleClose()
    } catch (err) {
      setError(err.message ?? 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFacebook = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithFacebook()
      handleClose()
    } catch (err) {
      setError(err.message ?? 'Facebook sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSuccess('Password reset email sent! Check your inbox.')
    } catch (err) {
      setError(err.message ?? 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const renderLoginForm = () => (
    <>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {mode === 'signup' && (
            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={handleFacebook}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continue with Facebook
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-gray-600">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </button>
      </p>

      {mode === 'login' && (
        <p className="mt-2 text-center text-sm">
          <button
            type="button"
            onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Forgot Password?
          </button>
        </p>
      )}
    </>
  )

  const renderForgotForm = () => (
    <form onSubmit={handleForgotPassword} className="mt-4 space-y-4">
      <p className="text-sm text-gray-600">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      <div>
        <label htmlFor="auth-email-forgot" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="auth-email-forgot"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
      <p className="mt-4 text-center text-sm text-gray-600">
        <button
          type="button"
          onClick={() => { setMode('login'); setError(''); setSuccess('') }}
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          Back to Login
        </button>
      </p>
    </form>
  )

  const modal = (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 id="login-modal-title" className="text-xl font-semibold text-gray-900">
            {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Reset Password'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="alert">
            {success}
          </p>
        )}

        {mode === 'forgot' ? renderForgotForm() : renderLoginForm()}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
