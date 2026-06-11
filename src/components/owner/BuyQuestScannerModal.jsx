import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { verifyBuyQuestByQR } from '../../services/ownerQuests.service'

export default function BuyQuestScannerModal({ quest, business, user, userLocation, onClose, onSuccess, onSwitchToCode }) {
  const [verificationError, setVerificationError] = useState('')
  const [initError, setInitError] = useState(null)
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
        console.warn('[BuyQuestScannerModal] scanner.stop() ignored:', err?.message || err)
      }
      isScanningRef.current = false
    }

    try {
      await scanner.clear()
    } catch (err) {
      console.warn('[BuyQuestScannerModal] scanner.clear() ignored:', err?.message || err)
    }

    scannerRef.current = null
    isCleaningUpRef.current = false
  }

  const handleScanSuccess = async (decodedText) => {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setVerifying(true)
    setVerificationError('')

    await safeStop()

    try {
      await verifyBuyQuestByQR(user.uid, quest.id, decodedText, userLocation)
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('[BuyQuestScannerModal] Verification failed:', err)
      setVerificationError(err.message || 'Verification failed. Please try again or use the code instead.')
      setVerifying(false)
      verifyingRef.current = false
    }
  }

  const handleRetry = async () => {
    setVerificationError('')
    setInitError(null)
    initScanner()
  }

  const handleClose = async () => {
    await safeStop()
    onClose()
  }

  const handleSwitchToCode = async () => {
    await safeStop()
    onClose()
    onSwitchToCode?.()
  }

  const initScanner = async () => {
    try {
      const scanner = new Html5Qrcode('buy-quest-scanner')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: function (viewfinderWidth, viewfinderHeight) {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const size = Math.min(Math.floor(minEdge * 0.7), 280)
            return { width: size, height: size }
          },
          aspectRatio: 1.0,
          disableFlip: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        },
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        () => {}
      )

      isScanningRef.current = true
    } catch (err) {
      console.error('[BuyQuestScannerModal] init failed:', err)

      const message = String(err?.message || err || '').toLowerCase()
      let friendly
      if (message.includes('permission') || message.includes('notallowed')) {
        friendly = 'Camera permission denied. Please allow camera access in your browser settings, or use the code instead.'
      } else if (message.includes('notfound') || message.includes('no camera') || message.includes('device')) {
        friendly = 'No camera found on this device. Please use the code instead.'
      } else {
        friendly = 'Could not start camera. Please try again or use the code instead.'
      }
      setInitError(friendly)
    }
  }

  useEffect(() => {
    initScanner()

    return () => {
      safeStop()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Scan Quest QR</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <p className="text-xs text-gray-600 mb-3">
          Ask staff at <strong>{business?.name || 'the business'}</strong> to show you the quest QR code, then scan it.
        </p>

        {initError ? (
          <div className="text-center mb-3">
            <div className="text-red-600 mb-4">⚠️ {initError}</div>
            {onSwitchToCode && (
              <button
                type="button"
                onClick={handleSwitchToCode}
                className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium hover:bg-emerald-700"
              >
                Enter Code Instead
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-full mt-2 border border-gray-300 rounded-lg py-3 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div id="buy-quest-scanner" className="rounded-xl overflow-hidden bg-gray-100 aspect-square mb-3"></div>

            {verifying && (
              <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-lg text-center">
                Verifying...
              </div>
            )}

            {verificationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-900 font-medium mb-1">❌ Verification failed</p>
                <p className="text-xs text-red-800">{verificationError}</p>
                <button
                  onClick={handleRetry}
                  className="text-xs text-red-700 underline mt-2"
                >
                  Try scanning again
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-4">
              {onSwitchToCode && (
                <button
                  onClick={handleSwitchToCode}
                  className="w-full border-2 border-emerald-600 text-emerald-700 rounded-lg py-3 font-medium hover:bg-emerald-50"
                >
                  Enter Code Instead
                </button>
              )}
              <button
                onClick={handleClose}
                className="w-full text-gray-600 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
