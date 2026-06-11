import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import EmailVerificationBanner from '../components/EmailVerificationBanner'
import { useLanguage } from '../contexts/LanguageContext'
import { submitBusinessRegistration } from '../services/submissions.service'
import { CABIAO_BARANGAYS, BUSINESS_CATEGORIES } from '../constants/cabiaoBarangays'
import { CABIAO_CENTER, CABIAO_BOUNDS, isWithinCabiaoBounds } from '../constants/cabiaoGeo'
import { validatePhone, validateURL } from '../utils/sanitization'
import { requireEmailVerified } from '../utils/requireEmailVerified'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const MAX_PHOTOS = 5
const CATEGORY_EMOJI = {
  food_dining: '🍽️',
  retail_shopping: '🛍️',
  accommodation: '🏨',
  tourism_recreation: '🌴',
  services: '🔧',
  agriculture: '🌾',
  other: '📦',
}

const STEPS = [
  { id: 1, key: 'info', labelKey: 'sectionBusinessInfo', icon: '🏪' },
  { id: 2, key: 'location', labelKey: 'sectionLocation', icon: '📍' },
  { id: 3, key: 'media', labelKey: 'sectionPhotosContact', icon: '📸' },
  { id: 4, key: 'owner', labelKey: 'sectionOwner', icon: '👤' },
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
      <span className="shrink-0" aria-hidden>
        ⓘ
      </span>
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
  businessName: '',
  category: '',
  description: '',
  barangay: '',
  address: '',
  contactNumber: '',
  facebook: '',
  website: '',
  isOwner: false,
  ownerName: '',
  ownerContact: '',
}

export default function RegisterBusinessPage() {
  const { user, loading: authLoading, isOAuth, grandfatheredUnverified } = useAuth()
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

  const rb = (key) => t(`registerBusiness.${key}`)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true, state: { openLogin: true, redirectTo: '/register-business' } })
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user?.displayName && !formData.ownerName) {
      setFormData((prev) => ({ ...prev, ownerName: user.displayName }))
    }
    if (user?.email && !formData.ownerContact) {
      setFormData((prev) => ({ ...prev, ownerContact: user.email }))
    }
  }, [user])

  useEffect(() => {
    const hasProgress =
      formData.businessName ||
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
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const setPin = useCallback((coords) => {
    if (isWithinCabiaoBounds(coords.lat, coords.lng)) {
      setLocation(coords)
      if (errors.location) setErrors((prev) => ({ ...prev, location: '' }))
    } else {
      showToast(rb('pinOutsideCabiao'))
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
          showToast(rb('pinOutsideCabiao'))
        }
      },
      () => showToast('Could not get your location. Please pin manually on the map.')
    )
  }

  const addPhotosFromFiles = (fileList) => {
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      showToast(rb('maxPhotosReached'))
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
      if (!formData.businessName.trim()) {
        stepErrors.businessName = 'Business name is required.'
      } else if (formData.businessName.trim().length > 100) {
        stepErrors.businessName = 'Business name must be 100 characters or less.'
      }
      if (!formData.category) stepErrors.category = 'Please select a category.'
      if (!formData.description.trim()) {
        stepErrors.description = 'Description is required.'
      } else if (formData.description.trim().length < 20) {
        stepErrors.description = 'Description must be at least 20 characters.'
      } else if (formData.description.trim().length > 500) {
        stepErrors.description = 'Description must be 500 characters or less.'
      }
      if (!formData.barangay) stepErrors.barangay = 'Please select a barangay.'
      if (!formData.address.trim()) stepErrors.address = 'Address is required.'
    }

    if (step === 2) {
      if (!location?.lat || !location?.lng) {
        stepErrors.location = rb('locationRequired')
      } else if (!isWithinCabiaoBounds(location.lat, location.lng)) {
        stepErrors.location = rb('pinOutsideCabiao')
      }
    }

    if (step === 3) {
      if (formData.contactNumber && !validatePhone(formData.contactNumber)) {
        stepErrors.contactNumber = 'Please enter a valid contact number'
      }
      if (formData.website && !validateURL(formData.website)) {
        stepErrors.website = 'Please enter a valid website URL (include https://)'
      }
    }

    if (step === 4) {
      if (!formData.isOwner) {
        stepErrors.isOwner = 'You must confirm ownership to continue.'
      }
      if (!formData.ownerName.trim()) stepErrors.ownerName = 'Owner name is required.'
      if (!formData.ownerContact.trim()) stepErrors.ownerContact = 'Owner contact is required.'
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
    setFormData({
      ...initialFormData,
      ownerName: user?.displayName || '',
      ownerContact: user?.email || '',
    })
    setLocation(null)
    setPhotos([])
    setErrors({})
    setSuccess(null)
    setCurrentStep(1)
    setCompletedSteps(new Set())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isBusinessNameValid =
    formData.businessName.trim().length > 0 && formData.businessName.trim().length <= 100
  const validate = () => {
    const newErrors = {}
    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required'
    else if (formData.businessName.trim().length > 100) {
      newErrors.businessName = 'Business name must be 100 characters or less'
    }
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }
    if (!formData.barangay) newErrors.barangay = 'Barangay is required'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!location) newErrors.location = rb('locationRequired')
    else if (!isWithinCabiaoBounds(location.lat, location.lng)) {
      newErrors.location = rb('pinOutsideCabiao')
    }
    if (formData.contactNumber && !validatePhone(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid contact number'
    }
    if (formData.website && !validateURL(formData.website)) {
      newErrors.website = 'Please enter a valid website URL (include https://)'
    }
    if (!formData.isOwner) {
      newErrors.isOwner = 'You must confirm you are the owner or authorized representative'
    }
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required'
    if (!formData.ownerContact.trim()) newErrors.ownerContact = 'Owner contact is required'

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
    if (!requireEmailVerified(user, showToast)) return
    const stepErrors = validateStep(4)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      scrollToFirstError(stepErrors)
      return
    }
    if (!validate()) return

    setIsSubmitting(true)
    setPhotos((prev) => prev.map((p) => ({ ...p, status: p.file ? 'uploading' : p.status })))

    try {
      const photoFiles = photos.filter((p) => p.file).map((p) => p.file)
      const submissionId = await submitBusinessRegistration(
        user.uid,
        user,
        { ...formData, location },
        photoFiles
      )
      setSuccess({
        ownerName: formData.ownerName,
        businessName: formData.businessName,
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
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('registerBusiness.submissionSuccess')}</h1>
            <p className="text-gray-600 mb-8">
              Thank you, {success.ownerName}! Your business &ldquo;{success.businessName}&rdquo; has been
              submitted for review by the Cabiao LGU team.
            </p>
            <div className="text-left rounded-xl bg-emerald-50 border border-emerald-100 p-5 mb-8">
              <p className="font-semibold text-gray-900 mb-3">📋 {rb('whatHappensNext')}</p>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>{rb('nextStep1')}</li>
                <li>{rb('nextStep2')}</li>
                <li>{rb('nextStep3')}</li>
              </ol>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/profile"
                className="flex-1 inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
              >
                {rb('viewMyProfile')}
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 inline-flex items-center justify-center min-h-[44px] px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                {rb('submitAnother')}
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
  const canSubmit =
    formData.isOwner && !isSubmitting && !photoUploading && currentStep === STEPS.length
  const currentStepMeta = STEPS[currentStep - 1]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <header className="bg-gradient-to-br from-emerald-50 to-white border-b border-emerald-100/80">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <Link
            to="/businesses"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
          >
            ← {rb('backToBusinessesLink')}
          </Link>
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>
              🏪
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('registerBusiness.title')}</h1>
              <p className="mt-2 text-gray-600 text-sm sm:text-base">{rb('subtitlePolished')}</p>
              <p className="mt-4 text-xs sm:text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>⏱ {rb('takes3to5Min')}</span>
                <span>📋 {rb('reviewedWithin3Days')}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {grandfatheredUnverified && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <EmailVerificationBanner />
        </div>
      )}

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
                    {rb(step.labelKey)}
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
          {rb('stepOf')} {currentStep} {rb('of')} {STEPS.length} · {rb(currentStepMeta.labelKey)}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-1">① {rb('sectionBusinessInfo')}</h2>
            <p className="text-sm text-gray-500 mb-6">Basic details about your business.</p>

            <div className="space-y-5" ref={(el) => { fieldRefs.current.businessName = el }}>
              <div>
                <label className="text-sm font-semibold text-gray-800">
                  {t('registerBusiness.businessName')} *
                </label>
                <HelperText>{rb('helperBusinessName')}</HelperText>
                <div className="relative">
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    maxLength={100}
                    className={inputClass('businessName')}
                    placeholder="e.g. Cabiao Garden Cafe"
                  />
                  <ValidCheck show={isBusinessNameValid} />
                </div>
                {isBusinessNameValid && (
                  <p className="text-xs text-emerald-600 mt-1">✓ {rb('looksGood')}</p>
                )}
                {errors.businessName && <p className="text-red-600 text-xs mt-1">{errors.businessName}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.category = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {t('registerBusiness.businessCategory')} *
                </label>
                <HelperText>{rb('helperCategory')}</HelperText>
                <select name="category" value={formData.category} onChange={handleChange} className={inputClass('category')}>
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {CATEGORY_EMOJI[cat.value] || '📦'} {cat.label}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.description = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {t('registerBusiness.businessDescription')} *
                </label>
                <HelperText>{rb('helperDescription')}</HelperText>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={500}
                  className={inputClass('description')}
                  placeholder="Describe your business, products, and services..."
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {formData.description.length} / 500 characters · minimum 20
                </p>
                {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.barangay = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {t('registerBusiness.businessBarangay')} *
                </label>
                <HelperText>{rb('helperBarangay')}</HelperText>
                <select name="barangay" value={formData.barangay} onChange={handleChange} className={inputClass('barangay')}>
                  <option value="">Select your barangay</option>
                  {CABIAO_BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.barangay && <p className="text-red-600 text-xs mt-1">{errors.barangay}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.address = el }}>
                <label className="text-sm font-semibold text-gray-800">
                  {t('registerBusiness.businessAddress')} *
                </label>
                <HelperText>{rb('helperAddress')}</HelperText>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={inputClass('address')}
                  placeholder="e.g. 123 Rizal Street, near the Public Market"
                />
                {errors.address && <p className="text-red-600 text-xs mt-1">{errors.address}</p>}
              </div>
            </div>
          </section>
          )}

          {currentStep === 2 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">② 📍 {rb('sectionLocation')}</h2>
            <HelperText>{rb('helperLocation')}</HelperText>

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
                <MapClickHandler onLocationSelect={setPin} onOutOfBounds={() => showToast(rb('pinOutsideCabiao'))} />
                <DraggablePin
                  position={location}
                  onMove={setPin}
                  onOutOfBounds={() => showToast(rb('pinOutsideCabiao'))}
                />
                <MapRecenterControl />
              </MapContainer>
              <button
                type="button"
                onClick={useMyLocation}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-lg px-4 py-2.5 text-sm font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 min-h-[44px] whitespace-nowrap"
              >
                📍 {rb('useMyLocation')}
              </button>
            </div>

            {location && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  {rb('pinnedAt')}:{' '}
                  <span className="font-mono text-gray-800">
                    📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                </p>
                <p className="text-sm text-emerald-700 font-medium">✓ {rb('locationPinnedSuccess')}</p>
              </div>
            )}
            {errors.location && <p className="text-red-600 text-xs mt-2">{errors.location}</p>}
          </section>
          )}

          {currentStep === 3 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">③ 📸 {rb('sectionPhotosContact')}</h2>
            <HelperText>{rb('helperPhotos')}</HelperText>
            <p className="text-xs text-gray-500 mb-4">{rb('maxPhotosHint')}</p>

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
                        {rb('cover')}
                      </span>
                    )}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => setAsCover(photo.id)}
                        className="absolute top-1 left-1 w-8 h-8 rounded-full bg-white/90 shadow text-sm hover:bg-white"
                        title={rb('setAsCover')}
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
                    <span className="text-xs font-medium">{rb('addPhoto')}</span>
                  </button>
                )
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {photos.length} {rb('of')} {MAX_PHOTOS} {rb('photosLabel')}
              {photos.length > 1 && ` · ${rb('dragToReorder')}`}
            </p>

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-5">
              <h3 className="text-sm font-semibold text-gray-800">Contact &amp; Online Presence</h3>

              <div>
                <label className="text-sm font-semibold text-gray-800">{t('registerBusiness.businessContact')}</label>
                <HelperText>{rb('helperContactNumber')}</HelperText>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className={inputClass('contactNumber')}
                  placeholder="09XX XXX XXXX"
                />
                {errors.contactNumber && <p className="text-red-600 text-xs mt-1">{errors.contactNumber}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-800">{t('registerBusiness.businessFacebook')}</label>
                <HelperText>{rb('helperFacebook')}</HelperText>
                <input
                  type="text"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  className={inputClass('facebook')}
                  placeholder="facebook.com/yourbusiness"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-800">{t('registerBusiness.businessWebsite')}</label>
                <HelperText>{rb('helperWebsite')}</HelperText>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className={inputClass('website')}
                  placeholder="https://yourbusiness.com"
                />
                {errors.website && <p className="text-red-600 text-xs mt-1">{errors.website}</p>}
              </div>
            </div>
          </section>
          )}

          {currentStep === 4 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">④ 👤 {rb('ownershipConfirmTitle')}</h2>
            <p className="text-sm text-gray-500 mb-6">{rb('ownershipConfirmIntro')}</p>

            <div ref={(el) => { fieldRefs.current.isOwner = el }} className="mb-5">
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition min-h-[44px]">
                <input
                  type="checkbox"
                  name="isOwner"
                  checked={formData.isOwner}
                  onChange={handleChange}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <span className="text-sm text-gray-700">{rb('ownershipConfirmCheckbox')}</span>
              </label>
              {errors.isOwner && <p className="text-red-600 text-xs mt-1">{errors.isOwner}</p>}
            </div>

            <div className="space-y-5">
              <div ref={(el) => { fieldRefs.current.ownerName = el }}>
                <label className="text-sm font-semibold text-gray-800">{t('registerBusiness.ownerName')} *</label>
                <HelperText>{rb('helperOwnerName')}</HelperText>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  className={inputClass('ownerName')}
                  placeholder="Juan dela Cruz"
                />
                {errors.ownerName && <p className="text-red-600 text-xs mt-1">{errors.ownerName}</p>}
              </div>

              <div ref={(el) => { fieldRefs.current.ownerContact = el }}>
                <label className="text-sm font-semibold text-gray-800">{t('registerBusiness.ownerContact')} *</label>
                <HelperText>{rb('helperOwnerContact')}</HelperText>
                <input
                  type="text"
                  name="ownerContact"
                  value={formData.ownerContact}
                  onChange={handleChange}
                  className={inputClass('ownerContact')}
                  placeholder="09XX XXX XXXX or email"
                />
                {errors.ownerContact && <p className="text-red-600 text-xs mt-1">{errors.ownerContact}</p>}
              </div>
            </div>
          </section>
          )}
          </div>

          {currentStep === STEPS.length && (
            <p className="text-xs text-gray-500 text-center mt-6">{rb('submitAgreement')}</p>
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
                  <span>←</span> {rb('back')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/businesses')}
                  className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition flex items-center justify-center"
                >
                  {rb('cancel')}
                </button>
              )}

              <span className="hidden sm:block text-sm text-gray-500">
                {rb('stepOf')} {currentStep} {rb('of')} {STEPS.length}
              </span>

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 sm:flex-none min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition flex items-center justify-center gap-2"
                >
                  {rb('next')} <span>→</span>
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
                      {t('registerBusiness.submitting')}
                    </>
                  ) : (
                    <>📤 {t('registerBusiness.submitForReview')}</>
                  )}
                </button>
              )}
            </div>
            <p className="text-center text-xs text-gray-400 mt-1.5 sm:hidden max-w-3xl mx-auto">
              {rb('stepOf')} {currentStep} {rb('of')} {STEPS.length} · {rb(currentStepMeta.labelKey)}
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
