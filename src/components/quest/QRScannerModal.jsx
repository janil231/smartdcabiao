import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { verifyQuestByQR } from '../../services/questVerification.service'
import { useAuth } from '../../contexts/AuthContext'

export default function QRScannerModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const html5QrCode = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !user?.uid) return

    let cancelled = false

    const startScanner = async () => {
      try {
        html5QrCode.current = new Html5Qrcode('qr-scanner-region')
        setScanning(true)
        setError('')

        await html5QrCode.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (cancelled || submitting) return
            cancelled = true

            try {
              await html5QrCode.current?.stop()
            } catch {
              // ignore
            }
            setScanning(false)
            setSubmitting(true)

            try {
              let userLocation = null
              try {
                userLocation = await new Promise((resolve) => {
                  navigator.geolocation.getCurrentPosition(
                    (pos) =>
                      resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve(null),
                    { timeout: 5000 }
                  )
                })
              } catch {
                userLocation = null
              }

              const result = await verifyQuestByQR(user.uid, decodedText, userLocation)
              onSuccess(result)
              onClose()
            } catch (err) {
              setError(err.message || 'Verification failed')
              setSubmitting(false)
              cancelled = false
            }
          },
          () => {}
        )
      } catch {
        setError('Camera access denied or unavailable. Please grant camera permission and try again.')
        setScanning(false)
      }
    }

    startScanner()

    return () => {
      cancelled = true
      if (html5QrCode.current?.isScanning) {
        html5QrCode.current.stop().catch(() => {})
      }
    }
  }, [isOpen, user?.uid, onClose, onSuccess])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-white sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">📱 Scan QR Code</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          {error && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {submitting && (
            <div className="text-emerald-600 font-semibold flex items-center gap-2 mb-4">
              <span className="animate-spin">⏳</span> Verifying...
            </div>
          )}

          {scanning && !submitting && (
            <p className="text-sm text-gray-500 mb-3 text-center">
              Point your camera at the QR code at the venue
            </p>
          )}

          <div
            id="qr-scanner-region"
            className="w-full max-w-sm bg-black rounded-xl overflow-hidden"
            style={{ minHeight: 300 }}
          />
        </div>
      </div>
    </div>
  )
}
