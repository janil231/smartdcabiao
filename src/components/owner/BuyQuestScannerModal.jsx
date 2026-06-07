import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { verifyBuyQuestByQR } from '../../services/ownerQuests.service'

export default function BuyQuestScannerModal({ quest, business, user, userLocation, onClose, onSuccess }) {
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    let scanner = null
    let stopped = false

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('buy-quest-scanner')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (verifying || stopped) return
            setVerifying(true)
            try {
              await scanner.stop()
              await verifyBuyQuestByQR(user.uid, quest.id, decodedText, userLocation)
              onSuccess()
            } catch (err) {
              setError(err.message || 'Verification failed')
              setVerifying(false)
              try {
                await scanner.start(
                  { facingMode: 'environment' },
                  { fps: 10, qrbox: { width: 250, height: 250 } },
                  () => {},
                  () => {}
                )
              } catch {}
            }
          },
          () => {}
        )
      } catch (err) {
        if (!stopped) setError('Camera access denied or unavailable')
      }
    }

    startScanner()

    return () => {
      stopped = true
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Scan Quest QR</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <p className="text-xs text-gray-600 mb-3">
          Ask staff at <strong>{business?.name || 'the business'}</strong> to show you the quest QR code, then scan it.
        </p>

        <div id="buy-quest-scanner" className="rounded-xl overflow-hidden bg-gray-100 aspect-square mb-3"></div>

        {verifying && (
          <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-lg text-center">
            Verifying...
          </div>
        )}

        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-800 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
