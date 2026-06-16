import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { verifyQuestByCode } from '../../services/questVerification.service'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { compressImage } from '../../utils/compressImage'
import { useAuth } from '../../contexts/AuthContext'

export default function EventCodeModal({ isOpen, onClose, quest, onSuccess }) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !quest) return null

  const needsPhoto = quest.requirePhoto !== false

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      setError('Photo must be under 3MB')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Please enter the event code.')
      return
    }
    if (needsPhoto && !photoFile) {
      setError('Please upload a photo to verify.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      let photoURL = null
      if (photoFile) {
        const compressed = await compressImage(photoFile, 1024, 0.75)
        photoURL = await uploadToCloudinary(compressed)
      }

      let userLocation = null
      try {
        userLocation = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 5000 }
          )
        })
      } catch {
        userLocation = null
      }

      const result = await verifyQuestByCode(user.uid, quest.id, code, photoURL, userLocation)
      onSuccess(result)
      onClose()
    } catch (err) {
      setError(err.message || 'Verification failed')
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-white sm:rounded-2xl overflow-y-auto flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="font-semibold">🔢 Enter Event Code</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Ask LGU staff at the event for today&apos;s verification code.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold block mb-1">Event Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CABIAO-XXX"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono text-lg tracking-wider"
            />
          </div>

          {needsPhoto && (
            <div>
              <label className="text-sm font-semibold block mb-1">Photo (required)</label>
              <p className="text-xs text-gray-500 mb-2">
                Upload a photo of yourself or the event for verification.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="block w-full text-sm"
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="mt-3 w-full max-h-48 object-cover rounded-xl"
                />
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {submitting ? (
              <>
                <span className="animate-spin">⏳</span> Verifying...
              </>
            ) : (
              'Verify Quest'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
