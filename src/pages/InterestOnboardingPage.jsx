import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, updateUserInterests, markInterestsSkipped } from '../services/users.service'
import { INTEREST_TAGS } from '../constants/interests'

export default function InterestOnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const isOAuth = location.state?.isOAuth

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
      return
    }
    const isOAuthUser = user.providerData?.some(
      p => p.providerId === 'google.com' || p.providerId === 'facebook.com'
    )
    if (!isOAuthUser && !user.emailVerified) {
      navigate('/', { replace: true })
      return
    }
    getUserProfile(user.uid).then(p => {
      if (p?.interestsSetAt) {
        navigate('/', { replace: true })
      }
    }).catch(() => {})
  }, [user, navigate])

  useEffect(() => {
    if (isOAuth) {
      setToast('Welcome to SMARTDCABIAO! 🎉')
      window.history.replaceState({}, document.title)
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [isOAuth])

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateUserInterests(user.uid, selected)
      const isOAuth = user.providerData?.some(
        p => p.providerId === 'google.com' || p.providerId === 'facebook.com'
      )
      navigate('/', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (!user) return
    setSaving(true)
    try {
      await markInterestsSkipped(user.uid)
      navigate('/', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg bg-emerald-600 text-white text-sm font-medium">
          {toast}
        </div>
      )}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to SMARTDCABIAO!</h1>
          <p className="text-gray-500 mt-2">Let&apos;s personalize your experience</p>
        </div>

        <p className="text-sm text-gray-500 mb-4 text-center">
          Pick at least 3 for better recommendations
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {INTEREST_TAGS.map(tag => {
            const isSelected = selected.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition min-h-[80px] ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <span className="text-2xl">{tag.icon}</span>
                <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-emerald-800' : 'text-gray-700'}`}>
                  {tag.label}
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-sm text-gray-500 mb-6 text-center">
          {selected.length} selected
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
