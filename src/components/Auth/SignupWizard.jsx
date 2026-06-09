import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { INTEREST_TAGS } from '../../constants/interests'
import { updateUserInterests, markInterestsSkipped } from '../../services/users.service'
import { showToast } from '../../utils/toast'

const STEPS = { ACCOUNT: 1, VERIFY: 2, INTERESTS: 3 }

export default function SignupWizard({ onComplete, onSwitchToLogin, onStepChange }) {
  const { user, emailVerified, signUp, signInWithGoogle, resendVerificationEmail, refreshUser, logout } = useAuth()

  const isOAuthUser = user?.providerData?.some(
    p => p.providerId === 'google.com' || p.providerId === 'facebook.com'
  )

  const [step, setStep] = useState(() => {
    if (isOAuthUser) return STEPS.INTERESTS
    const saved = localStorage.getItem('smartdcabiao:signup_wizard_step')
    return saved ? parseInt(saved, 10) : STEPS.ACCOUNT
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSendError, setEmailSendError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [selectedInterests, setSelectedInterests] = useState([])

  useEffect(() => {
    localStorage.setItem('smartdcabiao:signup_wizard_step', String(step))
    onStepChange?.(step)
  }, [step, onStepChange])

  useEffect(() => {
    if (step === STEPS.VERIFY && emailVerified) {
      setStep(STEPS.INTERESTS)
    }
  }, [step, emailVerified])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  useEffect(() => {
    console.log('[SignupWizard] step changed:', step)
  }, [step])

  useEffect(() => {
    console.log('[SignupWizard] user changed:', user?.uid, 'emailVerified:', emailVerified)
  }, [user, emailVerified])

  useEffect(() => {
    if (step !== STEPS.VERIFY) return
    const handler = () => {
      if (!document.hidden) refreshUser()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [step, refreshUser])

  async function handleCreateAccount(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    localStorage.removeItem('smartdcabiao:signup_wizard_step')

    try {
      const result = await signUp(email, password)
      if (result._verificationEmailError) {
        setEmailSendError(result._verificationEmailError)
        showToast('⚠️ Email could not be sent', 'warning')
      } else {
        showToast('📧 Verification email sent!', 'success')
      }
      setStep(STEPS.VERIFY)
      localStorage.setItem('smartdcabiao:signup_wizard_step', String(STEPS.VERIFY))
      setResendCooldown(60)
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setError('')
    setLoading(true)
    try {
      await refreshUser()
      if (!emailVerified) {
        setError('Not verified yet. Please click the link in your email first.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setEmailSendError('')
    try {
      await resendVerificationEmail()
      showToast('📧 Email resent!', 'success')
      setResendCooldown(60)
    } catch (err) {
      setEmailSendError(err.message)
      showToast(err.message, 'error')
    }
  }

  async function handleUseDifferentEmail() {
    await logout()
    localStorage.removeItem('smartdcabiao:signup_wizard_step')
    setStep(STEPS.ACCOUNT)
    setEmail('')
    setPassword('')
    setError('')
    setEmailSendError('')
  }

  async function handleSaveInterests() {
    setLoading(true)
    try {
      await updateUserInterests(user.uid, selectedInterests)
      complete()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSkipInterests() {
    setLoading(true)
    try {
      await markInterestsSkipped(user.uid)
      complete()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function complete() {
    localStorage.removeItem('smartdcabiao:signup_wizard_step')
    onComplete?.()
  }

  async function handleGoogleSignup() {
    setLoading(true)
    try {
      await signInWithGoogle()
      setStep(STEPS.INTERESTS)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === STEPS.ACCOUNT) {
    return (
      <div data-wizard-instance>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Create Your Account</h2>
        <p className="text-sm text-gray-500 mb-6">Step 1 of 3</p>

        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label htmlFor="wizard-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="wizard-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="wizard-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="wizard-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-3 min-h-[44px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Continue →'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Log in
          </button>
        </p>
      </div>
    )
  }

  if (step === STEPS.VERIFY) {
    return (
      <div data-wizard-instance>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Check Your Email</h2>
        <p className="text-sm text-gray-500 mb-6">Step 2 of 3</p>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 mb-4">
          <div className="text-4xl text-center mb-2">📧</div>
          <p className="text-center text-gray-700">
            Verification link sent to<br />
            <strong className="text-emerald-700">{user?.email}</strong>
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-800">
          <strong>📩 Didn't see the email?</strong>
          <p className="mt-1 text-amber-700">
            Check your spam folder and mark us as "Not spam" to ensure you receive future emails.
          </p>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Click the link in the email to verify your account, then come back and click
          <strong> "I've Verified — Continue"</strong> below to proceed.
        </p>

        {emailSendError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4" role="alert">
            <strong>Email send failed:</strong> {emailSendError}
            <br />
            <span className="text-xs">Try resending or use a different email.</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 mb-4" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-3 min-h-[44px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 mb-2"
        >
          {loading ? 'Checking...' : "I've Verified — Continue"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="w-full rounded-lg border border-gray-300 bg-white py-3 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 mb-4"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
        </button>

        <button
          type="button"
          onClick={handleUseDifferentEmail}
          className="w-full text-sm text-gray-500 hover:text-gray-700 underline text-center"
        >
          ← Use a different email
        </button>
      </div>
    )
  }

  if (step === STEPS.INTERESTS) {
    return (
      <div data-wizard-instance>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Pick Your Interests</h2>
        <p className="text-sm text-gray-500 mb-6">Step 3 of 3 — Pick 3+ for better recommendations</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {INTEREST_TAGS.map(tag => {
            const selected = selectedInterests.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedInterests(prev =>
                  selected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                )}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition min-h-[80px] ${
                  selected
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <span className="text-2xl">{tag.icon}</span>
                <span className={`text-xs font-medium leading-tight ${selected ? 'text-emerald-800' : 'text-gray-700'}`}>
                  {tag.label}
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-sm text-gray-500 mb-4">{selectedInterests.length} selected</p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4" role="alert">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSkipInterests}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSaveInterests}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
