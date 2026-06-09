import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const RESEND_COOLDOWN_KEY = 'smartdcabiao:verifyResendAt'

function getCooldownSeconds() {
  try {
    const stored = localStorage.getItem(RESEND_COOLDOWN_KEY)
    if (!stored) return 0
    const elapsed = (Date.now() - parseInt(stored, 10)) / 1000
    return Math.max(0, 60 - Math.floor(elapsed))
  } catch {
    return 0
  }
}

export default function EmailVerificationBanner() {
  const { user, emailVerified, resendVerificationEmail, refreshUser } = useAuth()
  const [cooldown, setCooldown] = useState(getCooldownSeconds)
  const [resending, setResending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState(null)

  const isOAuth = user?.providerData?.some(
    p => p.providerId === 'google.com' || p.providerId === 'facebook.com'
  )

  if (!user || emailVerified || isOAuth) return null

  const handleResend = async () => {
    setResending(true)
    setMessage(null)
    try {
      await resendVerificationEmail()
      localStorage.setItem(RESEND_COOLDOWN_KEY, String(Date.now()))
      setCooldown(60)
      setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' })

      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send. Try again in a moment.' })
    } finally {
      setResending(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage(null)
    try {
      await refreshUser()
      setMessage({ type: 'success', text: 'Email verified! 🎉' })
    } catch {
      setMessage({ type: 'error', text: 'Not verified yet. Click the link in your email first.' })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="border-l-4 border-amber-500 bg-amber-50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900">
            ⚠️ Please verify your email to unlock all features
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Check your inbox for a verification link.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {refreshing ? 'Checking...' : "I've Verified — Refresh"}
          </button>
        </div>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
