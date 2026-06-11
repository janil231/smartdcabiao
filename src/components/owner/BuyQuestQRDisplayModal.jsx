import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { rotateBuyQuestDailyCode } from '../../services/ownerQuests.service'

export default function BuyQuestQRDisplayModal({ quest, business, onClose, user }) {
  const canvasRef = useRef(null)
  const [displayMode, setDisplayMode] = useState('qr')
  const [rotating, setRotating] = useState(false)
  const [dailyCode, setDailyCode] = useState(quest?.dailyCode || null)
  const [qrError, setQrError] = useState(null)

  const qrPayload = quest?.qrToken
    ? `BQ:${quest.id}:${quest.qrToken}`
    : ''

  useEffect(() => {
    if (!qrPayload || !canvasRef.current) return
    setQrError(null)

    QRCode.toCanvas(canvasRef.current, qrPayload, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).catch(err => {
      console.error('[BuyQuestQRDisplayModal] QR generation failed:', err)
      setQrError(err.message || 'Failed to generate QR code')
    })
  }, [qrPayload])

  const handleRotateCode = async () => {
    if (!confirm('Generate a new daily code? The current code will stop working.')) return
    if (!user?.uid) return

    setRotating(true)
    try {
      const newCode = await rotateBuyQuestDailyCode(quest.id, user.uid)
      setDailyCode(newCode)
    } catch (err) {
      alert(`Failed: ${err.message}`)
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Quest QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {quest && (
          <p className="text-sm font-medium text-gray-700 mb-4">
            {quest.title}
          </p>
        )}

        <div className="flex gap-2 mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setDisplayMode('qr')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              displayMode === 'qr' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-600'
            }`}
          >
            📷 QR Code
          </button>
          <button
            onClick={() => setDisplayMode('code')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              displayMode === 'code' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-600'
            }`}
          >
            🔢 Code Only
          </button>
        </div>

        {displayMode === 'qr' && (
          <>
            <p className="text-sm text-gray-600 text-center mb-3">
              Customer scans this to claim their reward
            </p>

            {qrPayload && !qrError ? (
              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  className="border-2 border-gray-200 rounded-xl max-w-full h-auto"
                />
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <div className="w-[280px] h-[280px] bg-gray-100 rounded-xl flex items-center justify-center">
                  <p className="text-sm text-gray-500 px-4 text-center">
                    {qrError || 'No QR token generated'}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-700 mb-1">
                Or share this code if scanner doesn't work:
              </p>
              <p className="text-2xl font-bold text-emerald-900 tracking-widest font-mono">
                {dailyCode || '----'}
              </p>
            </div>
          </>
        )}

        {displayMode === 'code' && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Read this code aloud to your customer:
            </p>
            <p className="text-6xl font-bold text-emerald-700 tracking-widest font-mono mb-4">
              {dailyCode || '----'}
            </p>
            <p className="text-xs text-gray-500">
              Code rotates {quest?.autoRotateDaily ? 'daily' : 'manually'}
            </p>
          </div>
        )}

        <button
          onClick={handleRotateCode}
          disabled={rotating}
          className="w-full mt-4 border border-amber-300 text-amber-800 rounded-lg py-2 text-sm font-medium hover:bg-amber-50 disabled:opacity-50"
        >
          {rotating ? 'Rotating...' : '🔄 Rotate Code Now'}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 bg-gray-100 rounded-lg py-3 text-gray-700 font-medium"
        >
          Close
        </button>
      </div>
    </div>
  )
}
