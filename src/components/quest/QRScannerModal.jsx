import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { verifyQuestByQR } from '../../services/questVerification.service'
import { useAuth } from '../../contexts/AuthContext'

export default function QRScannerModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [initError, setInitError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const scannerRef = useRef(null)
  const isScanningRef = useRef(false)
  const isCleaningUpRef = useRef(false)
  const verifyingRef = useRef(false)

  const safeStop = async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    const scanner = scannerRef.current
    if (!scanner) {
      isCleaningUpRef.current = false
      return
    }

    if (isScanningRef.current) {
      try {
        await scanner.stop()
      } catch (err) {
        console.warn('[QRScannerModal] scanner.stop() ignored:', err?.message || err)
      }
      isScanningRef.current = false
    }

    try {
      await scanner.clear()
    } catch (err) {
      console.warn('[QRScannerModal] scanner.clear() ignored:', err?.message || err)
    }

    isCleaningUpRef.current = false
  }

  const handleScanSuccess = async (decodedText) => {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setVerifying(true)
    setScanning(false)

    await safeStop()

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
      setVerifying(false)
      verifyingRef.current = false
    }
  }

  const handleClose = async () => {
    await safeStop()
    onClose()
  }

  useEffect(() => {
    if (!isOpen || !user?.uid) return

    let cancelled = false
    const elementId = 'qr-scanner-region'

    const initScanner = async () => {
      try {
        const scanner = new Html5Qrcode(elementId)
        if (cancelled) return
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScanSuccess(decodedText)
          },
          () => {}
        )

        if (cancelled) {
          isScanningRef.current = true
          await safeStop()
          return
        }

        isScanningRef.current = true
        setScanning(true)
      } catch (err) {
        console.error('[QRScannerModal] init failed:', err)
        if (cancelled) return

        const message = String(err?.message || err || '').toLowerCase()
        let friendly
        if (message.includes('permission') || message.includes('notallowed')) {
          friendly = 'Camera permission denied. Please allow camera access in your browser settings and try again.'
        } else if (message.includes('notfound') || message.includes('no camera') || message.includes('device')) {
          friendly = 'No camera found on this device.'
        } else {
          friendly = 'Could not start camera. Please try again.'
        }
        setInitError(friendly)
      }
    }

    initScanner()

    return () => {
      cancelled = true
      safeStop()
    }
  }, [isOpen, user?.uid])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-white sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">📱 Scan QR Code</h3>
          <button type="button" onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          {initError ? (
            <div className="w-full text-center">
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                {initError}
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium hover:bg-emerald-700"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              {verifying && (
                <div className="text-emerald-600 font-semibold flex items-center gap-2 mb-4">
                  <span className="animate-spin">⏳</span> Verifying...
                </div>
              )}

              {scanning && !verifying && (
                <p className="text-sm text-gray-500 mb-3 text-center">
                  Point your camera at the QR code at the venue
                </p>
              )}

              <div
                id="qr-scanner-region"
                className="w-full max-w-sm bg-black rounded-xl overflow-hidden"
                style={{ minHeight: 300 }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
