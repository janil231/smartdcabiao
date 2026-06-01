import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { submitDestinationSuggestion } from '../services/submissions.service'
import { CABIAO_BARANGAYS } from '../constants/cabiaoBarangays'
import { CABIAO_CENTER, CABIAO_BOUNDS, isWithinCabiaoBounds } from '../constants/cabiaoGeo'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const MAX_PHOTOS = 5
const MIN_DESC_LENGTH = 30

const DESTINATION_CATEGORIES = [
  { value: 'nature', label: 'Nature & Scenic Spots', emoji: '🌿' },
  { value: 'historical', label: 'Historical & Cultural', emoji: '🏛️' },
  { value: 'religious', label: 'Religious & Spiritual', emoji: '⛪' },
  { value: 'food_dining', label: 'Food & Dining Spots', emoji: '🍽️' },
  { value: 'entertainment', label: 'Entertainment & Recreation', emoji: '🎯' },
  { value: 'shopping', label: 'Shopping & Pasalubong', emoji: '🛍️' },
  { value: 'accommodation', label: 'Accommodation & Staycations', emoji: '🏨' },
  { value: 'farm', label: 'Farm & Agri-Tourism', emoji: '🌾' },
  { value: 'river', label: 'River & Waterways', emoji: '⛵' },
  { value: 'park', label: 'Parks & Public Spaces', emoji: '🌳' },
  { value: 'festival', label: 'Festivals & Events', emoji: '🎪' },
  { value: 'other', label: 'Other Destination', emoji: '📍' },
]

const ENTRANCE_FEE_OPTIONS = [
  { value: 'free', label: 'Free Entry', emoji: '🆓' },
  { value: 'paid', label: 'Paid Entry', emoji: '🎫' },
  { value: 'donation', label: 'Donation-Based', emoji: '❤️' },
]

const STEPS = [
  { id: 1, key: 'info', labelKey: 'sectionInfo', icon: 'ℹ️' },
  { id: 2, key: 'location', labelKey: 'sectionLocation', icon: '📍' },
  { id: 3, key: 'photos', labelKey: 'sectionPhotos', icon: '📸' },
  { id: 4, key: 'review', labelKey: 'sectionReview', icon: '📋' },
]

const validatePhoto = (file) => {
  const MAX_SIZE = 3 * 1024 * 1024
  const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!ALLOWED.includes(file.type)) {
    return 'Only JPG, PNG, or WebP images are allowed.'
  }
  if (file.size > MAX_SIZE) {
    return `Photo is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 3MB per photo.`
  }
  return null
}

const newPhotoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

function Toast({ message, type, onClose }) {
  if (!message) return null
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] px-4 w-full max-w-md">
      <div
        className={`rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${
          type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span>{message}</span>
          <button type="button" onClick={onClose} className="opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

function MapClickHandler({ onLocationSelect, onOutOfBounds }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (isWithinCabiaoBounds(lat, lng)) {
        onLocationSelect({ lat, lng })
      } else {
        onOutOfBounds?.()
      }
    },
  })
  return null
}

function DraggablePin({ position, onMove, onOutOfBounds }) {
  const markerRef = useRef(null)
  if (!position) return null
  return (
    <Marker
      draggable
      position={[position.lat, position.lng]}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current
          if (!m) return
          const { lat, lng } = m.getLatLng()
          if (isWithinCabiaoBounds(lat, lng)) {
            onMove({ lat, lng })
          } else {
            onOutOfBounds?.()
            m.setLatLng([position.lat, position.lng])
          }
        },
      }}
    />
  )
}

function MapRecenterControl({ onRecenter }) {
  const map = useMap()
  return (
    <button
      type="button"
      onClick={() => {
        map.setView(CABIAO_CENTER, 14)
        onRecenter?.()
      }}
      className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 min-h-[44px]"
      title="Recenter"
    >
      ↻
    </button>
  )
}

function HelperText({ children }) {
  return (
    <p className="text-xs text-gray-500 mt-1 mb-2 flex items-start gap-1">
      <span className="shrink-0" aria-hidden>ⓘ</span>
      <span>{children}</span>
    </p>
  )
}

function ValidCheck({ show }) {
  if (!show) return null
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-sm" aria-hidden>
      ✓
    </span>
  )
}

const initialFormData = {
  name: '',
  category: '',
  tagline: '',
  description: '',
  bestTime: '',
  activities: '',
  entranceFee: 'free',
  barangay: '',
  landmark: '',
}

export default function SuggestDestinationPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const fieldRefs = useRef({})
  const dragPhotoId = useRef(null)

  const [formData, setFormData] = useState(initialFormData)
  const [location, setLocation] = useState(null)
  const [photos, setPhotos] = useState([])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState(() => new Set())
  const [stepFadeIn, setStepFadeIn] = useState(true)

  const sd = (key, params) => t(`suggestDestination.${key}`, params)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true, state: { openLogin: true, redirectTo: '/suggest-destination' } })
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user?.displayName && !formData.ownerName) {
      setFormData((prev) => ({ ...prev, ownerName: user.displayName }))
    }
  }, [user])

  useEffect(() => {
    const hasProgress =
      formData.name ||
      formData.description ||
      location?.lat ||
      photos.length > 0

    if (!hasProgress || success) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData, location, photos, success])

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: 'success' }), 5000)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const setPin = useCallback((coords) => {
    if (isWithinCabiaoBounds(coords.lat, coords.lng)) {
      setLocation(coords)
      if (errors.location) setErrors((prev) => ({ ...prev, location: '' }))
    } else {
      showToast(sd('pinOutsideCabiao'))
    }
  }, [errors.location])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (isWithinCabiaoBounds(lat, lng)) {
          setPin({ lat, lng })
        } else {
          showToast(sd('pinOutsideCabiao'))
        }
      },
      () => showToast('Could not get your location. Please pin manually on the map.')
    )
  }

  const addPhotosFromFiles = (fileList) => {
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      showToast(sd('maxPhotosReached'))
      return
    }
    const files = Array.from(fileList).slice(0, remaining)
    const newEntries = []
    for (const file of files) {
      const err = validatePhoto(file)
      if (err) {
        showToast(err)
        continue
      }
      newEntries.push({
        id: newPhotoId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'ready',
        cloudinaryUrl: null,
        error: null,
      })
    }
    if (newEntries.length) {
      setPhotos((prev) => [...prev, ...newEntries].slice(0, MAX_PHOTOS))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const setAsCover = (id) => {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      next.unshift(item)
      return next
    })
  }

  const reorderPhotos = (fromId, toIndex) => {
    setPhotos((prev) => {
      const fromIndex = prev.findIndex((p) => p.id === fromId)
      if (fromIndex < 0 || fromIndex === toIndex) return prev
      const next = [...prev]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      return next
    })
  }

  const scrollToFirstError = (stepErrors) => {
    const firstErrorField = Object.keys(stepErrors)[0]
    if (!firstErrorField) return
    const named = document.querySelector(`[name="${firstErrorField}"]`)
    if (named) {
      named.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (fieldRefs.current[firstErrorField]) {
      fieldRefs.current[firstErrorField].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const validateStep = (step) => {
    const stepErrors = {}

    if (step === 1) {
      if (!formData.name.trim()) {
        stepErrors.name = sd('nameRequired')
      } else if (formData.name.trim().length > 100) {
        stepErrors.name = sd('nameTooLong')
      }
      if (!formData.category) stepErrors.category = sd('categoryRequired')
      if (!formData.description.trim()) {
        stepErrors.description = sd('descriptionRequired')
      } else if (formData.description.trim().length < MIN_DESC_LENGTH) {
        stepErrors.description = sd('descriptionTooShort')
      } else if (formData.description.trim().length > 1000) {
        stepErrors.description = sd('descriptionTooLong')
      }
    }

    if (step === 2) {
      if (!formData.barangay) stepErrors.barangay = sd('barangayRequired')
      if (!location?.lat || !location?.lng) {
        stepErrors.location = sd('locationRequired')
      } else if (!isWithinCabiaoBounds(location.lat, location.lng)) {
        stepErrors.location = sd('pinOutsideCabiao')
      }
    }

    if (step === 3) {
      if (photos.length < 1) {
        stepErrors.photos = sd('photosRequired')
      }
    }

    return stepErrors
  }

  const goToStep = (targetStep) => {
    setStepFadeIn(false)
    setTimeout(() => {
      setCurrentStep(targetStep)
      setStepFadeIn(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const handleNext = () => {
    const stepErrors = validateStep(currentStep)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      scrollToFirstError(stepErrors)
      return
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep]))
    setErrors({})
    goToStep(Math.min(currentStep + 1, STEPS.length))
  }

  const handleBack = () => {
    setErrors({})
    goToStep(Math.max(currentStep - 1, 1))
  }

  const handleStepClick = (targetStep) => {
    if (targetStep === currentStep) return
    const isClickable = targetStep < currentStep || completedSteps.has(targetStep)
    if (!isClickable) return
    setErrors({})
    goToStep(targetStep)
  }

  const resetForm = () => {
    photos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
    })
    setFormData({ ...initialFormData })
    setLocation(null)
    setPhotos([])
    setErrors({})
    setSuccess(null)
    setCurrentStep(1)
    setCompletedSteps(new Set())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validateAll = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = sd('nameRequired')
    else if (formData.name.trim().length > 100) newErrors.name = sd('nameTooLong')
    if (!formData.category) newErrors.category = sd('categoryRequired')
    if (!formData.description.trim()) newErrors.description = sd('descriptionRequired')
    else if (formData.description.trim().length < MIN_DESC_LENGTH) newErrors.description = sd('descriptionTooShort')
    else if (formData.description.trim().length > 1000) newErrors.description = sd('descriptionTooLong')
    if (!formData.barangay) newErrors.barangay = sd('barangayRequired')
    if (!location) newErrors.location = sd('locationRequired')
    else if (!isWithinCabiaoBounds(location.lat, location.lng)) newErrors.location = sd('pinOutsideCabiao')
    if (photos.length < 1) newErrors.photos = sd('photosRequired')

    setErrors(newErrors)
    const firstErrorKey = Object.keys(newErrors)[0]
    if (firstErrorKey && fieldRefs.current[firstErrorKey]) {
      fieldRefs.current[firstErrorKey].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return Object.keys(newErrors).length === 0
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (currentStep !== STEPS.length) return
    handleSubmit(e)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const stepErrors = validateStep(4)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      scrollToFirstError(stepErrors)
      return
    }
    if (!validateAll()) return

    setIsSubmitting(true)
    setPhotos((prev) => prev.map((p) => ({ ...p, status: p.file ? 'uploading' : p.status })))

    try {
      const photoFiles = photos.filter((p) => p.file).map((p) => p.file)
      const submissionId = await submitDestinationSuggestion(
        user.uid,
        user,
        formData,
        location,
        photoFiles
      )
      setSuccess({
        destinationName: formData.name,
        submissionId,
      })
    } catch (err) {
      setPhotos((prev) =>
        prev.map((p) => (p.file ? { ...p, status: 'error', error: err.message } : p))
      )
      showToast(err.message || t('errors.generic'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-12 sm:py-16">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center">
            <div className="text-5xl mb-2">✅</div>
            <div className="text-4xl mb-6">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{sd('submissionSuccess')}</h1>
            <p className="text-gray-600 mb-8">
              {sd('submissionSuccessMessage', { name: success.destinationName })}
            </p>
            <div className="text-left rounded-xl bg-emerald-50 border border-emerald-100 p-5 mb-8">
              <p className="font-semibold text-gray-900 mb-3">📋 {sd('whatHappensNext')}</p>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>{sd('nextStep1')}</li>
                <li>{sd('nextStep2')}</li>
                <li>{sd('nextStep3')}</li>
              </ol>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/profile"
                className="flex-1 inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
              >
                {sd('viewMyProfile')}
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 inline-flex items-center justify-center min-h-[44px] px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                {sd('submitAnother')}
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const inputClass = (field) =>
    `w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
      errors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-100'
    }`

  const photoSlots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] || null)
  const photoUploading = photos.some((p) => p.status === 'uploading')
  const canSubmit = !isSubmitting && !photoUploading && currentStep === STEPS.length
  const currentStepMeta = STEPS[currentStep - 1]

  const getCategoryEmoji = (value) => DESTINATION_CATEGORIES.find((c) => c.value === value)?.emoji || '📍'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <header className="bg-gradient-to-br from-emerald-50 to-white border-b border-emerald-100/80">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <Link
            to="/destinations"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
          >
            ← {sd('backToDestinations')}
          </Link>
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>🌴</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{sd('title')}</h1>
              <p className="mt-2 text-gray-600 text-sm sm:text-base">{sd('subtitle')}</p>
              <p className="mt-4 text-xs sm:text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>⏱ {sd('takes3to5Min')}</span>
                <span>📋 {sd('reviewedWithin3Days')}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 pb-44 sm:pb-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8 sticky top-16 z-30 bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-gray-200">
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.has(step.id)
            const isCurrent = currentStep === step.id
            const isClickable = step.id < currentStep || isCompleted

            return (
              <Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable && !isCurrent}
                  className={`flex flex-col items-center gap-1 transition-all flex-1 min-w-0 ${
                    isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-9 h-10 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : isCompleted
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted && !isCurrent ? '✓' : step.id}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium text-center leading-tight hidden sm:block truncate w-full px-0.5 ${
                      isCurrent
                        ? 'text-emerald-700'
                        : isCompleted
                          ? 'text-emerald-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {sd(step.labelKey)}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block flex-1 h-0.5 mx-1 min-w-[8px] transition-all ${
                      completedSteps.has(step.id) ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </Fragment>
            )
          })}
        </div>

        <p className="text-sm text-gray-500 text-center mb-4 sm:hidden">
          {sd('stepOf')} {currentStep} {sd('of')} {STEPS.length} · {sd(currentStepMeta.labelKey)}
        </p>

        <form
          onSubmit={handleFormSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              if (currentStep !== STEPS.length) {
                e.preventDefault()
              }
            }
          }}
          className="space-y-6"
        >
          <div
            className={`transition-opacity duration-200 ${stepFadeIn ? 'opacity-100' : 'opacity-0'}`}
          >
          {currentStep === 1 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">① ℹ️ {sd('sectionInfo')}</h2>
            <p className="text-sm text-gray-500 mb-6">{sd('sectionInfoDesc')}</p>

            <div className="space-y-5" ref={(el) => { fieldRefs.current.name = el }}>
              <div>
                <label className="text-sm font-semibold text-gray-800">
                  {sd('destinationName')} *
                </label>
                <HelperText>{sd('helperName')}</HelperText>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    maxLength={100}
                    className={inputClass('name')}
                    placeholder="e.g. Cabiao Eco-Park"
                  />
                  <ValidCheck show={formData.name.trim().length > 0 && formData.name.trim().length <= 100} />
                </div>
                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.category = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {sd('category')} *
                </label>
                <HelperText>{sd('helperCategory')}</HelperText>
                <select name="category" value={formData.category} onChange={handleChange} className={inputClass('category')}>
                  <option value="">{sd('selectCategory')}</option>
                  {DESTINATION_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.tagline = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {sd('tagline')}
                </label>
                <HelperText>{sd('helperTagline')}</HelperText>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  maxLength={200}
                  className={inputClass('tagline')}
                  placeholder="e.g. Where nature meets adventure"
                />
              </div>

              <div ref={(el) => { fieldRefs.current.description = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {sd('description')} *
                </label>
                <HelperText>{sd('helperDescription')}</HelperText>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={1000}
                  className={inputClass('description')}
                  placeholder={sd('descriptionPlaceholder')}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {formData.description.length} / 1000 {sd('characters')} · {sd('minimum')} {MIN_DESC_LENGTH}
                </p>
                {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.bestTime = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {sd('bestTime')}
                </label>
                <HelperText>{sd('helperBestTime')}</HelperText>
                <input
                  type="text"
                  name="bestTime"
                  value={formData.bestTime}
                  onChange={handleChange}
                  maxLength={200}
                  className={inputClass('bestTime')}
                  placeholder="e.g. Early mornings or dry season (Nov–Apr)"
                />
              </div>

              <div ref={(el) => { fieldRefs.current.activities = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {sd('activities')}
                </label>
                <HelperText>{sd('helperActivities')}</HelperText>
                <input
                  type="text"
                  name="activities"
                  value={formData.activities}
                  onChange={handleChange}
                  maxLength={300}
                  className={inputClass('activities')}
                  placeholder="e.g. Swimming, hiking, picnic, bird watching"
                />
              </div>

              <div ref={(el) => { fieldRefs.current.entranceFee = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {sd('entranceFee')}
                </label>
                <HelperText>{sd('helperEntranceFee')}</HelperText>
                <div className="grid grid-cols-3 gap-2">
                  {ENTRANCE_FEE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      name="entranceFee"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, entranceFee: opt.value }))
                        if (errors.entranceFee) setErrors((prev) => ({ ...prev, entranceFee: '' }))
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px] ${
                        formData.entranceFee === opt.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
          )}

          {currentStep === 2 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">② 📍 {sd('sectionLocation')}</h2>
            <HelperText>{sd('helperLocation')}</HelperText>

            <div ref={(el) => { fieldRefs.current.barangay = el }} className="mb-5">
              <label className="text-sm font-semibold text-gray-800">
                {sd('barangay')} *
              </label>
              <HelperText>{sd('helperBarangay')}</HelperText>
              <select name="barangay" value={formData.barangay} onChange={handleChange} className={inputClass('barangay')}>
                <option value="">{sd('selectBarangay')}</option>
                {CABIAO_BARANGAYS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {errors.barangay && <p className="text-red-600 text-xs mt-1">{errors.barangay}</p>}
            </div>

            <div ref={(el) => { fieldRefs.current.landmark = el }} className="mb-5">
              <label className="text-sm font-semibold text-gray-800">
                {sd('landmark')}
              </label>
              <HelperText>{sd('helperLandmark')}</HelperText>
              <input
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                maxLength={200}
                className={inputClass('landmark')}
                placeholder="e.g. Near the municipal hall"
              />
            </div>

            <div
              ref={(el) => { fieldRefs.current.location = el }}
              className="relative h-[300px] sm:h-[400px] rounded-xl overflow-hidden border border-gray-200"
            >
              <MapContainer
                center={location ? [location.lat, location.lng] : CABIAO_CENTER}
                zoom={14}
                maxBounds={[CABIAO_BOUNDS.southWest, CABIAO_BOUNDS.northEast]}
                maxBoundsViscosity={1.0}
                className="h-full w-full z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onLocationSelect={setPin} onOutOfBounds={() => showToast(sd('pinOutsideCabiao'))} />
                <DraggablePin
                  position={location}
                  onMove={setPin}
                  onOutOfBounds={() => showToast(sd('pinOutsideCabiao'))}
                />
                <MapRecenterControl />
              </MapContainer>
              <button
                type="button"
                onClick={useMyLocation}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-lg px-4 py-2.5 text-sm font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 min-h-[44px] whitespace-nowrap"
              >
                📍 {sd('useMyLocation')}
              </button>
            </div>

            {location && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  {sd('pinnedAt')}:{' '}
                  <span className="font-mono text-gray-800">
                    📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                </p>
                <p className="text-sm text-emerald-700 font-medium">✓ {sd('locationPinnedSuccess')}</p>
              </div>
            )}
            {errors.location && <p className="text-red-600 text-xs mt-2">{errors.location}</p>}
          </section>
          )}

          {currentStep === 3 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">③ 📸 {sd('sectionPhotos')}</h2>
            <HelperText>{sd('helperPhotos')}</HelperText>
            <p className="text-xs text-gray-500 mb-4">{sd('maxPhotosHint')}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => addPhotosFromFiles(e.target.files)}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {photoSlots.map((photo, index) =>
                photo ? (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={() => { dragPhotoId.current = photo.id }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragPhotoId.current) {
                        reorderPhotos(dragPhotoId.current, index)
                        dragPhotoId.current = null
                      }
                    }}
                    className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 group"
                  >
                    <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded">
                        {sd('cover')}
                      </span>
                    )}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => setAsCover(photo.id)}
                        className="absolute top-1 left-1 w-8 h-8 rounded-full bg-white/90 shadow text-sm hover:bg-white"
                        title={sd('setAsCover')}
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-1 right-1 w-8 h-8 rounded-full bg-white shadow text-gray-600 hover:text-red-600 text-sm"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                    {(photo.status === 'uploading' || isSubmitting) && photo.file && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      </div>
                    )}
                    {photo.status === 'error' && (
                      <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center p-2">
                        <span className="text-white text-lg">⚠️</span>
                        <button
                          type="button"
                          className="mt-1 text-xs text-white underline"
                          onClick={() =>
                            setPhotos((prev) =>
                              prev.map((p) => (p.id === photo.id ? { ...p, status: 'ready', error: null } : p))
                            )
                          }
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    key={`empty-${index}`}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= MAX_PHOTOS}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    <span className="text-2xl">➕</span>
                    <span className="text-xs font-medium">{sd('addPhoto')}</span>
                  </button>
                )
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {photos.length} {sd('of')} {MAX_PHOTOS} {sd('photosLabel')}
              {photos.length > 1 && ` · ${sd('dragToReorder')}`}
            </p>
            {errors.photos && <p className="text-red-600 text-xs mt-2">{errors.photos}</p>}
          </section>
          )}

          {currentStep === 4 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">④ 📋 {sd('sectionReview')}</h2>
            <p className="text-sm text-gray-500 mb-6">{sd('sectionReviewDesc')}</p>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{formData.name || '—'}</h3>
                    {formData.tagline && (
                      <p className="text-sm text-gray-500 mt-0.5">{formData.tagline}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.category && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          {getCategoryEmoji(formData.category)} {DESTINATION_CATEGORIES.find(c => c.value === formData.category)?.label}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {ENTRANCE_FEE_OPTIONS.find(f => f.value === formData.entranceFee)?.emoji} {ENTRANCE_FEE_OPTIONS.find(f => f.value === formData.entranceFee)?.label}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { goToStep(1); setErrors({}) }}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 shrink-0"
                  >
                    {sd('edit')}
                  </button>
                </div>
              </div>

              {formData.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{sd('description')}</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{formData.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { goToStep(1); setErrors({}) }}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 shrink-0 ml-4"
                    >
                      {sd('edit')}
                    </button>
                  </div>
                </div>
              )}

              {(formData.bestTime || formData.activities) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      {formData.bestTime && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{sd('bestTime')}</p>
                          <p className="text-sm text-gray-800">{formData.bestTime}</p>
                        </div>
                      )}
                      {formData.activities && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{sd('activities')}</p>
                          <p className="text-sm text-gray-800">{formData.activities}</p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { goToStep(1); setErrors({}) }}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 shrink-0 ml-4"
                    >
                      {sd('edit')}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{sd('location')}</p>
                    <p className="text-sm text-gray-800">
                      {formData.barangay && `${formData.barangay}`}{formData.landmark && ` · ${formData.landmark}`}
                    </p>
                    {location && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { goToStep(2); setErrors({}) }}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 shrink-0"
                  >
                    {sd('edit')}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{sd('photos')}</p>
                    {photos.length > 0 ? (
                      <div className="flex gap-2 mt-2">
                        {photos.slice(0, 5).map((photo, i) => (
                          <div key={photo.id} className="relative">
                            <img
                              src={photo.previewUrl}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                            />
                            {i === 0 && (
                              <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{sd('noPhotosYet')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { goToStep(3); setErrors({}) }}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 shrink-0"
                  >
                    {sd('edit')}
                  </button>
                </div>
              </div>
            </div>
          </section>
          )}
          </div>

          {currentStep === STEPS.length && (
            <p className="text-xs text-gray-500 text-center mt-6">{sd('submitAgreement')}</p>
          )}

          <div
            className="
              fixed bottom-16 inset-x-0 z-30
              bg-white border-t border-gray-200 px-4 py-3
              shadow-[0_-4px_12px_rgba(0,0,0,0.08)]
              pb-[calc(0.75rem+env(safe-area-inset-bottom))]
              sm:relative sm:bottom-auto sm:inset-x-auto sm:z-auto
              sm:bg-transparent sm:border-0 sm:shadow-none sm:px-0 sm:py-0
              sm:mt-8 sm:pt-6 sm:border-t sm:border-gray-200 sm:pb-0
            "
          >
            <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>←</span> {sd('back')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/destinations')}
                  className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition flex items-center justify-center"
                >
                  {sd('cancel')}
                </button>
              )}

              <span className="hidden sm:block text-sm text-gray-500">
                {sd('stepOf')} {currentStep} {sd('of')} {STEPS.length}
              </span>

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition flex items-center justify-center gap-2"
                >
                  {sd('next')} <span>→</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      {sd('submitting')}
                    </>
                  ) : (
                    <>📤 {sd('submitForReview')}</>
                  )}
                </button>
              )}
            </div>
            <p className="text-center text-xs text-gray-400 mt-1.5 sm:hidden max-w-3xl mx-auto">
              {sd('stepOf')} {currentStep} {sd('of')} {STEPS.length} · {sd(currentStepMeta.labelKey)}
            </p>
          </div>
        </form>
      </main>

      <div className="hidden sm:block">
        <Footer />
      </div>
    </div>
  )
}
